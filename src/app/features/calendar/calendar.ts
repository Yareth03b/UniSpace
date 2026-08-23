import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  imports: [FormsModule],
  template: `
    <header>
      <div>
        <p>PLANIFICACIÓN</p>
        <h1>Calendario</h1>
        <span class="sub">Sincronizado en vivo con tu Google Calendar.</span>
      </div>
      @if (calId()) {
        <button class="ghost" (click)="reset()" title="Desconectar calendario">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          Quitar
        </button>
      }
    </header>

    @if (!calId()) {
      <!-- Configuración inicial -->
      <section class="setup">
        <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
        <h2>Conecta tu Google Calendar</h2>
        <p>Tus eventos aparecen aquí automáticamente y se actualizan solos.</p>

        <ol class="steps">
          <li>Abre <b>Google Calendar → Configuración</b>.</li>
          <li>Entra a <b>Configuración de mis calendarios</b> y elige el tuyo.</li>
          <li>Copia el <b>ID de calendario</b> de la sección "Integrar calendario".</li>
        </ol>

        <input [(ngModel)]="inputValue"
               placeholder="ej: c_abcd1234@group.calendar.google.com" />

        <button class="connect" (click)="save()">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Mostrar mi calendario
        </button>
        <a href="https://calendar.google.com/calendar/u/0/r/settings" target="_blank" rel="noopener">Abrir ajustes de Google Calendar ↗</a>
      </section>
    } @else {
      <!-- Visor en vivo -->
      <section class="viewer">
        <div class="bar">
          <span class="live"><i></i> En vivo · se actualiza solo</span>
          <a href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noopener">Abrir en Google ↗</a>
        </div>
        @if (embedUrl; as url) {
          <iframe [src]="url"
                  class="frame"
                  loading="lazy"
                  scrolling="no"
                  title="Google Calendar"></iframe>
        }
      </section>
    }
  `,
  styles: `
    header { display: flex; justify-content: space-between; align-items: center; }
    h1, h2, p { margin: 0; }
    header p { font-size: 12px; color: var(--ink-dim); font-weight: 700; letter-spacing: .08em; }
    h1 { font-family: var(--font-display); font-size: 30px; margin-top: 8px; }
    .sub { display: block; color: var(--ink-dim); margin-top: 8px; }

    .ghost {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(255, 99, 132, .08);
      border: 1px solid rgba(255, 143, 168, .3);
      color: #ff8fa8;
      border-radius: 5px;
      padding: 9px 14px;
      cursor: pointer;
      transition: background .15s;
    }
    .ghost:hover { background: rgba(255, 99, 132, .16); }

    /* ---------- Setup ---------- */
    .setup {
      margin-top: 30px;
      max-width: 560px;
      text-align: center;
      padding: 34px 30px;
    }
    .setup svg { opacity: .9; }
    .setup h2 { font-size: 18px; margin-top: 14px; color: var(--ink); }
    .setup p { color: var(--ink-dim); font-size: 13.5px; margin-top: 8px; line-height: 1.55; }

    .steps {
      text-align: left;
      margin: 18px auto 20px;
      padding-left: 18px;
      color: var(--ink-dim);
      font-size: 12.5px;
      line-height: 1.7;
      max-width: 420px;
    }
    .steps b { color: var(--ink); }

    .setup input {
      width: 100%;
      padding: 12px 14px;
    }
    .setup input:focus { outline: none; border-color: var(--accent-light) !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, .2); }

    .connect {
      display: inline-flex; align-items: center; gap: 7px;
      width: auto !important;
      margin-top: 16px;
      padding: 11px 20px !important;
      background: linear-gradient(135deg, var(--primary), var(--primary-light)) !important;
      color: #ffffff !important;
      border: 0 !important;
      border-radius: 6px !important;
      font-weight: 600 !important;
      box-shadow: 0 4px 16px rgba(55, 48, 163, .35) !important;
    }
    .connect:hover { filter: brightness(1.12); }

    .setup a {
      display: block;
      margin-top: 16px;
      color: var(--accent-light);
      font-size: 12.5px;
    }

    /* ---------- Visor ---------- */
    .viewer {
      margin-top: 26px;
      padding: 10px;
    }
    .bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px 12px;
    }
    .live {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 12px; font-weight: 700; color: var(--ink-dim);
      letter-spacing: .04em;
    }
    .live i {
      width: 8px; height: 8px; border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 50% { opacity: .35; } }

    .viewer a { color: var(--accent-light); font-size: 12.5px; text-decoration: none; }
    .viewer a:hover { text-decoration: underline; text-underline-offset: 3px; }

    .frame {
      width: 100%;
      height: min(72vh, 720px);
      border: 1px solid var(--glass-border);
      border-radius: 5px;
      background: #fff;
    }
  `
})
export class CalendarComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private static readonly STORAGE_KEY = 'unispace_calendar_id';

  /** ID del calendario guardado (persistente entre sesiones) */
  readonly calId = signal<string | null>(localStorage.getItem(CalendarComponent.STORAGE_KEY));
  inputValue = '';

  get embedUrl(): SafeResourceUrl | null {
    const id = this.calId();
    if (!id) return null;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const url =
      'https://calendar.google.com/calendar/embed' +
      `?src=${encodeURIComponent(id)}` +
      `&ctz=${encodeURIComponent(tz)}` +
      '&showTitle=0&showPrint=0&showCalendars=0&showTz=0&mode=MONTH';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /**
   * Acepta el ID directo, la URL completa de inserción o incluso el
   * fragmento <iframe … src="…"> copiado desde Google.
   */
  save(): void {
    const id = this.extractId(this.inputValue);
    if (!id) {
      alert('Pega un ID de calendario válido o el código de inserción completo.');
      return;
    }
    localStorage.setItem(CalendarComponent.STORAGE_KEY, id);
    this.calId.set(id);
    this.inputValue = '';
  }

  reset(): void {
    if (!confirm('¿Quitar tu calendario? Podrás conectarlo otra vez cuando quieras.')) return;
    localStorage.removeItem(CalendarComponent.STORAGE_KEY);
    this.calId.set(null);
  }

  private extractId(raw: string): string {
    let v = raw.trim();
    if (!v) return '';
    // Si pegó un <iframe>, extraer el atributo src
    const srcAttr = v.match(/src\s*=\s*["']([^"']+)["']/i);
    if (srcAttr) v = srcAttr[1];
    // Si pegó una URL embed, extraer el parámetro src
    const srcParam = v.match(/[?&]src=([^&]+)/);
    if (srcParam) v = decodeURIComponent(srcParam[1]);
    v = v.trim();
    // Validación laxa: un ID de calendario suele llevar @ o ser largo
    return /^[^\s]+@[^\s]+\.[^\s]+$/.test(v) || v.length > 16 ? v : '';
  }
}
