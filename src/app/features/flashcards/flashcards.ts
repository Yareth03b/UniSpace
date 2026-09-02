import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppStateService } from '../../core/services/app-state.service';
import { FlashcardService } from '../../core/services/flashcard.service';
import { Flashcard, FlashcardDeckSummary } from '../../core/models/flashcard.model';

@Component({
  selector: 'app-flashcards',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flashcards-container">
      <!-- ================= HEADER PRINCIPAL ================= -->
      <header class="fc-header">
        <div class="title-area">
          <p class="eyebrow">ESTUDIO ACTIVO</p>
          <h1>Flashcards</h1>
          <span class="subtitle">Tarjetas de memoria interactivas organizadas por tus materias y cursos.</span>
        </div>

        <div class="header-actions">
          <div class="view-toggles">
            <button class="toggle-btn" [class.active]="viewMode() === 'DECKS'" (click)="viewMode.set('DECKS')" title="Ver mazos de cursos">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <span>Mazos</span>
            </button>
            <button class="toggle-btn" [class.active]="viewMode() === 'STUDY'" (click)="switchToStudy(fcService.activeDeckKey())" title="Modo estudio 3D">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <span>Estudio 3D</span>
            </button>
            <button class="toggle-btn" [class.active]="viewMode() === 'LIST'" (click)="viewMode.set('LIST')" title="Ver lista de tarjetas">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              <span>Gestionar</span>
            </button>
          </div>

          <button class="btn ghost-btn" (click)="openImportModal()">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Importar mazo</span>
          </button>

          <button class="btn primary-btn" (click)="openNewCardModal()">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            <span>Nueva flashcard</span>
          </button>
        </div>
      </header>

      <!-- ================= VISTA 1: MAZOS POR CURSO / MATERIA ================= -->
      @if (viewMode() === 'DECKS') {
        <section class="decks-section">
          <div class="decks-grid">
            @for (deck of fcService.deckSummaries(); track deck.deckKey) {
              <article class="deck-card glass">
                <div class="deck-accent-bar" [style.background]="deck.color"></div>
                
                <div class="deck-body">
                  <div class="deck-top">
                    <span class="deck-badge" [style.background]="deck.color + '22'" [style.color]="deck.color">
                      {{ deck.isCustomDeck ? 'Mazo de Estudio' : deck.courseName }}
                    </span>
                    <div class="deck-top-actions">
                      @if (deck.isCustomDeck) {
                        <button class="create-course-chip" (click)="createCourseFromDeck(deck.courseName)" title="Crear este curso oficialmente en UniSpace para tener cuaderno y tareas">
                          ✨ Crear curso
                        </button>
                      }
                      <button class="deck-share-btn" (click)="openShareModal(deck.deckKey)" title="Compartir mazo con compañeros">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                      </button>
                      <button class="deck-delete-btn" (click)="deleteDeck(deck)" title="Eliminar todo el mazo completo y sus tarjetas">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>

                  <h3 class="deck-title">{{ deck.courseName }}</h3>

                  <div class="deck-meta">
                    <span><strong>{{ deck.totalCards }}</strong> {{ deck.totalCards === 1 ? 'tarjeta' : 'tarjetas' }}</span>
                    <span>•</span>
                    <span class="mastered-count"><strong>{{ deck.masteredCards }}</strong> dominadas</span>
                  </div>

                  <div class="deck-progress-bar">
                    <div class="deck-progress-fill" [style.width.%]="deck.progressPercentage" [style.background]="deck.color"></div>
                  </div>
                  <small class="progress-lbl">{{ deck.progressPercentage }}% completado</small>
                </div>

                <div class="deck-actions">
                  <button class="btn-deck study" [disabled]="deck.totalCards === 0" (click)="startStudy(deck.deckKey)">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    <span>Estudiar</span>
                  </button>
                  <button class="btn-deck manage" (click)="manageDeck(deck.deckKey)">
                    <span>Ver tarjetas</span>
                  </button>
                </div>
              </article>
            } @empty {
              <div class="empty-state glass">
                <div class="empty-icon">
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="16" height="14" rx="3"/><path d="M6 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/></svg>
                </div>
                <h3>Aún no tienes flashcards</h3>
                <p>Crea tu primera tarjeta de estudio interactiva o importa tus mazos desde un archivo .json.</p>
                <div class="empty-actions">
                  <button class="btn primary-btn" (click)="openNewCardModal()">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    <span>Nueva flashcard</span>
                  </button>
                  <button class="btn ghost-btn" (click)="openImportModal()">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>Importar archivo .json</span>
                  </button>
                </div>
              </div>
            }
          </div>
        </section>
      }

      <!-- ================= VISTA 2: ESTUDIO 3D INTERACTIVO ================= -->
      @if (viewMode() === 'STUDY') {
        <section class="study-section">
          <!-- Barra superior de estudio -->
          <div class="study-toolbar glass">
            <button class="back-link" (click)="viewMode.set('DECKS')">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              <span>Volver a mazos</span>
            </button>

            <div class="course-filter-pill">
              <label>Mazo activo:</label>
              <select [ngModel]="fcService.activeDeckKey()" (ngModelChange)="onFilterDeckChange($event)">
                <option value="ALL">Todas las tarjetas</option>
                @for (deck of fcService.deckSummaries(); track deck.deckKey) {
                  <option [value]="deck.deckKey">{{ deck.courseName }}</option>
                }
              </select>
            </div>

            <div class="stats-badge">
              <span>{{ fcService.studyStats().currentNumber }} / {{ fcService.studyStats().total }}</span>
              <div class="micro-progress">
                <div class="micro-fill" [style.width.%]="fcService.studyStats().percentage"></div>
              </div>
              <span class="pct">{{ fcService.studyStats().percentage }}% dominado</span>
            </div>
          </div>

          <!-- Escenario de la Tarjeta 3D -->
          @if (fcService.currentCard(); as card) {
            <div class="card-scene">
              <div class="flashcard-3d" [class.flipped]="fcService.isFlipped()" (click)="fcService.toggleFlip()">
                <!-- ANVERSO (TÉRMINO) -->
                <div class="card-face card-front glass">
                  <div class="card-header-bar">
                    <span class="course-tag">
                      {{ getCardCourseName(card) }}
                    </span>
                    <div class="card-header-right">
                      <span class="status-tag" [class.mastered]="card.mastered">
                        {{ card.mastered ? '★ Dominada' : 'Por repasar' }}
                      </span>
                      <button class="card-mini-btn" (click)="$event.stopPropagation(); openEditModal(card)" title="Editar esta tarjeta">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      </button>
                      <button class="card-mini-btn del" (click)="$event.stopPropagation(); deleteCard(card)" title="Eliminar esta tarjeta">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>

                  <div class="front-content">
                    <p class="card-prompt">TÉRMINO / PREGUNTA</p>
                    <h2 class="card-term">{{ card.term }}</h2>

                    @if (card.imageUrl) {
                      <div class="image-thumb" (click)="zoomImage($event, card.imageUrl)">
                        <img [src]="card.imageUrl" alt="Imagen de la tarjeta" loading="lazy" />
                        <span class="zoom-hint">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                          Ampliar imagen
                        </span>
                      </div>
                    }
                  </div>

                  <div class="card-footer-hint">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                    <span>Haz clic o pulsa <b>Espacio</b> para ver el concepto</span>
                  </div>
                </div>

                <!-- REVERSO (CONCEPTO / DEFINICIÓN) -->
                <div class="card-face card-back glass">
                  <div class="card-header-bar">
                    <span class="concept-tag">DEFINICIÓN / CONCEPTO</span>
                    <div class="card-header-right">
                      <button class="master-toggle-btn" [class.is-mastered]="card.mastered" (click)="toggleMasteredCurrent($event, card.id)">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                        <span>{{ card.mastered ? '¡Dominada!' : 'Marcar como dominada' }}</span>
                      </button>
                      <button class="card-mini-btn" (click)="$event.stopPropagation(); openEditModal(card)" title="Editar esta tarjeta">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      </button>
                      <button class="card-mini-btn del" (click)="$event.stopPropagation(); deleteCard(card)" title="Eliminar esta tarjeta">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>

                  <div class="back-content">
                    <h3 class="back-term-title">{{ card.term }}</h3>
                    <div class="concept-text">
                      {{ card.concept }}
                    </div>

                    @if (card.notes) {
                      <div class="key-notes glass">
                        <strong>
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                          Puntos Clave / Detalles:
                        </strong>
                        <p>{{ card.notes }}</p>
                      </div>
                    }

                    @if (card.imageUrl) {
                      <div class="back-image-box" (click)="zoomImage($event, card.imageUrl)">
                        <img [src]="card.imageUrl" alt="Imagen concepto" loading="lazy" />
                        <span>Ver en tamaño completo</span>
                      </div>
                    }
                  </div>

                  <div class="card-footer-hint">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                    <span>Haz clic para voltear al término</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Controles de navegación y acción -->
            <div class="study-controls">
              <button class="nav-btn" (click)="fcService.prevCard()" title="Tarjeta anterior (←)">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                <span>Anterior</span>
              </button>

              <button class="flip-action-btn" (click)="fcService.toggleFlip()" title="Voltear tarjeta (Espacio)">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                <span>Girar</span>
              </button>

              <button class="master-action-btn" [class.active]="card.mastered" (click)="fcService.toggleMastered(card.id)" title="Marcar/desmarcar aprendida (M)">
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                <span>{{ card.mastered ? 'Dominada' : 'Aprender' }}</span>
              </button>

              <button class="nav-btn edit-study-btn" (click)="openEditModal(card)" title="Editar esta tarjeta">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                <span>Editar</span>
              </button>

              <button class="shuffle-btn" (click)="fcService.shuffle()" title="Mezclar orden (R)">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
                <span>Mezclar</span>
              </button>

              <button class="nav-btn del-study-btn" (click)="deleteCard(card)" title="Eliminar esta tarjeta">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                <span>Borrar</span>
              </button>

              <button class="nav-btn" (click)="fcService.nextCard()" title="Siguiente tarjeta (→)">
                <span>Siguiente</span>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            <!-- Leyenda de atajos de teclado -->
            <div class="keyboard-shortcuts">
              <span><kbd>Espacio</kbd> Voltear</span>
              <span><kbd>←</kbd> <kbd>→</kbd> Navegar</span>
              <span><kbd>M</kbd> Dominar</span>
              <span><kbd>R</kbd> Mezclar</span>
            </div>
          } @else {
            <div class="empty-state glass">
              <h3>No hay tarjetas en este mazo</h3>
              <p>Agrega la primera tarjeta o selecciona otro mazo arriba.</p>
              <button class="btn primary-btn" (click)="openNewCardModal()">+ Agregar flashcard</button>
            </div>
          }
        </section>
      }

      <!-- ================= VISTA 3: GESTIÓN Y LISTA DE TARJETAS ================= -->
      @if (viewMode() === 'LIST') {
        <section class="list-section">
          <div class="list-filters glass">
            <div class="search-box">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" [ngModel]="fcService.searchQuery()" (ngModelChange)="fcService.searchQuery.set($event)" placeholder="Buscar por término o concepto..." />
            </div>

            <div class="filter-controls">
              <select [ngModel]="fcService.activeDeckKey()" (ngModelChange)="fcService.selectDeck($event)">
                <option value="ALL">Todos los mazos</option>
                @for (deck of fcService.deckSummaries(); track deck.deckKey) {
                  <option [value]="deck.deckKey">{{ deck.courseName }}</option>
                }
              </select>

              <select [ngModel]="fcService.filterMastered()" (ngModelChange)="fcService.filterMastered.set($event)">
                <option value="ALL">Todas las tarjetas</option>
                <option value="PENDING">Solo por repasar</option>
                <option value="MASTERED">Solo dominadas</option>
              </select>

              @if (fcService.activeDeckKey() !== 'ALL') {
                <button class="btn danger-btn-sm" (click)="deleteCurrentActiveDeck()" title="Eliminar todo este mazo con todas sus tarjetas">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  <span>Borrar este mazo</span>
                </button>
              }
            </div>
          </div>

          <div class="cards-table-wrap">
            <div class="cards-grid">
              @for (c of fcService.filteredCards(); track c.id) {
                <article class="card-item glass" [class.mastered]="c.mastered">
                  <div class="item-head">
                    <span class="course-chip">{{ getCardCourseName(c) }}</span>
                    <div class="item-actions">
                      <button class="item-master-btn" [class.active]="c.mastered" (click)="fcService.toggleMastered(c.id)" title="Alternar dominada">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                      </button>
                      <button class="item-btn edit" (click)="openEditModal(c)" title="Editar">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      </button>
                      <button class="item-btn del" (click)="deleteCard(c)" title="Eliminar">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>

                  @if (c.imageUrl) {
                    <div class="item-image-preview" (click)="zoomImage($event, c.imageUrl)">
                      <img [src]="c.imageUrl" alt="Miniatura" />
                    </div>
                  }

                  <h4 class="item-term">{{ c.term }}</h4>
                  <p class="item-concept">{{ c.concept }}</p>

                  @if (c.notes) {
                    <small class="item-notes">{{ c.notes }}</small>
                  }
                </article>
              } @empty {
                <div class="empty-state glass full-width">
                  <p>No se encontraron tarjetas que coincidan con la búsqueda o filtro.</p>
                </div>
              }
            </div>
          </div>
        </section>
      }

      <!-- ================= MODAL: CREAR / EDITAR FLASHCARD ================= -->
      @if (showCardModal()) {
        <div class="modal-overlay" (click)="closeCardModal()">
          <div class="modal-card glass" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h2>{{ isEditing() ? 'Editar Flashcard' : 'Nueva Flashcard' }}</h2>
              <button class="close-btn" (click)="closeCardModal()">✕</button>
            </div>

            <form (ngSubmit)="saveCard()">
              <label>
                Materia / Curso asignado
                <select name="modalCourse" [(ngModel)]="modalData.courseId">
                  <option [value]="null">Mazo independiente: {{ modalData.deckName || 'General' }}</option>
                  @for (c of appState.courses(); track c.id) {
                    <option [value]="c.id">{{ c.name }}</option>
                  }
                </select>
              </label>

              @if (!modalData.courseId) {
                <label>
                  Nombre del mazo
                  <input name="modalDeckName" [(ngModel)]="modalData.deckName" placeholder="Ej: Redes, Matemáticas, Programación..." />
                </label>
              }

              <label>
                Término o Pregunta (Anverso) *
                <input name="modalTerm" [(ngModel)]="modalData.term" required maxlength="120" placeholder="Ej: SSH, Latencia, Ecuación de Shannon..." />
              </label>

              <label>
                Concepto o Definición (Reverso) *
                <textarea name="modalConcept" [(ngModel)]="modalData.concept" required rows="4" placeholder="Escribe aquí la explicación completa..."></textarea>
              </label>

              <label>
                Notas clave / Fórmulas / Puertos (Opcional)
                <textarea name="modalNotes" [(ngModel)]="modalData.notes" rows="2" placeholder="Ej: Opera sobre el puerto TCP 22, usa criptografía asimétrica..."></textarea>
              </label>

              <!-- Sección de Imagen -->
              <div class="image-upload-section">
                <span class="sec-label">Imagen ilustrativa (Opcional)</span>

                <div class="image-tabs">
                  <button type="button" class="tab-btn" [class.active]="imageTab() === 'FILE'" (click)="imageTab.set('FILE')">Subir desde PC</button>
                  <button type="button" class="tab-btn" [class.active]="imageTab() === 'URL'" (click)="imageTab.set('URL')">Enlace URL</button>
                </div>

                @if (imageTab() === 'FILE') {
                  <div class="file-dropzone" (click)="fileInput.click()">
                    <input #fileInput type="file" accept="image/*" (change)="onFileSelected($event)" style="display: none;" />
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span>Haz clic para seleccionar una foto desde tu equipo</span>
                    <small>JPG, PNG, GIF, WebP (Se guarda localmente en tu UniSpace)</small>
                  </div>
                } @else {
                  <input type="url" name="modalImgUrl" [(ngModel)]="modalData.imageUrl" placeholder="https://ejemplo.com/diagrama.png" />
                }

                @if (modalData.imageUrl) {
                  <div class="modal-img-preview">
                    <img [src]="modalData.imageUrl" alt="Previsualización" />
                    <button type="button" class="remove-img-btn" (click)="modalData.imageUrl = null">Quitar imagen</button>
                  </div>
                }
              </div>

              <div class="modal-actions">
                <button type="button" class="btn ghost-btn" (click)="closeCardModal()">Cancelar</button>
                <button type="button" class="btn primary-btn" (click)="saveCard()">{{ isEditing() ? 'Guardar Cambios' : 'Crear Tarjeta' }}</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ================= MODAL: COMPARTIR MAZO ================= -->
      @if (showShareModal()) {
        <div class="modal-overlay" (click)="showShareModal.set(false)">
          <div class="modal-card glass" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h2>Compartir Mazo con Compañeros</h2>
              <button class="close-btn" (click)="showShareModal.set(false)">✕</button>
            </div>

            <p class="modal-desc">
              Comparte tus flashcards con otros estudiantes de UniSpace. Pueden importar este código directamente en su aplicación.
            </p>

            <div class="code-box-wrap">
              <label>Código de intercambio / JSON:</label>
              <textarea readonly class="share-code-area">{{ sharePayloadJson() }}</textarea>
            </div>

            <div class="share-actions-row">
              <button class="btn primary-btn" (click)="copyShareCode()">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span>{{ copiedText() ? '¡Copiado al portapapeles!' : 'Copiar código' }}</span>
              </button>
              <button class="btn ghost-btn" (click)="downloadShareJson()">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Descargar archivo .json</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ================= MODAL: IMPORTAR MAZO ================= -->
      @if (showImportModal()) {
        <div class="modal-overlay" (click)="showImportModal.set(false)">
          <div class="modal-card glass" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h2>Importar Mazo de Estudio</h2>
              <button class="close-btn" (click)="showImportModal.set(false)">✕</button>
            </div>

            <p class="modal-desc">
              Pega aquí el código que te compartió tu compañero o carga su archivo descargado.
            </p>

            <form (ngSubmit)="processImport()">
              <label>
                Asignar al curso (Opcional):
                <select [(ngModel)]="importTargetCourseId" name="targetCourse">
                  <option [value]="null">Conservar nombre original del mazo / archivo</option>
                  @for (c of appState.courses(); track c.id) {
                    <option [value]="c.id">{{ c.name }}</option>
                  }
                </select>
              </label>

              <div class="file-dropzone small" (click)="importFileInput.click()">
                <input #importFileInput type="file" accept=".json,application/json" (change)="onImportFileSelected($event)" style="display: none;" />
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Cargar archivo .json desde tu PC (opcional)</span>
              </div>

              <label>
                O pega el código de intercambio:
                <textarea name="rawCode" [(ngModel)]="importRawCode" required rows="5" placeholder="Pega el código o JSON aquí..."></textarea>
              </label>

              @if (importError()) {
                <div class="error-msg">⚠️ {{ importError() }}</div>
              }

              <div class="modal-actions">
                <button type="button" class="btn ghost-btn" (click)="showImportModal.set(false)">Cancelar</button>
                <button type="submit" class="btn primary-btn">Importar a UniSpace</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ================= MODAL: ZOOM IMAGEN ================= -->
      @if (zoomedImageUrl()) {
        <div class="zoom-overlay" (click)="zoomedImageUrl.set(null)">
          <div class="zoom-box" (click)="$event.stopPropagation()">
            <img [src]="zoomedImageUrl()!" alt="Zoom" />
            <button class="zoom-close" (click)="zoomedImageUrl.set(null)">✕ Cerrar</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* ============================================================
       FLASHCARDS - COSMOS PROFUNDO 2.0 UI
       ============================================================ */
    :host {
      display: block;
      width: 100%;
      min-height: 100%;
    }

    .flashcards-container {
      display: flex;
      flex-direction: column;
      gap: 26px;
      padding-bottom: 50px;
    }

    /* ---------- HEADER ---------- */
    .fc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
    }

    .eyebrow {
      margin: 0;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: .12em;
      color: var(--accent-light);
    }

    h1 {
      margin: 4px 0 0;
      font-family: var(--font-display);
      font-size: 34px;
      font-weight: 600;
      letter-spacing: -.02em;
    }

    .subtitle {
      display: block;
      color: var(--ink-dim);
      font-size: 13.5px;
      margin-top: 4px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .view-toggles {
      display: flex;
      background: rgba(15, 23, 42, .75);
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      padding: 3px;
      gap: 3px;
    }

    .toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 0;
      color: var(--ink-dim);
      padding: 7px 12px;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 600;
      transition: all .2s;
    }

    .toggle-btn.active {
      background: rgba(99, 102, 241, .25);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(99, 102, 241, .3);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 0;
      border-radius: 7px;
      padding: 9px 15px;
      font-size: 13px;
      font-weight: 600;
      transition: all .2s ease;
      cursor: pointer;
    }

    .primary-btn {
      background: linear-gradient(135deg, var(--primary), var(--primary-light));
      color: #ffffff;
      box-shadow: 0 4px 16px rgba(55, 48, 163, .35);
    }
    .primary-btn:hover {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }

    .ghost-btn {
      background: rgba(15, 23, 42, .6);
      border: 1px solid var(--glass-border);
      color: var(--ink);
    }
    .ghost-btn:hover {
      background: rgba(99, 102, 241, .15);
      border-color: var(--accent-light);
    }

    /* ---------- MAZOS GRID ---------- */
    .decks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 20px;
    }

    .deck-card {
      position: relative;
      border-radius: 12px;
      border: 1px solid var(--glass-border);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
    }
    .deck-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 30px rgba(0, 0, 0, .4);
      border-color: rgba(99, 102, 241, .4);
    }

    .deck-accent-bar {
      height: 4px;
      width: 100%;
    }

    .deck-body {
      padding: 20px;
    }

    .deck-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .deck-badge {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .deck-top-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .create-course-chip {
      background: rgba(37, 99, 235, .2);
      border: 1px solid rgba(59, 130, 246, .4);
      color: #93c5fd;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      cursor: pointer;
      transition: all .2s;
    }
    .create-course-chip:hover {
      background: rgba(37, 99, 235, .4);
      color: #ffffff;
      transform: translateY(-1px);
    }

    .deck-share-btn {
      background: transparent;
      border: 0;
      color: var(--ink-dim);
      padding: 4px;
      border-radius: 4px;
      transition: color .2s;
      cursor: pointer;
    }
    .deck-share-btn:hover {
      color: var(--accent-light);
    }

    .deck-delete-btn {
      background: transparent;
      border: 0;
      color: var(--ink-dim);
      padding: 4px;
      border-radius: 4px;
      transition: all .2s;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .deck-delete-btn:hover {
      color: #f87171;
      background: rgba(220, 38, 38, .15);
    }

    .danger-btn-sm {
      background: rgba(220, 38, 38, .15);
      border: 1px solid rgba(220, 38, 38, .3);
      color: #f87171;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all .2s;
    }
    .danger-btn-sm:hover {
      background: rgba(220, 38, 38, .3);
      color: #ffffff;
      border-color: var(--danger);
      transform: translateY(-1px);
    }

    .deck-title {
      margin: 0 0 10px;
      font-size: 18px;
      font-weight: 600;
      color: var(--ink);
    }

    .deck-meta {
      display: flex;
      gap: 8px;
      font-size: 12.5px;
      color: var(--ink-dim);
      margin-bottom: 14px;
    }

    .mastered-count strong {
      color: #34d399;
    }

    .deck-progress-bar {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, .08);
      border-radius: 99px;
      overflow: hidden;
    }

    .deck-progress-fill {
      height: 100%;
      border-radius: 99px;
      transition: width .4s ease;
    }

    .progress-lbl {
      display: block;
      margin-top: 6px;
      font-size: 11px;
      color: var(--ink-dim);
      text-align: right;
    }

    .deck-actions {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      border-top: 1px solid var(--glass-border);
    }

    .btn-deck {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 12px;
      font-size: 12.5px;
      font-weight: 600;
      border: 0;
      background: transparent;
      color: var(--ink);
      transition: background .2s;
      cursor: pointer;
    }

    .btn-deck.study {
      color: var(--accent-light);
      border-right: 1px solid var(--glass-border);
    }
    .btn-deck.study:hover:not(:disabled) {
      background: rgba(59, 130, 246, .15);
    }
    .btn-deck.study:disabled {
      opacity: .4;
      cursor: not-allowed;
    }

    .btn-deck.manage:hover {
      background: rgba(255, 255, 255, .05);
      color: #ffffff;
    }

    /* ---------- ESTUDIO 3D ---------- */
    .study-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 22px;
    }

    .study-toolbar {
      width: 100%;
      max-width: 720px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      border-radius: 10px;
      border: 1px solid var(--glass-border);
      flex-wrap: wrap;
      gap: 12px;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 0;
      color: var(--ink-dim);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
    }
    .back-link:hover {
      color: var(--ink);
    }

    .course-filter-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: var(--ink-dim);
    }

    .course-filter-pill select, .filter-controls select {
      background: rgba(6, 11, 26, .8);
      border: 1px solid var(--glass-border);
      color: var(--ink);
      border-radius: 6px;
      padding: 5px 10px;
      font-size: 12px;
    }

    .stats-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12.5px;
      font-weight: 600;
    }

    .micro-progress {
      width: 60px;
      height: 5px;
      background: rgba(255, 255, 255, .1);
      border-radius: 99px;
      overflow: hidden;
    }

    .micro-fill {
      height: 100%;
      background: #34d399;
      transition: width .3s ease;
    }

    .pct {
      color: #34d399;
      font-size: 11.5px;
    }

    /* Escenario y Carta 3D */
    .card-scene {
      width: 100%;
      max-width: 680px;
      height: 400px;
      perspective: 1400px;
      user-select: none;
    }

    .flashcard-3d {
      position: relative;
      width: 100%;
      height: 100%;
      transform-style: preserve-3d;
      transition: transform .6s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }

    .flashcard-3d.flipped {
      transform: rotateY(180deg);
    }

    .card-face {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      border-radius: 16px;
      border: 1px solid rgba(99, 102, 241, .28);
      box-shadow: 0 20px 45px rgba(0, 0, 0, .55);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 26px 30px;
      box-sizing: border-box;
      overflow-y: auto;
    }

    .card-face:hover {
      border-color: rgba(99, 102, 241, .5);
    }

    .card-back {
      transform: rotateY(180deg);
      background: linear-gradient(165deg, rgba(20, 27, 45, 0.94), rgba(10, 16, 32, 0.92));
    }

    .card-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .course-tag, .concept-tag {
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--accent-light);
    }

    .status-tag {
      font-size: 11.5px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, .08);
      color: var(--ink-dim);
    }
    .status-tag.mastered {
      background: rgba(52, 211, 153, .15);
      color: #34d399;
    }

    .card-header-right {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .card-mini-btn {
      background: rgba(255, 255, 255, .08);
      border: 1px solid var(--glass-border);
      border-radius: 6px;
      color: var(--ink-dim);
      padding: 4px 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all .2s;
    }
    .card-mini-btn:hover {
      background: rgba(99, 102, 241, .25);
      color: #ffffff;
      border-color: var(--accent-light);
      transform: translateY(-1px);
    }
    .card-mini-btn.del:hover {
      background: rgba(220, 38, 38, .25);
      color: #f87171;
      border-color: var(--danger);
      transform: translateY(-1px);
    }

    .master-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, .08);
      border: 1px solid var(--glass-border);
      border-radius: 6px;
      color: var(--ink-dim);
      padding: 4px 10px;
      font-size: 11.5px;
      font-weight: 600;
      transition: all .2s;
      cursor: pointer;
    }
    .master-toggle-btn.is-mastered {
      background: rgba(52, 211, 153, .2);
      border-color: #34d399;
      color: #34d399;
    }

    .front-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 16px;
      margin: auto 0;
    }

    .card-prompt {
      margin: 0;
      font-size: 11px;
      letter-spacing: .12em;
      color: var(--ink-dim);
      font-weight: 700;
    }

    .card-term {
      margin: 0;
      font-family: var(--font-display);
      font-size: 30px;
      font-weight: 600;
      line-height: 1.25;
      color: #ffffff;
      text-shadow: 0 2px 14px rgba(99, 102, 241, .4);
    }

    .image-thumb {
      max-width: 220px;
      max-height: 120px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--glass-border);
      position: relative;
    }
    .image-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .zoom-hint {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, .6);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 11px;
      color: #ffffff;
      opacity: 0;
      transition: opacity .2s;
    }
    .image-thumb:hover .zoom-hint {
      opacity: 1;
    }

    .card-footer-hint {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 12px;
      color: var(--ink-dim);
      border-top: 1px solid rgba(255, 255, 255, .06);
      padding-top: 14px;
      width: 100%;
    }

    .back-content {
      margin: auto 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .back-term-title {
      margin: 0;
      font-size: 18px;
      color: var(--accent-light);
    }

    .concept-text {
      font-size: 15px;
      line-height: 1.6;
      color: var(--ink);
    }

    .key-notes {
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid rgba(99, 102, 241, .2);
      font-size: 13px;
    }
    .key-notes strong {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: #38bdf8;
      margin-bottom: 4px;
    }
    .key-notes p {
      margin: 0;
      color: var(--ink-dim);
    }

    .back-image-box {
      max-width: 180px;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--glass-border);
      cursor: pointer;
    }
    .back-image-box img {
      width: 100%;
      display: block;
    }
    .back-image-box span {
      display: block;
      font-size: 10px;
      text-align: center;
      padding: 3px;
      background: rgba(0, 0, 0, .4);
      color: var(--ink-dim);
    }

    /* Controles de Navegación */
    .study-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 6px;
    }

    .nav-btn, .flip-action-btn, .master-action-btn, .shuffle-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid var(--glass-border);
      background: rgba(15, 23, 42, .7);
      color: var(--ink);
      transition: all .2s;
      cursor: pointer;
    }

    .nav-btn:hover, .shuffle-btn:hover {
      background: rgba(99, 102, 241, .2);
      border-color: var(--accent-light);
    }

    .flip-action-btn {
      background: linear-gradient(135deg, var(--primary), var(--primary-light));
      border: 0;
      color: #ffffff;
      box-shadow: 0 4px 16px rgba(55, 48, 163, .35);
    }
    .flip-action-btn:hover {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }

    .master-action-btn.active {
      background: rgba(52, 211, 153, .2);
      border-color: #34d399;
      color: #34d399;
    }

    .edit-study-btn:hover {
      background: rgba(59, 130, 246, .25);
      border-color: var(--accent-light);
      color: var(--accent-light);
    }

    .del-study-btn:hover {
      background: rgba(220, 38, 38, .2);
      border-color: var(--danger);
      color: #f87171;
    }

    .keyboard-shortcuts {
      display: flex;
      gap: 16px;
      font-size: 11.5px;
      color: var(--ink-dim);
    }
    .keyboard-shortcuts kbd {
      background: rgba(255, 255, 255, .1);
      border: 1px solid var(--glass-border);
      border-radius: 4px;
      padding: 2px 6px;
      font-family: monospace;
      font-size: 10.5px;
      color: var(--ink);
    }

    /* ---------- GESTIÓN Y LISTA ---------- */
    .list-section {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .list-filters {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1px solid var(--glass-border);
      flex-wrap: wrap;
      gap: 12px;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(6, 11, 26, .8);
      border: 1px solid var(--glass-border);
      border-radius: 6px;
      padding: 8px 12px;
      flex: 1;
      max-width: 380px;
    }
    .search-box input {
      background: transparent;
      border: 0;
      color: var(--ink);
      outline: none;
      width: 100%;
      font-size: 13px;
    }

    .filter-controls {
      display: flex;
      gap: 10px;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .card-item {
      padding: 18px;
      border-radius: 10px;
      border: 1px solid var(--glass-border);
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color .2s;
    }
    .card-item.mastered {
      border-left: 3px solid #34d399;
    }

    .item-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .course-chip {
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-light);
      background: rgba(59, 130, 246, .12);
      padding: 2px 7px;
      border-radius: 4px;
    }

    .item-actions {
      display: flex;
      gap: 4px;
    }

    .item-master-btn, .item-btn {
      background: transparent;
      border: 0;
      color: var(--ink-dim);
      padding: 4px;
      border-radius: 4px;
      cursor: pointer;
    }
    .item-master-btn.active {
      color: #34d399;
    }
    .item-btn:hover {
      color: var(--ink);
    }
    .item-btn.del:hover {
      color: var(--danger);
    }

    .item-image-preview {
      width: 100%;
      height: 90px;
      border-radius: 6px;
      overflow: hidden;
      cursor: pointer;
    }
    .item-image-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .item-term {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
    }

    .item-concept {
      margin: 0;
      font-size: 13px;
      color: var(--ink-dim);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.5;
    }

    .item-notes {
      font-size: 11.5px;
      color: #38bdf8;
      border-top: 1px solid rgba(255, 255, 255, .06);
      padding-top: 6px;
    }

    /* ---------- MODALES ---------- */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(4, 7, 18, .78);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-card {
      width: 100%;
      max-width: 540px;
      max-height: 90vh;
      overflow-y: auto;
      border-radius: 14px;
      border: 1px solid var(--glass-border);
      padding: 26px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, .7);
    }

    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .modal-head h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    .close-btn {
      background: transparent;
      border: 0;
      color: var(--ink-dim);
      font-size: 18px;
      cursor: pointer;
    }
    .close-btn:hover {
      color: #ffffff;
    }

    .modal-desc {
      margin: 0 0 16px;
      font-size: 13px;
      color: var(--ink-dim);
      line-height: 1.5;
    }

    form {
      display: grid;
      gap: 14px;
    }

    label {
      display: block;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: var(--ink-dim);
    }

    input, textarea, select {
      width: 100%;
      margin-top: 6px;
      background: rgba(6, 11, 26, .85);
      border: 1px solid var(--glass-border);
      border-radius: 6px;
      padding: 9px 12px;
      color: var(--ink);
      box-sizing: border-box;
      font: inherit;
      font-size: 13.5px;
    }
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: var(--accent-light);
    }

    .image-upload-section {
      display: grid;
      gap: 8px;
    }
    .sec-label {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--ink-dim);
    }

    .image-tabs {
      display: flex;
      gap: 6px;
    }
    .tab-btn {
      background: transparent;
      border: 1px solid var(--glass-border);
      color: var(--ink-dim);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
    }
    .tab-btn.active {
      background: rgba(99, 102, 241, .2);
      border-color: var(--accent-light);
      color: #ffffff;
    }

    .file-dropzone {
      border: 1.5px dashed var(--glass-border);
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 6px;
      cursor: pointer;
      background: rgba(255, 255, 255, .02);
      transition: background .2s, border-color .2s;
    }
    .file-dropzone:hover {
      background: rgba(99, 102, 241, .08);
      border-color: var(--accent-light);
    }
    .file-dropzone.small {
      padding: 12px;
    }
    .file-dropzone span {
      font-size: 12.5px;
      font-weight: 600;
    }
    .file-dropzone small {
      font-size: 11px;
      color: var(--ink-dim);
    }

    .modal-img-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      background: rgba(0, 0, 0, .3);
      border-radius: 6px;
    }
    .modal-img-preview img {
      width: 60px;
      height: 45px;
      object-fit: cover;
      border-radius: 4px;
    }
    .remove-img-btn {
      background: transparent;
      border: 0;
      color: var(--danger);
      font-size: 12px;
      cursor: pointer;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 10px;
    }

    .share-code-area {
      font-family: monospace;
      font-size: 11.5px;
      resize: none;
      height: 130px;
    }

    .share-actions-row {
      display: flex;
      gap: 10px;
      margin-top: 14px;
      flex-wrap: wrap;
    }

    .error-msg {
      color: #f87171;
      font-size: 12.5px;
      padding: 8px 12px;
      background: rgba(220, 38, 38, .15);
      border-radius: 6px;
    }

    /* ---------- ZOOM OVERLAY ---------- */
    .zoom-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, .85);
      backdrop-filter: blur(10px);
      z-index: 1200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .zoom-box {
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .zoom-box img {
      max-width: 100%;
      max-height: 80vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, .8);
    }
    .zoom-close {
      background: rgba(255, 255, 255, .15);
      border: 0;
      color: #ffffff;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12.5px;
      cursor: pointer;
    }

    /* ---------- EMPTY STATES ---------- */
    .empty-state {
      padding: 40px 24px;
      text-align: center;
      border-radius: 12px;
      border: 1px solid var(--glass-border);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      max-width: 480px;
      margin: 0 auto;
    }
    .empty-state.full-width {
      max-width: 100%;
    }
    .empty-icon {
      color: var(--ink-dim);
    }
    .empty-state h3 {
      margin: 0;
      font-size: 19px;
      color: var(--ink);
    }
    .empty-state p {
      margin: 0;
      color: var(--ink-dim);
      font-size: 13.5px;
      max-width: 360px;
    }
    .empty-actions {
      display: flex;
      gap: 10px;
      margin-top: 6px;
      flex-wrap: wrap;
      justify-content: center;
    }
  `]
})
export class FlashcardsComponent {
  readonly appState = inject(AppStateService);
  readonly fcService = inject(FlashcardService);

  readonly viewMode = signal<'DECKS' | 'STUDY' | 'LIST'>('DECKS');

  // Modales
  readonly showCardModal = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly editingCardId = signal<string | null>(null);

  readonly showShareModal = signal<boolean>(false);
  readonly shareDeckKey = signal<string | null>(null);
  readonly copiedText = signal<boolean>(false);

  readonly showImportModal = signal<boolean>(false);
  readonly importTargetCourseId = signal<string | null>(null);
  readonly importRawCode = signal<string>('');
  readonly importError = signal<string | null>(null);

  readonly zoomedImageUrl = signal<string | null>(null);
  readonly imageTab = signal<'FILE' | 'URL'>('FILE');

  modalData: {
    courseId: string | null;
    deckName: string;
    term: string;
    concept: string;
    notes: string;
    imageUrl: string | null;
  } = {
    courseId: null,
    deckName: 'General',
    term: '',
    concept: '',
    notes: '',
    imageUrl: null
  };

  readonly sharePayloadJson = computed(() => {
    if (!this.showShareModal()) return '';
    return this.fcService.exportDeck(this.shareDeckKey());
  });

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent) {
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
    if (this.showCardModal() || this.showShareModal() || this.showImportModal() || isTyping) {
      if (event.key === 'Escape') {
        this.closeCardModal();
        this.showShareModal.set(false);
        this.showImportModal.set(false);
        this.zoomedImageUrl.set(null);
      }
      return;
    }

    if (this.viewMode() === 'STUDY') {
      if (event.code === 'Space' || event.key === 'Enter') {
        event.preventDefault();
        this.fcService.toggleFlip();
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        this.fcService.nextCard();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.fcService.prevCard();
      } else if (event.key === 'm' || event.key === 'M') {
        event.preventDefault();
        const current = this.fcService.currentCard();
        if (current) this.fcService.toggleMastered(current.id);
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        this.fcService.shuffle();
      }
    }
  }

  getCardCourseName(card: Flashcard): string {
    if (card.courseId) {
      const course = this.appState.courses().find(c => c.id === card.courseId);
      if (course) return course.name;
    }
    return card.deckName || 'General';
  }

  startStudy(deckKey: string) {
    this.fcService.selectDeck(deckKey);
    this.viewMode.set('STUDY');
  }

  switchToStudy(deckKey: string | 'ALL') {
    this.fcService.selectDeck(deckKey);
    this.viewMode.set('STUDY');
  }

  manageDeck(deckKey: string) {
    this.fcService.selectDeck(deckKey);
    this.viewMode.set('LIST');
  }

  onFilterDeckChange(deckKey: string) {
    this.fcService.selectDeck(deckKey);
  }

  async createCourseFromDeck(deckName: string) {
    const ok = await this.fcService.createCourseFromDeck(deckName);
    if (ok) {
      alert(`¡Excelente! Se ha creado el curso "${deckName}" en UniSpace con su propio cuaderno de notas.`);
    } else {
      alert(`El mazo "${deckName}" se mantendrá activo en tus Flashcards para estudiar.`);
    }
  }

  toggleMasteredCurrent(e: MouseEvent, cardId: string) {
    e.stopPropagation();
    this.fcService.toggleMastered(cardId);
  }

  zoomImage(e: MouseEvent, url: string) {
    e.stopPropagation();
    this.zoomedImageUrl.set(url);
  }

  openNewCardModal() {
    this.isEditing.set(false);
    this.editingCardId.set(null);
    const active = this.fcService.activeDeckKey();
    const isCourse = active !== 'ALL' && !active.startsWith('deck_');
    const customName = active.startsWith('deck_') ? active.replace('deck_', '') : 'General';

    this.modalData = {
      courseId: isCourse ? active : null,
      deckName: customName,
      term: '',
      concept: '',
      notes: '',
      imageUrl: null
    };
    this.imageTab.set('FILE');
    this.showCardModal.set(true);
  }

  openEditModal(card: Flashcard) {
    this.isEditing.set(true);
    this.editingCardId.set(card.id);
    this.modalData = {
      courseId: card.courseId,
      deckName: card.deckName || 'General',
      term: card.term,
      concept: card.concept,
      notes: card.notes || '',
      imageUrl: card.imageUrl || null
    };
    this.imageTab.set(card.imageUrl && card.imageUrl.startsWith('data:') ? 'FILE' : 'URL');
    this.showCardModal.set(true);
  }

  closeCardModal() {
    this.showCardModal.set(false);
    this.isEditing.set(false);
    this.editingCardId.set(null);
  }

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.modalData.imageUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  saveCard() {
    const term = this.modalData.term?.trim();
    const concept = this.modalData.concept?.trim();

    if (!term) {
      alert('Por favor escribe el término o título de la tarjeta.');
      return;
    }
    if (!concept) {
      alert('Por favor escribe el concepto o definición.');
      return;
    }

    const cleanCourseId = (this.modalData.courseId === 'null' || !this.modalData.courseId) ? null : this.modalData.courseId;
    const cleanDeckName = this.modalData.deckName?.trim() || 'General';

    if (this.isEditing() && this.editingCardId()) {
      this.fcService.updateCard(this.editingCardId()!, {
        courseId: cleanCourseId,
        deckName: cleanDeckName,
        term: term,
        concept: concept,
        notes: this.modalData.notes?.trim() || undefined,
        imageUrl: this.modalData.imageUrl || null
      });
      alert('¡Flashcard actualizada correctamente! ✨');
    } else {
      this.fcService.addCard({
        courseId: cleanCourseId,
        deckName: cleanDeckName,
        term: term,
        concept: concept,
        notes: this.modalData.notes?.trim() || undefined,
        imageUrl: this.modalData.imageUrl || null
      });
      alert('¡Flashcard creada con éxito! 🎉');
    }

    this.closeCardModal();
  }

  deleteCard(card: Flashcard | null) {
    if (!card) return;
    const ok = confirm(`¿Estás seguro de que deseas eliminar la tarjeta:\n\n"${card.term}"?`);
    if (ok) {
      this.fcService.deleteCard(card.id);
      alert('Tarjeta eliminada correctamente. 🗑️');
    }
  }

  deleteDeck(deck: FlashcardDeckSummary) {
    const ok = confirm(`⚠️ ¿Estás seguro de que deseas ELIMINAR TODO EL MAZO:\n\n"${deck.courseName}"?\n\nSe eliminarán sus ${deck.totalCards} tarjetas de forma permanente.`);
    if (ok) {
      this.fcService.deleteDeck(deck.deckKey);
      alert(`El mazo "${deck.courseName}" y todas sus tarjetas fueron eliminados. 🗑️`);
    }
  }

  deleteCurrentActiveDeck() {
    const key = this.fcService.activeDeckKey();
    if (key === 'ALL') return;
    const summary = this.fcService.deckSummaries().find(d => d.deckKey === key);
    const name = summary ? summary.courseName : 'este mazo';
    const total = summary ? summary.totalCards : 'todas las';
    const ok = confirm(`⚠️ ¿Deseas eliminar todo el mazo "${name}" (${total} tarjetas)? Esta acción no se puede deshacer.`);
    if (ok) {
      this.fcService.deleteDeck(key);
      alert(`Mazo "${name}" eliminado con éxito. 🗑️`);
    }
  }

  openShareModal(deckKey: string | null) {
    this.shareDeckKey.set(deckKey);
    this.copiedText.set(false);
    this.showShareModal.set(true);
  }

  copyShareCode() {
    const code = this.sharePayloadJson();
    navigator.clipboard.writeText(code).then(() => {
      this.copiedText.set(true);
      setTimeout(() => this.copiedText.set(false), 2500);
    });
  }

  downloadShareJson() {
    const code = this.sharePayloadJson();
    const blob = new Blob([code], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unispace-flashcards-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  openImportModal() {
    const active = this.fcService.activeDeckKey();
    const isCourse = active !== 'ALL' && !active.startsWith('deck_');
    this.importTargetCourseId.set(isCourse ? active : null);
    this.importRawCode.set('');
    this.importError.set(null);
    this.showImportModal.set(true);
  }

  onImportFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.importRawCode.set(reader.result as string);
      };
      reader.readAsText(file);
    }
  }

  processImport() {
    this.importError.set(null);
    try {
      const res = this.fcService.importDeck(this.importTargetCourseId(), this.importRawCode());
      alert(`¡Éxito! Se importaron ${res.count} flashcards al mazo "${res.courseName}".`);
      this.showImportModal.set(false);
      this.viewMode.set('DECKS');
    } catch (err: any) {
      this.importError.set(err.message || 'Error al procesar el mazo importado.');
    }
  }
}
