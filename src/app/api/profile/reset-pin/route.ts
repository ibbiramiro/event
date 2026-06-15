import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email, newPin } = await req.json();

    if (!email || !newPin) {
      return NextResponse.json({ error: 'Email and newPin are required' }, { status: 400 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Check if email exists
    const { data: userRecord, error: checkError } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('email', email)
      .single();

    if (checkError || !userRecord) {
      return NextResponse.json({ error: 'Email tidak terdaftar, coba email lainnya.' }, { status: 404 });
    }

    // 2. Update PIN
    const { error: updateError } = await adminClient
      .from('user_roles')
      .update({ pin: newPin })
      .eq('email', email);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
    }

    // 3. Send Email via Nodemailer
    let transporter;
    const smtpUser = process.env.GMAIL_USER || process.env.SMTP_EMAIL;
    const smtpPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD;

    if (smtpUser && smtpPass) {
      transporter = nodemailer.createTransport({
        service: 'gmail', // You can change this or configure host/port
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    } else {
      // Fallback to Ethereal for testing
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
      subject: 'UniEvent Admin - Your New PIN',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0b1930;">UniEvent PIN Reset</h2>
          <p>Hello,</p>
          <p>Your PIN has been successfully reset. Please use the following 6-digit PIN to access your administrative dashboard:</p>
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e40af;">${newPin}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">If you did not request this change, please contact IT Support immediately.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">&copy; 2026 Binus@Medan. All rights reserved.</p>
        </div>
      `,
    });

    console.log('[EMAIL DISPATCH] Sent to:', email);
    if (!smtpUser) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return NextResponse.json({ success: true, message: 'PIN updated successfully' });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
