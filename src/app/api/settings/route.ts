import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await supabase.from('sysapp_config').select('key, value');
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const timestamp = new Date().toISOString();
    
    // Convert object { key: value } into upsert array
    const upserts = Object.keys(body).map((key) => ({
      key,
      value: body[key] === true ? 'Y' : body[key] === false ? 'N' : body[key],
      updated_at: timestamp
    }));

    const { error } = await supabase.from('sysapp_config').upsert(upserts, { onConflict: 'key' });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
