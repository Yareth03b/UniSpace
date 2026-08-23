# UniSpace

<p align="center">
  <img src="https://raw.githubusercontent.com/unispace/readme-assets/main/unispace-logo.svg" alt="UniSpace Logo" width="120">
</p>

<p align="center">
  <strong>Tu espacio académico personal — Organiza cursos, tareas, horarios y cuadernos en una galaxia interactiva.</strong>
</p>

<p align="center">
  <a href="https://angular.dev"><img src="https://img.shields.io/badge/Angular-22.1.0-red.svg" alt="Angular"></a>
  <a href="https://supabase.io"><img src="https://img.shields.io/badge/Supabase-2.112.3-blue.svg" alt="Supabase"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License"></a>
</p>

---

## Tabla de Contenidos

- [Sinopsis](#sinopsis)
- [Tecnologías](#tecnologías)
- [Características](#características)
- [Instalación](#instalación)
- [Ejecución Rápida](#ejecución-rápida)
- [Uso por Módulo](#uso-por-módulo)
- [Estado Actual](#estado-actual)
- [Scripts Disponibles](#scripts-disponibles)
- [Contribución](#contribución)
- [Licencia](#licencia)
- [Capturas de Pantalla](#capturas-de-pantalla)
- [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Sinopsis

**UniSpace** es una aplicación web personal de gestión académica construida con Angular 22 y Supabase. Proporciona un entorno integrado para:

- Autenticación de usuarios con Supabase Auth
- Gestión de cursos (CRUD con colores y docentes)
- Tareas con fechas límite y asociación a cursos
- Horario semanal interactivo (Lunes-Viernes)
- Cuadernos digitales por curso con páginas infinitas
- Calendario académico visual
- Configuración de perfil e iniciales

El diseño cuenta con fondos de nebulosa WebGL interactivos, esquinas de vidrio esmerilado, paleta índigo-cian y efectos de interacción sutiles.

---

## Tecnologías

| Categoría | Tecnología | Versión |
|---|---|---|
| Framework | Angular | 22.1.0 |
| Lenguaje | TypeScript | ~6.0.2 |
| Base de Datos | Supabase | 2.112.3 |
| UI | CSS Custom Properties, Flexbox Grid | — |
| Gráficos | WebGL Shader (simplex noise FBM) | — |
| Animaciones | Pointer events, Keyframes CSS | — |
| Utilidades | RxJS, jsdom, vitest | ~7.8.0, ^28.0.0, ^4.0.8 |

---

## Características

| Característica | Descripción |
|---|---|
| **Autenticación Completa** | Registro, inicio de sesión y recuperación de contraseña con Supabase Auth |
| **Gestión de Cursos** | Creación, edición y eliminación de cursos con colores identificativos y seguimiento de progreso |
| **Sistema de Tareas** | Tareas con fechas límite, filtros por curso, estado pendiente/completado e indicador de vencimiento |
| **Horario Semanal** | Cuadrícula de lunes a viernes con asignación de bloques por hora y gestión de clases |
| **Cuadernos Digitales** | Cuadernos por curso con persistencia de páginas (Supabase con respaldo en localStorage) |
| **Calendario Integrado** | Vista de calendario académico |
| **Fondo Galaxia WebGL** | Shader personalizado con ruido simplex, efecto parallax con el cursor y partículas |
| **Efecto Halo en Clics** | Efecto visual circular en elementos interactivos |
| **Sidebar Translúcido** | Menú lateral con efecto glassmorphism, estados expandido/colapsado y soporte responsive |
| **Diseño Adaptativo** | Compatible con resoluciones desde 320px hasta pantallas ultra anchas |
| **Modo de Movimiento Reducido** | Cumplimiento WAI-ARIA respetando la preferencia `prefers-reduced-motion` |
| **Datos de Demostración** | Interfaz totalmente funcional con datos simulados en modo local |

---

## Instalación

### Prerrequisitos

- [Node.js](https://nodejs.org/) v20 o superior
- [npm](https://www.npmjs.com/) v11 o **yarn** v1.22
- Cuenta en [Supabase](https://supabase.io)

### Pasos

1. **Clonar el repositorio**

   ```bash
   git clone https://github.com/tu-usuario/uni-space.git
   cd uni-space
   ```

2. **Instalar dependencias**

   ```bash
   npm install
   # o
   yarn install
   ```

3. **Configurar Supabase**

   - Crear un proyecto en el [Dashboard de Supabase](https://supabase.io/dashboard).
   - Ir a **Settings → API** y obtener las credenciales:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - O configurar directamente en `src/environments/environment.ts`:
     ```typescript
     export const environment = {
       supabaseUrl: 'TU_URL',
       supabasePublishableKey: 'TU_KEY'
     };
     ```

4. **Ejecutar migraciones SQL** (en el editor SQL de Supabase):

   ```sql
   -- Tabla de perfiles
   create table if not exists public.profiles (
     id uuid primary key references auth.users(id) on delete cascade,
     full_name text not null,
     email text not null,
     updated_at timestamptz not null default now()
   );

   -- Tabla de cursos
   create table if not exists public.courses (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references auth.users(id) on delete cascade,
     name text not null,
     teacher text,
     color text not null default '#4f46e5',
     progress integer not null default 0,
     cover text,
     created_at timestamptz not null default now()
   );

   -- Habilitar RLS
   alter table public.profiles enable row level security;
   alter table public.courses enable row level security;

   -- Políticas de seguridad
   create policy "Users manage own profiles" on public.profiles
     for all using ((select auth.uid()) = user_id);

   create policy "Users manage own courses" on public.courses
     for all using ((select auth.uid()) = user_id);
   ```

5. **Iniciar la aplicación**

   ```bash
   npm start
   ```

   La aplicación estará disponible en `http://localhost:4200`.

---

## Ejecución Rápida

| Comando | Descripción |
|---|---|
| `npm start` | Inicia el servidor de desarrollo en `http://localhost:4200` |
| `npm run build` | Compila el proyecto para producción en el directorio `dist/` |
| `npm run watch` | Inicia el modo de compilación continua en desarrollo |
| `npm test` | Ejecuta la suite de pruebas unitarias |

---

## Uso por Módulo

### Autenticación (`/auth`)

- Registro de usuario con nombre, correo electrónico y contraseña.
- Inicio de sesión con credenciales.
- Reenvío de correo de confirmación.
- Cierre de sesión seguro.

### Cursos (`/courses`)

- **Crear curso**: Registro de nombre, docente asignado y color identificador.
- **Ver cursos**: Cuadrícula de tarjetas con indicadores de color y avance.
- **Eliminar curso**: Confirmación previa con eliminación de tareas, horarios y cuadernos asociados.

### Tareas (`/tasks`)

- **Nueva tarea**: Título, curso vinculado (o "General") y fecha límite.
- **Gestión de tareas**: Listado con contador, selector de estado completado/pendiente y eliminación.
- **Alertas de vencimiento**: Resaltado visual para entregas fuera de plazo.

### Horario (`/schedule`)

- **Agregar clase**: Selección de curso, día de la semana (Lunes-Viernes), rango de horas y aula/ubicación.
- **Visualización**: Cuadrícula semanal con bloques superpuestos.
- **Eliminar clase**: Opción de borrado directo sobre cada bloque.

### Cuadernos (`/notebooks`)

- **Creación automática**: Generación de cuaderno al acceder por primera vez a un curso.
- **Guardado**: Persistencia de contenido en Supabase con respaldo local en `localStorage`.
- **Administración**: Renombrar, listar o eliminar cuadernos existentes.

### Configuración (`/settings`)

- Consulta y actualización de datos de perfil (nombre y correo).
- Actualización de contraseña a través de Supabase.
- Cierre de sesión.

### Fondo Galaxia (WebGL)

- Fondo interactivo con seguimiento del cursor en dos capas de parallax.
- Deriva visual ajustada con el desplazamiento vertical (scroll).
- Pausa automática en pestañas inactivas o cuando el sistema tiene habilitado `prefers-reduced-motion`.

---

## Estado Actual

> **Nota:** La aplicación cuenta con una interfaz totalmente funcional en modo demostración. Para habilitar la persistencia en la nube es necesario conectar una instancia de Supabase.

### Funcionalidades Implementadas

- Arquitectura Angular 22 con Signals y componentes Standalone.
- Servicios principales: `AuthService`, `AppStateService`, `NotebookService`.
- Interfaz completa con 7 vistas navegables.
- Shader WebGL integrado con fondos de nebulosa interactivos.
- Directiva de interacción tipo halo, barra lateral con efecto translúcido y diseño responsive.
- Soporte para datos de demostración en `AppStateService`.

### Tareas Pendientes

- [ ] Configuración de credenciales de Supabase en `environment.ts`.
- [ ] Ejecución de migraciones SQL en la base de datos de producción.
- [ ] Implementación de `canActivate` Guards en rutas protegidas.
- [ ] Carga y almacenamiento de portadas para cursos.
- [ ] Sincronización en tiempo real de cuadernos y páginas con Supabase.
- [ ] Integración de vista de calendario extendida.
- [ ] Ampliación de cobertura de pruebas unitarias.
- [ ] Soporte para internacionalización (i18n).
- [ ] Selector de tema visual (claro / oscuro).

---

## Scripts Disponibles

| Script | Descripción |
|---|---|
| `npm start` | Ejecuta `ng serve` para desarrollo local con recarga en caliente |
| `npm run build` | Ejecuta `ng build` para generar los archivos de producción |
| `npm run watch` | Ejecuta `ng build --watch` en configuración de desarrollo |
| `npm test` | Ejecuta las pruebas automatizadas con Vitest |

---

## Contribución

1. Crear un **Fork** del repositorio.
2. Crear una nueva rama: `git checkout -b feature/nueva-funcionalidad`.
3. Confirmar los cambios: `git commit -m 'feat: descripción del cambio'`.
4. Enviar los cambios a la rama remota: `git push origin feature/nueva-funcionalidad`.
5. Abrir un **Pull Request**.

### Pautas de Código

- Mantener la consistencia con el formateo de Prettier configurado.
- No incluir credenciales reales ni claves privadas en `environment.ts`.
- Incluir pruebas unitarias para nuevas funcionalidades.
- Actualizar la documentación en caso de modificar la estructura o los comandos.

---

## Licencia

Distribuido bajo la **Licencia MIT**. Para más información, consulte el archivo `LICENSE`.

---

## Capturas de Pantalla

<details>
  <summary>Desplegar módulos</summary>

| Módulo | Descripción |
|---|---|
| Dashboard | Vista principal con fondo interactivo y resumen general |
| Courses | Panel de cursos con etiquetas de color y métricas |
| Tasks | Control de tareas con estados y fechas límite |
| Schedule | Planificador semanal de clases por franjas horarias |
| Notebooks | Gestión y edición de notas por materia |
| Sidebar | Navegación lateral responsiva y colapsable |

</details>

---

## Preguntas Frecuentes

**¿Es obligatorio configurar Supabase para probar la aplicación?**  
No. La aplicación incluye datos de demostración locales que permiten navegar y probar la interfaz sin necesidad de configurar una base de datos inmediatamente.

**¿Funciona sin conexión a internet?**  
La aplicación permite la interacción básica y almacena datos de cuadernos en `localStorage`. Las funciones de sincronización y autenticación remota requieren conexión a internet.

**¿El fondo WebGL genera alto consumo de recursos?**  
El shader está optimizado para WebGL 1.0 sin dependencias externas pesadas. Se pausa automáticamente en pestañas inactivas o si el usuario tiene activada la reducción de movimiento en su sistema operativo.

**¿Cómo personalizar la paleta de colores?**  
Las variables principales de estilo están definidas en `src/styles.scss` (`--primary`, `--primary-light`, `--ink`, `--accent-light`).

