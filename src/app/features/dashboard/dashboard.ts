import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';

@Component({
  imports: [RouterLink],
  template: `
    <main class="dash">
      <!-- ---------- Hero con galaxia interactiva ---------- -->
      <header class="hero">
        <div class="hero-text">
          <p class="eyebrow">TU ESPACIO ACADÉMICO</p>
          <h1>Hola, {{ state.profile().name }}</h1>
          <p class="subtitle">Organiza tu semestre y avanza con calma.</p>
        </div>

        <!-- Galaxia: gira 360° siguiendo al cursor -->
        <div class="galaxy-stage" #galaxyStage aria-hidden="true">
          <div class="galaxy">
            <span class="g-arm"></span>
            <span class="g-ring r1"></span>
            <span class="g-ring r2"></span>
            <span class="g-ring r3"></span>

            <span class="orbit o1">
              <i></i><i style="--sa:120deg"></i><i style="--sa:240deg"></i>
            </span>
            <span class="orbit o2">
              <i></i><i style="--sa:72deg"></i><i style="--sa:144deg"></i><i style="--sa:216deg"></i><i style="--sa:288deg"></i>
            </span>
            <span class="orbit o3">
              <i></i><i style="--sa:90deg"></i><i style="--sa:180deg"></i><i style="--sa:270deg"></i>
            </span>

            <span class="core"></span>
          </div>
        </div>

      </header>

      <!-- ---------- Tareas + Cursos lado a lado ---------- -->
      <div class="duo">
        <section class="panel">
          <div class="p-head">
            <h2>Tareas pendientes</h2>
            <a routerLink="/tasks">Ver todas</a>
          </div>

          @if (state.pendingTasks().length) {
            <ul class="task-list">
              @for (t of state.pendingTasks(); track t.id) {
                <li>
                  <span class="dot"></span>
                  <div class="t-main">
                    <strong>{{ t.title }}</strong>
                    <small>{{ t.courseName }}</small>
                  </div>
                  <time>{{ t.dueLabel }}</time>
                </li>
              }
            </ul>
          } @else {
            <p class="empty">Cuando crees tareas, aparecerán aquí para que no se te escape ninguna.</p>
          }
        </section>

        <section class="panel">
          <div class="p-head">
            <h2>Mis cursos</h2>
            <a routerLink="/courses">Ver cursos</a>
          </div>

          @if (state.courses().length) {
            <div class="course-grid">
              @for (course of state.courses(); track course.id) {
                <a class="course-chip" routerLink="/courses">
                  <span class="swatch" [style.background]="coverStyle(course)">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 10 5-10 5L2 7Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
                  </span>
                  <div class="c-info">
                    <strong>{{ course.name }}</strong>
                    <small>{{ course.teacher }}</small>
                  </div>
                  <svg class="go" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </a>
              }
            </div>
          } @else {
            <p class="empty">Aún no tienes cursos. Crea el primero y construye tu semestre.</p>
          }
        </section>
      </div>
    </main>
  `,
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  readonly state = inject(AppStateService);
  private readonly zone = inject(NgZone);
  @ViewChild('galaxyStage') galaxyStage?: ElementRef<HTMLDivElement>;

  coverStyle(course: { color: string; cover?: string | null }): string {
    return course.cover
      ? `#0d1428 center/cover no-repeat url('${course.cover}')`
      : course.color;
  }

  /* La galaxia rota 360° hacia el cursor + deriva sutil */
  private readonly onMove = (e: PointerEvent) => {
    const el = this.galaxyStage?.nativeElement;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width || 1)));
    const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height || 1)));

    el.style.setProperty('--ga', `${angle.toFixed(1)}deg`);
    el.style.setProperty('--gx', `${(nx * 18).toFixed(1)}px`);
    el.style.setProperty('--gy', `${(ny * 18).toFixed(1)}px`);
  };

  ngAfterViewInit(): void {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.zone.runOutsideAngular(() => {
        window.addEventListener('pointermove', this.onMove, { passive: true });
      });
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('pointermove', this.onMove);
  }
}
