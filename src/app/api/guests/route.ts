import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxs6ei8aqHQmrezSs8sZ_OS0frWR6kG3QZrPEW9VeZG4L-FWR6LhrID-LRY-L-O2ejX3Q/exec';

import { createClient } from '@supabase/supabase-js';

async function getWebAppUrl(customUrl: string | null) {
  if (customUrl) return customUrl;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await supabase.from('sysapp_config').select('value').eq('key', 'web_app_url').single();
    if (data && data.value) return data.value;
  } catch (err) {
    console.error('Failed to get config from supabase', err);
  }
  return DEFAULT_WEB_APP_URL;
}

export async function GET(request: Request) {
  try {
    const customUrl = request.headers.get('x-web-app-url');
    const targetUrl = await getWebAppUrl(customUrl);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data from Google Apps Script');
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError: any) {
      if (text.includes('accounts.google.com') || text.includes('<html')) {
        console.error('Error: Google Apps Script URL requires authentication or returned HTML.');
        return NextResponse.json({
          error: 'Configuration Error',
          message: 'The Google Apps Script URL requires authentication. Please ensure it is deployed with "Execute as: Me" and "Who has access: Anyone".'
        }, { status: 500 });
      }
      return NextResponse.json({ error: 'Failed to fetch', message: 'Apps Script returned invalid JSON' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in GET /api/guests:', error);
    return NextResponse.json({ error: 'Failed to fetch', message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const customUrl = request.headers.get('x-web-app-url');
    const targetUrl = await getWebAppUrl(customUrl);

    const body = await request.json();
    const { action, rowNumber } = body;

    const formData = new URLSearchParams();
    for (const key in body) {
      if (body[key] !== undefined && body[key] !== null) {
        formData.append(key, body[key].toString());
      }
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to post data to Google Apps Script');
    }

    // Google Apps Script might return HTML instead of JSON if it crashes, so handle that safely
    const responseText = await response.text();
    try {
      const result = JSON.parse(responseText);
      return NextResponse.json(result);
    } catch (e) {
      if (responseText.includes('accounts.google.com') || responseText.includes('<html')) {
        console.error('Error: Google Apps Script URL requires authentication or returned HTML.');
        return NextResponse.json({
          error: 'Configuration Error',
          message: 'The Google Apps Script URL requires authentication. Please ensure it is deployed with "Execute as: Me" and "Who has access: Anyone".'
        }, { status: 500 });
      }
      // If it's not JSON, it might be the HTML error page.
      if (responseText.includes('Skrip sudah lengkap')) {
        return NextResponse.json({ error: 'Apps Script did not return anything. Make sure the script handles this action.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Apps Script returned invalid JSON' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating sheet:', error);
    return NextResponse.json({ error: 'Failed to update sheet' }, { status: 500 });
  }
}

