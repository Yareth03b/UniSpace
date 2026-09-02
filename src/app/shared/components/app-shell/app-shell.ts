import { Component, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppStateService } from '../../../core/services/app-state.service';
import { AuthService } from '../../../core/services/auth.service';
import { HaloDirective } from '../../directives/halo.directive';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, HaloDirective],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss'
})
export class AppShellComponent {
  readonly state = inject(AppStateService);
  readonly auth = inject(AuthService);

  menuOpen = false;

  toggleAccount(e: MouseEvent) {
    e.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.menuOpen = false;
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    this.menuOpen = false;
  }
}
