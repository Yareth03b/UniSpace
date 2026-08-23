export interface Course {
  id: string;
  name: string;
  teacher: string;
  color: string;
  /** Imagen de fondo opcional (data URL comprimida) */
  cover?: string | null;
  progress: number;
}
