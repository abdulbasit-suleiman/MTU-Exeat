import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { studentName, studentEmail, matricNo, refNo, exitDate, returnDate, purpose } = await req.json();

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: studentEmail,
      subject: `[MTU Exeat] ✅ Your Exeat Has Been Approved — Ref: ${refNo}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0d6f0;border-radius:12px;">
          <div style="background:#2B0A52;padding:20px 24px;border-radius:8px;margin-bottom:24px;">
            <h2 style="color:#fff;margin:0;font-size:20px;">Mountain Top University</h2>
            <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:13px;">Exeat Permit — Final Approval Notice</p>
          </div>
          <div style="background:#e1f5ee;border:1px solid #1D9E75;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
            <div style="font-size:36px;margin-bottom:8px;">✅</div>
            <h3 style="color:#0F6E56;margin:0 0 6px;">Exeat Approved!</h3>
            <p style="color:#0F6E56;font-size:13.5px;margin:0;">Your exeat permit has received full approval from the CSO.</p>
          </div>
          <p style="color:#333;font-size:14px;">Dear <strong>${studentName}</strong>,</p>
          <p style="color:#555;font-size:13.5px;line-height:1.7;">
            Your exeat request has been <strong>fully approved</strong> by the Chief Security Officer. 
            You may now proceed with your approved exit.
          </p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
            ${[
              ['Reference No.', refNo],
              ['Student', `${studentName} · ${matricNo}`],
              ['Exit Date', exitDate],
              ['Return Date', returnDate],
              ['Type', purpose],
              ['Status', '✅ FULLY APPROVED'],
            ].map(([k, v]) => `
              <tr>
                <td style="padding:9px 12px;background:#f5f0fb;font-weight:700;color:#4C1880;border-bottom:1px solid #e8e0f4;width:38%">${k}</td>
                <td style="padding:9px 12px;color:#333;border-bottom:1px solid #e8e0f4;">${v}</td>
              </tr>
            `).join('')}
          </table>
          <p style="color:#999;font-size:11.5px;border-top:1px solid #eee;padding-top:16px;margin-top:8px;">
            Mountain Top University · Km 12, Lagos-Ibadan Expressway, Prayer City, Ogun State.<br/>
            This is an automated message from the MTU Exeat Portal.
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