# Event Master

Next.js event management application with a Supabase-backed public registration page at `/checkin`.

## Local setup

1. Install dependencies:

```powershell
npm install
```

2. In Supabase, open **SQL Editor** and run `supabase/schema.sql` once.
3. Copy `.env.example` to `.env.local` and replace the placeholders with values from **Supabase Dashboard > Project Settings > API**.
4. Start the local app:

```powershell
npm run dev
```

Open `http://localhost:3000/checkin`.

## Registration data

The registration API assigns concurrency-safe numbers beginning at `DFC001`. The QR code contains only this registration number. BINUSIAN registrations require a 10-digit BINUSIAN ID and an `@binus.ac.id` email address; non-BINUSIAN registrations require an institution.

The browser never receives the Supabase service-role key. Registrations are submitted to the server-only `/api/registrations` Route Handler, while Row Level Security blocks direct anonymous access to the table.

## Deploy to Vercel

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Import the repository at [Vercel](https://vercel.com/new). Vercel detects Next.js automatically; no `vercel.json` is required.
3. Under **Project Settings > Environment Variables**, add these values for Production (and Preview if needed):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` while the existing admin features still use them.
4. Confirm that `supabase/schema.sql` has already been applied to the same Supabase project.
5. Deploy. The public registration URL will be `https://<your-project>.vercel.app/checkin`.

Never expose `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix or commit `.env.local`.

## Validation

```powershell
npm run lint
npm run build
```
