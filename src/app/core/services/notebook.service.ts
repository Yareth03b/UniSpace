import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface Notebook {
  id: string;
  course_id: string;
  title: string;
}

export interface NotebookPage {
  id?: string;
  notebook_id: string;
  page_number: number;
  drawing_data: any;
}

@Injectable({ providedIn: 'root' })
export class NotebookService {
  private readonly auth = inject(AuthService);

  async getOrCreateNotebook(courseId: string): Promise<Notebook> {
    try {
      const user = this.auth.session()?.user;
      if (!user) throw new Error('Usuario no autenticado');

      const { data: existing, error: fetchError } = await this.auth.client
        .from('notebooks')
        .select('id, course_id, title')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (existing) return existing as Notebook;

      const { data: created, error: createError } = await this.auth.client
        .from('notebooks')
        .insert({
          user_id: user.id,
          course_id: courseId,
          title: 'Mi Cuaderno'
        })
        .select('id, course_id, title')
        .single();

      if (createError) throw createError;
      return created as Notebook;
    } catch (e) {
      console.warn('Supabase no disponible, usando localStorage como fallback temporal:', e);
      const id = `local_${courseId}`;
      const map = this.readLocalNotebooks();
      if (!map[id]) {
        map[id] = { id, course_id: courseId, title: 'Mi Cuaderno (Local)' };
        localStorage.setItem('notebooks_local', JSON.stringify(map));
      }
      return map[id];
    }
  }

  async getPages(notebookId: string): Promise<NotebookPage[]> {
    try {
      if (notebookId.startsWith('local_')) {
        const localData = localStorage.getItem(`notebook_pages_${notebookId}`);
        return localData ? JSON.parse(localData) : [];
      }
      const { data, error } = await this.auth.client
        .from('notebook_pages')
        .select('id, notebook_id, page_number, drawing_data')
        .eq('notebook_id', notebookId)
        .order('page_number');

      if (error) throw error;
      return data as NotebookPage[];
    } catch (e) {
      console.warn('Cargando páginas desde localStorage debido a error de DB:', e);
      const localData = localStorage.getItem(`notebook_pages_${notebookId}`);
      return localData ? JSON.parse(localData) : [];
    }
  }

  async savePage(notebookId: string, pageNumber: number, drawingData: any): Promise<void> {
    try {
      if (notebookId.startsWith('local_')) {
        this.saveLocalPage(notebookId, pageNumber, drawingData);
        return;
      }
      const { error } = await this.auth.client
        .from('notebook_pages')
        .upsert(
          {
            notebook_id: notebookId,
            page_number: pageNumber,
            drawing_data: drawingData,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'notebook_id,page_number'
          }
        );

      if (error) throw error;
    } catch (e) {
      console.warn('Guardando página en localStorage temporalmente:', e);
      this.saveLocalPage(notebookId, pageNumber, drawingData);
    }
  }

  private saveLocalPage(notebookId: string, pageNumber: number, drawingData: any) {
    const localData = localStorage.getItem(`notebook_pages_${notebookId}`);
    let pages: NotebookPage[] = localData ? JSON.parse(localData) : [];
    const existingIndex = pages.findIndex(p => p.page_number === pageNumber);
    if (existingIndex !== -1) {
      pages[existingIndex].drawing_data = drawingData;
    } else {
      pages.push({ notebook_id: notebookId, page_number: pageNumber, drawing_data: drawingData });
    }
    localStorage.setItem(`notebook_pages_${notebookId}`, JSON.stringify(pages));
  }

  async deletePage(notebookId: string, pageNumber: number): Promise<void> {
    try {
      if (notebookId.startsWith('local_')) {
        this.deleteLocalPage(notebookId, pageNumber);
        return;
      }
      const { error } = await this.auth.client
        .from('notebook_pages')
        .delete()
        .eq('notebook_id', notebookId)
        .eq('page_number', pageNumber);

      if (error) throw error;
    } catch (e) {
      console.warn('Eliminando página de localStorage:', e);
      this.deleteLocalPage(notebookId, pageNumber);
    }
  }

  // ----------------------------------------------------
  // CRUD DE CUADERNOS
  // ----------------------------------------------------
  async listNotebooks(): Promise<Notebook[]> {
    const user = this.auth.session()?.user;
    if (!user) return [];
    const { data, error } = await this.auth.client
      .from('notebooks')
      .select('id, course_id, title')
      .eq('user_id', user.id);
    if (error) throw error;
    return (data ?? []) as Notebook[];
  }

  async renameNotebook(notebookId: string, title: string): Promise<void> {
    const clean = title.trim();
    if (!clean) throw new Error('El título no puede estar vacío');
    if (notebookId.startsWith('local_')) {
      const map = this.readLocalNotebooks();
      const nb = map[notebookId];
      if (nb) { nb.title = clean; localStorage.setItem('notebooks_local', JSON.stringify(map)); }
      return;
    }
    const { error } = await this.auth.client
      .from('notebooks')
      .update({ title: clean, updated_at: new Date().toISOString() })
      .eq('id', notebookId);
    if (error) throw error;
  }

  /** Elimina el cuaderno; sus páginas se borran en cascada por la FK */
  async deleteNotebook(notebookId: string): Promise<void> {
    if (notebookId.startsWith('local_')) {
      const map = this.readLocalNotebooks();
      delete map[notebookId];
      localStorage.setItem('notebooks_local', JSON.stringify(map));
      localStorage.removeItem(`notebook_pages_${notebookId}`);
      return;
    }
    const { error } = await this.auth.client
      .from('notebooks')
      .delete()
      .eq('id', notebookId);
    if (error) throw error;
  }

  private readLocalNotebooks(): Record<string, Notebook> {
    try {
      return JSON.parse(localStorage.getItem('notebooks_local') || '{}');
    } catch {
      return {};
    }
  }

  private deleteLocalPage(notebookId: string, pageNumber: number) {
    const localData = localStorage.getItem(`notebook_pages_${notebookId}`);
    if (localData) {
      let pages: NotebookPage[] = JSON.parse(localData);
      pages = pages.filter(p => p.page_number !== pageNumber);
      localStorage.setItem(`notebook_pages_${notebookId}`, JSON.stringify(pages));
    }
  }
}
