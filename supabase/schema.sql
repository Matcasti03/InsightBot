create extension if not exists "pgcrypto";

create table if not exists public.health_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  state text not null,
  type text not null default 'ubs' check (type in ('ubs', 'clinica', 'hospital')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists health_units_name_city_state_key
  on public.health_units (name, city, state);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  avatar_url text,
  role text not null default 'paciente'
    check (role in ('superadmin', 'medico', 'operador_ubs', 'paciente')),
  health_unit text,
  professional_register text,
  cpf text,
  birth_date date,
  phone text,
  status text not null default 'ativo'
    check (status in ('ativo', 'pendente', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_cpf_key
  on public.profiles (cpf) where cpf is not null;

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_health_unit_idx on public.profiles (health_unit);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  doctor_id uuid,
  operator_id uuid,
  health_unit text,
  capsule_id text not null,
  status text not null default 'agendado'
    check (status in ('agendado', 'em_andamento', 'concluido', 'cancelado')),
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  telemetry jsonb not null default '{}'::jsonb,
  capsule_position jsonb not null default '{}'::jsonb,
  ai_findings jsonb not null default '[]'::jsonb,
  report text,
  report_status text not null default 'pendente'
    check (report_status in ('pendente', 'em_analise', 'concluido')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exams_patient_id_fkey foreign key (patient_id)
    references public.profiles(id) on delete cascade,
  constraint exams_doctor_id_fkey foreign key (doctor_id)
    references public.profiles(id) on delete set null,
  constraint exams_operator_id_fkey foreign key (operator_id)
    references public.profiles(id) on delete set null
);

create index if not exists exams_patient_id_idx on public.exams (patient_id);
create index if not exists exams_doctor_id_idx on public.exams (doctor_id);
create index if not exists exams_operator_id_idx on public.exams (operator_id);
create index if not exists exams_status_idx on public.exams (status);
create index if not exists exams_health_unit_idx on public.exams (health_unit);
create index if not exists exams_capsule_id_idx on public.exams (capsule_id);

create table if not exists public.biopsy_samples (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null,
  capsule_id text not null,
  triggered_by uuid,
  triggered_at timestamptz not null default now(),
  coordinates jsonb not null default '{}'::jsonb,
  human_validated boolean not null default false,
  validated_by uuid,
  validated_at timestamptz,
  status text not null default 'coletada'
    check (status in ('coletada', 'enviada_laboratorio', 'resultado_disponivel')),
  result text not null default 'pendente'
    check (result in ('pendente', 'negativo', 'positivo', 'inconclusivo')),
  lab_code text,
  notes text,
  updated_at timestamptz not null default now(),
  constraint biopsy_samples_exam_id_fkey foreign key (exam_id)
    references public.exams(id) on delete cascade,
  constraint biopsy_samples_triggered_by_fkey foreign key (triggered_by)
    references public.profiles(id) on delete set null,
  constraint biopsy_samples_validated_by_fkey foreign key (validated_by)
    references public.profiles(id) on delete set null
);

create index if not exists biopsy_samples_exam_id_idx on public.biopsy_samples (exam_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role, status)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data->>'phone', ''),
    'paciente',
    'ativo'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid() and status = 'ativo'), 'anon');
$$;

create or replace function public.current_health_unit()
returns text language sql stable security definer set search_path = public
as $$ select health_unit from public.profiles where id = auth.uid() and status = 'ativo'; $$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() in ('superadmin', 'medico', 'operador_ubs');
$$;

create or replace function public.is_clinical()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() in ('superadmin', 'medico');
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() = 'superadmin';
$$;

create or replace function public.can_access_exam(p_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exams e
    where e.id = p_exam_id
      and public.current_profile_role() <> 'anon'
      and (
        e.patient_id = auth.uid()
        or public.is_superadmin()
        or (
          public.is_staff()
          and (
            e.doctor_id = auth.uid()
            or e.operator_id = auth.uid()
            or (
              e.health_unit is not null
              and e.health_unit = public.current_health_unit()
            )
          )
        )
      )
  );
$$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_superadmin() then
    if new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.email is distinct from old.email
      or new.health_unit is distinct from old.health_unit then
      raise exception 'Alteracao de perfil, status ou e-mail nao permitida.';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists exams_set_updated_at on public.exams;
create trigger exams_set_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();

drop trigger if exists biopsy_samples_set_updated_at on public.biopsy_samples;
create trigger biopsy_samples_set_updated_at
  before update on public.biopsy_samples
  for each row execute function public.set_updated_at();

alter table public.health_units enable row level security;
alter table public.profiles enable row level security;
alter table public.exams enable row level security;
alter table public.biopsy_samples enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists health_units_select on public.health_units;
create policy health_units_select on public.health_units
  for select to authenticated using (true);

drop policy if exists health_units_superadmin_all on public.health_units;
create policy health_units_superadmin_all on public.health_units
  for all to authenticated using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists profiles_select_scope on public.profiles;
create policy profiles_select_scope on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_superadmin()
    or (public.is_staff() and role = 'paciente' and health_unit is not null
      and health_unit = public.current_health_unit())
  );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_superadmin_update on public.profiles;
create policy profiles_superadmin_update on public.profiles
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists profiles_superadmin_delete on public.profiles;
create policy profiles_superadmin_delete on public.profiles
  for delete to authenticated using (public.is_superadmin());

drop policy if exists exams_select_scope on public.exams;
create policy exams_select_scope on public.exams
  for select to authenticated using (public.can_access_exam(id));

drop policy if exists exams_staff_insert on public.exams;
create policy exams_staff_insert on public.exams
  for insert to authenticated with check (public.is_staff());

drop policy if exists exams_staff_update on public.exams;
create policy exams_staff_update on public.exams
  for update to authenticated
  using (public.is_staff() and public.can_access_exam(id))
  with check (public.is_staff());

drop policy if exists exams_superadmin_delete on public.exams;
create policy exams_superadmin_delete on public.exams
  for delete to authenticated using (public.is_superadmin());

drop policy if exists biopsy_select_scope on public.biopsy_samples;
create policy biopsy_select_scope on public.biopsy_samples
  for select to authenticated using (public.can_access_exam(exam_id));

drop policy if exists biopsy_clinical_insert on public.biopsy_samples;
create policy biopsy_clinical_insert on public.biopsy_samples
  for insert to authenticated
  with check (public.is_clinical() and public.can_access_exam(exam_id));

drop policy if exists biopsy_clinical_update on public.biopsy_samples;
create policy biopsy_clinical_update on public.biopsy_samples
  for update to authenticated
  using (public.is_clinical() and public.can_access_exam(exam_id))
  with check (public.is_clinical() and public.can_access_exam(exam_id));

drop policy if exists biopsy_superadmin_delete on public.biopsy_samples;
create policy biopsy_superadmin_delete on public.biopsy_samples
  for delete to authenticated using (public.is_superadmin());

drop policy if exists audit_logs_select_superadmin on public.audit_logs;
create policy audit_logs_select_superadmin on public.audit_logs
  for select to authenticated using (public.is_superadmin());

revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url, professional_register, cpf, birth_date)
  on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('exams', 'exams', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_owner_insert on storage.objects;
create policy avatars_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists exams_media_read on storage.objects;
create policy exams_media_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'exams'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.can_access_exam(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists exams_media_insert on storage.objects;
create policy exams_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'exams'
    and public.is_staff()
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.can_access_exam(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists exams_media_update on storage.objects;
create policy exams_media_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'exams'
    and public.is_staff()
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.can_access_exam(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists exams_media_delete on storage.objects;
create policy exams_media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'exams'
    and public.is_staff()
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.can_access_exam(((storage.foldername(name))[1])::uuid)
  );

insert into public.health_units (name, city, state, type)
values
  ('UBS Dr. Joao Mendes', 'Sobral', 'CE', 'ubs'),
  ('UBS Santa Luzia', 'Sobral', 'CE', 'ubs'),
  ('Clinica Sao Camilo', 'Fortaleza', 'CE', 'clinica'),
  ('Hospital Regional Norte', 'Sobral', 'CE', 'hospital'),
  ('UBS Esperanca', 'Meruoca', 'CE', 'ubs'),
  ('Clinica Vida Plena', 'Massape', 'CE', 'clinica')
on conflict (name, city, state) do nothing;

-- Clinical writes go through the authenticated API, which validates roles,
-- human decisions and audit events. Read policies remain available to clients.
revoke insert, update, delete on public.exams, public.biopsy_samples,
  public.health_units, public.audit_logs from anon, authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

-- The database also prevents concurrent pairing of one capsule to two sessions.
create unique index if not exists exams_one_active_capsule
  on public.exams (capsule_id) where status = 'em_andamento';
create unique index if not exists biopsy_samples_lab_code_key
  on public.biopsy_samples (lab_code) where lab_code is not null;
