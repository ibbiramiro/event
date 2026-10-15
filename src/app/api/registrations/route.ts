import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const APPS_SCRIPT_CONTRACT_VERSION = 'digifest-registration-v2';

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
type ServerSupabaseClient = NonNullable<ReturnType<typeof getSupabase>>;

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
  sheet_synced_at: string | null;
  sheet_sync_error: string | null;
};

const SELECTED_COLUMNS =
  'id, registration_number, participant_type, full_name, email, whatsapp, program, binusian_id, institution, event_interests, other_interest, attendee_count, created_at, sheet_synced_at, sheet_sync_error';

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

function getGoogleAppsScriptUrl() {
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();
  if (!scriptUrl) throw new Error('GOOGLE_APPS_SCRIPT_URL is not configured.');

  const url = new URL(scriptUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !url.pathname.endsWith('/exec')) {
    throw new Error('GOOGLE_APPS_SCRIPT_URL must be an HTTPS script.google.com URL ending in /exec.');
  }

  return url.toString();
}

async function updateSheetSyncState(
  supabase: ServerSupabaseClient,
  registrationId: string,
  values: { sheet_synced_at: string | null; sheet_sync_error: string | null },
) {
  const { error } = await supabase
    .from('event_registrations')
    .update(values)
    .eq('id', registrationId);

  if (error) throw new Error(`Unable to update Sheet sync state: ${error.message}`);
}

type AppsScriptReceipt = {
  status?: string;
  message?: string;
  contractVersion?: string;
  verified?: boolean;
  registrationNumber?: string;
  spreadsheetId?: string;
  sheetId?: string;
  sheetName?: string;
  rowNumber?: number;
  action?: string;
};

function getExpectedSpreadsheetId() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID?.trim();
  if (!spreadsheetId) throw new Error('GOOGLE_SPREADSHEET_ID is not configured.');
  return spreadsheetId;
}

function validateAppsScriptReceipt(
  receipt: AppsScriptReceipt,
  row: RegistrationRow,
  expectedSpreadsheetId: string,
) {
  if (receipt.status !== 'success') {
    throw new Error(receipt.message || 'Google Apps Script could not update the sheet.');
  }
  if (receipt.contractVersion !== APPS_SCRIPT_CONTRACT_VERSION) {
    throw new Error('Google Apps Script is running an outdated deployment. Deploy the latest Code.gs version.');
  }
  if (receipt.spreadsheetId !== expectedSpreadsheetId) {
    throw new Error('Google Apps Script wrote to a different spreadsheet than GOOGLE_SPREADSHEET_ID.');
  }
  if (receipt.registrationNumber !== row.registration_number || receipt.verified !== true) {
    throw new Error(`Google Sheets could not verify registration ${row.registration_number}.`);
  }
}

async function syncRegistrationToSheet(supabase: ServerSupabaseClient, row: RegistrationRow) {
  const scriptUrl = getGoogleAppsScriptUrl();
  const expectedSpreadsheetId = getExpectedSpreadsheetId();
  const formData = new URLSearchParams({
    action: 'upsertRegistration',
    expectedSpreadsheetId,
    registrationNumber: row.registration_number,
    participantType: row.participant_type,
    fullName: row.full_name,
    email: row.email,
    whatsapp: row.whatsapp ?? '',
    program: row.program ?? '',
    binusianId: row.binusian_id ?? '',
    institution: row.institution ?? '',
    eventInterests: JSON.stringify(row.event_interests),
    otherInterest: row.other_interest ?? '',
    attendeeCount: String(row.attendee_count),
    createdAt: row.created_at,
  });

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    const responseText = await response.text();

    if (!response.ok) throw new Error(`Google Apps Script returned HTTP ${response.status}.`);

    let receipt: AppsScriptReceipt;
    try {
      receipt = JSON.parse(responseText) as AppsScriptReceipt;
    } catch {
      throw new Error('Google Apps Script returned an invalid response. Deploy it with access set to Anyone.');
    }

    validateAppsScriptReceipt(receipt, row, expectedSpreadsheetId);
    await updateSheetSyncState(supabase, row.id, {
      sheet_synced_at: new Date().toISOString(),
      sheet_sync_error: null,
    });
    return receipt;
  } catch (error) {
    const syncError = error instanceof Error ? error : new Error('Unknown Google Sheets error.');

    try {
      await updateSheetSyncState(supabase, row.id, {
        sheet_synced_at: null,
        sheet_sync_error: syncError.message.slice(0, 500),
      });
    } catch (stateError) {
      console.error('Unable to persist Google Sheets sync failure:', stateError);
    }

    throw syncError;
  }
}

async function registrationResponse(
  supabase: ServerSupabaseClient,
  row: RegistrationRow,
  successStatus: 200 | 201,
  reuseVerifiedSync = false,
) {
  if (reuseVerifiedSync && row.sheet_synced_at && !row.sheet_sync_error) {
    return NextResponse.json(
      {
        registration: toResponse(row),
        sheetSync: {
          status: 'synced',
          contractVersion: APPS_SCRIPT_CONTRACT_VERSION,
          recovered: true,
        },
      },
      { status: successStatus },
    );
  }

  try {
    const receipt = await syncRegistrationToSheet(supabase, row);
    return NextResponse.json(
      {
        registration: toResponse(row),
        sheetSync: {
          status: 'synced',
          contractVersion: receipt.contractVersion,
          rowNumber: receipt.rowNumber,
          sheetName: receipt.sheetName,
        },
      },
      { status: successStatus },
    );
  } catch (error) {
    console.error('Google Sheets registration sync failed:', error);
    return NextResponse.json(
      {
        error: 'Your data was saved, but Google Sheets could not be verified. Please submit again to retry the sync.',
        retryable: true,
      },
      { status: 502 },
    );
  }
}

function identifierSuffix(value: string | undefined) {
  if (!value) return null;
  return `...${value.slice(-6)}`;
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { status: 'misconfigured', error: 'Supabase server environment is incomplete.' },
      { status: 503 },
    );
  }

  try {
    const scriptUrl = getGoogleAppsScriptUrl();
    const expectedSpreadsheetId = getExpectedSpreadsheetId();
    const diagnosticsUrl = new URL(scriptUrl);
    diagnosticsUrl.searchParams.set('mode', 'diagnostics');

    const response = await fetch(diagnosticsUrl, {
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    const responseText = await response.text();
    const receipt = JSON.parse(responseText) as AppsScriptReceipt & { rowCount?: number };
    const contractMatches = receipt.contractVersion === APPS_SCRIPT_CONTRACT_VERSION;
    const targetMatches = receipt.spreadsheetId === expectedSpreadsheetId;
    const healthy = response.ok && receipt.status === 'success' && contractMatches && targetMatches;

    return NextResponse.json(
      {
        status: healthy ? 'ok' : 'misconfigured',
        checks: {
          appsScriptReachable: response.ok && receipt.status === 'success',
          contractMatches,
          targetMatches,
        },
        target: {
          expectedSpreadsheetId: identifierSuffix(expectedSpreadsheetId),
          actualSpreadsheetId: identifierSuffix(receipt.spreadsheetId),
          sheetName: receipt.sheetName ?? null,
          rowCount: receipt.rowCount ?? null,
        },
        contractVersion: receipt.contractVersion ?? null,
      },
      { status: healthy ? 200 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'misconfigured',
        error: error instanceof Error ? error.message : 'Unable to diagnose Google Sheets integration.',
      },
      { status: 503 },
    );
  }
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
        return registrationResponse(supabase, retryQuery.data as RegistrationRow, 200, true);
      }

      const existingEmailQuery = await supabase
        .from('event_registrations')
        .select(SELECTED_COLUMNS)
        .ilike('email', validation.data.email)
        .maybeSingle();

      if (existingEmailQuery.error) {
        console.error('Unable to recover registration by email:', existingEmailQuery.error.message);
      }

      if (existingEmailQuery.data) {
        return registrationResponse(supabase, existingEmailQuery.data as RegistrationRow, 200, true);
      }

      return NextResponse.json(
        { error: 'This BINUSIAN ID has already been registered with another email address.' },
        { status: 409 },
      );
    }

    console.error('Supabase registration failed:', error.code, error.message);
    return NextResponse.json(
      { error: 'We could not save your registration. Please try again.' },
      { status: 500 },
    );
  }

  return registrationResponse(supabase, data as RegistrationRow, 201);
}
