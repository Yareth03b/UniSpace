import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStateService } from '../../core/services/app-state.service';
import type { TaskView } from '../../core/models/task.model';

@Component({
  imports: [FormsModule],
  template: `
    <header>
      <div>
        <p>ORGANIZACIÓN</p>
        <h1>Tareas</h1>
      </div>
      <button class="new-btn" (click)="showForm.set(!showForm())">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Nueva tarea
      </button>
    </header>

    @if (showForm()) {
      <section class="form-card">
        <h2>Nueva tarea</h2>
        <form (ngSubmit)="add()">
          <label class="full">
            Título
            <input name="title" [(ngModel)]="title" required maxlength="160"
                   placeholder="Título de la tarea" />
          </label>

          <label>
            Curso (opcional)
            <select name="course" [(ngModel)]="courseId">
              <option value="">General</option>
              @for (c of state.courses(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          </label>

          <label>
            Fecha límite (opcional)
            <input type="date" name="due" [(ngModel)]="dueDate" [min]="todayIso" />
          </label>

          <div class="form-actions full">
            <button type="button" class="ghost" (click)="cancelForm()">Cancelar</button>
            <button type="submit">Guardar tarea</button>
          </div>
        </form>
      </section>
    }

    <section class="list-card">
      <div class="head">
        <h2>{{ state.pendingTasks().length }} pendientes</h2>
        <span>{{ state.taskViews().length }} en total</span>
      </div>

      @for (t of state.taskViews(); track t.id) {
        <article [class.done]="t.done">
          <button class="check" [class.checked]="t.done" (click)="toggle(t)"
                  [attr.aria-label]="t.done ? 'Marcar como pendiente' : 'Marcar como completada'">
            @if (t.done) {
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            }
          </button>

          <div class="body">
            <strong>{{ t.title }}</strong>
            <small>{{ t.courseName }}</small>
          </div>

          @if (t.dueLabel) {
            <time [class.overdue]="isOverdue(t) && !t.done">{{ t.dueLabel }}</time>
          }

          <button class="del" (click)="remove(t)" title="Eliminar tarea">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </article>
      } @empty {
        <p class="empty-text">
          No hay tareas todavía. Crea la primera con el botón "Nueva tarea".
        </p>
      }
    </section>
  `,
  styles: `
    header { display: flex; justify-content: space-between; align-items: center; }
    h1, h2, p { margin: 0; }
    header p { font-size: 12px; color: var(--ink-dim); font-weight: 700; letter-spacing: .08em; }
    h1 { font-family: var(--font-display); font-size: 30px; margin-top: 8px; }

    .new-btn {
      display: inline-flex; align-items: center; gap: 7px;
      background: linear-gradient(135deg, var(--primary), var(--primary-light));
      color: #ffffff; border: 0; border-radius: 6px;
      padding: 10px 16px; font-weight: 600;
      box-shadow: 0 4px 16px rgba(55, 48, 163, .35);
      transition: filter .2s, transform .2s;
    }
    .new-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }
    .new-btn svg { display: block; }

    .form-card { margin-top: 28px; padding: 22px; }
    .form-card h2 { font-size: 16px; color: var(--ink); margin-bottom: 14px; }

    form {
      display: grid;
      grid-template-columns: 1fr 260px 200px;
      gap: 14px;
      align-items: end;
    }

    label {
      display: block; font-size: 11.5px; font-weight: 700;
      letter-spacing: .06em; text-transform: uppercase;
      color: var(--ink-dim);
    }

    input, select {
      display: block; width: 100%; margin-top: 7px;
      background: rgba(6, 11, 26, .78);
      border: 1px solid rgba(99, 102, 241, .22);
      color: var(--ink);
      border-radius: 6px;
      padding: 10px 12px;
      font: inherit;
      box-sizing: border-box;
    }
    input:focus, select:focus { outline: none; border-color: var(--accent-light); }

    .full { grid-column: 1 / -1; }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; }
    .form-actions button { width: auto !important; padding: 10px 18px !important; border-radius: 6px !important; font-weight: 600; cursor: pointer; }
    .form-actions .ghost { background: transparent !important; color: var(--ink-dim) !important; border: 1px solid var(--glass-border) !important; box-shadow: none !important; }
    .form-actions button[type=submit] {
      background: linear-gradient(135deg, var(--primary), var(--primary-light)) !important;
      color: #ffffff !important; border: 0 !important;
      box-shadow: 0 4px 16px rgba(55, 48, 163, .35) !important;
    }

    /* ---------- Lista ---------- */
    .list-card { margin-top: 30px; padding: 22px 26px; }
    .head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .head h2 { font-size: 17px; color: var(--ink); }
    .head span { font-size: 12px; color: var(--ink-dim); }

    article {
      display: flex; align-items: center; gap: 13px;
      padding: 15px 2px;
      border-bottom: 1px solid rgba(99, 102, 241, .12);
    }
    article:last-of-type { border-bottom: 0; }

    .check {
      flex-shrink: 0;
      width: 21px; height: 21px;
      border-radius: 50%;
      border: 2px solid rgba(99, 102, 241, .45);
      background: transparent;
      cursor: pointer;
      display: grid; place-items: center;
      color: #ffffff;
      transition: all .15s;
      padding: 0;
    }
    .check:hover { border-color: var(--accent-light); }
    .check.checked {
      background: linear-gradient(135deg, var(--primary), var(--primary-light));
      border-color: transparent;
    }

    .body { flex: 1; min-width: 0; }
    .body strong { display: block; font-size: 14px; color: var(--ink); }
    .body small { display: block; color: var(--ink-dim); font-size: 11.5px; margin-top: 3px; }

    article.done .body strong {
      text-decoration: line-through;
      text-decoration-color: rgba(99, 102, 241, .6);
      color: var(--ink-dim);
    }

    time {
      font-size: 12px; color: var(--ink-dim);
      white-space: nowrap;
    }
    time.overdue { color: #ff8fa8; font-weight: 700; }

    .del {
      flex-shrink: 0;
      width: 30px; height: 30px;
      display: grid; place-items: center;
      background: transparent; border: 0; border-radius: 7px;
      color: var(--ink-dim); cursor: pointer;
      transition: color .15s, background .15s;
      padding: 0;
    }
    .del:hover { color: #ff8fa8; background: rgba(255, 99, 132, .1); }

    .empty-text {
      color: var(--ink-dim);
      font-size: 13.5px;
      line-height: 1.6;
      padding: 16px 0 8px;
    }

    @media (max-width: 720px) {
      form { grid-template-columns: 1fr; }
      .full { grid-column: auto; }
    }
  `
})
export class TasksComponent {
  readonly state = inject(AppStateService);
  readonly showForm = signal(false);

  /** Hoy en formato ISO para el atributo min del input date */
  readonly todayIso = new Date().toISOString().slice(0, 10);

  title = '';
  courseId = '';
  dueDate = '';

  isOverdue(t: TaskView): boolean {
    if (!t.dueDate) return false;
    return t.dueDate < this.todayIso;
  }

  cancelForm() {
    this.showForm.set(false);
    this.title = '';
    this.courseId = '';
    this.dueDate = '';
  }

  async add(): Promise<void> {
    const title = this.title.trim();
    if (!title) return;

    // Restricción: solo fechas de hoy en adelante
    if (this.dueDate && this.dueDate < this.todayIso) {
      alert('La fecha límite no puede ser anterior a hoy.');
      return;
    }

    try {
      await this.state.addTask(title, this.courseId || null, this.dueDate || null);
      this.cancelForm();
    } catch (e) {
      this.report(e, 'guardar la tarea');
    }
  }

  async toggle(t: TaskView): Promise<void> {
    try {
      await this.state.toggleTask(t.id, !t.done);
    } catch (e) {
      this.report(e, 'actualizar la tarea');
    }
  }

  async remove(t: TaskView): Promise<void> {
    if (!confirm(`¿Eliminar la tarea "${t.title}"?`)) return;
    try {
      await this.state.removeTask(t.id);
    } catch (e) {
      this.report(e, 'eliminar la tarea');
    }
  }

  /** Extrae el mensaje real de cualquier tipo de error (PostgrestError incluido) */
  private errMsg(e: unknown): string {
    if (typeof e === 'string') return e;
    const any = e as { message?: string; error?: { message?: string }; details?: string };
    return any?.message ?? any?.error?.message ?? any?.details ?? JSON.stringify(e);
  }

  private report(e: unknown, action: string): void {
    console.error('Error en tareas:', e);
    const msg = this.errMsg(e);
    if (/does not exist|could not find|42P01/i.test(msg)) {
      alert(
        `Falta la tabla "tasks" en Supabase.\n\n` +
        `Ve al SQL Editor de Supabase y ejecuta:\n\n` +
        `create table public.tasks (\n` +
        `  id uuid primary key default gen_random_uuid(),\n` +
        `  user_id uuid not null references auth.users(id) on delete cascade,\n` +
        `  course_id uuid references public.courses(id) on delete set null,\n` +
        `  title text not null,\n` +
        `  due_date date,\n` +
        `  done boolean not null default false,\n` +
        `  created_at timestamptz not null default now()\n` +
        `);\n` +
        `alter table public.tasks enable row level security;\n` +
        `create policy "Users manage own tasks" on public.tasks\n` +
        `  for all using ((select auth.uid()) = user_id)\n` +
        `  with check ((select auth.uid()) = user_id);`
      );
    } else {
      alert(`No se pudo ${action}: ${msg}`);
    }
  }
}
