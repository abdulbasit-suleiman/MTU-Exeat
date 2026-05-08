// app/api/send-consent/route.js
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      studentName, matricNo, department, roomNo,
      exitDate, returnDate, purpose, reason,
      parentName, parentEmail,
      refNo,
    } = body;

    const approveUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/consent-reply?ref=${refNo}&action=approve`;
    const declineUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/consent-reply?ref=${refNo}&action=decline`;

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to:   parentEmail,
      subject: `[MTU Exeat] Consent Required for ${studentName} — Ref: ${refNo}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0d6f0;border-radius:12px;">
          <div style="background:#2B0A52;padding:20px 24px;border-radius:8px;margin-bottom:24px;">
            <h2 style="color:#fff;margin:0;font-size:20px;">Mountain Top University</h2>
            <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:13px;">Exeat Permit — Parent Consent Request</p>
          </div>

          <p style="color:#333;font-size:14px;">Dear <strong>${parentName}</strong>,</p>
          <p style="color:#555;font-size:13.5px;line-height:1.7;">
            Your ward, <strong>${studentName}</strong> (${matricNo}), has submitted an exeat request. 
            As a parent/guardian, your consent is required before this proceeds to the Students' Affairs Division.
          </p>

          <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
            ${[
              ['Reference No.', refNo],
              ['Student', `${studentName} · ${matricNo}`],
              ['Department', department],
              ['Room', roomNo],
              ['Exit Date', exitDate],
              ['Return Date', returnDate],
              ['Type', purpose],
              ['Reason', reason],
            ].map(([k,v]) => `
              <tr>
                <td style="padding:9px 12px;background:#f5f0fb;font-weight:700;color:#4C1880;border-bottom:1px solid #e8e0f4;width:38%">${k}</td>
                <td style="padding:9px 12px;color:#333;border-bottom:1px solid #e8e0f4;">${v}</td>
              </tr>
            `).join('')}
          </table>

          <div style="display:flex;gap:12px;margin:28px 0;">
            <a href="${approveUrl}" style="flex:1;text-align:center;background:#1D9E75;color:#fff;padding:14px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">
              ✅ Approve Exeat
            </a>
            <a href="${declineUrl}" style="flex:1;text-align:center;background:#A32D2D;color:#fff;padding:14px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">
              ✗ Decline Exeat
            </a>
          </div>

          <p style="color:#999;font-size:11.5px;border-top:1px solid #eee;padding-top:16px;margin-top:8px;">
            Mountain Top University · Km 12, Lagos-Ibadan Expressway, Prayer City, Ogun State.<br/>
            This email was sent automatically. Do not reply — use the buttons above.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}