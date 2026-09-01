'use server';

import { createClient } from '@supabase/supabase-js';

const DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxs6ei8aqHQmrezSs8sZ_OS0frWR6kG3QZrPEW9VeZG4L-FWR6LhrID-LRY-L-O2ejX3Q/exec';

async function getWebAppUrl() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase.from('sysapp_config').select('value').eq('key', 'web_app_url').single();
      if (data && data.value) return data.value;
    }
  } catch (err) {
    console.error('Failed to get config from supabase', err);
  }
  return DEFAULT_WEB_APP_URL;
}

export async function verifyRegistration(regNumber: string) {
  try {
    const targetUrl = await getWebAppUrl();
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    
    if (!response.ok) throw new Error('Failed to fetch from Google Apps Script');
    const text = await response.text();
    const data = JSON.parse(text);
    
    if (!data || data.length < 2) return { success: false, error: 'No data found' };
    
    // data[0] is headers
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowReg = row[1] ? row[1].toString().trim() : '';
      if (rowReg === regNumber.trim()) {
        return {
          success: true,
          data: {
            name: row[2] || 'Unknown',
            totalRSVP: row[10] || '1',
            regNumber: rowReg
          }
        };
      }
    }
    return { success: false, error: 'Nomor registrasi tidak ditemukan' };
  } catch (error) {
    console.error('Verification error:', error);
    return { success: false, error: 'Terjadi kesalahan saat memverifikasi data' };
  }
}
