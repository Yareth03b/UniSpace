-- Imagen de fondo (data URL comprimida) opcional para la portada del curso
alter table public.courses add column if not exists cover text;
