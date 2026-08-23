import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStateService } from '../../core/services/app-state.service';

@Component({
  imports: [FormsModule],
  template: `
    <header>
      <div>
        <p class="eyebrow">PERSONALIZACIÓN</p>
        <h1>Ajustes</h1>
        <span class="subtitle">Gestiona tu perfil y preferencias de cuenta.</span>
      </div>
    </header>

    <section class="settings-card">
      <h2>Perfil de estudiante</h2>
      <p class="info">Los cambios se reflejan de inmediato en el menú lateral y en tu pantalla de inicio.</p>

      <form (ngSubmit)="saveProfile()">
        <label>
          Nombre completo
          <input name="name" [(ngModel)]="name" placeholder="Nombre completo" required maxlength="80" />
        </label>
        <label>
          Correo electrónico
          <input name="email" [(ngModel)]="email" type="email" placeholder="Correo electrónico" maxlength="120" />
        </label>
        <button type="submit" class="save-btn">Guardar cambios</button>
      </form>

      @if (saved) {
        <span class="saved">✓ Perfil actualizado correctamente</span>
      }
    </section>
  `,
  styles: `
    header { margin-bottom: 24px; }
    h1, h2, p { margin: 0; }
    .eyebrow { font-size: 12px; color: var(--ink-dim); font-weight: 700; letter-spacing: .08em; }
    h1 { font-family: var(--font-display); font-size: 30px; margin-top: 6px; }
    .subtitle { display: block; color: var(--ink-dim); margin-top: 6px; font-size: 13.5px; }

    .settings-card {
      max-width: 580px;
      padding: 26px 28px;
    }
    .settings-card h2 { font-size: 17px; color: var(--ink); }
    .info { font-size: 13px; color: var(--ink-dim); margin-top: 6px; line-height: 1.5; }

    form { margin-top: 20px; display: grid; gap: 16px; }
    label { display: block; font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-dim); }
    input {
      width: 100%; display: block; margin-top: 6px;
      background: rgba(6, 11, 26, .78);
      border: 1px solid rgba(99, 102, 241, .22);
      border-radius: 6px; padding: 10px 12px;
      color: var(--ink); font: inherit; box-sizing: border-box;
    }
    input:focus { outline: none; border-color: var(--accent-light); }

    .save-btn {
      margin-top: 8px; width: fit-content;
      background: linear-gradient(135deg, var(--primary), var(--primary-light)) !important;
      color: #ffffff !important; border: 0 !important; border-radius: 6px !important;
      padding: 10px 20px !important; font-weight: 600 !important; cursor: pointer;
      box-shadow: 0 4px 16px rgba(55, 48, 163, .35) !important;
      transition: filter .2s, transform .2s;
    }
    .save-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }

    .saved {
      display: inline-block; color: #34d399; font-size: 13px;
      margin-top: 14px; font-weight: 600;
    }
  `
})
export class SettingsComponent {
  readonly state = inject(AppStateService);
  name = this.state.profile().name;
  email = this.state.profile().email;
  saved = false;

  async saveProfile(): Promise<void> {
    await this.state.updateProfile(this.name, this.email);
    this.saved = true;
    setTimeout(() => { this.saved = false; }, 4000);
  }
}
