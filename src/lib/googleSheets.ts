import { Guest } from './data';

export async function syncGuestsFromSheet(webAppUrl?: string): Promise<Guest[]> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (webAppUrl) {
      headers['x-web-app-url'] = webAppUrl;
    }

    const res = await fetch('/api/guests', {
      method: 'GET',
      headers,
      cache: 'no-store' // Always fetch fresh data
    });

    if (!res.ok) {
      let errMsg = 'Failed to fetch from API';
      try {
        const errorData = await res.json();
        if (errorData && errorData.message) errMsg += ': ' + errorData.message;
        else if (errorData && errorData.error) errMsg += ': ' + errorData.error;
      } catch (e) {}
      throw new Error(errMsg);
    }

    const data: any[][] = await res.json();
    
    if (!data || data.length < 2) {
      return [];
    }

    // data[0] is header
    // e.g., ["No.", "Nama Mahasiswa", "Jurusan", "Status Pembayaran", ... , "Kehadiran"]
    // We assume data starts from index 1.
    const guests: Guest[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // rowNumber in Google Sheets is i + 1
      const sheetRowNumber = i + 1;
      
      const registrationNumber = row[1] ? row[1].toString() : '';
      const name = row[2] || '';
      const major = row[3] || '';
      const paymentStatus = row[4] || 'Unpaid';
      const contact = row[5] || ''; // Column F is Contact
      const nominal = row[6] || ''; // Column G is nominal
      const attendance = row[7] || ''; // Column H is Checked-in
      const verifiedBy = row[8] || ''; // Column I is Diproses Oleh
      const jamHadir = row[9] || ''; // Column J is Jam Hadir
      
      const totalRSVPStr = row[10] || '0';
      const totalHadirStr = row[11] || '0';
      const totalRSVP = parseInt(totalRSVPStr, 10) || 0;
      const totalHadir = parseInt(totalHadirStr, 10) || 0;
      const status = row[12] || '';

      // Determine method from attendance status
      let method: 'Self Check-in' | 'Manual Input' | 'Spreadsheet' = 'Spreadsheet' as any;
      
      // If it's already checked in on sheet, maybe it was manual or self, we can default to 'Spreadsheet'
      if (attendance === 'Checked-in') {
        method = 'Self Check-in'; // or we can leave it as something else
      }

      guests.push({
        id: sheetRowNumber.toString(), // Using row number as ID is very useful for updating!
        name: name,
        time: jamHadir ? jamHadir : (attendance === 'Checked-in' ? 'Checked In' : ''),
        major: major,
        method: attendance === 'Checked-in' ? 'Self Check-in' : 'Spreadsheet' as any,
        paymentStatus,
        verifiedBy,
        nominal,
        registrationNumber,
        contact,
        totalRSVP,
        totalHadir,
        status,
      });
    }

    return guests;
  } catch (error: any) {
    // Suppress Next.js error overlay for network interruptions during background polling
    if (error.name !== 'TypeError' && error.message !== 'Failed to fetch') {
      console.warn('Error syncing guests:', error);
    }
    return [];
  }
}

export async function checkInGuestToSheet(rowNumber: string | number, webAppUrl?: string) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (webAppUrl) {
      headers['x-web-app-url'] = webAppUrl;
    }

    const res = await fetch('/api/guests', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'checkin',
        rowNumber: Number(rowNumber),
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to post checkin');
    }

    return await res.json();
  } catch (error) {
    console.error('Error checking in guest:', error);
    return { status: 'error', message: (error as Error).message };
  }
}

export async function registerGuestToSheet(data: { name: string; major: string; contact: string; registrationNumber?: string }, webAppUrl?: string) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (webAppUrl) {
      headers['x-web-app-url'] = webAppUrl;
    }

    const res = await fetch('/api/guests', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'create',
        // Standard payload mapping (matching the new Apps Script)
        registrationNumber: data.registrationNumber || '-',
        name: data.name || '-',
        major: data.major || '-',
        status: 'Unpaid',
        paymentStatus: 'Unpaid',
        contact: data.contact || '-',
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to register guest');
    }

    return await res.json();
  } catch (error) {
    console.error('Error registering guest:', error);
    return { status: 'error', message: (error as Error).message };
  }
}

export async function removeGuestFromSheet(rowNumber: string | number, webAppUrl?: string) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (webAppUrl) {
      headers['x-web-app-url'] = webAppUrl;
    }

    const res = await fetch('/api/guests', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'remove',
        rowNumber: Number(rowNumber),
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to post remove action');
    }

    return await res.json();
  } catch (error) {
    console.error('Error removing guest:', error);
    return { status: 'error', message: (error as Error).message };
  }
}
