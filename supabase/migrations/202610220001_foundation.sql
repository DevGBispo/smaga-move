-- SMAGA Move | Fundação segura. Aplicar apenas em projeto NOVO de desenvolvimento.
-- Perfis pertencem ao Auth; contas de teste são criadas pelo Dashboard -> Authentication.
create type public.app_role as enum ('operator','manager','admin');
create type public.transport_sector as enum ('operations','full','empty');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role public.app_role not null default 'operator',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.profile_sectors (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sector public.transport_sector not null,
  primary key (profile_id, sector)
);
create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Não aceitar papel/ativação vindos de user_metadata do cliente.
create function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.create_profile_for_new_user();

-- Função interna para RLS sem recursão em policies de profiles.
create function public.is_active_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active);
$$;
create function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and p.role = 'admin');
$$;
revoke all on function public.is_active_staff() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_active_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.profile_sectors enable row level security;
alter table public.audit_events enable row level security;
create policy profiles_read on public.profiles for select to authenticated using ((id = (select auth.uid()) and public.is_active_staff()) or public.is_admin());
create policy sectors_read on public.profile_sectors for select to authenticated using ((profile_id = (select auth.uid()) and public.is_active_staff()) or public.is_admin());
-- Mutação de papéis/setores e leitura da auditoria: somente operações privilegiadas no backend.
-- Ausência de policies de escrita é intencional. Nunca expor service_role no frontend.
revoke all on public.audit_events from anon, authenticated;
revoke insert, update, delete on public.profiles, public.profile_sectors from anon, authenticated;
