-- Tareas académicas del usuario
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index tasks_user_id_idx on public.tasks(user_id);
create index tasks_course_id_idx on public.tasks(course_id);

alter table public.tasks enable row level security;

create policy "Users manage own tasks" on public.tasks
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
