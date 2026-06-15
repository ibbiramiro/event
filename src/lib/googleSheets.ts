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
      
      const name = row[1] || '';
      const major = row[2] || '';
      const paymentStatus = row[3] || 'Unpaid';
      const nominal = row[5] || ''; // Column F is nominal
      const attendance = row[6] || ''; // Column G is Checked-in
      const verifiedBy = row[7] || ''; // Column H is Diproses Oleh
      const jamHadir = row[8] || ''; // Column I is Jam Hadir

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
      });
    }

    return guests;
  } catch (error) {
    console.error('Error syncing guests:', error);
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

export async function registerGuestToSheet(data: { name: string; major: string; contact: string }, webAppUrl?: string) {
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
        name: data.name,
        major: data.major,
        contact: data.contact,
        status: 'Unpaid',
        paymentStatus: 'Unpaid',
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
