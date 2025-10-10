import { Resend } from 'resend';
import { addSignup, getProgress } from '../../../lib/database.js';

// Initialize Resend only if API key is available
let resend;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

// --- POST /api/send ---
export async function POST(req) {
  try {
    const { email } = await req.json();
    const normalizedEmail = (email || '').trim().toLowerCase();

    // 1) Validate email format
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid email format' }),
        { status: 400, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
      );
    }

    // 3) Insert (idempotent via DB unique constraint)
    let inserted = false;
    try {
      inserted = await addSignup(normalizedEmail);
    } catch (e) {
      const code = e?.code || e?.original?.code || e?.cause?.code;
      if (code === '23505') {
        // PostgreSQL unique_violation
        return new Response(
          JSON.stringify({ ok: false, error: 'Email already registered' }),
          { status: 409, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
        );
      }
      return new Response(
        JSON.stringify({ ok: false, error: 'Database error' }),
        { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
      );
    }

    if (!inserted) {
      // Adapter indicated existing record (idempotent no-op)
      return new Response(
        JSON.stringify({ ok: false, error: 'Email already registered' }),
        { status: 409, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
      );
    }

    // 4) Compute latest progress (authoritative from DB)
    let progress = { count: 0, goal: 5000, percentage: 0 };
    try {
      progress = await getProgress();
    } catch (_) {
      // keep default progress if DB read fails; insert already happened
    }

    // 5) Send welcome email (non-blocking for success status)
    let emailSent = false;
    if (resend) {
      try {
        await resend.emails.send({
          from: 'SoundChain <noreply@sndchain.xyz>',
          to: normalizedEmail,
          subject: "Welcome to SoundChain - We're excited to have you on board",
          html: getWelcomeEmailHtml(
            'https://sndchain.xyz/',
            'https://x.com/joinsoundchain',
            'https://www.instagram.com/joinsoundchain/?utm_source=ig_web_button_share_sheet'
          ),
        });
        emailSent = true;
      } catch (_) {
        // Email send failed; we still report signup success
      }
    }

    return new Response(
      JSON.stringify({
        count: progress.count,
        goal: progress.goal,
        percentage: progress.percentage,
        message: emailSent ? 'Signup recorded and welcome email sent' : 'Signup recorded',
      }),
      { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, message: error?.message || 'signup_failed' }),
      { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
    );
  }
}

// --- GET /api/send ---
export async function GET() {
  try {
    const progress = await getProgress();
    return new Response(
      JSON.stringify({ count: progress.count, goal: progress.goal, percentage: progress.percentage }),
      { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
    );
  } catch (e) {
    // fallback response (service remains usable)
    const fallback = { count: 0, goal: 5000, percentage: 0 };
    return new Response(
      JSON.stringify(fallback),
      { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
    );
  }
}

// Minimalistic email template that matches the landing page vibe
function getWelcomeEmailHtml(siteUrl, xUrl, igUrl) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>Welcome to SoundChain</title>
  </head>
  <body style="margin:0;padding:0;background-color:#ffffff;color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="background-color:#ffffff;padding:40px 20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:480px;margin:0 auto;">
        <tr>
          <td>
            <div style="background:linear-gradient(135deg,#8B5FFF 0%,#A78BFA 25%,#4FC3F7 50%,#C084FC 75%,#8B5FFF 100%);padding:4px;border-radius:20px;">
              <div style="background-color:#ffffff;border-radius:16px;padding:48px 32px;text-align:center;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 32px auto;">
                  <tr>
                    <td style="width:64px;height:64px;background:linear-gradient(135deg,#8B5FFF,#4FC3F7);border-radius:16px;text-align:center;vertical-align:middle;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-1px;line-height:1;">SC</td>
                  </tr>
                </table>
                <h1 style="margin:0 0 16px 0;font-size:28px;font-weight:700;color:#000000;letter-spacing:-0.5px;">Welcome to SoundChain</h1>
                <p style="margin:0 0 24px 0;font-size:16px;line-height:1.5;color:#6b7280;">Thanks for joining the waitlist.<br>We'll keep you updated.</p>
                <p style="margin:0 0 32px 0;font-size:16px;line-height:1.5;color:#374151;">Support artists directly through NFTs with fair revenue sharing for everyone who contributed to the track and discover new ways for artists to engage with their fanbases.</p>
                <div style="margin-bottom:32px;padding:24px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                  <p style="margin:0;font-size:14px;color:#8B5FFF;font-weight:600;margin-bottom:8px;">What you'll get:</p>
                  <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">Early access • Tester features • Special rewards</p>
                </div>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px auto;">
                  <tr>
                    <td style="padding:0 6px;"><a href="${xUrl}" style="display:block;background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;text-decoration:none;color:#000000;width:44px;height:44px;text-align:center;vertical-align:middle;line-height:44px;font-size:16px;font-weight:700;">X</a></td>
                    <td style="padding:0 6px;"><a href="${igUrl}" style="display:block;background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;text-decoration:none;color:#000000;width:44px;height:44px;text-align:center;vertical-align:middle;line-height:44px;font-size:16px;font-weight:700;">IG</a></td>
                  </tr>
                </table>
                <p style="margin:0;font-size:12px;color:#6b7280;">SoundChain 2025 • <a href="${siteUrl}" style="color:#8B5FFF;text-decoration:none;">sndchain.xyz</a></p>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  </body>
  </html>`
}
