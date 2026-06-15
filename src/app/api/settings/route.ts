import { NextResponse } from 'next/server';

// Global variable stored in memory
// Note: On Vercel, this might reset during cold starts, but it works for short-term sessions
let globalSettings = {
  checkinDisabled: false
};

export async function GET() {
  return NextResponse.json(globalSettings);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.checkinDisabled === 'boolean') {
      globalSettings.checkinDisabled = body.checkinDisabled;
    }
    return NextResponse.json(globalSettings);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
