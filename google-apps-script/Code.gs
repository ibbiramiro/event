const CONTRACT_VERSION = 'digifest-registration-v2';

const CONFIG = {
  // Optional hard-coded fallback. Prefer running setupSheetHeaders(), which
  // stores the target IDs in Apps Script Properties automatically.
  SPREADSHEET_ID: '',
  SHEET_NAME: 'Sheet1',
};

const HEADERS = [
  'No.',
  'Registration Number',
  'Nama Mahasiswa',
  'Jurusan',
  'Status Pembayaran',
  'Contact',
  'Nominal',
  'Kehadiran',
  'Diproses Oleh',
  'Jam Hadir',
  'Total RSVP (#orang)',
  'Total Hadir (#orang)',
  'Status',
  'Participant Type',
  'Email',
  'BINUSIAN ID',
  'Institution',
  'Event Activities',
  'Other Interest',
  'Registered At',
];

const EVENT_LABELS = {
  SEMINAR_TALKSHOW: 'Seminar / Talkshow',
  BAZAAR: 'Bazaar',
  BOOTH_EXHIBITION: 'Booth & Exhibition',
  NETWORKING: 'Networking',
  FULL_EVENT: 'Full DIGIFEST CAMP 2026 Experience',
  OTHER: 'Other',
};

function doGet(event) {
  try {
    const sheet = getSheet_();
    ensureHeaders_(sheet);

    if (event && event.parameter && event.parameter.mode === 'diagnostics') {
      return jsonResponse_({
        status: 'success',
        contractVersion: CONTRACT_VERSION,
        spreadsheetId: sheet.getParent().getId(),
        sheetId: String(sheet.getSheetId()),
        sheetName: sheet.getName(),
        rowCount: Math.max(sheet.getLastRow() - 1, 0),
      });
    }

    return jsonResponse_(sheet.getDataRange().getDisplayValues());
  } catch (error) {
    return errorResponse_(error);
  }
}

function doPost(event) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(15000);
    const payload = parsePayload_(event);
    const sheet = getSheet_();
    ensureHeaders_(sheet);

    switch (String(payload.action || '')) {
      case 'upsertRegistration':
        return jsonResponse_(upsertRegistration_(sheet, payload));
      case 'create':
        return jsonResponse_(createLegacyGuest_(sheet, payload));
      case 'payment':
        return jsonResponse_(recordPayment_(sheet, payload));
      case 'checkin':
        return jsonResponse_(checkInGuest_(sheet, payload));
      case 'remove':
        return jsonResponse_(removeGuest_(sheet, payload));
      default:
        throw new Error('Unsupported action: ' + String(payload.action || '(empty)'));
    }
  } catch (error) {
    return errorResponse_(error);
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {
      // The lock was not acquired, so there is nothing to release.
    }
  }
}

// Run this function once from the Apps Script editor opened through the
// intended Google Sheet. It permanently binds Web App requests to this file.
function setupSheetHeaders() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Open Apps Script from the target Google Sheet before running setupSheetHeaders.');
  }

  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('Sheet not found: ' + CONFIG.SHEET_NAME);

  PropertiesService.getScriptProperties().setProperties({
    TARGET_SPREADSHEET_ID: spreadsheet.getId(),
    TARGET_SHEET_ID: String(sheet.getSheetId()),
  });

  ensureHeaders_(sheet);
  SpreadsheetApp.flush();

  const result = {
    status: 'success',
    contractVersion: CONTRACT_VERSION,
    spreadsheetId: spreadsheet.getId(),
    sheetId: String(sheet.getSheetId()),
    sheetName: sheet.getName(),
  };
  console.log(JSON.stringify(result));
  return JSON.stringify(result);
}

function upsertRegistration_(sheet, payload) {
  const spreadsheetId = sheet.getParent().getId();
  const expectedSpreadsheetId = requiredText_(payload.expectedSpreadsheetId, 'expectedSpreadsheetId');

  if (expectedSpreadsheetId !== spreadsheetId) {
    throw new Error('Spreadsheet target mismatch. The Vercel Spreadsheet ID does not match this Apps Script target.');
  }

  const registrationNumber = requiredText_(payload.registrationNumber, 'registrationNumber').toUpperCase();
  const existingRow = findRegistrationRow_(sheet, registrationNumber);
  const rowNumber = existingRow || Math.max(sheet.getLastRow() + 1, 2);
  const previous = existingRow
    ? sheet.getRange(existingRow, 1, 1, HEADERS.length).getValues()[0]
    : new Array(HEADERS.length).fill('');

  const interests = parseInterests_(payload.eventInterests);
  const activityLabels = interests.map(function (interest) {
    return EVENT_LABELS[interest] || interest;
  }).join(', ');
  const attendeeCount = integerBetween_(payload.attendeeCount, 1, 20, 'attendeeCount');
  const participantType = requiredText_(payload.participantType, 'participantType');
  const program = cleanText_(payload.program);
  const institution = cleanText_(payload.institution);
  const email = requiredText_(payload.email, 'email');
  const whatsapp = cleanText_(payload.whatsapp);

  const row = [
    rowNumber - 1,
    safeCell_(registrationNumber),
    safeCell_(requiredText_(payload.fullName, 'fullName')),
    safeCell_(program || (participantType === 'NON_BINUSIAN' ? 'Non-BINUSIAN' : '-')),
    previous[4] || 'Unpaid',
    safeCell_(whatsapp || email),
    previous[6] || '',
    previous[7] || '',
    previous[8] || '',
    previous[9] || '',
    attendeeCount,
    previous[11] || 0,
    previous[12] || 'Registered',
    safeCell_(participantType),
    safeCell_(email),
    safeCell_(cleanText_(payload.binusianId)),
    safeCell_(institution),
    safeCell_(activityLabels),
    safeCell_(cleanText_(payload.otherInterest)),
    safeCell_(cleanText_(payload.createdAt) || new Date().toISOString()),
  ];

  sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  SpreadsheetApp.flush();

  const storedRegistrationNumber = String(sheet.getRange(rowNumber, 2).getDisplayValue())
    .trim()
    .toUpperCase();
  if (storedRegistrationNumber !== registrationNumber) {
    throw new Error('Registration write verification failed for ' + registrationNumber + '.');
  }

  return {
    status: 'success',
    contractVersion: CONTRACT_VERSION,
    verified: true,
    action: existingRow ? 'updated' : 'created',
    rowNumber: rowNumber,
    registrationNumber: storedRegistrationNumber,
    spreadsheetId: spreadsheetId,
    sheetId: String(sheet.getSheetId()),
    sheetName: sheet.getName(),
  };
}

function createLegacyGuest_(sheet, payload) {
  const rowNumber = Math.max(sheet.getLastRow() + 1, 2);
  const registrationNumber = cleanText_(payload.registrationNumber) || '-';
  const row = new Array(HEADERS.length).fill('');

  row[0] = rowNumber - 1;
  row[1] = safeCell_(registrationNumber);
  row[2] = safeCell_(cleanText_(payload.name) || '-');
  row[3] = safeCell_(cleanText_(payload.major) || '-');
  row[4] = safeCell_(cleanText_(payload.paymentStatus) || cleanText_(payload.status) || 'Unpaid');
  row[5] = safeCell_(cleanText_(payload.contact) || '-');
  row[10] = integerBetween_(payload.totalRSVP || 1, 1, 20, 'totalRSVP');
  row[11] = 0;
  row[12] = registrationNumber === '-' ? 'Walk-In' : '';
  row[19] = new Date().toISOString();

  sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  SpreadsheetApp.flush();
  return { status: 'success', action: 'created', rowNumber: rowNumber };
}

function recordPayment_(sheet, payload) {
  const rowNumber = Number(payload.rowNumber);
  if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
    throw new Error('A valid rowNumber is required for payment.');
  }

  const registrationNumber = cleanText_(payload.registrationNumber);
  const verifiedBy = cleanText_(payload.verifiedBy);
  if (registrationNumber) {
    sheet.getRange(rowNumber, 2).setValue(safeCell_(registrationNumber.toUpperCase()));
  }
  sheet.getRange(rowNumber, 5).setValue('Paid');
  if (verifiedBy) sheet.getRange(rowNumber, 9).setValue(safeCell_(verifiedBy));
  SpreadsheetApp.flush();

  return {
    status: 'success',
    action: 'payment',
    rowNumber: rowNumber,
    registrationNumber: registrationNumber || undefined,
  };
}

function checkInGuest_(sheet, payload) {
  const rowNumber = Number(payload.rowNumber);
  if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
    throw new Error('A valid rowNumber is required for check-in.');
  }

  const totalPresent = integerBetween_(
    payload.totalHadir || payload.total_hadir || payload['Total Hadir'] || 1,
    1,
    20,
    'totalHadir'
  );

  sheet.getRange(rowNumber, 8).setValue('Checked-in');
  sheet.getRange(rowNumber, 9).setValue(safeCell_(cleanText_(payload.processedBy) || 'QR Scanner'));
  sheet.getRange(rowNumber, 10).setValue(Utilities.formatDate(new Date(), 'GMT+7', 'hh:mm:ss a'));
  sheet.getRange(rowNumber, 12).setValue(totalPresent);
  sheet.getRange(rowNumber, 13).setValue('Checked-in');
  SpreadsheetApp.flush();
  return { status: 'success', action: 'checked-in', rowNumber: rowNumber };
}

function removeGuest_(sheet, payload) {
  const rowNumber = Number(payload.rowNumber);
  if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
    throw new Error('A valid rowNumber is required for removal.');
  }

  sheet.deleteRow(rowNumber);
  renumberRows_(sheet);
  SpreadsheetApp.flush();
  return { status: 'success', action: 'removed', rowNumber: rowNumber };
}

function getSheet_() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = CONFIG.SPREADSHEET_ID || properties.getProperty('TARGET_SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('Target spreadsheet is not configured. Run setupSheetHeaders from the target spreadsheet, then deploy a new Web App version.');
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('Sheet not found: ' + CONFIG.SHEET_NAME);

  const expectedSheetId = properties.getProperty('TARGET_SHEET_ID');
  if (expectedSheetId && String(sheet.getSheetId()) !== expectedSheetId) {
    throw new Error('Sheet target mismatch. Run setupSheetHeaders again.');
  }
  return sheet;
}

function ensureHeaders_(sheet) {
  const range = sheet.getRange(1, 1, 1, HEADERS.length);
  const current = range.getValues()[0];
  let changed = false;
  const updated = HEADERS.map(function (expected, index) {
    if (String(current[index] || '').trim()) return current[index];
    changed = true;
    return expected;
  });

  if (changed) {
    range.setValues([updated]);
    sheet.setFrozenRows(1);
  }
}

function findRegistrationRow_(sheet, registrationNumber) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const values = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues();
  for (let index = 0; index < values.length; index += 1) {
    if (String(values[index][0] || '').trim().toUpperCase() === registrationNumber) return index + 2;
  }
  return 0;
}

function renumberRows_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const numbers = [];
  for (let row = 2; row <= lastRow; row += 1) numbers.push([row - 1]);
  sheet.getRange(2, 1, numbers.length, 1).setValues(numbers);
}

function parsePayload_(event) {
  if (!event) return {};
  const contentType = String(event.postData && event.postData.type || '').toLowerCase();
  if (contentType.indexOf('application/json') !== -1) {
    return JSON.parse(event.postData.contents || '{}');
  }
  return event.parameter || {};
}

function parseInterests_(value) {
  if (Array.isArray(value)) return value;
  const raw = cleanText_(value);
  if (!raw) throw new Error('At least one event interest is required.');

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(String);
  } catch (_) {
    // Accept comma-separated values for manual API tests.
  }

  const commaSeparated = raw.split(',').map(function (item) {
    return item.trim();
  }).filter(Boolean);
  if (commaSeparated.length === 0) throw new Error('At least one event interest is required.');
  return commaSeparated;
}

function integerBetween_(value, minimum, maximum, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(fieldName + ' must be an integer between ' + minimum + ' and ' + maximum + '.');
  }
  return number;
}

function requiredText_(value, fieldName) {
  const cleaned = cleanText_(value);
  if (!cleaned) throw new Error(fieldName + ' is required.');
  return cleaned;
}

function cleanText_(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function safeCell_(value) {
  const text = cleanText_(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse_(error) {
  console.error(error);
  return jsonResponse_({
    status: 'error',
    contractVersion: CONTRACT_VERSION,
    message: error && error.message ? error.message : String(error),
  });
}
