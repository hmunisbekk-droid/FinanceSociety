-- WIUT Finance Society — initial schema (ТЗ v1, sections 3, 5, 6).
--
-- Content tree:   levels → subjects → topics → (materials, quiz → questions → options)
-- Learning:       topic_progress, quiz_attempts, topic_views
-- Community:      events → event_registrations
-- People:         profiles (role: student | editor | admin), editor_subjects
--
-- Security model: every table has row-level security. Helper functions below are
-- SECURITY DEFINER so policies can read profiles without recursing into their own RLS.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('student', 'editor', 'admin');
-- draft = being written · review = editor submitted it for publishing · published = students can see it
create type public.content_status as enum ('draft', 'review', 'published');
create type public.material_type as enum ('pdf', 'slides', 'image', 'video', 'link', 'notes');
create type public.question_type as enum ('single', 'multiple', 'true_false', 'numeric');
create type public.tolerance_type as enum ('absolute', 'percent');

-- ---------------------------------------------------------------------------
-- Content tree
-- ---------------------------------------------------------------------------
create table public.levels (
  id          uuid primary key default gen_random_uuid(),
  number      smallint not null unique check (number between 3 and 6),
  name        text not null,
  study_year  text not null,
  description text not null default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  level_id    uuid not null references public.levels(id) on delete cascade,
  name        text not null,
  slug        text not null,
  description text not null default '',
  sort_order  int  not null default 0,
  status      public.content_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (level_id, slug)
);
create index subjects_level_idx on public.subjects (level_id, sort_order);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  programme   text,
  level_id    uuid references public.levels(id) on delete set null,
  role        public.user_role not null default 'student',
  is_blocked  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_email_idx on public.profiles (lower(email));

create table public.editor_subjects (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  primary key (user_id, subject_id)
);
create index editor_subjects_subject_idx on public.editor_subjects (subject_id);

-- ---------------------------------------------------------------------------
-- Topics, materials, quizzes
-- ---------------------------------------------------------------------------
create table public.topics (
  id             uuid primary key default gen_random_uuid(),
  subject_id     uuid not null references public.subjects(id) on delete cascade,
  title          text not null,
  slug           text not null,
  summary        text not null default '',
  key_formulas   text not null default '',
  worked_example text not null default '',
  sort_order     int  not null default 0,
  status         public.content_status not null default 'draft',
  author_id      uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (subject_id, slug)
);
create index topics_subject_idx on public.topics (subject_id, sort_order);

create table public.materials (
  id             uuid primary key default gen_random_uuid(),
  topic_id       uuid not null references public.topics(id) on delete cascade,
  title          text not null,
  type           public.material_type not null,
  storage_path   text,                 -- uploaded file in the "materials" bucket
  external_url   text,                 -- video or external link
  body           text,                 -- text notes
  file_size      bigint,
  allow_download boolean not null default true,
  sort_order     int  not null default 0,
  status         public.content_status not null default 'published',
  author_id      uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  check (file_size is null or file_size <= 20 * 1024 * 1024)
);
create index materials_topic_idx on public.materials (topic_id, sort_order);

create table public.quizzes (
  id                 uuid primary key default gen_random_uuid(),
  topic_id           uuid not null unique references public.topics(id) on delete cascade,
  title              text not null default 'Quiz',
  shuffle_questions  boolean not null default true,
  shuffle_options    boolean not null default true,
  time_limit_seconds int,
  status             public.content_status not null default 'draft',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.questions (
  id             uuid primary key default gen_random_uuid(),
  quiz_id        uuid not null references public.quizzes(id) on delete cascade,
  type           public.question_type not null,
  prompt         text not null,
  explanation    text not null default '',
  points         numeric not null default 1 check (points > 0),
  -- numeric questions only
  numeric_answer numeric,
  tolerance      numeric check (tolerance is null or tolerance >= 0),
  tolerance_type public.tolerance_type,
  sort_order     int  not null default 0,
  created_at     timestamptz not null default now(),
  check (type <> 'numeric' or numeric_answer is not null)
);
create index questions_quiz_idx on public.questions (quiz_id, sort_order);

create table public.question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  text        text not null,
  is_correct  boolean not null default false,
  sort_order  int  not null default 0
);
create index question_options_question_idx on public.question_options (question_id, sort_order);

-- ---------------------------------------------------------------------------
-- Learning activity
-- ---------------------------------------------------------------------------
create table public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  quiz_id      uuid not null references public.quizzes(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  score        numeric not null,
  max_score    numeric not null,
  percent      numeric not null,
  answers      jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now()
);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id, quiz_id, submitted_at desc);
create index quiz_attempts_quiz_idx on public.quiz_attempts (quiz_id);

create table public.topic_progress (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  topic_id       uuid not null references public.topics(id) on delete cascade,
  completed_at   timestamptz,
  last_opened_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);
create index topic_progress_topic_idx on public.topic_progress (topic_id);

create table public.topic_views (
  id        bigint generated always as identity primary key,
  topic_id  uuid not null references public.topics(id) on delete cascade,
  user_id   uuid references public.profiles(id) on delete set null,
  viewed_at timestamptz not null default now()
);
create index topic_views_topic_idx on public.topic_views (topic_id, viewed_at desc);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  slug        text not null unique,
  description text not null default '',
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  location    text,
  online_link text,
  speaker     text,
  poster_path text,                   -- image in the "posters" bucket
  capacity    int check (capacity is null or capacity > 0),
  status      public.content_status not null default 'draft',
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index events_starts_idx on public.events (starts_at);

create table public.event_registrations (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (event_id, user_id)
);
create index event_registrations_event_idx on public.event_registrations (event_id) where cancelled_at is null;

-- ---------------------------------------------------------------------------
-- Helper functions used by policies and triggers
-- ---------------------------------------------------------------------------
-- True for the service-role key and for direct database connections (migrations,
-- the dashboard SQL editor), which carry no user token. Both already bypass RLS;
-- this lets the triggers below treat them as admins too.
create or replace function public.is_privileged()
returns boolean language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '') = ''
      or coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
$$;

create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = (select auth.uid()) and not is_blocked
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select not is_blocked from public.profiles where id = (select auth.uid())), false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_privileged()
      or coalesce((select role = 'admin' and not is_blocked from public.profiles where id = (select auth.uid())), false)
$$;

create or replace function public.is_editor_of(p_subject_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1
    from public.editor_subjects es
    join public.profiles p on p.id = es.user_id
    where es.user_id = (select auth.uid())
      and es.subject_id = p_subject_id
      and p.role in ('editor', 'admin')
      and not p.is_blocked
  )
$$;

create or replace function public.is_content_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce(
    (select role in ('editor', 'admin') and not is_blocked from public.profiles where id = (select auth.uid())), false)
$$;

-- Author names for topic pages, without exposing emails or roles.
create view public.profile_names as
  select id, full_name from public.profiles;
revoke all on public.profile_names from anon;
grant select on public.profile_names to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger subjects_updated_at before update on public.subjects for each row execute function public.set_updated_at();
create trigger topics_updated_at   before update on public.topics   for each row execute function public.set_updated_at();
create trigger quizzes_updated_at  before update on public.quizzes  for each row execute function public.set_updated_at();
create trigger events_updated_at   before update on public.events   for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- A profile row is created for every new auth user from the sign-up form's metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_level text := new.raw_user_meta_data ->> 'level_id';
begin
  insert into public.profiles (id, email, full_name, programme, level_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'programme', ''),
    case when v_level ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_level::uuid end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Students may edit their own profile but never their role, block flag or email.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.role       := old.role;
    new.is_blocked := old.is_blocked;
    new.email      := old.email;
  end if;
  return new;
end $$;

create trigger profiles_protect_fields before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Only admins publish (ТЗ §3): editors can move content to draft or review.
create or replace function public.protect_publish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published')
     and not public.is_admin() then
    raise exception 'Only admins can publish content' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger subjects_protect_publish  before insert or update on public.subjects  for each row execute function public.protect_publish();
create trigger topics_protect_publish    before insert or update on public.topics    for each row execute function public.protect_publish();
create trigger quizzes_protect_publish   before insert or update on public.quizzes   for each row execute function public.protect_publish();
create trigger events_protect_publish    before insert or update on public.events    for each row execute function public.protect_publish();

-- ---------------------------------------------------------------------------
-- Event registration with capacity check (FR-29). Runs as definer so the row
-- lock and the count happen in one transaction.
-- ---------------------------------------------------------------------------
create or replace function public.register_for_event(p_event_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_event public.events%rowtype;
  v_taken int;
begin
  if v_uid is null or not public.is_active_user() then
    raise exception 'You must be logged in to register' using errcode = '42501';
  end if;

  select * into v_event from public.events
   where id = p_event_id and status = 'published'
   for update;
  if not found then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if v_event.starts_at < now() then
    return 'past';
  end if;

  if exists (select 1 from public.event_registrations
              where event_id = p_event_id and user_id = v_uid and cancelled_at is null) then
    return 'registered';
  end if;

  select count(*) into v_taken from public.event_registrations
   where event_id = p_event_id and cancelled_at is null;
  if v_event.capacity is not null and v_taken >= v_event.capacity then
    return 'full';
  end if;

  insert into public.event_registrations (event_id, user_id)
  values (p_event_id, v_uid)
  on conflict (event_id, user_id) do update set cancelled_at = null, created_at = now();
  return 'registered';
end $$;

create or replace function public.cancel_event_registration(p_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.event_registrations
     set cancelled_at = now()
   where event_id = p_event_id and user_id = auth.uid() and cancelled_at is null;
end $$;

revoke execute on function public.register_for_event(uuid) from public, anon;
revoke execute on function public.cancel_event_registration(uuid) from public, anon;
grant execute on function public.register_for_event(uuid) to authenticated;
grant execute on function public.cancel_event_registration(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.levels              enable row level security;
alter table public.subjects            enable row level security;
alter table public.profiles            enable row level security;
alter table public.editor_subjects     enable row level security;
alter table public.topics              enable row level security;
alter table public.materials           enable row level security;
alter table public.quizzes             enable row level security;
alter table public.questions           enable row level security;
alter table public.question_options    enable row level security;
alter table public.quiz_attempts       enable row level security;
alter table public.topic_progress      enable row level security;
alter table public.topic_views         enable row level security;
alter table public.events              enable row level security;
alter table public.event_registrations enable row level security;

-- Levels: public list; admins manage.
create policy "levels are public"      on public.levels for select using (true);
create policy "admins manage levels"   on public.levels for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Subjects: published ones are public (guests see the list); staff see their own drafts.
create policy "published subjects are public" on public.subjects for select
  using (status = 'published' or public.is_editor_of(id));
create policy "admins manage subjects" on public.subjects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Profiles: own row (+ admins see everyone).
create policy "read own profile"    on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "update own profile"  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin()) with check (id = (select auth.uid()) or public.is_admin());

-- Editor assignments: visible to the editor and admins; only admins change them.
create policy "see own assignments"   on public.editor_subjects for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "admins assign editors" on public.editor_subjects for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Topics: logged-in students see published topics of published subjects; editors see all of theirs.
create policy "students read published topics" on public.topics for select to authenticated
  using (
    (status = 'published' and public.is_active_user()
       and exists (select 1 from public.subjects s where s.id = subject_id and s.status = 'published'))
    or public.is_editor_of(subject_id)
  );
create policy "editors manage topics" on public.topics for all to authenticated
  using (public.is_editor_of(subject_id)) with check (public.is_editor_of(subject_id));

-- Materials: follow their topic.
create policy "students read materials" on public.materials for select to authenticated
  using (
    (status = 'published' and public.is_active_user()
       and exists (select 1 from public.topics t join public.subjects s on s.id = t.subject_id
                    where t.id = topic_id and t.status = 'published' and s.status = 'published'))
    or exists (select 1 from public.topics t where t.id = topic_id and public.is_editor_of(t.subject_id))
  );
create policy "editors manage materials" on public.materials for all to authenticated
  using (exists (select 1 from public.topics t where t.id = topic_id and public.is_editor_of(t.subject_id)))
  with check (exists (select 1 from public.topics t where t.id = topic_id and public.is_editor_of(t.subject_id)));

-- Quizzes: students see that a published quiz exists; the questions themselves are
-- served by the server (answers stripped), so students have no direct access to them.
create policy "students read published quizzes" on public.quizzes for select to authenticated
  using (
    (status = 'published' and public.is_active_user()
       and exists (select 1 from public.topics t join public.subjects s on s.id = t.subject_id
                    where t.id = topic_id and t.status = 'published' and s.status = 'published'))
    or exists (select 1 from public.topics t where t.id = topic_id and public.is_editor_of(t.subject_id))
  );
create policy "editors manage quizzes" on public.quizzes for all to authenticated
  using (exists (select 1 from public.topics t where t.id = topic_id and public.is_editor_of(t.subject_id)))
  with check (exists (select 1 from public.topics t where t.id = topic_id and public.is_editor_of(t.subject_id)));

create policy "editors manage questions" on public.questions for all to authenticated
  using (exists (select 1 from public.quizzes q join public.topics t on t.id = q.topic_id
                  where q.id = quiz_id and public.is_editor_of(t.subject_id)))
  with check (exists (select 1 from public.quizzes q join public.topics t on t.id = q.topic_id
                       where q.id = quiz_id and public.is_editor_of(t.subject_id)));

create policy "editors manage options" on public.question_options for all to authenticated
  using (exists (select 1 from public.questions qn join public.quizzes q on q.id = qn.quiz_id
                  join public.topics t on t.id = q.topic_id
                  where qn.id = question_id and public.is_editor_of(t.subject_id)))
  with check (exists (select 1 from public.questions qn join public.quizzes q on q.id = qn.quiz_id
                       join public.topics t on t.id = q.topic_id
                       where qn.id = question_id and public.is_editor_of(t.subject_id)));

-- Attempts are written by the server after grading; students only read their own.
create policy "read own attempts" on public.quiz_attempts for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- Progress: own rows.
create policy "own progress" on public.topic_progress for all to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()));

-- Views: anyone logged in can record one; admins read them for statistics.
create policy "record topic views" on public.topic_views for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "admins read topic views" on public.topic_views for select to authenticated
  using (public.is_admin());

-- Events: published ones are public; admins manage.
create policy "published events are public" on public.events for select
  using (status = 'published' or public.is_admin());
create policy "admins manage events" on public.events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Registrations: written through register_for_event(); own rows readable, admins see all.
create policy "read own registrations" on public.event_registrations for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "admins manage registrations" on public.event_registrations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage buckets (FR-15, FR-18: 20 MB per file)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('materials', 'materials', false, 20 * 1024 * 1024, null),
  ('posters',   'posters',   true,  5 * 1024 * 1024,  array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "students read materials files" on storage.objects for select to authenticated
  using (bucket_id = 'materials' and public.is_active_user());
create policy "staff upload materials files" on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and public.is_content_staff());
create policy "staff update materials files" on storage.objects for update to authenticated
  using (bucket_id = 'materials' and public.is_content_staff());
create policy "staff delete materials files" on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and public.is_content_staff());

create policy "posters are public" on storage.objects for select
  using (bucket_id = 'posters');
create policy "admins upload posters" on storage.objects for insert to authenticated
  with check (bucket_id = 'posters' and public.is_admin());
create policy "admins update posters" on storage.objects for update to authenticated
  using (bucket_id = 'posters' and public.is_admin());
create policy "admins delete posters" on storage.objects for delete to authenticated
  using (bucket_id = 'posters' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed: the four WIUT levels, each with six placeholder modules (ТЗ §6.1).
-- The club renames the modules in the admin panel.
-- ---------------------------------------------------------------------------
insert into public.levels (number, name, study_year, description, sort_order) values
  (3, 'Level 3', 'Foundation',    'Foundation year: the building blocks of finance, economics and quantitative methods.', 1),
  (4, 'Level 4', 'Year 1',        'First year: core modules in accounting, economics and financial mathematics.', 2),
  (5, 'Level 5', 'Year 2',        'Second year: corporate finance, investments and financial reporting in depth.', 3),
  (6, 'Level 6', 'Year 3 (final)','Final year: advanced finance, risk, derivatives and the dissertation.', 4)
on conflict (number) do nothing;

insert into public.subjects (level_id, name, slug, description, sort_order, status)
select l.id, 'Module ' || m, 'module-' || m, 'Module description to be provided by the club.', m, 'published'
from public.levels l cross join generate_series(1, 6) as m
on conflict (level_id, slug) do nothing;
