import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { HaloDirective } from '../../shared/directives/halo.directive';

@Component({
  selector: 'app-auth',
  imports: [FormsModule, HaloDirective],
  template: `
    <main class="hero">
      <section class="card glass">
        <div class="logo">
          <svg viewBox="0 0 64 64" width="46" height="46" aria-hidden="true">
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="64" x2="64" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#22d3ee"/>
                <stop offset=".5" stop-color="#4f7dff"/>
                <stop offset="1" stop-color="#b45cf7"/>
              </linearGradient>
            </defs>
            <g fill="none" stroke="url(#logoGrad)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M32 6 57 16 32 26 7 16Z"/>
              <path d="M17 23v5c0 3.6 6.7 6 15 6s15-2.4 15-6v-5"/>
              <path d="M9 51c6-7 16-8 23-3 7-5 17-4 23 3l-3.5 4c-5-6-13-6.6-19.5-2.6C25.5 48.4 17.5 49 12.5 55Z"/>
              <path d="M46 47c6-4 9-10 9-18"/>
              <path d="m49 34 6-6 6 7"/>
            </g>
          </svg>
        </div>
        <p class="eyebrow">UNISPACE · COSMOS PROFONDO</p>
        <h1>{{ registering() ? 'Crea tu cuenta' : 'Bienvenido' }}</h1>
        <span class="sub">{{ registering()
          ? 'Tus cursos, horario y avances se guardarán en tu cuenta.'
          : 'Inicia sesión para ver tu espacio académico.' }}</span>

        <form (ngSubmit)="submit()">
          @if(registering()){
            <label>Nombre
              <input name="name" [(ngModel)]="name" required autocomplete="name" />
            </label>
          }
          <label>Correo
            <input name="email" [(ngModel)]="email" type="email" required autocomplete="email" />
          </label>
          <label>Contraseña
            <input name="password" [(ngModel)]="password" type="password" minlength="6" required autocomplete="current-password" />
          </label>

          @if(message()){
            <div class="message">{{ message() }}</div>
          }

          @if(needsConfirmation()){
            <button type="button" class="secondary" (click)="resend()">Reenviar confirmación</button>
          }

          <button type="submit" class="primary" appHalo>
            {{ registering() ? 'Crear cuenta' : 'Iniciar sesión' }}
          </button>
        </form>

        <a (click)="registering.set(!registering())">
          {{ registering() ? 'Ya tengo una cuenta' : 'Quiero crear una cuenta' }}
        </a>
      </section>
    </main>
  `,
  styles: `
    .hero {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px 20px 60px;
    }

    .card {
      width: min(100%, 430px);
      padding: 36px 34px 30px;
      border-radius: 5px;
      box-shadow: 0 30px 80px rgba(2, 6, 18, .6), inset 0 1px 0 rgba(255,255,255,.06);
      text-align: left;
    }

    .logo {
      display: grid;
      place-items: center;
      width: 58px;
      height: 58px;
      border-radius: 5px;
      background: linear-gradient(135deg, var(--primary), var(--primary-light));
      box-shadow: 0 6px 26px rgba(79, 70, 229, .35);
      filter: drop-shadow(0 0 10px rgba(79, 70, 229, .3));
    }

    .eyebrow {
      font-size: 10px;
      letter-spacing: .32em;
      color: var(--ink-dim);
      font-weight: 700;
      margin: 20px 0 6px;
    }

h1 {
      margin: 0;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 27px;
      line-height: 1.18;
      background: linear-gradient(92deg, #eef8ff, #9fd4ff 55%, #c3b4ff);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      text-shadow: none;
    }

    .sub {
      display: block;
      color: var(--ink-dim);
      font-size: 13.5px;
      line-height: 1.6;
      margin-top: 9px;
    }

    label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--ink-dim);
      margin-top: 18px;
    }

    input {
      width: 100%;
      display: block;
      margin-top: 7px;
      border: 1px solid rgba(140, 180, 255, .22);
      background: rgba(6, 11, 26, .72);
      color: var(--ink);
      caret-color: var(--accent-light);
      border-radius: 6px;
      padding: 12px 13px;
      box-sizing: border-box;
      font: inherit;
      transition: border-color .2s, box-shadow .2s;
    }

    input:focus {
      outline: none;
      border-color: var(--accent-light);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, .2);
    }

    button {
      width: 100%;
      cursor: pointer;
      border: 0;
      border-radius: 6px;
      padding: 13px;
      font-weight: 600;
      font-size: 15px;
    }

    .primary {
      margin-top: 24px;
      color: #ffffff;
      background: linear-gradient(135deg, var(--primary), var(--primary-light));
      box-shadow: 0 6px 22px rgba(55, 48, 163, .35);
      transition: filter .2s, transform .2s;
    }

    .primary:hover { filter: brightness(1.12); transform: translateY(-1px); }

    .secondary {
      margin-top: 16px;
      background: transparent;
      color: var(--accent-light);
      border: 1px solid rgba(59, 130, 246, .35) !important;
      font-size: 13px;
    }

    .secondary:hover { background: rgba(59, 130, 246, .1); }

    .message {
      margin-top: 16px;
      color: #ffb9c4;
      font-size: 13px;
      line-height: 1.5;
      background: rgba(255, 99, 132, .09);
      border: 1px solid rgba(255, 122, 144, .25);
      padding: 10px 12px;
      border-radius: 6px;
    }

    a {
      display: block;
      margin-top: 19px;
      text-align: center;
      color: var(--accent-light);
      cursor: pointer;
      font-size: 13.5px;
      font-weight: 600;
      letter-spacing: .02em;
    }

    a:hover { text-decoration: underline; text-underline-offset: 4px; }
  `
})
export class AuthComponent implements AfterViewInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly registering = signal(false);
  readonly message = signal('');
  readonly needsConfirmation = signal(false);

  name = '';
  email = '';
  password = '';

  /* Parallax sutil de la tarjeta con el ratón (tilt) */
  private onMove = (ev: PointerEvent) => {
    const el = this.host.nativeElement.querySelector<HTMLElement>('.card');
    if (!el) return;
    const rx = ((ev.clientY / window.innerHeight) - 0.5) * -3.2;
    const ry = ((ev.clientX / window.innerWidth) - 0.5) * 4.2;
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  };

  ngAfterViewInit(): void {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.addEventListener('pointermove', this.onMove, { passive: true });
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('pointermove', this.onMove);
  }

  async submit(): Promise<void> {
    this.message.set('');
    this.needsConfirmation.set(false);
    const error = this.registering()
      ? await this.auth.signUp(this.name, this.email, this.password)
      : await this.auth.signIn(this.email, this.password);
    this.needsConfirmation.set(error === 'Email not confirmed');
    this.message.set(error ?? (this.registering() ? 'Revisa tu correo para confirmar la cuenta.' : ''));
  }

  async resend(): Promise<void> {
    const error = await this.auth.resendConfirmation(this.email);
    this.message.set(error ?? 'Correo enviado. Abre el enlace más reciente y vuelve a esta página.');
  }
}
