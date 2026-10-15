import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PROGRAMS = new Set([
  'Computer Science',
  'Visual Communication Design',
  'Information System',
  'Digital Business',
  'International Trade',
]);

const EVENT_INTERESTS = new Set([
  'SEMINAR_TALKSHOW',
  'BAZAAR',
  'BOOTH_EXHIBITION',
  'NETWORKING',
  'FULL_EVENT',
  'OTHER',
]);

type ParticipantType = 'BINUSIAN' | 'NON_BINUSIAN';

type RegistrationPayload = {
  participantType?: unknown;
  fullName?: unknown;
  email?: unknown;
  whatsapp?: unknown;
  program?: unknown;
  binusianId?: unknown;
  institution?: unknown;
  eventInterests?: unknown;
  otherInterest?: unknown;
  attendeeCount?: unknown;
  consent?: unknown;
  idempotencyKey?: unknown;
};

type RegistrationRow = {
  id: string;
  registration_number: string;
  participant_type: ParticipantType;
  full_name: string;
  email: string;
  whatsapp: string | null;
  program: string | null;
  binusian_id: string | null;
  institution: string | null;
  event_interests: string[];
  other_interest: string | null;
  attendee_count: number;
  created_at: string;
};

const SELECTED_COLUMNS =
  'id, registration_number, participant_type, full_name, email, whatsapp, program, binusian_id, institution, event_interests, other_interest, attendee_count, created_at';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toResponse(row: RegistrationRow) {
  return {
    id: row.id,
    registrationNumber: row.registration_number,
    participantType: row.participant_type,
    fullName: row.full_name,
    email: row.email,
    whatsapp: row.whatsapp,
    program: row.program,
    binusianId: row.binusian_id,
    institution: row.institution,
    eventInterests: row.event_interests,
    otherInterest: row.other_interest,
    attendeeCount: row.attendee_count,
    createdAt: row.created_at,
  };
}

function validate(body: RegistrationPayload) {
  const participantType = text(body.participantType) as ParticipantType;
  const fullName = text(body.fullName).replace(/\s+/g, ' ');
  const email = text(body.email).toLowerCase();
  const whatsapp = text(body.whatsapp).replace(/\s+/g, ' ');
  const program = text(body.program);
  const binusianId = text(body.binusianId);
  const institution = text(body.institution).replace(/\s+/g, ' ');
  const otherInterest = text(body.otherInterest).replace(/\s+/g, ' ');
  const attendeeCount = Number(body.attendeeCount);
  const idempotencyKey = text(body.idempotencyKey);
  const eventInterests = Array.isArray(body.eventInterests)
    ? [...new Set(body.eventInterests.filter((item): item is string => typeof item === 'string'))]
    : [];

  if (participantType !== 'BINUSIAN' && participantType !== 'NON_BINUSIAN') {
    return { error: 'Choose a participant category.' } as const;
  }
  if (fullName.length < 2 || fullName.length > 100) {
    return { error: 'Full name must contain 2 to 100 characters.' } as const;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { error: 'Enter a valid email address.' } as const;
  }
  if (participantType === 'BINUSIAN') {
    if (!email.endsWith('@binus.ac.id')) {
      return { error: 'BINUSIAN participants must use an @binus.ac.id email address.' } as const;
    }
    if (!/^\d{10}$/.test(binusianId)) {
      return { error: 'BINUSIAN ID must contain exactly 10 digits.' } as const;
    }
    if (!PROGRAMS.has(program)) {
      return { error: 'Choose one of the available study programs.' } as const;
    }
  }
  if (participantType === 'NON_BINUSIAN') {
    if (institution.length < 2 || institution.length > 150) {
      return { error: 'Institution must contain 2 to 150 characters.' } as const;
    }
    if (!/^\+?[0-9][0-9 ()-]{7,24}$/.test(whatsapp)) {
      return { error: 'Enter a valid WhatsApp number.' } as const;
    }
  }
  if (eventInterests.length === 0 || eventInterests.some((interest) => !EVENT_INTERESTS.has(interest))) {
    return { error: 'Choose at least one valid DIGIFEST CAMP 2026 activity.' } as const;
  }
  if (eventInterests.includes('OTHER') && (otherInterest.length < 2 || otherInterest.length > 200)) {
    return { error: 'Describe your other event interest using 2 to 200 characters.' } as const;
  }
  if (!Number.isInteger(attendeeCount) || attendeeCount < 1 || attendeeCount > 20) {
    return { error: 'Attendee count must be between 1 and 20.' } as const;
  }
  if (body.consent !== true) {
    return { error: 'You must agree to the registration terms.' } as const;
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return { error: 'The registration request is invalid. Refresh the page and try again.' } as const;
  }

  return {
    data: {
      participant_type: participantType,
      full_name: fullName,
      email,
      whatsapp: participantType === 'NON_BINUSIAN' ? whatsapp : null,
      program: participantType === 'BINUSIAN' ? program : null,
      binusian_id: participantType === 'BINUSIAN' ? binusianId : null,
      institution: participantType === 'NON_BINUSIAN' ? institution : null,
      event_interests: eventInterests,
      other_interest: eventInterests.includes('OTHER') ? otherInterest : null,
      attendee_count: attendeeCount,
      idempotency_key: idempotencyKey,
    },
  } as const;
}

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  let body: RegistrationPayload;

  try {
    body = (await request.json()) as RegistrationPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request.' }, { status: 400 });
  }

  const validation = validate(body);
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.error('Registration API is missing Supabase environment variables.');
    return NextResponse.json(
      { error: 'Registration is temporarily unavailable. Please contact the event team.' },
      { status: 503 },
    );
  }

  const idempotencyKey = validation.data.idempotency_key;
  const existingQuery = await supabase
    .from('event_registrations')
    .select(SELECTED_COLUMNS)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingQuery.data) {
    return NextResponse.json({ registration: toResponse(existingQuery.data as RegistrationRow) });
  }

  const { data, error } = await supabase
    .from('event_registrations')
    .insert(validation.data)
    .select(SELECTED_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') {
      const retryQuery = await supabase
        .from('event_registrations')
        .select(SELECTED_COLUMNS)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (retryQuery.data) {
        return NextResponse.json({ registration: toResponse(retryQuery.data as RegistrationRow) });
      }

      return NextResponse.json(
        { error: 'This email address or BINUSIAN ID has already been registered.' },
        { status: 409 },
      );
    }

    console.error('Supabase registration failed:', error.code, error.message);
    return NextResponse.json(
      { error: 'We could not save your registration. Please try again.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ registration: toResponse(data as RegistrationRow) }, { status: 201 });
}
