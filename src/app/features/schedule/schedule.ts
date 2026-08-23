import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';
import { ScheduleEntry } from '../../core/models/schedule-entry.model';

interface PlacedBlock extends ScheduleEntry {
  dayIndex: number;
  startRow: number;
  rowSpan: number;
}

@Component({
  imports: [FormsModule, RouterLink],
  template: `
    <header>
      <div>
        <p class="eyebrow">PLANIFICACIÓN SEMANAL</p>
        <h1>Mi horario</h1>
        <span class="subtitle">Agrega todas tus clases, con hora y aula para organizar tu semana.</span>
      </div>
      <span class="count-badge">{{ state.schedule().length }} clases</span>
    </header>

    @if (!state.courses().length) {
      <section class="empty-card">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
        </div>
        <h2>Primero agrega tus cursos</h2>
        <p>El horario relaciona cada bloque de clase con una de tus asignaturas.</p>
        <a routerLink="/courses" class="primary-btn">Ir a Cursos</a>
      </section>
    }

    @if (state.courses().length) {
      <section class="form-card">
        <h2>Agregar clase al horario</h2>
        <form (ngSubmit)="addEntry()">
          <label>Curso
            <select name="course" [(ngModel)]="courseId" required>
              <option value="" disabled selected>Selecciona un curso</option>
              @for (course of state.courses(); track course.id) {
                <option [value]="course.id">{{ course.name }}</option>
              }
            </select>
          </label>
          <label>Día
            <select name="day" [(ngModel)]="day">
              @for (d of DAYS; track d) {
                <option [value]="d">{{ d }}</option>
              }
            </select>
          </label>
          <label>Hora Inicio
            <input name="start" [(ngModel)]="startTime" type="time" required />
          </label>
          <label>Hora Fin
            <input name="end" [(ngModel)]="endTime" type="time" required />
          </label>
          <label>Aula o enlace (opcional)
            <input name="location" [(ngModel)]="location" placeholder="Aula, laboratorio o link" maxlength="80" />
          </label>
          <button type="submit" class="submit-btn">Agregar al horario</button>
        </form>
      </section>

      <!-- ---------- Tabla horaria organizada y continua (Lunes a Viernes) ---------- -->
      <section class="timetable-wrap">
        <div class="tt-head">
          <div>
            <h2>Horario semanal</h2>
            <span class="tt-sub">De lunes a viernes · {{ state.schedule().length }} clases registradas</span>
          </div>
        </div>

        @if (!state.schedule().length) {
          <p class="empty-text">Todavía no agregaste clases. Usa el formulario de arriba para completar tu horario.</p>
        } @else {
          <div class="timetable" [style.grid-template-rows]="'42px ' + gridRows">
            <!-- Encabezados de día -->
            <span class="cell corner" style="grid-column: 1; grid-row: 1;"></span>
            @for (d of DAYS; track $index) {
              <span class="cell day-head" [style.grid-column]="$index + 2" style="grid-row: 1;">{{ d }}</span>
            }

            <!-- Celdas de cuadrícula y etiquetas de hora fijas -->
            @for (h of hoursRange; track h; let rIdx = $index) {
              <span class="cell hour-label" style="grid-column: 1;" [style.grid-row]="rIdx + 2">{{ fmtHour(h) }}</span>
              @for (d of DAYS; track d; let dIdx = $index) {
                <span class="cell slot" [style.grid-column]="dIdx + 2" [style.grid-row]="rIdx + 2"></span>
              }
            }

            <!-- Bloques de clase superpuestos exactamente en sus coordenadas -->
            @for (b of placedBlocks; track b.id) {
              <article class="block"
                       [style.background]="'linear-gradient(135deg,' + courseColor(b.courseId) + '33,' + courseColor(b.courseId) + '1f)'"
                       [style.border-left-color]="courseColor(b.courseId)"
                       [style.grid-column]="b.dayIndex + 2"
                       [style.grid-row]="b.startRow + ' / span ' + b.rowSpan">
                <div class="b-head">
                  <span class="b-time">{{ b.startTime }} – {{ b.endTime }}</span>
                  <button class="b-del" (click)="state.removeScheduleEntry(b.id)" title="Eliminar bloque">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
                <strong class="b-course">{{ courseName(b.courseId) }}</strong>
                @if (b.location) {
                  <small class="b-loc">{{ b.location }}</small>
                }
              </article>
            }
          </div>
        }
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
    .count-badge { font-size: 12px; color: var(--ink-dim); background: rgba(99, 102, 241, .15); padding: 4px 10px; border-radius: 12px; border: 1px solid rgba(99, 102, 241, .2); }

    .form-card { margin-top: 26px; padding: 22px; }
    .form-card h2 { font-size: 16px; color: var(--ink); margin-bottom: 14px; }

    form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 14px;
      align-items: end;
    }

    label {
      display: block; font-size: 11px; font-weight: 700;
      letter-spacing: .06em; text-transform: uppercase;
      color: var(--ink-dim);
    }

    input, select {
      display: block; width: 100%; margin-top: 6px;
      background: rgba(6, 11, 26, .78);
      border: 1px solid rgba(99, 102, 241, .22);
      color: var(--ink);
      border-radius: 6px;
      padding: 9px 11px;
      font: inherit;
      box-sizing: border-box;
      color-scheme: dark;
    }
    input:focus, select:focus { outline: none; border-color: var(--accent-light); }

    .submit-btn {
      background: linear-gradient(135deg, var(--primary), var(--primary-light)) !important;
      color: #ffffff !important; border: 0 !important; border-radius: 6px !important;
      padding: 10px 14px !important; font-weight: 600 !important; cursor: pointer;
      box-shadow: 0 4px 16px rgba(55, 48, 163, .35) !important;
      transition: filter .2s, transform .2s;
      height: 40px;
    }
    .submit-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }

    /* ---------- Tabla horaria ---------- */
    .timetable-wrap {
      margin-top: 28px;
      padding: 20px 22px 24px;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }
    .tt-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
    .tt-head h2 { font-size: 17px; color: var(--ink); }
    .tt-sub { font-size: 12.5px; color: var(--ink-dim); margin-top: 4px; display: block; }

    .timetable {
      display: grid;
      grid-template-columns: 68px repeat(5, minmax(0, 1fr));
      width: 100%;
      box-sizing: border-box;
      gap: 1px;
      background: rgba(99, 102, 241, .14);
      border: 1px solid rgba(99, 102, 241, .22);
      border-radius: 6px;
      overflow: hidden;
      position: relative;
    }

    .cell {
      background: rgba(10, 16, 34, 0.95);
      min-height: 46px;
      position: relative;
    }

    .corner { background: rgba(13, 20, 40, .98); }

    .day-head {
      display: grid; place-items: center;
      background: rgba(13, 20, 40, .98);
      color: var(--ink);
      font-weight: 700;
      font-size: 12.5px;
      letter-spacing: .03em;
      border-bottom: 1px solid rgba(99, 102, 241, .2);
    }

    .hour-label {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ink-dim);
      font-size: 11.5px;
      font-weight: 600;
      background: rgba(12, 18, 38, 0.98);
      border-right: 1px solid rgba(99, 102, 241, .15);
      letter-spacing: .02em;
    }

    .slot {
      background: rgba(8, 14, 30, 0.65);
      transition: background .15s;
    }
    .slot:hover {
      background: rgba(99, 102, 241, 0.08);
    }

    /* ---------- Bloques de clase ---------- */
    .block {
      z-index: 5;
      margin: 2px 3px;
      padding: 6px 9px;
      border-radius: 5px;
      border-left: 3.5px solid var(--primary);
      border-top: 1px solid rgba(255, 255, 255, .08);
      border-right: 1px solid rgba(255, 255, 255, .05);
      border-bottom: 1px solid rgba(0, 0, 0, .2);
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, .3);
      position: relative;
    }

    .b-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .b-time {
      font-size: 10.5px;
      font-weight: 700;
      color: var(--ink);
      opacity: .95;
      white-space: nowrap;
    }

    .b-course {
      font-size: 12px;
      color: #ffffff;
      font-weight: 700;
      line-height: 1.25;
      margin-top: 1px;
    }

    .b-loc {
      font-size: 10.5px;
      color: var(--ink-dim);
      opacity: .85;
      line-height: 1.2;
    }

    .b-del {
      width: 18px; height: 18px;
      display: grid;
      place-items: center;
      background: rgba(4, 7, 15, .75);
      border: 0; border-radius: 3px;
      color: #ff8fa8;
      cursor: pointer;
      padding: 0;
      opacity: 0;
      transition: opacity .15s, background .15s;
    }

    .block:hover .b-del { opacity: 1; }
    .b-del:hover { background: rgba(220, 60, 90, .9); color: #fff; }

    .empty-text { color: var(--ink-dim); font-size: 13.5px; margin: 12px 0 6px; }
    .empty-card { text-align: center; max-width: 540px; margin: 30px auto; padding: 32px 24px; }
    .empty-icon { color: var(--accent-light); opacity: .85; margin-bottom: 12px; }
    .empty-card h2 { font-size: 19px; color: var(--ink); margin-bottom: 8px; }
    .empty-card p { color: var(--ink-dim); margin-bottom: 20px; font-size: 13.5px; }

    .primary-btn {
      display: inline-block;
      background: linear-gradient(135deg, var(--primary), var(--primary-light)) !important;
      color: #ffffff !important; border-radius: 6px; padding: 10px 20px;
      font-weight: 600; text-decoration: none;
      box-shadow: 0 4px 16px rgba(55, 48, 163, .35);
    }
  `
]
})
export class ScheduleComponent {
  readonly state = inject(AppStateService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  courseId = '';
  day = 'Lunes';
  startTime = '';
  endTime = '';
  location = '';

  /** Rango horario visible continuo: estándar de 7:00 a 22:00 o ampliado según clases */
  get rangeStart(): number {
    if (!this.state.schedule().length) return 7;
    const earliest = Math.min(...this.state.schedule().map(e => Math.floor(this.toMinutes(e.startTime) / 60)));
    return Math.min(7, earliest);
  }

  get rangeEnd(): number {
    if (!this.state.schedule().length) return 22;
    const latest = Math.max(...this.state.schedule().map(e => Math.ceil(this.toMinutes(e.endTime) / 60)));
    return Math.max(22, latest);
  }

  get hoursRange(): number[] {
    const out: number[] = [];
    for (let h = this.rangeStart; h <= this.rangeEnd; h++) {
      out.push(h);
    }
    return out;
  }

  /** Filas CSS: una por hora del rango */
  get gridRows(): string {
    return `repeat(${this.hoursRange.length}, minmax(46px, auto))`;
  }

  private toMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  get placedBlocks(): PlacedBlock[] {
    const startH = this.rangeStart;
    return this.state.schedule()
      .filter(entry => this.DAYS.includes(entry.day))
      .map(entry => {
        const dayIndex = this.DAYS.indexOf(entry.day);
        const sMin = this.toMinutes(entry.startTime);
        const eMin = this.toMinutes(entry.endTime);
        const startRow = Math.floor(sMin / 60) - startH + 2;
        const durationHours = (eMin - sMin) / 60;
        const rowSpan = Math.max(1, Math.round(durationHours) || 1);
        return { ...entry, dayIndex: dayIndex >= 0 ? dayIndex : 0, startRow, rowSpan };
      });
  }

  fmtHour(h: number): string {
    const hh = String(h).padStart(2, '0');
    return `${hh}:00`;
  }

  courseName(courseId: string | null): string {
    return this.state.courses().find(c => c.id === courseId)?.name ?? 'Curso';
  }

  courseColor(courseId: string | null): string {
    return this.state.courses().find(c => c.id === courseId)?.color ?? '#4f46e5';
  }

  addEntry(): void {
    if (!this.courseId) { alert('Primero selecciona un curso en la lista.'); return; }
    if (!this.startTime || !this.endTime) { alert('Completa la hora de inicio y la hora de fin.'); return; }
    if (this.endTime <= this.startTime) {
      alert('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    this.state.addScheduleEntry(this.courseId, this.day, this.startTime, this.endTime, this.location)
      .then(() => {
        this.startTime = ''; this.endTime = ''; this.location = '';
        this.cdr.detectChanges();
      })
      .catch(e => {
        console.error('Error agregando bloque:', e);
        const msg = e?.message ?? String(e);
        if (/row-level security/i.test(msg)) {
          alert('Tu sesión expiró. Vuelve a iniciar sesión e intenta otra vez.');
        } else {
          alert(`No se pudo agregar al horario: ${msg}`);
        }
      });
  }
}