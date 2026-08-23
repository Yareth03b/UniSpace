# UniSpace

Base de una aplicación académica personal creada con Angular. Incluye una maqueta navegable para cursos, tareas, cuadernos, calendario, archivos y ajustes.

## Abrir en VS Code

1. Abre Visual Studio Code.
2. Selecciona **File > Open Folder**.
3. Elige la carpeta `UniSpace`.
4. Abre la terminal integrada y ejecuta `npm start`.
5. Visita la dirección que mostrará Angular, normalmente `http://localhost:4200`.

## Estructura

```text
src/app/
├── core/                 # Modelos, servicios y futura integración Supabase
├── features/             # Una carpeta por módulo funcional
│   ├── calendar/
│   ├── courses/
│   ├── dashboard/
│   ├── files/
│   ├── notebooks/
│   ├── settings/
│   └── tasks/
└── shared/               # Componentes reutilizables, como el menú lateral
```

## Estado actual

La interfaz usa datos de demostración en `core/services/app-state.service.ts`. La siguiente etapa es conectar autenticación, base de datos y almacenamiento de archivos de Supabase.

## Comandos

- `npm start`: inicia el servidor de desarrollo.
- `npm run build`: genera una compilación de producción.
- `npm test`: ejecuta las pruebas configuradas.
