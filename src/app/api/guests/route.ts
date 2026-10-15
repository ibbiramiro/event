import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxs6ei8aqHQmrezSs8sZ_OS0frWR6kG3QZrPEW9VeZG4L-FWR6LhrID-LRY-L-O2ejX3Q/exec';

async function getWebAppUrl(customUrl: string | null) {
  if (customUrl) return customUrl;
  if (process.env.GOOGLE_APPS_SCRIPT_URL) return process.env.GOOGLE_APPS_SCRIPT_URL;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data } = await supabase
      .from('sysapp_config')
      .select('value')
      .eq('key', 'web_app_url')
      .single();

    if (data?.value) return data.value;
  } catch (error) {
    console.error('Failed to get Google Apps Script URL from Supabase:', error);
  }

  return DEFAULT_WEB_APP_URL;
}

export async function GET(request: Request) {
  try {
    const customUrl = request.headers.get('x-web-app-url');
    const targetUrl = await getWebAppUrl(customUrl);
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) throw new Error('Failed to fetch data from Google Apps Script');

    const responseText = await response.text();
    try {
      return NextResponse.json(JSON.parse(responseText));
    } catch {
      if (responseText.includes('accounts.google.com') || responseText.includes('<html')) {
        console.error('Google Apps Script requires authentication or returned HTML.');
        return NextResponse.json(
          {
            error: 'Configuration Error',
            message: 'Deploy Google Apps Script with Execute as: Me and Who has access: Anyone.',
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch', message: 'Apps Script returned invalid JSON' },
        { status: 500 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Google Sheets error';
    console.error('Error in GET /api/guests:', error);
    return NextResponse.json({ error: 'Failed to fetch', message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const customUrl = request.headers.get('x-web-app-url');
    const targetUrl = await getWebAppUrl(customUrl);
    const body = (await request.json()) as Record<string, unknown>;
    const formData = new URLSearchParams();

    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) formData.append(key, String(value));
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!response.ok) throw new Error('Failed to post data to Google Apps Script');

    const responseText = await response.text();
    try {
      return NextResponse.json(JSON.parse(responseText));
    } catch {
      if (responseText.includes('accounts.google.com') || responseText.includes('<html')) {
        console.error('Google Apps Script requires authentication or returned HTML.');
        return NextResponse.json(
          {
            error: 'Configuration Error',
            message: 'Deploy Google Apps Script with Execute as: Me and Who has access: Anyone.',
          },
          { status: 500 },
        );
      }

      if (responseText.includes('Skrip sudah lengkap')) {
        return NextResponse.json(
          { error: 'Apps Script did not return anything. Make sure the script handles this action.' },
          { status: 400 },
        );
      }

      return NextResponse.json({ error: 'Apps Script returned invalid JSON' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating sheet:', error);
    return NextResponse.json({ error: 'Failed to update sheet' }, { status: 500 });
  }
}
