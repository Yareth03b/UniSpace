import { AfterViewInit, Component, ChangeDetectorRef, ElementRef, HostListener, OnInit, QueryList, ViewChild, ViewChildren, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../core/services/app-state.service';
import { NotebookService, Notebook, NotebookPage } from '../../core/services/notebook.service';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { getStroke } from 'perfect-freehand';

// Configurar el worker de PDF.js localmente en el servidor para evitar bloqueos de red y CORS
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Dimensiones lógicas de la hoja A4 (los trazos se guardan en este espacio de coordenadas)
const SHEET_W = 794;
const SHEET_H = 1123;

interface Stroke {
  points: { x: number; y: number; pressure?: number }[];
  color: string;
  width: number;
  isEraser?: boolean;
  pixelEraser?: boolean;
  pencilType?: 'ballpoint' | 'calligraphy' | 'highlighter';
  pen?: boolean;
}

// Convierte el contorno poligonal de perfect-freehand en un Path2D con curvas suaves
function outlineToPath(outline: number[][]): Path2D {
  const path = new Path2D();
  if (outline.length === 0) return path;
  path.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[i + 1] ?? outline[i];
    path.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
  path.closePath();
  return path;
}

interface NotebookImage {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PageData {
  strokes: Stroke[];
  images: NotebookImage[];
}

/** PDF abierto en la sesión actual (solo memoria) */
interface SessionPdf {
  key: string;
  name: string;
  doc: any;
  totalPages: number;
}

@Component({
  imports: [FormsModule, RouterLink, CommonModule],
  template: `
    <!-- HUB PRINCIPAL: SELECCIÓN DE CUADERNOS -->
    <ng-container *ngIf="!activeNotebook">
      <header>
        <div>
          <p>APUNTES DIGITALES</p>
          <h1>Cuadernos</h1>
          <span>Guarda textos, trazos e imágenes por página.</span>
        </div>
      </header>

      <ng-container *ngIf="state.courses().length">
        <section class="notebooks-grid">
          @for(course of state.courses(); track course.id) {
            <article class="notebook-card">
              <div class="cover" [style.background]="coverStyle(course)">
                <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
              </div>

              @if (editingMetaId === course.id) {
                <!-- Editor del curso: docente, color e imagen de fondo -->
                <div class="meta-editor">
                  <label class="m-label">Curso</label>
                  <p class="m-course">{{ course.name }}</p>

                  <label class="m-label">Docente</label>
                  <input class="m-input" [(ngModel)]="metaTeacher" placeholder="Nombre del docente" />

                  <div class="meta-row">
                    <div>
                      <label class="m-label">Color</label>
                      <input type="color" class="color-input" [(ngModel)]="metaColor" />
                    </div>
                    <div class="grow">
                      <label class="m-label">Fondo</label>
                      <label class="pick-btn">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        {{ metaCover ? 'Cambiar' : 'Subir imagen' }}
                        <input type="file" accept="image/*" hidden (change)="onCoverPicked($event)" />
                      </label>
                    </div>
                  </div>

                  @if (metaCover) {
                    <div class="cover-preview" [style.background-image]="'url(' + metaCover + ')'">
                      <button type="button" class="rm" (click)="metaCover = null" title="Quitar imagen">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </div>
                    <p class="m-hint">Se comprime automáticamente al guardar.</p>
                  }
                </div>
              } @else {
              @if (editingCourseId === course.id) {
                <input class="rename-input" [(ngModel)]="editTitle"
                       (keyup.enter)="saveRename(course)" (keyup.escape)="cancelRename()"
                       maxlength="60" autofocus />
              } @else {
                <h2>{{ course.name }}</h2>
                <p>{{ course.teacher }}</p>
                @if (notebookFor(course); as nb) {
                  <small class="nb-title">{{ nb.title }}</small>
                } @else {
                  <small class="nb-title none">Sin cuaderno todavía</small>
                }
              }

              @if (editingCourseId !== course.id && editingMetaId !== course.id) {
                @if (notebookFor(course); as nb) {
                  <button class="open-btn" (click)="loadNotebook(course.id)">
                    Abrir cuaderno →
                  </button>
                } @else {
                  <button class="open-btn create" (click)="createNotebookFor(course)">
                    ＋ Crear cuaderno
                  </button>
                }
              }
              }

              <div class="card-actions">
                @if (editingCourseId === course.id) {
                  <button class="mini-action save" (click)="saveRename(course)" title="Guardar nombre">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </button>
                  <button class="mini-action" (click)="cancelRename()" title="Cancelar">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                } @else if (editingMetaId === course.id) {
                  <button class="mini-action save" (click)="saveEditMeta(course)" title="Guardar cambios del curso">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </button>
                  <button class="mini-action" (click)="cancelEditMeta()" title="Cancelar">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                } @else {
                  <button class="mini-action" (click)="startRename(course)" title="Renombrar cuaderno">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </button>
                  <button class="mini-action" (click)="startEditMeta(course)" title="Editar curso: docente, color y fondo">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                  </button>
                  <button class="mini-action del" (click)="deleteNotebookFor(course)" title="Eliminar curso completo (cuaderno, páginas y horario)">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                }
              </div>
            </article>
          }
        </section>
      </ng-container>

      <ng-container *ngIf="!state.courses().length">
        <section class="empty-state">
          <b>
            <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#6255e8" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          </b>
          <h2>Primero crea un curso</h2>
          <p>Los cuadernos siempre estarán asociados a uno de tus cursos.</p>
          <a routerLink="/courses" class="btn-primary">Ir a Cursos</a>
        </section>
      </ng-container>
    </ng-container>

    <!-- ESPACIO DE TRABAJO: PANEL DESPLEGABLE + HOJA A4 ADAPTATIVA -->
    <ng-container *ngIf="activeNotebook">
      <div class="workspace">
        <!-- BARRA SUPERIOR: Volver atrás + herramientas de iconos con submenús -->
        <header class="workspace-header">
          <div class="header-left">
            <button class="back-btn" (click)="closeNotebook()">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
              Volver atrás
            </button>
            <span class="notebook-title">
              <strong>{{ activeNotebook.title }}</strong> · {{ getCourseName(activeNotebook.course_id) }}
            </span>
          </div>

          <div class="top-tools">
            <!-- Escribir -->
            <div class="menu-item" [ngClass]="{ active: selectedTool === 'pencil', open: openMenu === 'pencil' }" (mouseenter)="onMenuEnter('pencil')" (mouseleave)="onMenuLeave()">
              <button class="tool-btn" (click)="toggleMenu($event, 'pencil')" title="Escribir">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              </button>
              <div class="flyout" (click)="$event.stopPropagation()">
                <div class="fly-row">
                  <button class="pencil-opt" [ngClass]="{ active: selectedPencilType === 'ballpoint' }" (click)="selectedPencilType = 'ballpoint'" title="Bolígrafo estándar">
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                  <button class="pencil-opt" [ngClass]="{ active: selectedPencilType === 'calligraphy' }" (click)="selectedPencilType = 'calligraphy'" title="Pluma caligráfica (presión)">
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                  </button>
                  <button class="pencil-opt" [ngClass]="{ active: selectedPencilType === 'highlighter' }" (click)="selectedPencilType = 'highlighter'" title="Resaltador translúcido">
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>
                  </button>
                </div>
                <div class="fly-row colors-row">
                  <button *ngFor="let c of colors" class="color-dot" [style.background]="c" [ngClass]="{ selected: selectedColor === c }" (click)="selectedColor = c"></button>
                  <input type="color" [(ngModel)]="selectedColor" class="custom-color-picker" title="Color personalizado" />
                </div>
                <div class="fly-row slider-row">
                  <span>Grosor</span>
                  <input type="range" min="1" max="25" [(ngModel)]="brushWidth" />
                  <b>{{ brushWidth }}px</b>
                </div>
              </div>
            </div>

            <!-- Borrar -->
            <div class="menu-item" [ngClass]="{ active: selectedTool === 'eraser', open: openMenu === 'eraser' }" (mouseenter)="onMenuEnter('eraser')" (mouseleave)="onMenuLeave()">
              <button class="tool-btn" (click)="toggleMenu($event, 'eraser')" title="Borrar">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
              </button>
              <div class="flyout" (click)="$event.stopPropagation()">
                <div class="fly-row seg-row">
                  <button class="seg-btn" [ngClass]="{ active: eraserMode === 'stroke' }" (click)="eraserMode = 'stroke'" title="Elimina trazos completos">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/></svg>
                    Por trazo
                  </button>
                  <button class="seg-btn" [ngClass]="{ active: eraserMode === 'pixels' }" (click)="eraserMode = 'pixels'" title="Borra zonas exactas del dibujo">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    Por píxeles
                  </button>
                </div>
                <div class="fly-row slider-row">
                  <span>Tamaño</span>
                  <input type="range" min="5" max="80" [(ngModel)]="eraserWidth" />
                  <b>{{ eraserWidth }}px</b>
                </div>
                <p class="fly-tip">{{ eraserMode === 'stroke' ? 'Arrastra sobre la tinta para eliminar los trazos completos que toques.' : 'Arrastra para recortar zonas exactas del dibujo. La cuadrícula y las imágenes no se dañan.' }}</p>
              </div>
            </div>

            <!-- Mover recortes -->
            <div class="menu-item" [ngClass]="{ active: selectedTool === 'move' }">
              <button class="tool-btn" (click)="setTool('move')" title="Mover imágenes y recortes">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/></svg>
              </button>
            </div>
          </div>

          <div class="header-right">
            <span class="save-status" [ngClass]="{ saving: isSaving }">
              @if (isSaving) {
                <svg class="rot" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              } @else {
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              }
              {{ isSaving ? 'Guardando…' : 'Guardado' }}
            </span>
            <div class="page-controls">
              <span>Pág. {{ currentPageIndex + 1 }} de {{ pages.length }}</span>
              <button (click)="addPage()" title="Añadir página al final">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>
              </button>
              <button (click)="deleteCurrentPage()" [disabled]="pages.length <= 1" title="Eliminar la página que estás viendo">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
            <button class="icon-action" (click)="exportToPDF()" title="Exportar cuaderno a PDF">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            </button>
          </div>
        </header>

        <!-- CUERPO: PANEL IZQUIERDO REDIMENSIONABLE + LIENZO -->
        <div class="workspace-body">
          <aside class="side-panel" [class.open]="sideOpen" [class.resizing]="resizing" [style.width.px]="sideOpen ? sideWidth : 52">
            <div class="side-rail">
              <button class="rail-btn" (click)="toggleSide()" [title]="sideOpen ? 'Ocultar panel PDF' : 'Mostrar panel PDF'">
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
              </button>
              <span class="rail-label" *ngIf="!sideOpen">PDFS</span>
            </div>

            <div class="side-content" *ngIf="sideOpen"
                 (dragover)="onDragOver($event)"
                 (drop)="onDropPDF($event)">
              <div class="side-head">
                <h2>PDFs de la sesión</h2>
                <small>Rápidos y temporales · arrastra el borde derecho para agrandar →</small>
              </div>

              <label class="mini-btn upload-btn">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Subir PDFs
                <input type="file" hidden multiple accept="application/pdf" (change)="onPDFFileSelected($event)" />
              </label>

              @if (pdfDocs.length) {
                <div class="pdf-files-list">
                  @for (f of pdfDocs; track f.key) {
                    <button class="pdf-file-chip" [class.active]="activeFileId === f.key"
                            [disabled]="loadingFileId === f.key"
                            (click)="openSessionPdf(f)" [title]="f.name">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
                      <span class="fname">{{ f.name }}</span>
                      @if (loadingFileId === f.key) {
                        <svg class="rot chip-spin" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      } @else {
                        <span class="chip-del" title="Quitar de la lista" (click)="removeSessionPdf($event, f)">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </span>
                      }
                    </button>
                  }
                </div>
                <p class="upload-note">Los archivos viven solo durante esta sesión.</p>
              } @else {
                <div class="pdf-upload-zone">
                  <svg class="icon" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4-4 4 4"/></svg>
                  <h3>Arrastra tus PDF aquí</h3>
                  <p>Se abren al instante como recursos de esta sesión</p>
                  <label class="file-label">Elegir archivos<input type="file" multiple accept="application/pdf" (change)="onPDFFileSelected($event)" /></label>
                </div>
              }

              @if (pdfLoadingStatus !== 'idle') {
                <div class="pdf-loading-overlay">
                  <div class="spinner"></div>
                  <p>{{ pdfLoadingStatus === 'loading' ? 'Descargando archivo…' : 'Preparando páginas…' }}</p>
                </div>
              }

              @if (pdfDoc && pdfLoadingStatus === 'idle') {
                <div class="pdf-meta">
                  <span>Pág. {{ pdfCurrentPage }} de {{ pdfTotalPages }}</span>
                  <button class="chip-del standalone" title="Cerrar visor" (click)="closePDF()">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>

                <!-- Hojas del PDF en scroll vertical continuo (render perezoso) -->
                <div class="pdf-pages" #pdfContainer (scroll)="onPdfScroll()">
                  <div *ngFor="let pageNum of pdfPageNumbers" class="pdf-page-wrapper" [attr.data-page]="pageNum">
                    <canvas [id]="'pdf-canvas-' + pageNum"></canvas>
                  </div>
                </div>
              }
            </div>

            <!-- Borde arrastrable para estirar el panel hacia la derecha -->
            <div class="side-resizer" *ngIf="sideOpen"
                 (pointerdown)="startSideResize($event)"
                 (pointermove)="moveSideResize($event)"
                 (pointerup)="endSideResize($event)"
                 title="Arrastra para redimensionar"></div>
          </aside>

          <!-- ÁREA PRINCIPAL: páginas A4 en flujo vertical continuo (como Word) -->
          <main class="canvas-area" [class.eraser-active]="selectedTool === 'eraser'">
            <!-- Marco estático: este margen con el panel es constante,
                 sin importar el zoom ni el desplazamiento de la hoja -->
            <div class="canvas-gutter">
              <div class="notebook-canvas-container" #notebookContainer
                   (scroll)="onSheetScroll()"
                   (touchstart)="onTouchStart($event)"
                   (touchmove)="onTouchMove($event)"
                   (touchend)="onTouchEnd($event)"
                   (wheel)="onCanvasWheel($event)">
                <div class="pages-flow" #pagesFlow>
                  @for (page of pages; track $index) {
                    <div class="page-slot">
                      <span class="page-tag">Página {{ $index + 1 }}</span>
                      <div class="scale-box" [style.width.px]="scaledSheetW" [style.height.px]="scaledSheetH">
                        <div class="a4-sheet" [style.transform]="'scale(' + viewScale + ')'">
                          <!-- Capa inferior: cuadrícula CSS pura · Capa superior: canvas transparente -->
                          <canvas #pageCanvas [attr.data-page-index]="$index"
                                  [style.cursor]="selectedTool === 'eraser' ? 'none' : 'crosshair'"
                                  (pointerdown)="onPointerDown($event)"
                                  (pointermove)="onPointerMove($event)"
                                  (pointerup)="onPointerUp($event)"
                                  (pointerleave)="onPointerLeave($event)"></canvas>
                        </div>
                      </div>
                    </div>
                  }
                </div>
                <p class="hint">Pellizca con dos dedos (o Ctrl + rueda) para hacer zoom y mover la hoja. Escribe en cualquier página: se guarda sola.</p>
              </div>

              <!-- Controles de zoom flotantes -->
              <div class="zoom-controls">
                <button (click)="stepZoom(-1)" title="Alejar">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>
                </button>
                <button class="pct" (click)="resetZoom()" title="Restablecer zoom">{{ zoomPercent }}%</button>
                <button (click)="stepZoom(1)" title="Acercar">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>

      <!-- Anillo indicador del borrador: sigue al puntero mostrando la zona a borrar -->
      <div class="eraser-ring" *ngIf="showEraserRing"
           [style.width.px]="eraserWidth * viewScale"
           [style.height.px]="eraserWidth * viewScale"
           [style.left.px]="ringX"
           [style.top.px]="ringY"></div>
    </ng-container>
  `,
  styles: `
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
    h1, h2, p { margin: 0; }
    header p { font-size: 12px; color: #788196; font-weight: 700; letter-spacing: .08em; }
    h1 { font-size: 30px; margin-top: 8px; }
    header span { display: block; color: #7e879a; margin-top: 8px; }

    /* HUB DE CUADERNOS */
    .notebooks-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 20px; margin-top: 20px; }
    .notebook-card { background: #fff; border: 1px solid #e9ecf2; border-radius: 13px; padding: 22px; text-align: center; display: flex; flex-direction: column; }

    .nb-title {
      display: block;
      margin-top: -4px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .05em;
      color: #93a1c7;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .rename-input {
      width: 100%;
      margin: 2px 0 6px;
      background: rgba(8, 14, 30, .78);
      border: 1px solid rgba(99, 102, 241, .45);
      color: var(--ink);
      caret-color: var(--accent-light);
      border-radius: 5px;
      padding: 9px 10px;
      font: inherit;
      text-align: center;
      box-sizing: border-box;
    }
    .rename-input:focus { outline: none; box-shadow: 0 0 0 3px rgba(59, 130, 246, .2); }

    .card-actions { display: flex; gap: 6px; margin-top: auto; padding-top: 12px; }

    .mini-action {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 10px;
      border-radius: 5px;
      border: 1px solid rgba(99, 102, 241, .2);
      background: rgba(99, 102, 241, .06);
      color: var(--ink-dim);
      cursor: pointer;
      transition: color .15s, border-color .15s, background .15s;
    }

    .mini-action svg { display: block; }

    .mini-action:hover:not(:disabled) {
      color: var(--ink);
      border-color: rgba(99, 102, 241, .45);
      background: rgba(99, 102, 241, .15);
    }

    .mini-action.save { color: #10b981; border-color: rgba(16, 185, 129, .4); background: rgba(16, 185, 129, .08); }
    .mini-action.save:hover { color: #10b981; border-color: rgba(16, 185, 129, .7); background: rgba(16, 185, 129, .18); filter: brightness(1.1); }

    .mini-action.del:hover { color: #ff8fa8 !important; border-color: rgba(255, 143, 168, .45) !important; background: rgba(255, 99, 132, .12) !important; }

    /* Portada con imagen opcional */
    .cover { position: relative; overflow: hidden; }
    .cover::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(180deg, rgba(4,7,15,.02), rgba(4,7,15,.38));
      pointer-events: none;
    }
    .cover svg {
      position: relative;
      z-index: 1;
      filter: drop-shadow(0 2px 8px rgba(4,7,15,.5));
    }

    /* Editor del curso (docente / color / fondo) */
    .meta-editor {
      display: flex;
      flex-direction: column;
      text-align: left;
      margin: 6px 0 10px;
      padding: 14px;
      background: rgba(8, 14, 30, .55);
      border: 1px solid var(--glass-border);
      border-radius: 5px;
    }

    .m-label {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: #93a1c7;
      margin: 0 0 5px;
    }
    .m-course {
      margin: 0;
      color: var(--ink);
      font-weight: 600;
      font-size: 13.5px;
    }
    .meta-editor .m-label + .m-input,
    .meta-row { margin-bottom: 12px; }

    .m-input {
      width: 100%;
      background: rgba(8, 14, 30, .78);
      border: 1px solid rgba(99, 102, 241, .25);
      color: var(--ink);
      caret-color: var(--accent-light);
      border-radius: 5px;
      padding: 9px 11px;
      font: inherit;
      box-sizing: border-box;
    }
    .m-input:focus { outline: none; border-color: var(--accent-light); }

    .meta-row { display: flex; gap: 10px; align-items: flex-end; }
    .meta-row > div { min-width: 0; }
    .meta-row .grow { flex: 1; }

    .color-input {
      width: 100%;
      height: 38px;
      padding: 3px;
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(99, 102, 241, .2);
      border-radius: 5px;
      cursor: pointer;
    }

    .pick-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      height: 38px;
      border-radius: 5px;
      border: 1px dashed rgba(99, 102, 241, .45);
      background: rgba(99, 102, 241, .08);
      color: var(--ink);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s;
      white-space: nowrap;
      overflow: hidden;
    }
    .pick-btn:hover { background: rgba(99, 102, 241, .16); }
    .pick-btn input { display: none; }

    .cover-preview {
      position: relative;
      aspect-ratio: 21 / 9;
      border-radius: 5px;
      background-size: cover;
      background-position: center;
      border: 1px solid var(--glass-border);
      overflow: hidden;
    }
    .cover-preview .rm {
      position: absolute;
      top: 6px; right: 6px;
      width: 22px; height: 22px;
      display: grid; place-items: center;
      border: 0; border-radius: 50%;
      background: rgba(4, 7, 15, .75);
      color: #ffb9c4;
      cursor: pointer;
    }
    .rm:hover { background: rgba(220, 60, 90, .85); color: #fff; }

    .m-hint {
      margin: -4px 0 0 !important;
      font-size: 10.5px !important;
      color: #8b97b8 !important;
      letter-spacing: 0 !important;
      font-weight: 500 !important;
      line-height: 1.4;
    }
    .notebook-card .cover { height: 120px; border-radius: 5px; display: grid; place-items: center; font-size: 45px; color: #fff; margin-bottom: 15px; }
    .notebook-card h2 { font-size: 18px; font-weight: 700; margin: 10px 0 5px; }
    .notebook-card p { font-size: 13px; color: #7e879a; margin-bottom: 18px; }
    .open-btn { background: linear-gradient(135deg, var(--primary), var(--primary-light)); color: #ffffff; border: 0; border-radius: 5px; padding: 10px 15px; font-weight: 600; cursor: pointer; width: 100%; transition: filter 0.2s; margin-bottom: 4px; box-shadow: 0 4px 14px rgba(55, 48, 163, .3); }
    .open-btn:hover { filter: brightness(1.12); }

    .empty-state { text-align: center; max-width: 500px; margin: 50px auto; background: #fff; padding: 30px; border-radius: 13px; border: 1px solid #e9ecf2; }
    .empty-state b { font-size: 40px; display: block; margin-bottom: 15px; }
    .empty-state h2 { font-size: 20px; }
    .empty-state p { color: #7e879a; margin: 10px 0 20px; }
    .btn-primary { background: linear-gradient(135deg, var(--primary), var(--primary-light)); color: #ffffff; border: 0; border-radius: 5px; padding: 11px 20px; font-weight: 600; text-decoration: none; display: inline-block; box-shadow: 0 4px 16px rgba(55, 48, 163, .35); }

    /* ================= WORKSPACE ================= */
    .workspace { display: flex; flex-direction: column; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(1200px 800px at 75% -10%, rgba(23,84,166,.28), transparent 60%), radial-gradient(900px 600px at -10% 100%, rgba(79,70,229,.15), transparent 55%), #070b18; z-index: 9999; overflow: hidden; }

    /* --- Barra superior con herramientas de iconos --- */
    .workspace-header { position: relative; z-index: 90; display: flex; justify-content: space-between; align-items: center; gap: 12px; background: rgba(13,20,40,.78); backdrop-filter: blur(16px) saturate(1.2); -webkit-backdrop-filter: blur(16px) saturate(1.2); padding: 8px 14px; border-bottom: 1px solid var(--glass-border); }
    .header-left, .header-right, .top-tools { display: flex; align-items: center; gap: 10px; }
    .back-btn { background: rgba(10,16,34,.85); color: var(--ink); border: 1px solid var(--glass-border); border-radius: 5px; padding: 9px 18px; font-weight: 600; font-size: 14px; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 7px; }
    .back-btn:hover { background: rgba(20,30,58,.95); }
    .notebook-title { font-size: 13.5px; color: #aab6d9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }

    .top-tools { gap: 2px; }
    .menu-item { position: relative; }
    .tool-btn { width: 42px; height: 42px; border-radius: 5px; border: 1px solid transparent; background: transparent; display: grid; place-items: center; cursor: pointer; color: #cbd6ff; transition: background .15s; }
    .tool-btn svg { display: block; }
    .tool-btn:hover { background: rgba(99,102,241,.12); }
    .menu-item.active .tool-btn { background: linear-gradient(135deg, var(--primary), var(--primary-light)); color: #ffffff; box-shadow: 0 4px 14px rgba(55, 48, 163, .45); }

    /* Submenú flotante */
    .flyout { display: none; position: absolute; top: calc(100% + 12px); left: 50%; transform: translateX(-50%); background: rgba(16, 26, 51, .96); border: 1px solid var(--glass-border); border-radius: 5px; padding: 12px; box-shadow: 0 18px 44px rgba(2, 6, 18, .6); z-index: 80; min-width: 235px; cursor: default; }
    .flyout::before { content: ''; position: absolute; top: -6px; left: 50%; width: 12px; height: 12px; background: rgba(16,26,51,.96); border-left: 1px solid var(--glass-border); border-top: 1px solid var(--glass-border); transform: translateX(-50%) rotate(45deg); }

    .menu-item::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); width: min(180px, 110%); height: 16px; display: none; }
    .menu-item:hover::after, .menu-item:focus-within::after, .menu-item.open::after { display: block; }

    .menu-item:hover .flyout, .menu-item:focus-within .flyout, .menu-item.open .flyout { display: block; }
    .fly-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .fly-row:last-child { margin-bottom: 0; }

    /* Botones segmentados del borrador (Por trazo / Por píxeles) */
    .seg-row { gap: 6px; }
    .seg-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 6px; border-radius: 5px; border: 1px solid rgba(99, 102, 241, .2); background: rgba(10, 16, 34, .8); font-size: 12px; font-weight: 600; color: var(--ink-dim); cursor: pointer; white-space: nowrap; }
    .seg-btn:hover { background: rgba(99, 102, 241, .12); color: var(--ink); }
    .seg-btn.active { border-color: var(--accent-light); background: rgba(79, 70, 229, .25); color: #ffffff; }
    .pencil-opt { width: 38px; height: 38px; border-radius: 5px; border: 1px solid rgba(99,102,241,.2); background: rgba(255,255,255,.04); cursor: pointer; color: #cbd6ff; display: grid; place-items: center; }
    .pencil-opt svg { display: block; }
    .pencil-opt:hover { background: rgba(99,102,241,.12); }
    .pencil-opt.active { border-color: var(--accent-light); background: rgba(79,70,229,.25); color: #ffffff; }
    .colors-row { flex-wrap: wrap; }
    .color-dot { width: 24px !important; height: 24px !important; border-radius: 50% !important; padding: 0 !important; border: 2px solid transparent !important; cursor: pointer; }
    .color-dot.selected { border-color: #eaf0ff !important; transform: scale(1.15); }
    .custom-color-picker { width: 28px; height: 28px; border: 0; border-radius: 6px; padding: 0; cursor: pointer; background: transparent; }
    .slider-row { font-size: 12px; color: #93a1c7; gap: 8px; }
    .slider-row input[type=range] { width: 110px; }
    .slider-row b { color: #dbe4ff; min-width: 38px; text-align: right; }
    .fly-tip { margin: 2px 0 0; font-size: 11px; color: #94a3b8; max-width: 215px; line-height: 1.4; }

    .save-status { font-size: 12.5px; color: #10b981; font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center; gap: 5px; }
    .save-status.saving { color: #f59e0b; }
    .rot { animation: spin 1s linear infinite; }
    .page-controls { display: flex; align-items: center; gap: 2px; background: rgba(255,255,255,.05); border-radius: 5px; padding: 3px; }
    .page-controls button { width: 30px; height: 30px; border: 0; background: transparent; border-radius: 6px; cursor: pointer; color: #cbd6ff; display: grid; place-items: center; }
    .page-controls button svg { display: block; }
    .page-controls button:hover:not(:disabled) { background: rgba(255,255,255,.09); }
    .page-controls button:disabled { opacity: .35; cursor: default; }
    .page-controls span { font-size: 12px; font-weight: 700; color: #cbd6ff; padding: 0 5px; white-space: nowrap; }
    .icon-action { width: 38px; height: 38px; border-radius: 5px; border: 1px solid var(--glass-border); background: rgba(255,255,255,.05); cursor: pointer; display: grid; place-items: center; color: #cbd6ff; }
    .icon-action svg { display: block; }
    .icon-action:hover { background: rgba(255,255,255,.09); }
    .icon-action.danger { color: #ff8fa8; border-color: rgba(255,143,168,.35); }

    /* --- Cuerpo: panel lateral + lienzo --- */
    .workspace-body { display: flex; flex: 1; overflow: hidden; position: relative; }

    /* Panel izquierdo azul, desplegable y redimensionable */
    .side-panel { position: relative; height: 100%; background: linear-gradient(168deg, #22345c, #141f3b); color: #fff; display: flex; flex-shrink: 0; transition: width .18s ease; overflow: visible; }
    .side-panel.resizing { transition: none; }
    .side-rail { width: 52px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; padding: 12px 0; gap: 14px; }
    .rail-btn { width: 36px; height: 36px; border-radius: 5px; border: 0; background: rgba(255,255,255,.14); color: #fff; cursor: pointer; display: grid; place-items: center; }
    .rail-btn svg { display: block; }
    .rail-btn:hover { background: rgba(255,255,255,.26); }
    .rail-label { writing-mode: vertical-rl; letter-spacing: .3em; font-size: 11px; opacity: .7; font-weight: 700; }

    .side-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; padding: 12px 14px 12px 0; }
    .side-head h2 { font-size: 15px; margin: 0; }
    .side-head small { display: block; font-size: 10.5px; opacity: .65; margin-top: 3px; }

    .mini-btn { background: rgba(255,255,255,.14); color: #fff; border: 1px solid rgba(255,255,255,.28); border-radius: 6px; padding: 6px 10px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 5px; }
    .mini-btn svg { display: block; }
    .mini-btn:hover { background: rgba(255,255,255,.28); }

    .upload-btn { justify-content: center; padding: 8px; }
    .upload-btn input { display: none; }
    .upload-note { margin: 0; font-size: 11.5px; opacity: .75; }

    /* Lista de PDFs guardados del cuaderno */
    .pdf-files-list { display: flex; flex-direction: column; gap: 6px; max-height: 34%; overflow-y: auto; }
    .pdf-file-chip {
      display: flex; align-items: center; gap: 7px;
      width: 100%; text-align: left;
      background: rgba(255,255,255,.10);
      border: 1px solid rgba(255,255,255,.22);
      border-radius: 5px; padding: 8px 9px;
      color: #fff; font-size: 12.5px; font-weight: 600;
      cursor: pointer; transition: background .15s;
    }
    .pdf-file-chip:hover:not(:disabled) { background: rgba(255,255,255,.22); }
    .pdf-file-chip.active { border-color: #a99cff; background: rgba(98,85,232,.45); }
    .pdf-file-chip:disabled { opacity: .65; cursor: wait; }
    .pdf-file-chip .fname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pdf-file-chip svg:first-child { flex-shrink: 0; opacity: .85; }
    .chip-spin { animation-duration: .7s; }
    .chip-del {
      flex-shrink: 0; display: grid; place-items: center;
      width: 20px; height: 20px; border-radius: 50%;
      background: rgba(255,255,255,.12); border: 0; color: #fff; cursor: pointer;
    }
    .chip-del:hover { background: #ef4444; }
    .pdf-meta .chip-del.standalone { background: transparent; border: 1px solid rgba(255,255,255,.35); }
    .mini-btn { background: rgba(255,255,255,.14); color: #fff; border: 1px solid rgba(255,255,255,.28); border-radius: 6px; padding: 6px 10px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 5px; }
    .mini-btn svg { display: block; }
    .mini-btn:hover { background: rgba(255,255,255,.28); }
    .mini-btn.danger:hover { background: #ef4444; border-color: #ef4444; }

    .pdf-meta { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,.09); border-radius: 5px; padding: 6px 9px; font-size: 12px; font-weight: 600; }

    .pdf-upload-zone { border: 2px dashed rgba(255,255,255,.45); border-radius: 5px; padding: 26px 14px; text-align: center; }
    .pdf-upload-zone .icon { display: block; margin: 0 auto 8px; opacity: .9; }
    .pdf-upload-zone h3 { font-size: 13.5px; margin: 0 0 4px; }
    .pdf-upload-zone p { font-size: 11.5px; opacity: .75; margin: 0 0 12px; }
    .file-label { background: linear-gradient(135deg, var(--primary), var(--primary-light)); color: #ffffff; padding: 8px 14px; border-radius: 6px; font-weight: 600; cursor: pointer; display: inline-block; font-size: 12.5px; box-shadow: 0 4px 14px rgba(55, 48, 163, .3); }
    .file-label:hover { filter: brightness(1.12); }
    .file-label input { display: none; }

    .pdf-loading-overlay { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 34px 0; font-size: 12.5px; font-weight: 600; }
    .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,.25); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; }

    /* Hojas apiladas en vertical · placeholder A4 antes de renderizar */
    .pdf-pages { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 10px 4px 22px; border-radius: 5px; background: rgba(0,0,0,.16); scroll-behavior: smooth; }
    .pdf-page-wrapper { position: relative; width: 92%; max-width: 100%; line-height: 0; aspect-ratio: 210 / 297; background: rgba(255,255,255,.08); border-radius: 3px; }
    .pdf-page-wrapper canvas { width: 100%; height: auto; display: block; background: #fff; box-shadow: 0 6px 18px rgba(0,0,0,.35); border-radius: 3px; }

    /* Borde arrastrable del panel */
    .side-resizer { position: absolute; top: 0; right: -5px; width: 10px; height: 100%; cursor: col-resize; z-index: 70; touch-action: none; }
    .side-resizer::after { content: ''; position: absolute; top: 0; right: 4px; width: 2px; height: 100%; background: rgba(255,255,255,.35); transition: background .15s, width .15s; }
    .side-resizer:hover::after, .side-resizer:active::after { background: #8f83ff; width: 4px; right: 3px; }

    /* Área principal del lienzo A4 */
    .canvas-area { flex: 1; min-width: 0; display: flex; }

    /* Marco estático alrededor del lienzo: margen constante con el panel
       sin importar el zoom ni el desplazamiento */
    .canvas-gutter { flex: 1; min-width: 0; display: flex; position: relative; padding: 16px 20px 18px 26px; }
    .notebook-canvas-container { flex: 1; overflow: auto; touch-action: none; display: block; width: 100%; box-sizing: border-box; background: #0d1428; border-radius: 5px; box-shadow: inset 0 0 0 1px rgba(140,180,255,.14); }

    /* Controles de zoom flotantes */
    .zoom-controls {
      position: absolute;
      right: 16px;
      bottom: 16px;
      display: flex;
      align-items: center;
      gap: 2px;
      background: rgba(13,20,40,.85);
      border: 1px solid var(--glass-border);
      border-radius: 5px;
      padding: 4px;
      box-shadow: 0 10px 26px rgba(2, 6, 18, .5);
      z-index: 30;
    }
    .zoom-controls button {
      min-width: 32px;
      height: 32px;
      border: 0;
      background: transparent;
      border-radius: 5px;
      font-weight: 700;
      color: #cbd6ff;
      cursor: pointer;
      display: grid;
      place-items: center;
      font-size: 15px;
    }
    .zoom-controls button:hover { background: rgba(255,255,255,.09); }
    .zoom-controls .pct { min-width: 54px; font-size: 12px; }

    /* Anillo del borrador: círculo translúcido que sigue al puntero */
    .eraser-ring {
      position: fixed;
      border: 1.6px solid rgba(98, 85, 232, .95);
      background: rgba(98, 85, 232, .10);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .55);
      border-radius: 50%;
      pointer-events: none;
      transform: translate(-50%, -50%);
      z-index: 10000;
    }

    /* Flujo vertical continuo (estilo Word). width:max-content + margin:auto
       permiten alcanzar la esquina izquierda con el scroll cuando el zoom
       supera el ancho visible */
    .pages-flow { display: flex; flex-direction: column; align-items: center; gap: 40px; width: max-content; min-width: 100%; margin-inline: auto; padding-bottom: 26px; }
    .page-slot { display: flex; flex-direction: column; align-items: center; gap: 9px; }
    .page-tag { font-size: 11px; font-weight: 800; letter-spacing: .09em; color: #94a3b8; text-transform: uppercase; }
    .scale-box { position: relative; flex-shrink: 0; }

    /* Hoja A4 cuadriculada — CAPA INFERIOR con patrón CSS puro */
    .a4-sheet {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: top left;
      width: 794px;
      height: 1123px;
      background-color: #ffffff;
      /* Cuadrícula de 20x20px generada por CSS: nítida a cualquier zoom y jamás borrable */
      background-image:
        linear-gradient(to right, #e5e7eb 1px, transparent 1px),
        linear-gradient(to bottom, #e5e7eb 1px, transparent 1px);
      background-size: 20px 20px;
      box-shadow: 0 24px 60px rgba(0,0,0,.55), 0 8px 22px rgba(0,0,0,.35);
      border: 1px solid #94a3b8;
      border-radius: 4px;
      overflow: hidden;
    }
    .a4-sheet canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: transparent; cursor: crosshair; touch-action: none; -webkit-user-select: none; user-select: none; z-index: 1; }
    .hint { margin-top: 14px; font-size: 11px; color: #93a1c7; max-width: 560px; text-align: center; font-weight: 500; }

    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    /* Responsivo: en pantallas angostas el panel pasa a cajón superpuesto */
    @media (max-width: 900px) {
      .notebook-title { display: none; }
      .hint { display: none; }
      .workspace-body { position: relative; }
      .side-panel { position: absolute; top: 0; bottom: 0; left: 0; z-index: 45; box-shadow: 16px 0 40px rgba(15,23,42,.32); }
      .flyout { min-width: 200px; }
    }
  `
})
export class NotebooksComponent implements AfterViewInit, OnInit {
  readonly state = inject(AppStateService);
  private readonly notebookService = inject(NotebookService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChildren('pageCanvas') pageCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChild('pdfContainer') pdfContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('notebookContainer') notebookContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('pagesFlow') pagesFlow!: ElementRef<HTMLDivElement>;

  // Estado del cuaderno
  activeNotebook: Notebook | null = null;
  pages: NotebookPage[] = [];
  currentPageIndex = 0;
  isSaving = false;
  private saveTimeout: any = null;

  // Cache de imágenes
  private imageElementsCache = new Map<string, HTMLImageElement>();

  // Herramientas de dibujo
  selectedTool: 'pencil' | 'eraser' | 'move' = 'pencil';
  selectedPencilType: 'ballpoint' | 'calligraphy' | 'highlighter' = 'ballpoint';
  selectedColor = '#000000';
  brushWidth = 3;
  eraserWidth = 25;
  // Modos del borrador: 'stroke' elimina trazos enteros, 'pixels' recorta zonas
  eraserMode: 'stroke' | 'pixels' = 'stroke';
  private lastErase: { x: number; y: number } | null = null;
  colors = ['#000000', '#ea4335', '#004fe6', '#0f9d58'];

  // Control de trazado
  private isDrawing = false;
  private currentStroke: Stroke | null = null;

  // Flujo continuo de páginas: canvas activo y páginas pendientes de guardar
  private dirtyPages = new Set<number>();
  private activePageEl: HTMLCanvasElement | null = null;
  private activePointerId: number | null = null;

  // Trazos abiertos (sin soltar) para poder cancelarlos si llega un segundo dedo
  private openStrokes: { idx: number; stroke: Stroke }[] = [];

  // Estado de mover imágenes
  private isDraggingImage = false;
  private selectedImageIndex: number | null = null;
  private dragOffset = { x: 0, y: 0 };

  // Panel lateral desplegable y redimensionable
  sideOpen = false;
  sideWidth = 380;
  resizing = false;
  private resizeStartX = 0;
  private resizeStartW = 0;

  // Escala responsiva de la hoja A4: ajuste automático + zoom manual del usuario
  userZoom = 1;
  viewScale = 1;
  scaledSheetW = SHEET_W;
  scaledSheetH = SHEET_H;

  // Gesto táctil de pellizco con dos dedos
  private gesture: { startDist: number; startZoom: number; anchorNX: number; anchorNY: number } | null = null;

  // Anillo indicador del borrador (posición en coordenadas de pantalla)
  showEraserRing = false;
  ringX = 0;
  ringY = 0;

  get zoomPercent(): number { return Math.round(this.viewScale * 100); }

  // PDFs de la sesión: recursos temporales en memoria (sin tocar la BD)
  pdfDocs: SessionPdf[] = [];
  activeFileId: string | null = null;
  loadingFileId: string | null = null;
  pdfDoc: any = null;
  pdfCurrentPage = 1;
  pdfTotalPages = 1;
  pdfPageNumbers: number[] = [];
  pdfLoadingStatus: 'idle' | 'loading' | 'rendering' | 'error' = 'idle';

  // Render perezoso: solo se dibujan las páginas cercanas al viewport
  private renderedPages = new Set<number>();
  private renderingPages = new Set<number>();
  private pdfObserver?: IntersectionObserver;
  private rerenderTimer: any = null;

  get activeFileName(): string {
    return this.pdfDocs.find(d => d.key === this.activeFileId)?.name ?? '';
  }

  get currentPageData(): PageData {
    if (!this.pages[this.currentPageIndex]) {
      return { strokes: [], images: [] };
    }
    const data = this.pages[this.currentPageIndex].drawing_data || {};
    if (!data.strokes) data.strokes = [];
    if (!data.images) data.images = [];
    return data as PageData;
  }

  private getPageData(index: number): PageData {
    const data: any = this.pages[index]?.drawing_data || {};
    if (!data.strokes) data.strokes = [];
    if (!data.images) data.images = [];
    return data as PageData;
  }

  private markDirty(index: number) {
    this.dirtyPages.add(index);
  }

  ngAfterViewInit() {
    // Al añadir/quitar páginas Angular crea/destruye canvases: resincronizar
    this.pageCanvases.changes.subscribe(() => {
      setTimeout(() => this.refreshSheets(), 0);
    });
  }

  // ----------------------------------------------------
  // GESTIÓN DE CUADERNOS
  // ----------------------------------------------------
  // ----------------------------------------------------
  // HUB: CRUD DE CUADERNOS POR CURSO
  // ----------------------------------------------------
  hubNotebooks = new Map<string, Notebook>();   // course_id -> cuaderno
  editingCourseId: string | null = null;
  editTitle = '';

  ngOnInit(): void {
    void this.refreshHub();
  }

  // Editor del curso: docente / color / imagen de fondo
  editingMetaId: string | null = null;
  metaTeacher = '';
  metaColor = '#6457e8';
  metaCover: string | null = null;

  coverStyle(course: { color: string; cover?: string | null }): string {
    return course.cover
      ? `#0d1428 center/cover no-repeat url('${course.cover}')`
      : course.color;
  }

  startEditMeta(course: { id: string; teacher: string; color: string; cover?: string | null }) {
    this.cancelRename();
    const c = this.state.courses().find(x => x.id === course.id);
    this.metaTeacher = c?.teacher ?? '';
    this.metaColor = c?.color ?? '#6457e8';
    this.metaCover = c?.cover ?? null;
    this.editingMetaId = course.id;
  }

  cancelEditMeta() {
    this.editingMetaId = null;
  }

  removeCover() {
    this.metaCover = null;
  }

  onCoverPicked(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    void this.compressImage(file)
      .then(dataUrl => { this.metaCover = dataUrl; this.cdr.detectChanges(); })
      .catch(() => alert('No se pudo procesar la imagen. Prueba con otra.'));
  }

  /** Redimensiona a máx. 900px y comprime a JPEG para guardar liviano */
  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('decode'));
        img.onload = () => {
          const scale = Math.min(1, 900 / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async saveEditMeta(course: { id: string }) {
    try {
      await this.state.updateCourse(course.id, {
        teacher: this.metaTeacher,
        color: this.metaColor,
        cover: this.metaCover
      });
      this.cancelEditMeta();
    } catch (e) {
      console.error('Error actualizando curso:', e);
      const msg = e instanceof Error ? e.message : String(e);
      if (/cover|does not exist|could not find/i.test(msg)) {
        alert(
          'Falta la columna "cover" en la tabla courses de Supabase.\n\n' +
          'Ejecuta esto una sola vez en el SQL Editor de Supabase:\n\n' +
          'ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS cover text;'
        );
        // Guarda al menos docente y color sin imagen
        try {
          await this.state.updateCourse(course.id, { teacher: this.metaTeacher, color: this.metaColor });
          this.cancelEditMeta();
        } catch { /* ya informado */ }
      } else {
        alert(`No se pudo actualizar el curso: ${msg}`);
      }
    }
  }

  async refreshHub(): Promise<void> {
    try {
      const all = await this.notebookService.listNotebooks();
      this.hubNotebooks = new Map(all.map(n => [n.course_id, n]));
      this.cdr.detectChanges();
    } catch (e) {
      console.warn('No se pudieron listar los cuadernos:', e);
    }
  }

  notebookFor(course: { id: string }): Notebook | undefined {
    return this.hubNotebooks.get(course.id);
  }

  startRename(course: { id: string }) {
    const nb = this.hubNotebooks.get(course.id);
    this.editTitle = nb?.title ?? 'Mi Cuaderno';
    this.editingCourseId = course.id;
  }

  cancelRename() {
    this.editingCourseId = null;
    this.editTitle = '';
  }

  async saveRename(course: { id: string }) {
    const title = this.editTitle.trim();
    if (!title) return;
    try {
      let nb = this.hubNotebooks.get(course.id);
      if (!nb) {
        // Aún no existe: crear y luego renombrar
        nb = await this.notebookService.getOrCreateNotebook(course.id);
        this.hubNotebooks.set(course.id, nb);
      }
      await this.notebookService.renameNotebook(nb.id, title);
      nb.title = title;
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error renombrando cuaderno:', e);
      alert('No se pudo renombrar el cuaderno.');
    } finally {
      this.cancelRename();
    }
  }

  /** Elimina el CURSO completo: cuaderno, páginas y clases del horario (cascada) */
  async deleteNotebookFor(course: { id: string; name: string }) {
    if (!confirm(`¿Eliminar COMPLETAMENTE el curso "${course.name}"?\n\nSe borrarán: el curso, su cuaderno, todas las páginas y sus clases del horario.`)) return;
    try {
      await this.state.deleteCourse(course.id);
      this.hubNotebooks.delete(course.id);
      // Si su cuaderno estaba abierto, cerrar el visor
      if (this.activeNotebook?.course_id === course.id) {
        this.closeViewer();
        this.activeNotebook = null;
        this.pages = [];
      }
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error eliminando curso:', e);
      alert('No se pudo eliminar el curso.');
    }
  }

  /** Crea explícitamente un cuaderno para el curso */
  async createNotebookFor(course: { id: string; name: string }) {
    try {
      this.loadingFileId = course.id;
      this.cdr.detectChanges();
      const nb = await this.notebookService.getOrCreateNotebook(course.id);
      this.hubNotebooks.set(nb.course_id, nb);
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error creando cuaderno:', e);
      alert('No se pudo crear el cuaderno.');
    } finally {
      this.loadingFileId = null;
    }
  }

  /** Solo abre si ya existe — borrarlo lo elimina de verdad (no se regenera) */
  async loadNotebook(courseId: string) {
    if (!this.hubNotebooks.has(courseId)) return; // fue eliminado: no auto-crear
    try {
      this.isSaving = true;
      this.activeNotebook = await this.notebookService.getOrCreateNotebook(courseId);
      const fetchedPages = await this.notebookService.getPages(this.activeNotebook.id);

      if (fetchedPages.length === 0) {
        const newPage: NotebookPage = {
          notebook_id: this.activeNotebook.id,
          page_number: 1,
          drawing_data: { strokes: [], images: [] }
        };
        await this.notebookService.savePage(newPage.notebook_id, newPage.page_number, newPage.drawing_data);
        this.pages = [newPage];
      } else {
        this.pages = fetchedPages;
      }
      this.currentPageIndex = 0;
      this.dirtyPages.clear();

      // Los PDFs son recursos de la sesión actual (solo memoria)
      this.pdfDocs = [];
      this.activeFileId = null;
      this.closeViewer();

      setTimeout(() => {
        this.userZoom = 1;
        this.updateSheetScale();
        this.sizeAllCanvases();
        this.redrawAll();
        this.scrollToPage(0, 'auto');
        this.enterFullScreen();
      }, 50);

    } catch (e) {
      console.error('Error cargando cuaderno:', e);
    } finally {
      this.isSaving = false;
    }
  }

  getCourseName(courseId: string): string {
    return this.state.courses().find(c => c.id === courseId)?.name ?? 'Curso';
  }

  // ----------------------------------------------------
  // PANTALLA COMPLETA (FULLSCREEN) Y BOTÓN VOLVER
  // ----------------------------------------------------
  isFullScreen = false;

  enterFullScreen() {
    this.isFullScreen = true;
    const wrapper = document.querySelector('.workspace') as HTMLElement;
    if (wrapper) wrapper.classList.add('full-screen');
  }

  exitFullScreen() {
    this.isFullScreen = false;
    const wrapper = document.querySelector('.workspace') as HTMLElement;
    if (wrapper) wrapper.classList.remove('full-screen');
  }

  closeNotebook() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveCurrentPageImmediately();
    }
    if (this.isFullScreen) {
      this.exitFullScreen();
    }
    this.activeNotebook = null;
    this.pages = [];
    this.currentPageIndex = 0;
    this.currentStroke = null;
    this.isDrawing = false;
    this.pdfDoc = null;
    this.pdfCurrentPage = 1;
    this.pdfTotalPages = 1;
    this.pdfPageNumbers = [];
    this.pdfLoadingStatus = 'idle';
    this.imageElementsCache.clear();
    this.dirtyPages.clear();
    this.openMenu = null;
    this.menuPinned = false;
    this.pdfDocs = [];
    this.activeFileId = null;
    this.loadingFileId = null;
  }

  /** Cierra solo el visor; los archivos siguen listados en el panel */
  private closeViewer() {
    this.pdfObserver?.disconnect();
    this.pdfDoc = null;
    this.activeFileId = null;
    this.pdfCurrentPage = 1;
    this.pdfTotalPages = 1;
    this.pdfPageNumbers = [];
    this.renderedPages.clear();
    this.renderingPages.clear();
    this.pdfLoadingStatus = 'idle';
  }

  // ----------------------------------------------------
  // PANEL LATERAL: DESPLEGAR Y REDIMENSIONAR
  // ----------------------------------------------------
  toggleSide() {
    this.sideOpen = !this.sideOpen;
    setTimeout(() => {
      this.updateSheetScale();
      this.scheduleRerender();
    }, 60);
  }

  startSideResize(e: PointerEvent) {
    e.preventDefault();
    this.resizing = true;
    this.resizeStartX = e.clientX;
    this.resizeStartW = this.sideWidth;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  moveSideResize(e: PointerEvent) {
    if (!this.resizing) return;
    e.preventDefault();
    const maxW = Math.min(window.innerWidth - 340, Math.round(window.innerWidth * 0.75));
    this.sideWidth = Math.max(260, Math.min(maxW, this.resizeStartW + (e.clientX - this.resizeStartX)));
    this.updateSheetScale();
  }

  endSideResize(e: PointerEvent) {
    if (!this.resizing) return;
    this.resizing = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    // Re-renderizar las páginas ya dibujadas al nuevo ancho del visor
    this.scheduleRerender();
  }

  /** El zoom es absoluto: 100% = hoja A4 a tamaño nativo. Sin multiplicadores. */
  updateSheetScale() {
    this.applyView();
  }

  /** Recalcula la escala final y las dimensiones visibles de la hoja */
  private applyView() {
    this.viewScale = this.userZoom;
    this.scaledSheetW = Math.round(SHEET_W * this.viewScale);
    this.scaledSheetH = Math.round(SHEET_H * this.viewScale);
  }

  // ----------------------------------------------------
  // ZOOM Y DESPLAZAMIENTO (PELLIZCO CON DOS DEDOS / CTRL + RUEDA)
  // ----------------------------------------------------
  onTouchStart(e: TouchEvent) {
    if (!this.activeNotebook || e.touches.length !== 2) return;
    e.preventDefault();

    // El segundo dedo cancela trazos/recortes en curso
    this.cancelActiveDrawing();

    const t1 = e.touches[0], t2 = e.touches[1];
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY) || 1;
    const anchor = this.captureAnchor((t1.clientX + t2.clientX) / 2, (t1.clientY + t2.clientY) / 2);
    if (!anchor) return;

    this.gesture = { startDist: dist, startZoom: this.userZoom, anchorNX: anchor.nx, anchorNY: anchor.ny };
  }

  onTouchMove(e: TouchEvent) {
    const g = this.gesture;
    if (!g || !this.activeNotebook || e.touches.length < 2) return;
    e.preventDefault();

    const t1 = e.touches[0], t2 = e.touches[1];
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY) || 1;
    const midX = (t1.clientX + t2.clientX) / 2;
    const midY = (t1.clientY + t2.clientY) / 2;

    const target = g.startZoom * (dist / g.startDist);
    if (Math.abs(target - this.userZoom) > 0.001) {
      this.userZoom = Math.min(5, Math.max(0.5, target));
      this.applyView();
      this.cdr.detectChanges(); // sincroniza el layout antes de reanclar
    }
    this.reanchor(g.anchorNX, g.anchorNY, midX, midY);
  }

  onTouchEnd(e: TouchEvent) {
    if (this.gesture && e.touches.length < 2) {
      this.gesture = null;
    }
  }

  /** Ctrl + rueda para zoom anclado al cursor en escritorio */
  onCanvasWheel(e: WheelEvent) {
    if (!e.ctrlKey || !this.activeNotebook) return;
    e.preventDefault();
    this.zoomBy(Math.exp(-e.deltaY * 0.002), e.clientX, e.clientY);
  }

  stepZoom(dir: number) {
    this.zoomBy(dir > 0 ? 1.25 : 0.8);
  }

  resetZoom() {
    this.zoomTo(1);
  }

  private zoomBy(factor: number, clientX?: number, clientY?: number) {
    this.zoomTo(Math.min(5, Math.max(0.5, this.userZoom * factor)), clientX, clientY);
  }

  private zoomTo(zoom: number, clientX?: number, clientY?: number) {
    const cont = this.notebookContainer?.nativeElement;
    if (!cont) return;
    const rect = cont.getBoundingClientRect();
    let ax = rect.left + rect.width / 2;
    let ay = rect.top + rect.height / 2;
    let nx = 0.5, ny = 0.5;

    const flow = this.pagesFlow?.nativeElement;
    if (clientX !== undefined && clientY !== undefined && flow) {
      const fr = flow.getBoundingClientRect();
      nx = Math.min(1, Math.max(0, (clientX - fr.left) / (fr.width || 1)));
      ny = Math.min(1, Math.max(0, (clientY - fr.top) / (fr.height || 1)));
      ax = clientX;
      ay = clientY;
    }

    this.userZoom = zoom;
    this.applyView();
    this.cdr.detectChanges();
    this.reanchor(nx, ny, ax, ay);
  }

  /** Fracción del flujo bajo el punto inicial del gesto */
  private captureAnchor(clientX: number, clientY: number): { nx: number; ny: number } | null {
    const flow = this.pagesFlow?.nativeElement;
    if (!flow) return null;
    const fr = flow.getBoundingClientRect();
    return {
      nx: Math.min(1, Math.max(0, (clientX - fr.left) / (fr.width || 1))),
      ny: Math.min(1, Math.max(0, (clientY - fr.top) / (fr.height || 1)))
    };
  }

  /** Ajusta el scroll para que el punto anclado quede bajo (ax, ay) */
  private reanchor(nx: number, ny: number, ax: number, ay: number) {
    const cont = this.notebookContainer?.nativeElement;
    const flow = this.pagesFlow?.nativeElement;
    if (!cont || !flow) return;
    const fr = flow.getBoundingClientRect();

    // Posición actual del punto anclado y corrección de scroll
    cont.scrollLeft += (fr.left + nx * fr.width) - ax;
    cont.scrollTop += (fr.top + ny * fr.height) - ay;
  }

  /** Segundo dedo detectado: descarta trazos abiertos y libera capturas */
  private cancelActiveDrawing() {
    let changed = false;
    for (const o of this.openStrokes) {
      const arr = this.pages[o.idx]?.drawing_data?.strokes;
      if (!arr) continue;
      const i = arr.indexOf(o.stroke);
      if (i !== -1) {
        arr.splice(i, 1);
        changed = true;
        this.markDirty(o.idx);
      }
    }
    this.openStrokes = [];
    this.isDrawing = false;
    this.currentStroke = null;
    this.lastErase = null;
    this.isDraggingImage = false;
    this.selectedImageIndex = null;
    if (this.activePageEl && this.activePointerId !== null) {
      try { this.activePageEl.releasePointerCapture(this.activePointerId); } catch { /* noop */ }
    }
    this.activePageEl = null;
    this.activePointerId = null;
    this.showEraserRing = false;
    if (changed) {
      this.redrawAll();
      this.triggerAutoSave();
    }
  }

  // ----------------------------------------------------
  // LIENZO DE DIBUJO (CANVAS TRANSPARENTE A4 VERTICAL)
  // ----------------------------------------------------
  // Retina Display Fix: la resolución interna se multiplica por
  // devicePixelRatio y el CSS mantiene el tamaño lógico, así el trazo
  // se ve nítido ("vectorial") incluso con zoom o pantallas HiDPI.
  private readonly dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

  /** Dimensiona cada canvas de página con escalado DPR (Retina Fix) */
  private sizeAllCanvases() {
    this.pageCanvases?.forEach((ref) => {
      const canvas = ref.nativeElement;
      const targetW = SHEET_W * this.dpr;
      const targetH = SHEET_H * this.dpr;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.getContext('2d')?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      }
    });
  }

  /** Recalcula escala, tamaños y redibuja todo el flujo de páginas */
  private refreshSheets() {
    this.updateSheetScale();
    this.sizeAllCanvases();
    this.redrawAll();
  }

  setTool(tool: 'pencil' | 'eraser' | 'move') {
    this.selectedTool = tool;
    if (tool !== 'eraser') this.showEraserRing = false;
  }

  // ----------------------------------------------------
  // SUBMENÚS DE LA BARRA SUPERIOR (hover + clic fijado)
  // ----------------------------------------------------
  openMenu: 'pencil' | 'eraser' | null = null;
  private menuPinned = false;
  private menuCloseTimer: any = null;

  /** Clic en el icono: selecciona la herramienta Y fija/desfija su submenú */
  toggleMenu(e: MouseEvent, menu: 'pencil' | 'eraser') {
    e.stopPropagation();
    if (this.menuCloseTimer) { clearTimeout(this.menuCloseTimer); this.menuCloseTimer = null; }
    if (this.openMenu === menu && this.menuPinned) {
      this.openMenu = null;
      this.menuPinned = false;
    } else {
      this.openMenu = menu;
      this.menuPinned = true;
      // Fijar también activa la herramienta, como en las apps de notas
      this.setTool(menu);
    }
  }

  onMenuEnter(menu: 'pencil' | 'eraser') {
    if (this.menuCloseTimer) { clearTimeout(this.menuCloseTimer); this.menuCloseTimer = null; }
    if (!this.menuPinned) this.openMenu = menu;
  }

  onMenuLeave() {
    if (this.menuPinned) return;
    // Gracia de 350ms antes de cerrar: da tiempo a cruzar hacia el submenú
    if (this.menuCloseTimer) clearTimeout(this.menuCloseTimer);
    this.menuCloseTimer = setTimeout(() => {
      this.openMenu = null;
      this.menuCloseTimer = null;
    }, 350);
  }

  @HostListener('document:click')
  onDocumentClick() {
    // Clic fuera de los menús cierra incluso los fijados
    this.openMenu = null;
    this.menuPinned = false;
    if (this.menuCloseTimer) { clearTimeout(this.menuCloseTimer); this.menuCloseTimer = null; }
  }

  @HostListener('window:keydown.escape')
  onEscapeKey() {
    this.openMenu = null;
    this.menuPinned = false;
  }

  /** Redibuja todas las páginas del flujo vertical continuo */
  redrawAll() {
    if (!this.pageCanvases) return;
    this.pageCanvases.forEach((ref, i) => {
      const ctx = ref.nativeElement.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, SHEET_W, SHEET_H);

      // El fondo cuadriculado vive en la capa CSS inferior (jamás se toca)
      // El canvas transparente solo dibuja imágenes y trazos vectoriales
      const data = this.getPageData(i);
      this.drawImages(ctx, data.images);

      for (const stroke of data.strokes) {
        this.drawStrokePath(ctx, stroke, false);
      }
    });
  }

  /** Redibuja solo una página (usado durante trazos activos por rendimiento) */
  private redrawPage(index: number) {
    const ref = this.pageCanvases?.get(index);
    if (!ref) return;
    const ctx = ref.nativeElement.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, SHEET_W, SHEET_H);

    const data = this.getPageData(index);
    this.drawImages(ctx, data.images);
    for (const stroke of data.strokes) {
      const live = stroke === this.currentStroke && this.isDrawing;
      this.drawStrokePath(ctx, stroke, live);
    }
  }

  private drawImages(ctx: CanvasRenderingContext2D, images: NotebookImage[]) {
    for (const img of images) {
      const el = this.imageElementsCache.get(img.src);
      if (el) {
        ctx.drawImage(el, img.x, img.y, img.width, img.height);
      } else {
        const newEl = new Image();
        newEl.src = img.src;
        newEl.onload = () => {
          this.imageElementsCache.set(img.src, newEl);
          this.redrawAll();
        };
      }
    }
  }

  /**
   * Traza un trazo como forma vectorial rellena (perfect-freehand):
   * los puntos del lápiz se convierten en un contorno suave con presión
   * simulada o real según el tipo de pincel. Nunca usa mapa de bits.
   */
  private drawStrokePath(ctx: CanvasRenderingContext2D, stroke: Stroke, isLive: boolean) {
    // Trazos legacy del borrador antiguo (pintaban blanco): se ignoran
    if (stroke.isEraser || stroke.points.length < 1) return;

    // Borrador de píxeles: recorta el dibujo con composición destination-out.
    // La cuadrícula vive en la capa CSS inferior, así que jamás se ve afectada;
    // los trazos añadidos DESPUÉS vuelven a pintar por encima del hueco.
    if (stroke.pixelEraser) {
      const outline = getStroke(
        stroke.points.map(p => [p.x, p.y, 0.5]),
        { size: stroke.width, thinning: 0, smoothing: 0.6, streamline: 0.45, easing: (t: number) => t, last: !isLive }
      );
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      ctx.fill(outlineToPath(outline));
      ctx.globalCompositeOperation = 'source-over';
      return;
    }

    const pencilType = stroke.pencilType || 'ballpoint';
    const isHighlighter = pencilType === 'highlighter';
    const isCalligraphy = pencilType === 'calligraphy';

    const options = {
      size: isHighlighter ? stroke.width * 2.2 : isCalligraphy ? stroke.width * 1.5 : stroke.width,
      thinning: isHighlighter ? 0 : isCalligraphy ? 0.75 : 0.45,
      smoothing: 0.6,
      streamline: isHighlighter ? 0.68 : isCalligraphy ? 0.42 : 0.5,
      simulatePressure: !stroke.pen,
      easing: (t: number) => t,
      last: !isLive
    };

    const outline = getStroke(
      stroke.points.map(p => [p.x, p.y, stroke.pen ? (p.pressure ?? 0.5) : 0.5]),
      options
    );

    ctx.globalAlpha = isHighlighter ? 0.35 : 1.0;
    ctx.fillStyle = stroke.color;
    ctx.fill(outlineToPath(outline));
    ctx.globalAlpha = 1.0;
  }

  // Convierte coordenadas de pantalla a las coordenadas lógicas A4 (SHEET_W x SHEET_H)
  private toSheetCoords(e: PointerEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (SHEET_W / rect.width),
      y: (e.clientY - rect.top) * (SHEET_H / rect.height)
    };
  }

  /**
   * Borrador por TRAZOS: elimina trazos completos cuyo recorrido pase cerca
   * del puntero. Método puro: los efectos visuales/guardado los hace el caller.
   */
  private eraseAt(x: number, y: number): boolean {
    const data = this.currentPageData;
    const radius = this.eraserWidth / 2;
    let removed = false;

    for (let i = data.strokes.length - 1; i >= 0; i--) {
      const s = data.strokes[i];
      // Purgar trazos legacy del borrador antiguo (píxeles blancos)
      if (s.isEraser) {
        data.strokes.splice(i, 1);
        removed = true;
        continue;
      }
      if (s.pixelEraser) continue; // las zonas borradas por píxeles no se tocan

      const hitRadius = radius + s.width / 2;
      for (const p of s.points) {
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          data.strokes.splice(i, 1);
          removed = true;
          break;
        }
      }
    }

    return removed;
  }

  /** Confirma un gesto de borrado en la página activa */
  private commitErase() {
    this.markDirty(this.currentPageIndex);
    this.redrawPage(this.currentPageIndex);
    this.triggerAutoSave();
  }

  /** Interpola entre puntos para cubrir movimientos rápidos del borrador */
  private eraseSegment(x0: number, y0: number, x1: number, y1: number) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / Math.max(3, this.eraserWidth / 4)));
    for (let s = 1; s <= steps; s++) {
      this.eraseAt(x0 + (x1 - x0) * s / steps, y0 + (y1 - y0) * s / steps);
    }
  }

  /** Inicia el gesto de borrado según el modo (trazo o píxeles) */
  private beginErase(x: number, y: number) {
    if (this.eraserMode === 'pixels') {
      this.currentStroke = { points: [{ x, y, pressure: 0.5 }], color: '#000', width: this.eraserWidth, pixelEraser: true };
      this.currentPageData.strokes.push(this.currentStroke);
      this.openStrokes.push({ idx: this.currentPageIndex, stroke: this.currentStroke });
      this.markDirty(this.currentPageIndex);
      this.redrawPage(this.currentPageIndex);
    } else {
      this.lastErase = { x, y };
      this.eraseAt(x, y);
      this.commitErase();
    }
  }

  /** Continúa borrando mientras se arrastra (sin clics individuales) */
  private continueErase(x: number, y: number) {
    if (this.eraserMode === 'pixels') {
      if (!this.currentStroke?.pixelEraser) {
        this.beginErase(x, y);
        return;
      }
      this.appendEraserPoints(this.currentStroke, x, y);
      this.markDirty(this.currentPageIndex);
      this.redrawPage(this.currentPageIndex);
    } else {
      const from = this.lastErase ?? { x, y };
      this.eraseSegment(from.x, from.y, x, y);
      this.lastErase = { x, y };
      this.commitErase();
    }
  }

  /** Puntos intermedios para que los arrastres rápidos no dejen huecos */
  private appendEraserPoints(stroke: Stroke, tx: number, ty: number) {
    const pts = stroke.points;
    const last = pts[pts.length - 1];
    const dist = Math.hypot(tx - last.x, ty - last.y);
    const n = Math.floor(dist / Math.max(2, this.eraserWidth / 6));
    for (let s = 1; s <= n; s++) {
      pts.push({ x: last.x + (tx - last.x) * s / n, y: last.y + (ty - last.y) * s / n, pressure: 0.5 });
    }
    pts.push({ x: tx, y: ty, pressure: 0.5 });
  }

  onPointerDown(e: PointerEvent) {
    if (this.gesture) return; // durante el pellizco no se dibuja
    // El canvas que recibió el toque determina la página activa
    const canvas = e.currentTarget as HTMLCanvasElement;
    const idx = Number(canvas.dataset['pageIndex'] ?? 0);
    this.currentPageIndex = idx;
    this.activePageEl = canvas;
    const { x, y } = this.toSheetCoords(e, canvas);
    this.updateEraserRing(e);

    // Detectar botón borrador del lápiz físico
    const isStylusEraser = e.pointerType === 'eraser' || (e.buttons & 32) !== 0 || e.button === 5;
    const currentActiveTool = isStylusEraser ? 'eraser' : this.selectedTool;

    if (currentActiveTool === 'move') {
      const images = this.currentPageData.images;
      for (let i = images.length - 1; i >= 0; i--) {
        const img = images[i];
        if (x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height) {
          this.selectedImageIndex = i;
          this.isDraggingImage = true;
          this.dragOffset = { x: x - img.x, y: y - img.y };
          canvas.setPointerCapture(e.pointerId);
          this.activePointerId = e.pointerId;
          break;
        }
      }
    } else {
      this.isDrawing = true;
      canvas.setPointerCapture(e.pointerId);
      this.activePointerId = e.pointerId;

      // Borrador: inicia gesto continuo según el modo (trazo o píxeles)
      if (currentActiveTool === 'eraser') {
        this.beginErase(x, y);
        return;
      }

      const penDevice = e.pointerType === 'pen';
      const pressure = penDevice ? (e.pressure || 0.5) : 0.5;
      this.currentStroke = {
        points: [{ x, y, pressure }],
        color: this.selectedColor,
        width: this.brushWidth,
        pencilType: this.selectedPencilType,
        pen: penDevice
      };

      this.currentPageData.strokes.push(this.currentStroke);
      this.openStrokes.push({ idx: this.currentPageIndex, stroke: this.currentStroke });
      this.markDirty(this.currentPageIndex);
      this.redrawPage(this.currentPageIndex);
    }
  }

  onPointerMove(e: PointerEvent) {
    this.updateEraserRing(e);
    if (this.gesture || !this.activePageEl) return;
    const { x, y } = this.toSheetCoords(e, this.activePageEl);

    if (this.isDraggingImage && this.selectedImageIndex !== null) {
      const img = this.currentPageData.images[this.selectedImageIndex];
      img.x = x - this.dragOffset.x;
      img.y = y - this.dragOffset.y;
      this.markDirty(this.currentPageIndex);
      this.redrawPage(this.currentPageIndex);
    } else if (this.isDrawing) {
      const isStylusEraser = e.pointerType === 'eraser' || (e.buttons & 32) !== 0;
      const eraserActive = isStylusEraser || this.selectedTool === 'eraser';

      // Se activó el borrador a mitad de trazo de lápiz: descartar el trazo
      if (isStylusEraser && this.currentStroke && !this.currentStroke.pixelEraser) {
        const arr = this.currentPageData.strokes;
        const idx = arr.indexOf(this.currentStroke);
        if (idx !== -1) arr.splice(idx, 1);
        this.currentStroke = null;
      }

      if (eraserActive) {
        // Arrastre continuo: borra a lo largo del recorrido del puntero
        this.continueErase(x, y);
        return;
      }

      if (!this.currentStroke || this.currentStroke.pixelEraser) return;
      const pressure = this.currentStroke.pen ? (e.pressure || 0.5) : 0.5;
      this.currentStroke.points.push({ x, y, pressure });
      this.redrawPage(this.currentPageIndex);
    }
  }

  onPointerUp(e: PointerEvent) {
    const canvas = this.activePageEl || (e.currentTarget as HTMLCanvasElement);

    if (this.isDraggingImage) {
      this.isDraggingImage = false;
      this.selectedImageIndex = null;
      canvas.releasePointerCapture(e.pointerId);
      this.triggerAutoSave();
    } else if (this.isDrawing) {
      this.isDrawing = false;
      this.openStrokes = this.openStrokes.filter(o => o.stroke !== this.currentStroke);
      this.currentStroke = null;
      this.lastErase = null;
      canvas.releasePointerCapture(e.pointerId);
      // Render final con remates de contorno cerrados
      this.redrawPage(this.currentPageIndex);
      this.triggerAutoSave();
    }

    if (e.pointerId === this.activePointerId) {
      this.activePageEl = null;
      this.activePointerId = null;
    }
  }

  onPointerLeave(e: PointerEvent) {
    if (this.isDrawing) {
      this.onPointerUp(e);
    } else {
      this.showEraserRing = false;
    }
  }

  /** Muestra/actualiza el anillo del borrador bajo el puntero */
  private updateEraserRing(e: PointerEvent) {
    if (this.gesture || e.pointerType === 'touch' || this.selectedTool !== 'eraser') {
      this.showEraserRing = false;
      return;
    }
    const overSheet = !!(e.target as HTMLElement)?.closest?.('.a4-sheet');
    this.showEraserRing = overSheet;
    if (overSheet) {
      this.ringX = e.clientX;
      this.ringY = e.clientY;
    }
  }

  // ----------------------------------------------------
  // PEGADO DE IMÁGENES (Ctrl + V)
  // ----------------------------------------------------
  @HostListener('window:paste', ['$event'])
  onPasteImage(event: ClipboardEvent) {
    if (!this.activeNotebook) return;
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (!file) continue;

        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;

          this.currentPageData.images.push({
            src,
            x: 200,
            y: 350,
            width: 300,
            height: 300
          });

          this.markDirty(this.currentPageIndex);
          this.redrawAll();
          this.triggerAutoSave();
        };
        reader.readAsDataURL(file);
        event.preventDefault();
        break;
      }
    }
  }

  // ----------------------------------------------------
  // PERSISTENCIA Y AUTOGUARDADO (Debounce 2s)
  // ----------------------------------------------------
  triggerAutoSave() {
    this.isSaving = true;
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveCurrentPageImmediately();
    }, 2000);
  }

  async saveCurrentPageImmediately() {
    if (!this.activeNotebook || this.dirtyPages.size === 0) return;
    try {
      // Guarda todas las páginas modificadas del flujo continuo
      for (const idx of Array.from(this.dirtyPages)) {
        const page = this.pages[idx];
        if (!page) continue;
        await this.notebookService.savePage(
          this.activeNotebook.id,
          page.page_number,
          page.drawing_data
        );
        this.dirtyPages.delete(idx);
      }
    } catch (e) {
      console.error('Error al autoguardar páginas:', e);
    } finally {
      this.isSaving = false;
    }
  }

  /** Desplaza el flujo vertical hasta la página indicada */
  scrollToPage(index: number, behavior: ScrollBehavior = 'smooth') {
    const container = this.notebookContainer?.nativeElement;
    if (!container) return;
    const slot = container.querySelectorAll<HTMLElement>('.page-slot')[index];
    if (slot) {
      container.scrollTo({ top: slot.offsetTop - 14, behavior });
    }
  }

  /** Detecta la página visible según el scroll (como el lector de PDF) */
  onSheetScroll() {
    const container = this.notebookContainer?.nativeElement;
    if (!container || !this.pages.length) return;
    const slots = container.querySelectorAll<HTMLElement>('.page-slot');
    const reference = container.scrollTop + container.clientHeight * 0.3;
    let active = 0;
    slots.forEach((slot, i) => {
      if (slot.offsetTop <= reference) active = i;
    });
    this.currentPageIndex = active;
  }

  async addPage() {
    if (!this.activeNotebook) return;
    try {
      this.isSaving = true;
      const newPageNumber = this.pages.length + 1;
      const newPage: NotebookPage = {
        notebook_id: this.activeNotebook.id,
        page_number: newPageNumber,
        drawing_data: { strokes: [], images: [] }
      };

      await this.notebookService.savePage(newPage.notebook_id, newPage.page_number, newPage.drawing_data);
      this.pages.push(newPage);
      this.currentPageIndex = this.pages.length - 1;

      // El nuevo canvas se crea vía QueryList.changes -> refreshSheets()
      setTimeout(() => this.scrollToPage(this.pages.length - 1), 120);
    } catch (e) {
      console.error('Error agregando página:', e);
    } finally {
      this.isSaving = false;
    }
  }

  async deleteCurrentPage() {
    if (!this.activeNotebook || this.pages.length <= 1) return;
    if (!confirm(`¿Eliminar la página ${this.currentPageIndex + 1}? Perderás sus trazos e imágenes.`)) return;

    try {
      this.isSaving = true;
      const pageToDelete = this.pages[this.currentPageIndex];
      await this.notebookService.deletePage(this.activeNotebook.id, pageToDelete.page_number);

      this.pages.splice(this.currentPageIndex, 1);
      this.dirtyPages.clear();

      // Renumerar las páginas posteriores en la base de datos
      for (let i = this.currentPageIndex; i < this.pages.length; i++) {
        this.pages[i].page_number = i + 1;
        await this.notebookService.savePage(this.activeNotebook.id, this.pages[i].page_number, this.pages[i].drawing_data);
      }

      this.currentPageIndex = Math.max(0, Math.min(this.currentPageIndex, this.pages.length - 1));
      // La eliminación recrea los canvases posteriores -> refreshSheets()
      setTimeout(() => this.scrollToPage(this.currentPageIndex), 150);
    } catch (e) {
      console.error('Error eliminando página:', e);
    } finally {
      this.isSaving = false;
    }
  }

  // ----------------------------------------------------
  // ARCHIVOS PDF DEL CUADERNO (GUARDADOS EN LA BASE DE DATOS)
  // ----------------------------------------------------
  onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  onDropPDF(e: DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files as FileList).filter(f => f.type === 'application/pdf');
    if (files.length) void this.handlePdfFiles(files);
  }

  onPDFFileSelected(e: any) {
    const files = Array.from(e.target.files as FileList).filter(f => f.type === 'application/pdf');
    e.target.value = '';
    if (files.length) void this.handlePdfFiles(files);
  }

  /** Abre los archivos localmente: decodifica una vez y queda en memoria */
  private async handlePdfFiles(files: File[]) {
    for (const file of files) {
      const key = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      this.loadingFileId = key;
      try {
        const buf = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buf }).promise;
        const entry: SessionPdf = { key, name: file.name, doc, totalPages: doc.numPages };
        this.pdfDocs = [...this.pdfDocs, entry];
        this.activeFileId = key;
        this.activatePdf(doc);
      } catch (err) {
        console.error('Error abriendo PDF:', err);
        alert(`No se pudo abrir "${file.name}". Verifica que sea un PDF válido.`);
      } finally {
        this.loadingFileId = null;
      }
    }
  }

  /** Cambiar entre archivos ya abiertos es instantáneo (memoria) */
  openSessionPdf(entry: SessionPdf) {
    if (this.activeFileId === entry.key && this.pdfDoc) return;
    this.activeFileId = entry.key;
    this.activatePdf(entry.doc);
  }

  /** Quita un PDF de la sesión (solo memoria, sin confirmación) */
  removeSessionPdf(e: MouseEvent, entry: SessionPdf) {
    e.stopPropagation();
    this.pdfDocs = this.pdfDocs.filter(d => d.key !== entry.key);
    if (this.activeFileId === entry.key) this.closeViewer();
  }

  /** Prepara el visor para un documento; las páginas se dibujan bajo demanda */
  private activatePdf(doc: any) {
    this.pdfDoc = doc;
    this.pdfTotalPages = doc.numPages;
    this.pdfCurrentPage = 1;
    this.renderedPages.clear();
    this.renderingPages.clear();
    this.pdfPageNumbers = Array.from({ length: this.pdfTotalPages }, (_, i) => i + 1);
    this.pdfLoadingStatus = 'idle';
    this.cdr.detectChanges();

    // Las primeras páginas al instante; el resto entra por IntersectionObserver
    setTimeout(() => {
      const first = Math.min(3, this.pdfTotalPages);
      for (let n = 1; n <= first; n++) void this.renderSinglePdfPage(n);
      this.setupLazyObserver();
    }, 30);
  }

  /** Renderiza una página al acercarse al viewport (perezoso) */
  async renderSinglePdfPage(pageNum: number) {
    if (!this.pdfDoc || this.renderedPages.has(pageNum) || this.renderingPages.has(pageNum)) return;
    this.renderingPages.add(pageNum);

    try {
      const canvas = document.getElementById(`pdf-canvas-${pageNum}`) as HTMLCanvasElement | null;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const page = await this.pdfDoc.getPage(pageNum);
      const containerWidth = Math.max(220, (this.pdfContainer?.nativeElement?.clientWidth || 320) - 8);
      const viewportStandard = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: containerWidth / viewportStandard.width });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      this.renderedPages.add(pageNum);
    } catch (err) {
      console.warn(`Página ${pageNum} sin renderizar:`, err);
    } finally {
      this.renderingPages.delete(pageNum);
    }
  }

  /** Observa los wrappers y dibuja cada página al acercarse al viewport */
  private setupLazyObserver() {
    this.pdfObserver?.disconnect();
    const rootEl = this.pdfContainer?.nativeElement;
    if (!rootEl || typeof IntersectionObserver === 'undefined') return;

    this.pdfObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const num = Number((entry.target as HTMLElement).dataset['page']);
        if (num) void this.renderSinglePdfPage(num);
      }
    }, { root: rootEl, rootMargin: '900px 0px' });

    rootEl.querySelectorAll<HTMLElement>('.pdf-page-wrapper').forEach(w => this.pdfObserver!.observe(w));
  }

  /** Tras redimensionar el panel, re-renderiza con nitidez (con debounce) */
  private scheduleRerender() {
    if (!this.pdfDoc) return;
    clearTimeout(this.rerenderTimer);
    this.rerenderTimer = setTimeout(async () => {
      const nums = [...this.renderedPages];
      this.renderedPages.clear();
      for (const n of nums) await this.renderSinglePdfPage(n);
    }, 400);
  }

  // Detectar la página en vista activa mediante scroll
  onPdfScroll() {
    if (!this.pdfContainer || this.pdfPageNumbers.length === 0) return;
    const container = this.pdfContainer.nativeElement;
    const scrollTop = container.scrollTop;

    let activePage = 1;
    for (const pageNum of this.pdfPageNumbers) {
      const canvas = document.getElementById(`pdf-canvas-${pageNum}`);
      if (canvas) {
        const offsetTop = canvas.offsetTop;
        if (scrollTop + 180 >= offsetTop) {
          activePage = pageNum;
        }
      }
    }
    this.pdfCurrentPage = activePage;
  }

  closePDF() {
    this.pdfObserver?.disconnect();
    this.pdfDoc = null;
    this.activeFileId = null;
    this.pdfCurrentPage = 1;
    this.pdfTotalPages = 1;
    this.pdfPageNumbers = [];
    this.renderedPages.clear();
    this.renderingPages.clear();
    this.pdfLoadingStatus = 'idle';
  }

  // ----------------------------------------------------
  // EXPORTAR A PDF (LIBRERÍA JSPDF)
  // ----------------------------------------------------
  async exportToPDF() {
    if (!this.activeNotebook) return;
    try {
      this.isSaving = true;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });

      for (let i = 0; i < this.pages.length; i++) {
        if (i > 0) {
          doc.addPage();
        }

        // Render a 2x para máxima fidelidad en el PDF exportado.
        // El contenido se dibuja en un buffer transparente para que el
        // borrador de píxeles (destination-out) funcione igual que en
        // pantalla, y después se compone sobre el fondo con cuadrícula.
        const EXPORT_SCALE = 2;
        const contentCanvas = document.createElement('canvas');
        contentCanvas.width = SHEET_W * EXPORT_SCALE;
        contentCanvas.height = SHEET_H * EXPORT_SCALE;
        const contentCtx = contentCanvas.getContext('2d');
        if (!contentCtx) continue;
        contentCtx.scale(EXPORT_SCALE, EXPORT_SCALE);

        const pageData = (this.pages[i].drawing_data || { strokes: [], images: [] }) as PageData;

        for (const img of pageData.images) {
          const el = this.imageElementsCache.get(img.src) || new Image();
          if (!el.src) el.src = img.src;

          if (!el.complete) {
            await new Promise((resolve) => { el.onload = resolve; });
          }
          contentCtx.drawImage(el, img.x, img.y, img.width, img.height);
        }

        // Mismo renderizador vectorial que en pantalla (incluye borrador píxel)
        for (const stroke of pageData.strokes) {
          this.drawStrokePath(contentCtx, stroke, false);
        }
        contentCtx.globalAlpha = 1.0;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = SHEET_W * EXPORT_SCALE;
        tempCanvas.height = SHEET_H * EXPORT_SCALE;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) continue;
        tempCtx.scale(EXPORT_SCALE, EXPORT_SCALE);

        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, SHEET_W, SHEET_H);

        // Misma cuadrícula que la hoja (CSS: 20px, #e5e7eb)
        tempCtx.strokeStyle = '#e5e7eb';
        tempCtx.lineWidth = 1;
        const gridSize = 20;
        for (let x = gridSize; x < SHEET_W; x += gridSize) {
          tempCtx.beginPath();
          tempCtx.moveTo(x, 0);
          tempCtx.lineTo(x, SHEET_H);
          tempCtx.stroke();
        }
        for (let y = gridSize; y < SHEET_H; y += gridSize) {
          tempCtx.beginPath();
          tempCtx.moveTo(0, y);
          tempCtx.lineTo(SHEET_W, y);
          tempCtx.stroke();
        }

        // Componer el contenido (con sus zonas borradas) encima del fondo
        tempCtx.drawImage(contentCanvas, 0, 0, SHEET_W, SHEET_H);

        const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
        doc.addImage(dataUrl, 'JPEG', 0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight());
      }

      doc.save(`${this.activeNotebook.title || 'Cuaderno'} - ${this.getCourseName(this.activeNotebook.course_id)}.pdf`);

    } catch (e) {
      console.error('Error exportando PDF:', e);
      alert('Hubo un error al exportar tus apuntes a PDF.');
    } finally {
      this.isSaving = false;
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.updateSheetScale();
    this.scheduleRerender();
  }
}
