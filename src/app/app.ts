import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { AppShellComponent } from './shared/components/app-shell/app-shell';
import { AuthComponent } from './features/auth/auth';
import { NebulaBackgroundComponent } from './shared/components/nebula-background';

@Component({
  imports: [RouterOutlet, AppShellComponent, AuthComponent, NebulaBackgroundComponent],
  selector: 'app-root',
  template: `
    <app-nebula-background />
    @if (!auth.ready()) {
      <main class="loading">
        <div class="orbit"></div>
        <p>Cargando UniSpace…</p>
      </main>
    } @else if (auth.session()) {
      <app-shell><router-outlet /></app-shell>
    } @else {
      <app-auth />
    }
  `,
  styles: [`
    .loading {
      min-height: 100vh;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: 22px;
      color: var(--ink-dim);
      font-weight: 600;
      letter-spacing: .14em;
      text-transform: uppercase;
      font-size: 12px;
    }
    .orbit {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      border: 2px solid rgba(99, 102, 241, .2);
      border-top-color: var(--accent-light);
      animation: spin 1s linear infinite;
      box-shadow: 0 0 24px rgba(99, 102, 241, .4);
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class App { readonly auth = inject(AuthService); }
