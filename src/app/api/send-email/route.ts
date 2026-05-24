import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, text } = body;

    if (!to || !subject || !text) {
      return NextResponse.json({ error: 'Missing parameters (to, subject, text)' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'no-reply@mypartpros.com';

    if (!apiKey) {
      console.log(`[EMAIL SIMULATION]
From: ${fromEmail}
To: ${to}
Subject: ${subject}
Body:
${text}
-----------------------------------------`);
      return NextResponse.json({ success: true, simulated: true, message: 'RESEND_API_KEY is not configured. Email logged to console.' });
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      text
    });

    if (error) {
      console.error('Resend email error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Email route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
