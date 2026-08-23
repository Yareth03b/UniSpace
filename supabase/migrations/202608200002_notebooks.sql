-- Applied to the UniSpace Supabase project for notebooks functionality
create table public.notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null default 'Mi Cuaderno',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notebook_pages (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  page_number integer not null,
  drawing_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notebook_id, page_number)
);

create index notebooks_user_id_idx on public.notebooks(user_id);
create index notebooks_course_id_idx on public.notebooks(course_id);
create index notebook_pages_notebook_id_idx on public.notebook_pages(notebook_id);

alter table public.notebooks enable row level security;
alter table public.notebook_pages enable row level security;

create policy "Users manage own notebooks" on public.notebooks
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage own notebook pages" on public.notebook_pages
  for all using (
    exists (
      select 1 from public.notebooks n 
      where n.id = notebook_pages.notebook_id and n.user_id = (select auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.notebooks n 
      where n.id = notebook_pages.notebook_id and n.user_id = (select auth.uid())
    )
  );
