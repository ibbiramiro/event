import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email, currentPin, newPin } = await req.json();

    if (!email || !currentPin || !newPin) {
      return NextResponse.json({ error: 'Email, currentPin, and newPin are required' }, { status: 400 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Verify current PIN
    const { data: userRecord, error: checkError } = await adminClient
      .from('user_roles')
      .select('pin')
      .eq('email', email)
      .single();

    if (checkError || !userRecord) {
      return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 });
    }

    if (userRecord.pin !== currentPin) {
      return NextResponse.json({ error: 'PIN Terkini yang Anda masukkan salah.' }, { status: 401 });
    }

    // 2. Update to new PIN
    const { error: updateError } = await adminClient
      .from('user_roles')
      .update({ pin: newPin })
      .eq('email', email);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json({ error: 'Gagal memperbarui database.' }, { status: 500 });
    }

    // 3. Send Email Notification
    let transporter;
    const smtpUser = process.env.GMAIL_USER || process.env.SMTP_EMAIL;
    const smtpPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD;

    if (smtpUser && smtpPass) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const info = await transporter.sendMail({
      from: '"UniEvent Admin" <noreply@unievent.com>',
      to: email,
      subject: 'UniEvent Admin - Security Alert: PIN Changed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0b1930;">UniEvent Security Alert</h2>
          <p>Hello,</p>
          <p>Your administrative PIN has been successfully changed via the Profile Settings page.</p>
          <p><strong>If you did not make this change</strong>, please contact IT Support immediately to secure your account.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">&copy; 2026 Binus@Medan. All rights reserved.</p>
        </div>
      `,
    });

    console.log('[EMAIL DISPATCH] Change PIN Alert Sent to:', email);
    if (!smtpUser) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return NextResponse.json({ success: true, message: 'PIN berhasil diubah.' });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
