import { Routes } from '@angular/router';
import { CalendarComponent } from './features/calendar/calendar';
import { CoursesComponent } from './features/courses/courses';
import { DashboardComponent } from './features/dashboard/dashboard';
import { NotebooksComponent } from './features/notebooks/notebooks';
import { SettingsComponent } from './features/settings/settings';
import { ScheduleComponent } from './features/schedule/schedule';
import { TasksComponent } from './features/tasks/tasks';

export const routes: Routes = [
  { path: '', component: DashboardComponent, title: 'Inicio | UniSpace' },
  { path: 'courses', component: CoursesComponent, title: 'Cursos | UniSpace' },
  { path: 'tasks', component: TasksComponent, title: 'Tareas | UniSpace' },
  { path: 'notebooks', component: NotebooksComponent, title: 'Cuadernos | UniSpace' },
  { path: 'calendar', component: CalendarComponent, title: 'Calendario | UniSpace' },
  { path: 'schedule', component: ScheduleComponent, title: 'Horario | UniSpace' },
  { path: 'settings', component: SettingsComponent, title: 'Ajustes | UniSpace' },
  { path: '**', redirectTo: '' },
];
