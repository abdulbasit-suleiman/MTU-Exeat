import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { studentName, matricNo, refNo, exitDate, returnDate, reason, department } = await req.json();
    const chapEmail = process.env.CHAPLAINCY_EMAIL || process.env.NEXT_PUBLIC_CHAPLAINCY_EMAIL || 'chaplaincy@mtu.edu.ng';

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: chapEmail,
      subject: `[MTU Exeat] Student Exit Notification — ${studentName} (${matricNo})`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0d6f0;border-radius:12px;">
          <div style="background:#1a5276;padding:20px 24px;border-radius:8px;margin-bottom:24px;">
            <h2 style="color:#fff;margin:0;font-size:20px;">Mountain Top University</h2>
            <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:13px;">Chaplaincy Notification — Student Exeat Approved by Affairs</p>
          </div>
          <p style="color:#333;font-size:14px;">Dear Chaplaincy Team,</p>
          <p style="color:#555;font-size:13.5px;line-height:1.7;">
            The following student exeat has been approved by Student Affairs and is now awaiting consent.
          </p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
            ${[['Reference No.', refNo], ['Student', `${studentName} · ${matricNo}`], ['Department', department || '—'], ['Exit Date', exitDate], ['Return Date', returnDate], ['Reason', reason]].map(([k, v]) => `
              <tr>
                <td style="padding:9px 12px;background:#eaf4fb;font-weight:700;color:#1a5276;border-bottom:1px solid #d6eaf8;width:38%">${k}</td>
                <td style="padding:9px 12px;color:#333;border-bottom:1px solid #d6eaf8;">${v}</td>
              </tr>`).join('')}
          </table>
          <p style="color:#555;font-size:13px;line-height:1.7;">Log in to the Chaplaincy Portal to view and filter all exeat records.</p>
          <p style="color:#999;font-size:11.5px;border-top:1px solid #eee;padding-top:16px;margin-top:8px;">
            Mountain Top University · Km 12, Lagos-Ibadan Expressway, Prayer City, Ogun State.<br/>
            This is an automated notification from the MTU Exeat Portal.
          </p>
        </div>
      `,
    });

    if (error) return NextResponse.json({ success: false, error }, { status: 500 });
    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}