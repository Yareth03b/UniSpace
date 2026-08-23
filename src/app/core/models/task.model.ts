export interface Task {
  id: string;
  title: string;
  /** null = tarea general, sin curso */
  courseId: string | null;
  dueDate: string | null;
  done: boolean;
}

/** Tarea lista para mostrar en la UI (con nombre de curso resuelto) */
export interface TaskView extends Task {
  courseName: string;
  dueLabel: string;
}
