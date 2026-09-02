export interface Flashcard {
  id: string;
  courseId: string | null;      // ID del curso en UniSpace (null = mazo independiente o sin curso oficial)
  deckName?: string;            // Nombre descriptivo del mazo (ej: "Administración de Servicios de Red")
  term: string;                 // Término / Pregunta
  concept: string;              // Concepto / Definición / Respuesta
  notes?: string;               // Puntos clave adicionales o notas (opcional)
  imageUrl?: string | null;     // URL o imagen codificada en Base64
  mastered: boolean;            // true = Aprendida/Dominada, false = Por repasar
  createdAt: string;            // ISO date string
  updatedAt?: string;           // ISO date string
}

export interface FlashcardDeckSummary {
  deckKey: string;              // Clave única del mazo (courseId o 'deck_' + deckName)
  courseId: string | null;
  courseName: string;           // Nombre a mostrar (ej: "Administración de Servicios de Red")
  color: string;
  totalCards: number;
  masteredCards: number;
  progressPercentage: number;
  isCustomDeck?: boolean;       // true si aún no está vinculado a un curso oficial de UniSpace
}

export interface SharedFlashcardDeck {
  unispaceVersion: string;
  courseName: string;
  description?: string;
  exportedAt: string;
  cards: Array<{
    term: string;
    concept: string;
    notes?: string;
    imageUrl?: string | null;
  }>;
}
