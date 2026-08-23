import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/**
 * Efecto "Halo Activo" (Cosmos Profondo 2.0):
 * al hacer clic, un gradiente circular cian→turquesa se expande desde
 * el punto exacto del clic y se disuelve como una onda en el agua.
 *
 * Uso: <button appHalo>…</button>
 */
@Directive({
  selector: '[appHalo]',
  host: { class: 'halo-host' }
})
export class HaloDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostListener('pointerdown', ['$event'])
  onPointerDown(e: PointerEvent) {
    const el = this.host.nativeElement;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.3;

    const ripple = document.createElement('span');
    ripple.className = 'halo-ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;

    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }
}
