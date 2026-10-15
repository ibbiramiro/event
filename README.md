# Event Master

Next.js event management application with Supabase persistence and verified Google Sheets synchronization for public registration at `/checkin`.

## Local setup

1. Install dependencies with `npm install`.
2. Run `supabase/schema.sql` in **Supabase Dashboard > SQL Editor**.
3. Deploy the Google Apps Script by following the steps below.
4. Copy `.env.example` to `.env.local` and replace every placeholder.
5. Run `npm run dev`, then open `http://localhost:3000/checkin`.

## Connect the existing Google Sheet

The script preserves A–M for the existing dashboard/scanner and adds registration details in N–T:

| Columns | Value |
|---|---|
| A–M | Existing number, registration, participant, program, payment, contact, attendance, RSVP, and status fields |
| N | Participant Type |
| O | Email |
| P | BINUSIAN ID |
| Q | Institution |
| R | Event Activities |
| S | Other Interest |
| T | Registered At |

Setup and recovery steps:

1. Open the exact target Google Sheet and select **Extensions > Apps Script**.
2. Replace the editor contents with `google-apps-script/Code.gs`.
3. Keep `SHEET_NAME: 'Sheet1'` and save.
4. Select `setupSheetHeaders` and click **Run** once. Approve permissions. This stores the target Spreadsheet ID and Sheet ID in Script Properties, so Web App requests can never depend on the active browser tab.
5. Open the execution log and confirm the returned `spreadsheetId` matches the value between `/d/` and `/edit` in the Google Sheet URL.
6. Select **Deploy > Manage deployments**, edit the Web App, choose **New version**, then deploy. Saving code alone does not update `/exec`.
7. Confirm **Execute as: Me** and **Who has access: Anyone**.
8. Copy the URL ending in `/exec`, not `/dev`.
9. Set both values in Vercel Production:
   - `GOOGLE_APPS_SCRIPT_URL`: the exact `/exec` URL.
   - `GOOGLE_SPREADSHEET_ID`: the value between `/d/` and `/edit` in the target Sheet URL.
10. Redeploy Vercel after changing environment variables.

After deployment, open:

```text
https://<your-project>.vercel.app/api/registrations
```

A correct connection returns HTTP 200 with:

```json
{
  "status": "ok",
  "checks": {
    "appsScriptReachable": true,
    "contractMatches": true,
    "targetMatches": true
  }
}
```

If the endpoint returns `misconfigured`, do not test registration yet. The response identifies whether the Apps Script version is stale or the Spreadsheet ID points to another file.

## Registration write flow

1. Supabase atomically creates the `DFC001+` registration.
2. The server sends the committed data and expected Spreadsheet ID to Google Apps Script.
3. Apps Script rejects the request if its stored target does not match that ID.
4. The script upserts by DFC number, flushes the write, and reads column B back for verification.
5. The API requires the current contract version, matching Spreadsheet ID, matching registration number, and `verified: true`.
6. The browser shows the QR pass only when the API also returns `sheetSync.status: synced`.

The Apps Script continues supporting `GET`, `create`, `payment`, `checkin`, and `remove` for CRM, guest list, and scanner compatibility.

## Environment variables

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/your-deployment-id/exec
GOOGLE_SPREADSHEET_ID=your-google-spreadsheet-id
```

Keep `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_APPS_SCRIPT_URL`, and `GOOGLE_SPREADSHEET_ID` server-side. Add all values to the correct Vercel environment (Production versus Preview), then redeploy.

## Validation

```powershell
npm run lint
npm run build
```
