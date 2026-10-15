-- Event registration schema for Supabase
-- Run this file once in Supabase Dashboard > SQL Editor before deploying the app.

create extension if not exists pgcrypto;

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  registration_sequence bigint generated always as identity (start with 1 increment by 1),
  registration_number text not null,
  participant_type text not null,
  full_name text not null,
  email text not null,
  whatsapp text not null,
  program text not null,
  binusian_id text,
  institution text,
  idempotency_key uuid not null,
  status text not null default 'REGISTERED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  checked_in_at timestamptz,

  constraint event_registrations_registration_sequence_key unique (registration_sequence),
  constraint event_registrations_registration_number_key unique (registration_number),
  constraint event_registrations_idempotency_key_key unique (idempotency_key),
  constraint event_registrations_participant_type_check
    check (participant_type in ('BINUSIAN', 'NON_BINUSIAN')),
  constraint event_registrations_program_check
    check (program in (
      'Computer Science',
      'Visual Communication Design',
      'Information System',
      'Digital Business',
      'International Trade'
    )),
  constraint event_registrations_status_check
    check (status in ('REGISTERED', 'CHECKED_IN', 'CANCELLED')),
  constraint event_registrations_full_name_check
    check (char_length(full_name) between 2 and 100),
  constraint event_registrations_email_check
    check (char_length(email) between 5 and 254 and position('@' in email) > 1),
  constraint event_registrations_whatsapp_check
    check (char_length(whatsapp) between 8 and 25),
  constraint event_registrations_participant_details_check
    check (
      (
        participant_type = 'BINUSIAN'
        and binusian_id ~ '^[0-9]{10}$'
        and institution is null
        and lower(email) like '%@binus.ac.id'
      )
      or
      (
        participant_type = 'NON_BINUSIAN'
        and binusian_id is null
        and char_length(institution) between 2 and 150
      )
    )
);

create unique index if not exists event_registrations_email_unique
  on public.event_registrations (lower(email));

create unique index if not exists event_registrations_binusian_id_unique
  on public.event_registrations (binusian_id)
  where binusian_id is not null;

create index if not exists event_registrations_created_at_idx
  on public.event_registrations (created_at desc);

create or replace function public.set_event_registration_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.registration_number := 'DFC' ||
    case
      when new.registration_sequence < 1000
        then lpad(new.registration_sequence::text, 3, '0')
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

-- Registrations are written only by the server-side API with the service-role key.
-- No anonymous browser policy is intentionally created.
revoke all on table public.event_registrations from anon, authenticated;
grant all on table public.event_registrations to service_role;
grant usage, select on sequence public.event_registrations_registration_sequence_seq to service_role;

revoke execute on function public.set_event_registration_number() from public, anon, authenticated;
revoke execute on function public.set_event_registration_updated_at() from public, anon, authenticated;
grant execute on function public.set_event_registration_number() to service_role;
grant execute on function public.set_event_registration_updated_at() to service_role;
