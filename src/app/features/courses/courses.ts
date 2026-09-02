import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';
import { Course } from '../../core/models/course.model';

@Component({
  imports: [FormsModule, RouterLink],
  template: `
    <header>
      <div>
        <p class="eyebrow">GESTIÓN ACADÉMICA</p>
        <h1>Mis cursos</h1>
        <span class="subtitle">Organiza tus asignaturas, notas y profesores.</span>
      </div>
      <button class="primary-btn" (click)="showForm.set(!showForm())">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Nuevo curso
      </button>
    </header>

    @if (showForm()) {
      <section class="form-card">
        <h2>Nuevo curso</h2>
        <form (ngSubmit)="saveCourse()">
          <label>Nombre del curso
            <input name="name" [(ngModel)]="name" placeholder="Nombre del curso" required maxlength="80" />
          </label>
          <label>
            Docente (opcional)
            <input name="teacher" [(ngModel)]="teacher" placeholder="Nombre del docente" maxlength="80" />
          </label>
          <label class="color-label">
            Color identificador
            <input class="color-picker" name="color" [(ngModel)]="color" type="color" />
          </label>
          <div class="actions">
            <button type="button" class="cancel-btn" (click)="showForm.set(false)">Cancelar</button>
            <button type="submit" class="submit-btn">Guardar curso</button>
          </div>
        </form>
      </section>
    }

    @if (state.courses().length) {
      <div class="courses-grid">
        @for (course of state.courses(); track course.id) {
          <article class="course-card">
            <div class="card-header">
              <span class="badge" [style.background]="course.color">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2 10 5-10 5L2 7Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>
                </svg>
              </span>
              <button class="delete-btn" (click)="deleteCourse(course)" title="Eliminar curso">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
            <h2>{{ course.name }}</h2>
            <p>{{ course.teacher ? course.teacher : 'Sin docente asignado' }}</p>
            <div class="card-links">
              <a routerLink="/flashcards" class="chip-link">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="16" height="14" rx="3"/><path d="M6 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/></svg>
                Flashcards
              </a>
              <a routerLink="/notebooks" class="chip-link">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                Cuaderno
              </a>
            </div>
          </article>
        }
      </div>
    } @else {
      <section class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10 12 5 2 10l10 5 10-5Z"/>
          </svg>
        </div>
        <h2>Aún no tienes cursos</h2>
        <p>Crea tu primer curso para empezar a organizar tareas, cuadernos y tu horario.</p>
        <button class="primary-btn" (click)="showForm.set(true)">Crear mi primer curso</button>
      </section>
    }
  `,
  styles: [
    `
    header { display: flex; justify-content: space-between; align-items: center; }
    h1, h2, p { margin: 0; }
    .eyebrow { font-size: 12px; color: var(--ink-dim); font-weight: 700; letter-spacing: .08em; }
    h1 { font-family: var(--font-display); font-size: 30px; margin-top: 6px; }
    .subtitle { display: block; color: var(--ink-dim); margin-top: 6px; font-size: 13.5px; }

    .primary-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: linear-gradient(135deg, var(--primary), var(--primary-light)) !important;
      color: #ffffff !important; border: 0 !important; border-radius: 6px !important;
      padding: 10px 18px !important; font-weight: 600 !important; cursor: pointer;
      box-shadow: 0 4px 18px rgba(55, 48, 163, .35) !important;
      transition: filter .2s, transform .2s;
    }
    .primary-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }

    .form-card {
      margin-top: 26px; padding: 24px;
      max-width: 560px;
    }
    .form-card h2 { font-size: 17px; color: var(--ink); margin-bottom: 16px; }

    form { display: grid; gap: 14px; }
    label { display: block; font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-dim); }
    input {
      width: 100%; display: block; margin-top: 6px;
      background: rgba(6, 11, 26, .78);
      border: 1px solid rgba(99, 102, 241, .22);
      border-radius: 6px; padding: 10px 12px;
      color: var(--ink); font: inherit; box-sizing: border-box;
    }
    input:focus { outline: none; border-color: var(--accent-light); }

    .color-picker { height: 42px; padding: 3px; cursor: pointer; }

    .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }
    .cancel-btn {
      background: transparent !important; color: var(--ink-dim) !important;
      border: 1px solid var(--glass-border) !important; border-radius: 6px !important;
      padding: 9px 16px !important; font-weight: 600 !important; cursor: pointer;
      box-shadow: none !important;
    }
    .cancel-btn:hover { background: rgba(99, 102, 241, .1) !important; color: var(--ink) !important; }

    .submit-btn {
      background: linear-gradient(135deg, var(--primary), var(--primary-light)) !important;
      color: #ffffff !important; border: 0 !important; border-radius: 6px !important;
      padding: 9px 18px !important; font-weight: 600 !important; cursor: pointer;
      box-shadow: 0 4px 16px rgba(55, 48, 163, .35) !important;
    }

    .courses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
      margin-top: 26px;
    }

    .course-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .badge {
      width: 38px; height: 38px;
      border-radius: 8px;
      display: grid; place-items: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, .3);
    }

    .delete-btn {
      width: 30px; height: 30px;
      border-radius: 6px;
      border: 0; background: transparent;
      color: var(--ink-dim);
      display: grid; place-items: center;
      cursor: pointer;
      transition: color .15s, background .15s;
    }
    .delete-btn:hover { color: #ff8fa8; background: rgba(255, 99, 132, .12); }

    .course-card h2 { font-size: 17px; color: var(--ink); font-weight: 600; }
    .course-card p { font-size: 13px; color: var(--ink-dim); }

    .card-links { display: flex; gap: 8px; margin-top: 6px; }
    .chip-link {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11.5px; font-weight: 600; text-decoration: none;
      color: var(--ink-dim); background: rgba(255, 255, 255, .05);
      border: 1px solid var(--glass-border); border-radius: 5px;
      padding: 5px 9px; transition: all .2s;
    }
    .chip-link:hover {
      background: rgba(99, 102, 241, .2); color: var(--accent-light);
      border-color: var(--accent-light);
    }

    .empty-state {
      text-align: center; max-width: 500px;
      margin: 40px auto; padding: 32px 24px;
    }
    .empty-icon { color: var(--accent-light); margin-bottom: 14px; opacity: .85; }
    .empty-state h2 { font-size: 19px; color: var(--ink); margin-bottom: 8px; }
    .empty-state p { color: var(--ink-dim); font-size: 13.5px; margin-bottom: 22px; line-height: 1.5; }
    `
  ]
})
export class CoursesComponent {
  readonly state = inject(AppStateService);
  readonly showForm = signal(false);
  name = '';
  teacher = '';
  color = '#4f46e5';

  async saveCourse(): Promise<void> {
    if (!this.name.trim()) return;
    await this.state.addCourse(this.name, this.teacher, this.color);
    this.name = '';
    this.teacher = '';
    this.color = '#4f46e5';
    this.showForm.set(false);
  }

  async deleteCourse(course: Course): Promise<void> {
    if (confirm(`¿Eliminar el curso "${course.name}"? Se borrarán sus tareas, horario y cuaderno asociados.`)) {
      await this.state.deleteCourse(course.id);
    }
  }
}