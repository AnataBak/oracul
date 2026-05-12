-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

-- Триггер для авто-создания profiles при регистрации в auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- artworks: справочник картин, только код и текстовые поля, без изображения
create table public.artworks (
  signature text primary key,
  source text not null,
  external_id text not null,
  title text not null,
  artist text,
  year text,
  image_url text not null,
  full_image_url text,
  artwork_url text,
  museum_info jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.artworks enable row level security;

create policy "artworks_read_all" on public.artworks
  for select to authenticated, anon using (true);
-- INSERT/UPDATE выполняются только service_role (серверные route handlers).

-- artwork_translations: общая копилка переводов description + short_description
create table public.artwork_translations (
  artwork_signature text not null references public.artworks(signature) on delete cascade,
  language text not null,
  description text,
  short_description text,
  source_model text,
  created_at timestamptz not null default now(),
  primary key (artwork_signature, language)
);
alter table public.artwork_translations enable row level security;

create policy "translations_read_all" on public.artwork_translations
  for select to authenticated, anon using (true);
-- INSERT/UPDATE/DELETE — только service_role

-- oracle_sessions: история раскладов пользователя
create table public.oracle_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artwork_signature text not null references public.artworks(signature),
  mood_text text,
  oracle_voice text,
  oracle_comment text,
  gemini_text_model text,
  visual_analysis_used boolean default false,
  selection_strictness text,
  created_at timestamptz not null default now()
);
alter table public.oracle_sessions enable row level security;

create policy "sessions_select_own" on public.oracle_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "sessions_insert_own" on public.oracle_sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "sessions_delete_own" on public.oracle_sessions
  for delete to authenticated using ((select auth.uid()) = user_id);

create index oracle_sessions_user_created_idx
  on public.oracle_sessions (user_id, created_at desc);
create index oracle_sessions_artwork_idx
  on public.oracle_sessions (artwork_signature);

-- favorites: закладка на конкретный расклад + заметки/теги
create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.oracle_sessions(id) on delete cascade,
  note text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (user_id, session_id)
);
alter table public.favorites enable row level security;

create policy "fav_select_own" on public.favorites
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "fav_insert_own" on public.favorites
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "fav_update_own" on public.favorites
  for update to authenticated using ((select auth.uid()) = user_id);
create policy "fav_delete_own" on public.favorites
  for delete to authenticated using ((select auth.uid()) = user_id);

create index favorites_user_created_idx
  on public.favorites (user_id, created_at desc);
