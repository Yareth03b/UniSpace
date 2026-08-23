import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Course } from '../models/course.model';
import { ScheduleEntry } from '../models/schedule-entry.model';
import { Task, TaskView } from '../models/task.model';
import { UserProfile } from '../models/user-profile.model';
import { AuthService } from './auth.service';

type DatabaseCourse = { id: string; name: string; teacher: string; color: string; cover: string | null; progress: number };
type DatabaseSchedule = { id: string; course_id: string; day_of_week: number; start_time: string; end_time: string; location: string };
type DatabaseTask = { id: string; title: string; course_id: string | null; due_date: string | null; done: boolean };

const dueFormatter = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly auth = inject(AuthService);
  readonly courses = signal<Course[]>([]);
  readonly tasks = signal<Task[]>([]);
  readonly profile = signal<UserProfile>({ name: 'Estudiante', email: '' });
  readonly schedule = signal<ScheduleEntry[]>([]);
  readonly initials = computed(() => this.profile().name.split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'US');
  readonly overallProgress = computed(() => { const courses = this.courses(); return courses.length ? Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / courses.length) : 0; });

  /** Tareas pendientes ordenadas por fecha, con curso resuelto para la UI */
  readonly pendingTasks = computed<TaskView[]>(() => {
    const courses = this.courses();
    return this.tasks()
      .filter(t => !t.done)
      .map(t => {
        const course = t.courseId ? courses.find(c => c.id === t.courseId) : null;
        return {
          ...t,
          courseName: course?.name ?? (t.courseId ? 'Curso eliminado' : 'General'),
          dueLabel: t.dueDate ? dueFormatter.format(new Date(t.dueDate + 'T00:00:00')) : ''
        };
      })
      .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  });

  /** Todas las tareas con metadatos de UI (pendientes primero) */
  readonly taskViews = computed<TaskView[]>(() => {
    const pend = this.pendingTasks();
    const done = this.tasks().filter(t => t.done).map(t => {
      const view = pend.find(p => p.id === t.id);
      return view ?? { ...t, courseName: 'General', dueLabel: '' };
    });
    return [...pend, ...done];
  });

  courseName(courseId: string | null): string {
    if (!courseId) return 'General';
    return this.courses().find(c => c.id === courseId)?.name ?? 'Curso eliminado';
  }

  dueLabel(dueDate: string | null): string {
    return dueDate ? dueFormatter.format(new Date(dueDate + 'T00:00:00')) : '';
  }

  constructor() { effect(() => { const user = this.auth.session()?.user; if (user) void this.loadUserData(user.id); else this.reset(); }); }

  async addCourse(name: string, teacher: string, color: string): Promise<void> {
    const user = this.requireUser(); if (!user || !name.trim()) return;
    const { data, error } = await this.auth.client.from('courses').insert({ user_id: user.id, name: name.trim(), teacher: teacher.trim(), color, progress: 0 }).select('id,name,teacher,color,progress').single();
    if (error) throw error;
    const course = data as DatabaseCourse & { cover?: string };
    this.courses.update(courses => [...courses, { ...course, cover: null }]);
  }

  /** Actualiza docente / color / imagen de fondo del curso */
  async updateCourse(id: string, patch: { teacher?: string; color?: string; cover?: string | null }): Promise<void> {
    if (!this.requireUser()) return;
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.teacher !== undefined) payload['teacher'] = patch.teacher.trim();
    if (patch.color !== undefined) payload['color'] = patch.color;
    if (patch.cover !== undefined) payload['cover'] = patch.cover;

    const first = await this.auth.client
      .from('courses')
      .update(payload)
      .eq('id', id)
      .select('id,name,teacher,color,cover,progress')
      .single();

    if (first.error) {
      // Si la columna cover aún no existe (migración pendiente), guardar sin ella
      if (this.isUnknownColumn(first.error)) {
        delete payload['cover'];
        const retry = await this.auth.client
          .from('courses')
          .update(payload)
          .eq('id', id)
          .select('id,name,teacher,color,progress')
          .single();
        if (retry.error) throw new Error(retry.error.message);
        const row = retry.data as DatabaseCourse & { name: string };
        this.courses.update(list => list.map(c => c.id === id
          ? { ...c, name: row.name, teacher: row.teacher, color: row.color, progress: row.progress }
          : c));
        return;
      }
      throw new Error(first.error.message);
    }

    const row = first.data as DatabaseCourse & { name: string };
    this.courses.update(list => list.map(c => c.id === id
      ? { ...c, name: row.name, teacher: row.teacher, color: row.color, cover: row.cover ?? null, progress: row.progress }
      : c));
  }

  private isUnknownColumn(err: unknown): boolean {
    const e = err as { code?: string; message?: string };
    return e?.code === '42703'
      || /column .* does not exist/i.test(e?.message ?? '')
      || /could not find the/i.test(e?.message ?? '');
  }

  async updateProfile(name: string, email: string): Promise<void> {
    const user = this.requireUser(); if (!user) return;
    const profile = { name: name.trim() || 'Estudiante', email: email.trim() };
    const { error } = await this.auth.client.from('profiles').upsert({ id: user.id, full_name: profile.name, email: profile.email, updated_at: new Date().toISOString() });
    if (error) throw error;
    this.profile.set(profile);
  }

  async addScheduleEntry(courseId: string, day: string, startTime: string, endTime: string, location: string): Promise<void> {
    const user = this.requireUser(); if (!user || !courseId || !startTime || !endTime || endTime <= startTime) return;
    const { data, error } = await this.auth.client.from('schedule_entries').insert({ user_id: user.id, course_id: courseId, day_of_week: this.dayNumber(day), start_time: startTime, end_time: endTime, location: location.trim() || 'Sin aula definida' }).select('id,course_id,day_of_week,start_time,end_time,location').single();
    if (error) throw error;
    this.schedule.update(entries => [...entries, this.toScheduleEntry(data as DatabaseSchedule)].sort((a, b) => `${a.day}${a.startTime}`.localeCompare(`${b.day}${b.startTime}`)));
  }

  async removeScheduleEntry(id: string): Promise<void> {
    const { error } = await this.auth.client.from('schedule_entries').delete().eq('id', id); if (error) throw error;
    this.schedule.update(entries => entries.filter(entry => entry.id !== id));
  }

  // ----------------------------------------------------
  // TAREAS (CRUD)
  // ----------------------------------------------------
  private toTask(row: DatabaseTask): Task {
    return { id: row.id, title: row.title, courseId: row.course_id, dueDate: row.due_date, done: row.done };
  }

  async addTask(title: string, courseId: string | null, dueDate: string | null): Promise<void> {
    const user = this.requireUser();
    const clean = title.trim();
    if (!user || !clean) return;
    const { data, error } = await this.auth.client
      .from('tasks')
      .insert({ user_id: user.id, title: clean, course_id: courseId || null, due_date: dueDate || null })
      .select('id,title,course_id,due_date,done')
      .single();
    if (error) throw error;
    this.tasks.update(tasks => [this.toTask(data as DatabaseTask), ...tasks]);
  }

  async toggleTask(id: string, done: boolean): Promise<void> {
    const { error } = await this.auth.client.from('tasks').update({ done }).eq('id', id);
    if (error) throw error;
    this.tasks.update(tasks => tasks.map(t => t.id === id ? { ...t, done } : t));
  }

  async removeTask(id: string): Promise<void> {
    const { error } = await this.auth.client.from('tasks').delete().eq('id', id);
    if (error) throw error;
    this.tasks.update(tasks => tasks.filter(t => t.id !== id));
  }

  /** Borra el curso completo: FKs en cascada limpian cuaderno, páginas y horario */
  async deleteCourse(id: string): Promise<void> {
    const { error } = await this.auth.client.from('courses').delete().eq('id', id);
    if (error) throw error;
    this.courses.update(list => list.filter(c => c.id !== id));
    this.schedule.update(entries => entries.filter(e => e.courseId !== id));
    this.tasks.update(tasks => tasks.filter(t => t.courseId !== id));
  }

  private async loadUserData(userId: string): Promise<void> {
    const [profileResult, coursesResult, scheduleResult, tasksResult] = await Promise.all([
      this.auth.client.from('profiles').select('full_name,email').eq('id', userId).maybeSingle(),
      this.auth.client.from('courses').select('id,name,teacher,color,cover,progress').order('created_at'),
      this.auth.client.from('schedule_entries').select('id,course_id,day_of_week,start_time,end_time,location').order('day_of_week').order('start_time'),
      this.auth.client.from('tasks').select('id,title,course_id,due_date,done').order('created_at'),
    ]);
    if (profileResult.data) this.profile.set({ name: profileResult.data.full_name, email: profileResult.data.email ?? '' });
    if (coursesResult.data) this.courses.set(coursesResult.data as DatabaseCourse[]);
    if (scheduleResult.data) this.schedule.set((scheduleResult.data as DatabaseSchedule[]).map(entry => this.toScheduleEntry(entry)));
    if (tasksResult.data) this.tasks.set((tasksResult.data as DatabaseTask[]).map(row => this.toTask(row)));
  }

  private reset(): void {
    this.courses.set([]); this.tasks.set([]); this.schedule.set([]); this.profile.set({ name: 'Estudiante', email: '' });
  }

  private requireUser() { return this.auth.session()?.user ?? null; }
  private dayNumber(day: string): number { return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].indexOf(day) + 1; }
  private toScheduleEntry(entry: DatabaseSchedule): ScheduleEntry { const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']; return { id: entry.id, courseId: entry.course_id, day: days[entry.day_of_week - 1], startTime: entry.start_time.slice(0, 5), endTime: entry.end_time.slice(0, 5), location: entry.location }; }
}
