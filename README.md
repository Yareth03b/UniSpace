# UniSpace · Cosmos Profondo

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

## 📖 Tabla de Contenidos

- [🚀 Sinopsis](#sinopsis)
- [🛠 Tecnologías](#tecnologías)
- [✨ Características](#características)
- [📦 Instalación](#instalación)
- [🚦 Ejecución Rápida](#ejecución-rápida)
- [📚 Uso por Módulo](#-uso-por-módulo)
- [🌐 Estado Actual](#-estado-actual)
- [📜 Scripts Disponibles](#scripts-disponibles)
- [🤝 Contribución](#-contribución)
- [📄 Licencia](#-licencia)

---

## 🚀 Sinopsis

**UniSpace** es una aplicación web personal de gestión académica construida con Angular 22 y Supabase. Proporciona un entorno integrado para:

- Autenticación de usuarios con Supabase Auth
- Gestión de cursos (CRUD con colores y docentes)
- Tareas con fechas límite y asociación a cursos
- Horario semanal interactivo (Lunes-Viernes)
- Cuadernos digitales por curso con páginas infinitas
- Calendario académico visual
- Configuración de perfil y iniciales

El diseño sigue el tema **"Cosmos Profondo"**: fondos de nebulosa WebGL interactivos, esquinas vidrio esmerilado, paleta índigo-cian y efectos de hover sutiles.

---

## 🛠 Tecnologías

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Framework | Angular | 22.1.0 |
| Idioma | TypeScript | ~6.0.2 |
| Base de Datos | Supabase | 2.112.3 |
| UI | CSS Custom Properties, Flexbox Grid | — |
| Gráficos | WebGL Shader (simplex noise FBM) | — |
| Animaciones | Pointer events, Keyframes CSS | — |
| Utilidades | RxJS, jsdom, vitest | ~7.8.0, ^28.0.0, ^4.0.8 |

---

## ✨ Características

| Característica | Descripción |
|----------------|-------------|
| **Autenticación Completa** | Registro, login, recuperación de contraseña con Supabase Auth |
| **Gestión de Cursos** | Crear/editar/eliminar cursos con colores identificativos y progreso |
| **Sistema de Tareas** | Tareas con fechas límite, filtros por curso, estado pendiente/completado, indicador de vencido |
| **Horario Semanal** | Cuadrícula Lunes-Viernes, arrastrar bloques por hora y día, eliminación |
| **Cuadernos Digitales** | Notebooks por curso con guardar/cargar páginas (Supabase + localStorage fallback) |
| **Calendario Integrado** | Vista de calendario académico |
| **Fondo Galaxia WebGL** | Shader personalizado con ruido simplex, parallax de mouse, polvo de estrellas titilante |
| **Efecto Halo en Clics** | Ripple circular cian→turquesa al hacer clic en botones |
| **Sidebar Vidrio** | Menú lateral con backdrop-filter, estado abierto/cerrado, responsive |
| **Responsive Design** | Adaptativo desde 320px hasta 1920px+, sidebar colapsable |
| **Modo Reduced Motion** | WAI-ARIA compliant, respeta `prefers-reduced-motion` |
| **Datos de Demostración** | Interfaz funcional con datos simulados hasta conectar Supabase |

---

## 📦 Instalación

### Prerrequisitos

- [Node.js](https://nodejs.org/) ^20 o superior
- [npm](https://www.npmjs.com/) ^11 o **yarn** ^1.22
- Cuenta [Supabase](https://supabase.io) (gratuita)

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

   - Crea un nuevo proyecto en [Supabase Dashboard](https://supabase.io/dashboard)
   - Ve a **Settings → API** y copia tus valores:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - O edita `src/environments/environment.ts` directamente:
     ```typescript
     export const environment = {
       supabaseUrl: 'TU_URL',
       supabasePublishableKey: 'TU_KEY'
     };
     ```

4. **Ejecutar migraciones SQL** (en el SQL Editor de Supabase):

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

   La aplicación se abrirá en `http://localhost:4200`.

---

## 🚦 Ejecución Rápida

| Comando | Descripción |
|---------|-------------|
| `npm start` | Servidor de desarrollo en `http://localhost:4200` |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run watch` | Modo watch con `--configuration development` |
| `npm test` | Ejecutar pruebas Vitest |

---

## 📚 Uso por Módulo

### Autenticación (`/auth`)

- Registro con nombre, email y contraseña
- Login con credenciales
- Reenvío de correo de confirmación
- Cerrar sesión

### Cursos (`/courses`)

- **Crear curso**: Agregar nombre, docente opcional y color identificador
- **Ver cursos**: Grid de tarjetas con badges de color
- **Eliminar curso**: Confirmación previa — borra tareas, horario y cuaderno asociados

### Tareas (`/tasks`)

- **Nueva tarea**: Título, curso opcional (o "General"), fecha límite (solo a partir de hoy)
- **Ver tareas**: Lista con contador, checkbox para completar/pendiente, eliminar
- **Fechas vencidas**: Resaltado en rojo con negrita bold

### Horario (`/schedule`)

- **Agregar clase**: Seleccionar curso, día (Lunes-Viernes), hora inicio/fin, ubicación
- **Ver horario**: Cuadrícula continua Lunes-Viernes con bloques superpuestos
- **Eliminar bloque**: Botón en cada bloque de clase

### Cuadernos (`/notebooks`)

- **Crear cuaderno**: Automático por curso al primera acceso
- **Guardar página**: Datos de dibujo guardados en Supabase o localStorage
- **Listar cuadernos**: Ver todos los cuadernos por curso
- **Renombrar/Eliminar**: Acciones sobre el cuaderno seleccionado

### Configuración (`/settings`)

- Ver/editar nombre y email del perfil
- Cambiar contraseña (via Supabase)
- Cerrar sesión

### Galaxia (Fondo)

- El fondo WebGL sigue al cursor con 2 capas de parallax
- Deriva sutil que acelera con scroll de página
- Se pausa en pestañas inactivas y modo reduced-motion
- El scroll hacia abajo realza el tono cian

---

## 🌐 Estado Actual

> **⚠️ Esta aplicación está finalizada con interfaz funcional, pero aún requiere conectar Supabase completamente.**

### Hecho ✅

- Arquitectura Angular 22 con signals y standalone components
- Servicios completos: Auth, AppState, Notebook
- UI completa con 7 módulos navegables
- WebGL shader "Cosmos Profondo" personalizado
- Efectos Halo directive, sidebar vidrio, responsive
- Datos de demostración funcionando en `AppStateService`

### Por Hacer 📋

- [ ] Conectar Supabase Auth persistente (guardado en `environment.ts`)
- [ ] Ejecutar migraciones SQL completas en tu proyecto Supabase
- [ ] Proteger rutas con `canActivate` guard
- [ ] Subir imágenes de portada de cursos (`cover` field)
- [ ] Sincronizar `notebooks` y `notebook_pages` con Supabase
- [ ] Agregar calendario full-calendar integration
- [ ] Tests unitarios completos
- [ ] Internacionalización (i18n)
- [ ] Modo oscuro/claro toggle

---

## 📜 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm start` | `ng serve` — Desarrollo local con hot-reload |
| `npm run build` | `ng build` — Compilación de producción |
| `npm run watch` | `ng build --watch --configuration development` — Vigilar cambios |
| `npm test` | `ng test` — Ejecutar suite de pruebas Vitest |

---

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor:

1. **Fork** el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit tus cambios: `git commit -m 'Añadir nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abre un **Pull Request**

### Guías de contribución

- Mantén el estilo de código existente (Prettier configurado)
- No modifiques `environment.ts` con credenciales reales en commits públicos
- Añade tests para nueva funcionalidad
- Actualiza la documentación si cambian APIs públicas
- Sigue el patrón "Cosmos Profundo" en nuevos componentes/estilos

---

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT**.

> Copyright (c) 2026 UniSpace. Para más detalles, consulta el archivo `LICENSE`.

---

## 📸 Capturas de Pantalla

<details>
  <summary>Ver capturas</summary>

| Módulo | Descripción |
|--------|-------------|
| <kbd>Dashboard</kbd> | Página principal con galaxia interactiva y resumen rápido |
| <kbd>Courses</kbd> | Grid de cursos con badges de color y acciones |
| <kbd>Tasks</kbd> | Lista de tareas con checkbox y estado vencido |
| <kbd>Schedule</kbd> | Cuadrícula horaria Lunes-Viernes con bloques superpuestos |
| <kbd>Notebooks</kbd> | Gestión de cuadernos por curso |
| <kbd>Sidebar</kbd> | Menú lateral colapsable en mobile |

</details>

---

## 🙋‍♂️ Preguntas Frecuentes

**¿Necesito configurar Supabase para usar la app?**

No necesariamente. La app funciona completamente con datos de demostración fuera de línea. Sin embargo, para persistencia real, autenticación y storage de archivos, sí es necesario configurar Supabase.

**¿Puedo usar la app sin conexión?**

La interfaz funciona sin conexión usando `localStorage` fallback para cuadernos. Las funciones que requieren Supabase (auth, cursos, tareas, horario) necesitan conexión.

**¿El fondo WebGL afecta el rendimiento?**

El shader está optimizado para WebGL1 sin dependencias externas. En dispositivos móviles o con `prefers-reduced-motion`, el fondo se pauso automáticamente para ahorrar recursos.

**¿Cómo cambio el color/theme principal?**

Los colores principales se definen en las variables CSS `--primary`, `--primary-light`, `--ink`, `--accent-light`. Puedes sobrescribirlas en el archivo `src/styles.scss` o usando atributos `style` en el elemento `<app-root>`.

---

### Hecho con ❤️ por UniSpace

*Sigue el viaje académico entre las estrellas.*
