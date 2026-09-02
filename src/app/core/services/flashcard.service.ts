import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { AppStateService } from './app-state.service';
import { Flashcard, FlashcardDeckSummary, SharedFlashcardDeck } from '../models/flashcard.model';

@Injectable({
  providedIn: 'root'
})
export class FlashcardService {
  private readonly auth = inject(AuthService);
  private readonly appState = inject(AppStateService);

  readonly flashcards = signal<Flashcard[]>([]);
  readonly activeDeckKey = signal<string | 'ALL'>('ALL');
  readonly currentIndex = signal<number>(0);
  readonly isFlipped = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly filterMastered = signal<'ALL' | 'PENDING' | 'MASTERED'>('ALL');

  /**
   * Resumen de mazos:
   * 1. Cada curso oficial de UniSpace.
   * 2. Mazos importados o creados con nombre propio (ej: "Administración de Servicios de Red").
   */
  readonly deckSummaries = computed<FlashcardDeckSummary[]>(() => {
    const courses = this.appState.courses();
    const cards = this.flashcards();
    const summaries: FlashcardDeckSummary[] = [];

    // 1. Mazos vinculados a Cursos oficiales
    courses.forEach(course => {
      const courseCards = cards.filter(c =>
        c.courseId === course.id ||
        (!c.courseId && c.deckName && c.deckName.trim().toLowerCase() === course.name.trim().toLowerCase())
      );
      const mastered = courseCards.filter(c => c.mastered).length;
      const total = courseCards.length;
      const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;

      summaries.push({
        deckKey: course.id,
        courseId: course.id,
        courseName: course.name,
        color: course.color || '#3b82f6',
        totalCards: total,
        masteredCards: mastered,
        progressPercentage: percentage,
        isCustomDeck: false
      });
    });

    // 2. Mazos independientes (tarjetas que no están en ninguno de los cursos anteriores)
    const assignedCourseIds = new Set(courses.map(c => c.id));
    const unassignedCards = cards.filter(c => {
      if (c.courseId && assignedCourseIds.has(c.courseId)) return false;
      if (!c.courseId && c.deckName && courses.some(course => course.name.trim().toLowerCase() === c.deckName!.trim().toLowerCase())) {
        return false;
      }
      return true;
    });

    // Agrupar unassignedCards por deckName
    const groups = new Map<string, Flashcard[]>();
    unassignedCards.forEach(c => {
      const name = (c.deckName && c.deckName.trim()) ? c.deckName.trim() : 'Mazo Independiente';
      const existing = groups.get(name) || [];
      existing.push(c);
      groups.set(name, existing);
    });

    groups.forEach((groupCards, name) => {
      const mastered = groupCards.filter(c => c.mastered).length;
      const total = groupCards.length;
      const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;

      summaries.push({
        deckKey: 'deck_' + name,
        courseId: null,
        courseName: name,
        color: name.toLowerCase().includes('red') ? '#2563eb' : '#6366f1',
        totalCards: total,
        masteredCards: mastered,
        progressPercentage: percentage,
        isCustomDeck: true
      });
    });

    return summaries;
  });

  /**
   * Tarjetas filtradas por el mazo/curso activo, búsqueda y estado
   */
  readonly filteredCards = computed<Flashcard[]>(() => {
    const key = this.activeDeckKey();
    const query = this.searchQuery().trim().toLowerCase();
    const masteredFilter = this.filterMastered();
    let list = this.flashcards();

    if (key !== 'ALL') {
      if (key.startsWith('deck_')) {
        const deckName = key.replace('deck_', '').trim().toLowerCase();
        list = list.filter(c => (c.deckName || '').trim().toLowerCase() === deckName);
      } else {
        // Es un curso oficial (course.id)
        const course = this.appState.courses().find(c => c.id === key);
        const courseName = course?.name.trim().toLowerCase();
        list = list.filter(c =>
          c.courseId === key ||
          (!c.courseId && courseName && (c.deckName || '').trim().toLowerCase() === courseName)
        );
      }
    }

    if (masteredFilter === 'PENDING') {
      list = list.filter(c => !c.mastered);
    } else if (masteredFilter === 'MASTERED') {
      list = list.filter(c => c.mastered);
    }

    if (query) {
      list = list.filter(c =>
        c.term.toLowerCase().includes(query) ||
        c.concept.toLowerCase().includes(query) ||
        (c.notes && c.notes.toLowerCase().includes(query))
      );
    }

    return list;
  });

  readonly currentCard = computed<Flashcard | null>(() => {
    const list = this.filteredCards();
    const index = this.currentIndex();
    if (list.length === 0) return null;
    const safeIndex = Math.max(0, Math.min(index, list.length - 1));
    return list[safeIndex] ?? null;
  });

  readonly studyStats = computed(() => {
    const list = this.filteredCards();
    const total = list.length;
    const mastered = list.filter(c => c.mastered).length;
    const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;
    return {
      total,
      mastered,
      pending: total - mastered,
      percentage,
      currentNumber: total > 0 ? Math.min(this.currentIndex() + 1, total) : 0
    };
  });

  constructor() {
    effect(() => {
      const user = this.auth.session()?.user;
      this.loadCardsForUser(user?.id);
    });
  }

  private getStorageKey(userId?: string): string {
    return `unispace_flashcards_${userId || 'guest'}`;
  }

  private loadCardsForUser(userId?: string) {
    try {
      const key = this.getStorageKey(userId);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: Flashcard[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.flashcards.set(parsed);
        } else {
          this.flashcards.set([]);
        }
      } else {
        this.flashcards.set([]);
      }
      this.currentIndex.set(0);
      this.isFlipped.set(false);
    } catch (e) {
      console.error('Error al cargar flashcards de localStorage:', e);
      this.flashcards.set([]);
    }
  }

  private persist() {
    try {
      const user = this.auth.session()?.user;
      const key = this.getStorageKey(user?.id);
      localStorage.setItem(key, JSON.stringify(this.flashcards()));
    } catch (e) {
      console.error('Error al persistir flashcards en localStorage:', e);
    }
  }

  selectDeck(deckKey: string | 'ALL') {
    this.activeDeckKey.set(deckKey);
    this.currentIndex.set(0);
    this.isFlipped.set(false);
  }

  toggleFlip() {
    this.isFlipped.update(f => !f);
  }

  nextCard() {
    const list = this.filteredCards();
    if (list.length === 0) return;
    this.isFlipped.set(false);
    this.currentIndex.update(idx => (idx + 1) % list.length);
  }

  prevCard() {
    const list = this.filteredCards();
    if (list.length === 0) return;
    this.isFlipped.set(false);
    this.currentIndex.update(idx => (idx - 1 + list.length) % list.length);
  }

  goToIndex(index: number) {
    const list = this.filteredCards();
    if (index >= 0 && index < list.length) {
      this.isFlipped.set(false);
      this.currentIndex.set(index);
    }
  }

  shuffle() {
    const currentList = [...this.flashcards()];
    for (let i = currentList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [currentList[i], currentList[j]] = [currentList[j], currentList[i]];
    }
    this.flashcards.set(currentList);
    this.currentIndex.set(0);
    this.isFlipped.set(false);
    this.persist();
  }

  addCard(data: {
    courseId: string | null;
    deckName?: string;
    term: string;
    concept: string;
    notes?: string;
    imageUrl?: string | null;
  }): Flashcard {
    const course = data.courseId ? this.appState.courses().find(c => c.id === data.courseId) : null;
    const resolvedDeckName = course ? course.name : (data.deckName?.trim() || 'General');

    const newCard: Flashcard = {
      id: 'fc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      courseId: data.courseId,
      deckName: resolvedDeckName,
      term: data.term.trim(),
      concept: data.concept.trim(),
      notes: data.notes?.trim() || undefined,
      imageUrl: data.imageUrl || null,
      mastered: false,
      createdAt: new Date().toISOString()
    };

    this.flashcards.update(list => [newCard, ...list]);
    this.persist();
    return newCard;
  }

  updateCard(id: string, patch: Partial<Omit<Flashcard, 'id' | 'createdAt'>>) {
    const cleanCourseId = (patch.courseId === 'null' || !patch.courseId) ? null : patch.courseId;
    const course = cleanCourseId ? this.appState.courses().find(crs => crs.id === cleanCourseId) : null;

    this.flashcards.update(list =>
      list.map(c => {
        if (c.id === id) {
          const deckName = course ? course.name : (patch.deckName?.trim() || c.deckName || 'General');
          return {
            ...c,
            ...patch,
            courseId: cleanCourseId,
            deckName,
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      })
    );
    this.isFlipped.set(false);
    this.persist();
  }

  deleteCard(id: string) {
    this.flashcards.update(list => list.filter(c => c.id !== id));
    this.persist();
    const currentLen = this.filteredCards().length;
    if (this.currentIndex() >= currentLen) {
      this.currentIndex.set(Math.max(0, currentLen - 1));
    }
    this.isFlipped.set(false);
  }

  deleteDeck(deckKey: string) {
    if (deckKey === 'ALL') {
      this.flashcards.set([]);
    } else if (deckKey.startsWith('deck_')) {
      const groupName = deckKey.replace('deck_', '').trim().toLowerCase();
      this.flashcards.update(list => list.filter(c => (c.deckName || '').trim().toLowerCase() !== groupName));
    } else {
      const course = this.appState.courses().find(c => c.id === deckKey);
      const courseName = course?.name.trim().toLowerCase();
      this.flashcards.update(list => list.filter(c => {
        if (c.courseId === deckKey) return false;
        if (!c.courseId && courseName && (c.deckName || '').trim().toLowerCase() === courseName) return false;
        return true;
      }));
    }
    this.activeDeckKey.set('ALL');
    this.currentIndex.set(0);
    this.isFlipped.set(false);
    this.persist();
  }

  toggleMastered(id: string) {
    this.flashcards.update(list =>
      list.map(c => c.id === id ? { ...c, mastered: !c.mastered } : c)
    );
    this.persist();
  }

  /**
   * Vincula tarjetas de un mazo independiente a un curso oficial de UniSpace
   */
  assignDeckToCourse(deckName: string, courseId: string) {
    const course = this.appState.courses().find(c => c.id === courseId);
    if (!course) return;

    this.flashcards.update(list =>
      list.map(c => {
        if ((c.deckName || '').trim().toLowerCase() === deckName.trim().toLowerCase() || !c.courseId) {
          return { ...c, courseId: course.id, deckName: course.name, updatedAt: new Date().toISOString() };
        }
        return c;
      })
    );
    this.persist();
  }

  /**
   * Crea automáticamente un curso en UniSpace a partir de un mazo independiente
   */
  async createCourseFromDeck(deckName: string): Promise<boolean> {
    try {
      await this.appState.addCourse(deckName, 'Docente por asignar', '#2563eb');
      // Esperar brevemente a que el signal de cursos se actualice
      const created = this.appState.courses().find(c => c.name.trim().toLowerCase() === deckName.trim().toLowerCase());
      if (created) {
        this.assignDeckToCourse(deckName, created.id);
        this.selectDeck(created.id);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('No se pudo crear en base de datos remota:', e);
      return false;
    }
  }

  exportDeck(deckKey: string | null): string {
    let cardsToExport: Flashcard[] = [];
    let courseName = 'General';

    if (deckKey && deckKey.startsWith('deck_')) {
      const name = deckKey.replace('deck_', '').trim().toLowerCase();
      cardsToExport = this.flashcards().filter(c => (c.deckName || '').trim().toLowerCase() === name);
      courseName = deckKey.replace('deck_', '').trim();
    } else if (deckKey && deckKey !== 'ALL') {
      const course = this.appState.courses().find(c => c.id === deckKey);
      courseName = course ? course.name : 'Curso';
      cardsToExport = this.flashcards().filter(c =>
        c.courseId === deckKey ||
        (!c.courseId && course && (c.deckName || '').trim().toLowerCase() === course.name.trim().toLowerCase())
      );
    } else {
      cardsToExport = this.flashcards();
      courseName = 'Colección UniSpace';
    }

    const payload: SharedFlashcardDeck = {
      unispaceVersion: '2.0',
      courseName: courseName,
      description: `Mazo de tarjetas de estudio para ${courseName}`,
      exportedAt: new Date().toISOString(),
      cards: cardsToExport.map(c => ({
        term: c.term,
        concept: c.concept,
        notes: c.notes,
        imageUrl: c.imageUrl
      }))
    };

    return JSON.stringify(payload, null, 2);
  }

  importDeck(targetCourseId: string | null, rawJsonOrCode: string): { count: number; courseName: string } {
    const cleanStr = rawJsonOrCode.trim();
    let payload: SharedFlashcardDeck;

    try {
      payload = JSON.parse(cleanStr);
    } catch {
      try {
        const decoded = decodeURIComponent(escape(atob(cleanStr)));
        payload = JSON.parse(decoded);
      } catch (e2) {
        throw new Error('El formato del código o archivo no es válido para UniSpace.');
      }
    }

    if (!payload.cards || !Array.isArray(payload.cards)) {
      throw new Error('El mazo no contiene tarjetas válidas.');
    }

    const targetCourse = targetCourseId ? this.appState.courses().find(c => c.id === targetCourseId) : null;
    const resolvedName = targetCourse ? targetCourse.name : (payload.courseName || 'Mazo Importado');

    const importedCards: Flashcard[] = payload.cards.map(c => ({
      id: 'fc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      courseId: targetCourseId,
      deckName: resolvedName,
      term: c.term || 'Sin término',
      concept: c.concept || 'Sin concepto',
      notes: c.notes || undefined,
      imageUrl: c.imageUrl || null,
      mastered: false,
      createdAt: new Date().toISOString()
    }));

    this.flashcards.update(list => [...importedCards, ...list]);
    this.persist();

    return {
      count: importedCards.length,
      courseName: resolvedName
    };
  }
}
