-- DIGIFEST CAMP 2026 event registration schema for Supabase.
-- Safe for both a fresh project and a project that already ran the previous schema.
-- Run the complete file in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  registration_sequence bigint generated always as identity (start with 1 increment by 1),
  registration_number text not null,
  participant_type text not null,
  full_name text not null,
  email text not null,
  whatsapp text,
  program text,
  binusian_id text,
  institution text,
  event_interests text[] not null default '{}'::text[],
  other_interest text,
  attendee_count integer not null default 1,
  idempotency_key uuid not null,
  status text not null default 'REGISTERED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  checked_in_at timestamptz,
  sheet_synced_at timestamptz,
  sheet_sync_error text,

  constraint event_registrations_registration_sequence_key unique (registration_sequence),
  constraint event_registrations_registration_number_key unique (registration_number),
  constraint event_registrations_idempotency_key_key unique (idempotency_key)
);

-- Upgrade columns from previous versions without deleting existing registrations.
alter table public.event_registrations add column if not exists event_interests text[] not null default '{}'::text[];
alter table public.event_registrations add column if not exists other_interest text;
alter table public.event_registrations add column if not exists attendee_count integer not null default 1;
alter table public.event_registrations add column if not exists sheet_synced_at timestamptz;
alter table public.event_registrations add column if not exists sheet_sync_error text;
alter table public.event_registrations alter column whatsapp drop not null;
alter table public.event_registrations alter column program drop not null;

-- Replace old constraints with the updated conditional registration rules.
alter table public.event_registrations drop constraint if exists event_registrations_participant_type_check;
alter table public.event_registrations drop constraint if exists event_registrations_program_check;
alter table public.event_registrations drop constraint if exists event_registrations_status_check;
alter table public.event_registrations drop constraint if exists event_registrations_full_name_check;
alter table public.event_registrations drop constraint if exists event_registrations_email_check;
alter table public.event_registrations drop constraint if exists event_registrations_whatsapp_check;
alter table public.event_registrations drop constraint if exists event_registrations_participant_details_check;
alter table public.event_registrations drop constraint if exists event_registrations_event_interests_check;
alter table public.event_registrations drop constraint if exists event_registrations_other_interest_check;
alter table public.event_registrations drop constraint if exists event_registrations_attendee_count_check;

alter table public.event_registrations
  add constraint event_registrations_participant_type_check
  check (participant_type in ('BINUSIAN', 'NON_BINUSIAN')) not valid;

alter table public.event_registrations
  add constraint event_registrations_program_check
  check (program is null or program in (
    'Computer Science',
    'Visual Communication Design',
    'Information System',
    'Digital Business',
    'International Trade'
  )) not valid;

alter table public.event_registrations
  add constraint event_registrations_status_check
  check (status in ('REGISTERED', 'CHECKED_IN', 'CANCELLED')) not valid;

alter table public.event_registrations
  add constraint event_registrations_full_name_check
  check (char_length(full_name) between 2 and 100) not valid;

alter table public.event_registrations
  add constraint event_registrations_email_check
  check (char_length(email) between 5 and 254 and position('@' in email) > 1) not valid;

alter table public.event_registrations
  add constraint event_registrations_whatsapp_check
  check (whatsapp is null or char_length(whatsapp) between 8 and 25) not valid;

alter table public.event_registrations
  add constraint event_registrations_event_interests_check
  check (
    cardinality(event_interests) between 1 and 6
    and event_interests <@ array[
      'SEMINAR_TALKSHOW',
      'BAZAAR',
      'BOOTH_EXHIBITION',
      'NETWORKING',
      'FULL_EVENT',
      'OTHER'
    ]::text[]
  ) not valid;

alter table public.event_registrations
  add constraint event_registrations_other_interest_check
  check (
    (
      'OTHER' = any(event_interests)
      and char_length(other_interest) between 2 and 200
    )
    or
    (
      not ('OTHER' = any(event_interests))
      and other_interest is null
    )
  ) not valid;

alter table public.event_registrations
  add constraint event_registrations_attendee_count_check
  check (attendee_count between 1 and 20) not valid;

alter table public.event_registrations
  add constraint event_registrations_participant_details_check
  check (
    (
      participant_type = 'BINUSIAN'
      and binusian_id ~ '^[0-9]{10}$'
      and institution is null
      and whatsapp is null
      and program is not null
      and lower(email) like '%@binus.ac.id'
    )
    or
    (
      participant_type = 'NON_BINUSIAN'
      and binusian_id is null
      and program is null
      and char_length(institution) between 2 and 150
      and char_length(whatsapp) between 8 and 25
    )
  ) not valid;

create unique index if not exists event_registrations_email_unique
  on public.event_registrations (lower(email));

create unique index if not exists event_registrations_binusian_id_unique
  on public.event_registrations (binusian_id)
  where binusian_id is not null;

create index if not exists event_registrations_created_at_idx
  on public.event_registrations (created_at desc);

create index if not exists event_registrations_event_interests_idx
  on public.event_registrations using gin (event_interests);

create or replace function public.set_event_registration_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.registration_number := 'DFC' ||
    case
      when new.registration_sequence < 1000 then lpad(new.registration_sequence::text, 3, '0')
      else new.registration_sequence::text
    end;
  return new;
end;
$$;

drop trigger if exists set_event_registration_number on public.event_registrations;
create trigger set_event_registration_number
  before insert on public.event_registrations
  for each row
  execute function public.set_event_registration_number();

create or replace function public.set_event_registration_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_event_registration_updated_at on public.event_registrations;
create trigger set_event_registration_updated_at
  before update on public.event_registrations
  for each row
  execute function public.set_event_registration_updated_at();

alter table public.event_registrations enable row level security;

revoke all on table public.event_registrations from anon, authenticated;
grant all on table public.event_registrations to service_role;
grant usage, select on sequence public.event_registrations_registration_sequence_seq to service_role;

revoke execute on function public.set_event_registration_number() from public, anon, authenticated;
revoke execute on function public.set_event_registration_updated_at() from public, anon, authenticated;
grant execute on function public.set_event_registration_number() to service_role;
grant execute on function public.set_event_registration_updated_at() to service_role;
