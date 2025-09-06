import { Resend } from 'resend';
import { addSignup, getProgress, checkEmailExists } from '../../../lib/database.js';

const resend = new Resend(process.env.RESEND_API_KEY);

// In-memory storage for development when database is not available
const tempEmailStore = new Set();
let tempCount = 0;

// Reset storage for testing (can be removed in production)
tempEmailStore.clear();
tempCount = 0;

// Reset storage for testing
console.log('🗑️ RESET: Email storage cleared for fresh testing');
tempEmailStore.clear();
tempCount = 0;
export async function POST(req) {
  try {
    const { email } = await req.json();
    console.log("Received email request for:", email);
    console.log("Using API Key:", process.env.RESEND_API_KEY ? "Loaded" : "Missing");

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid email format' }),
        { status: 400, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
      );
    }

    // Check if we should use fallback storage based on environment
    const hasValidKV = process.env.KV_URL && !process.env.KV_URL.includes('placeholder');
    const hasValidDB = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('placeholder');
    const usingFallbackStorage = !hasValidKV && !hasValidDB;
    
    console.log(`Storage mode: ${usingFallbackStorage ? 'FALLBACK (in-memory)' : 'DATABASE'}`);
    
    if (usingFallbackStorage) {
      // Fallback: Check in-memory store for duplicates
      const normalizedEmail = email.trim().toLowerCase();
      if (tempEmailStore.has(normalizedEmail)) {
        console.log('Duplicate email found in fallback storage:', normalizedEmail);
        return new Response(
          JSON.stringify({ ok: false, error: 'Email already registered' }),
          { status: 409, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
        );
      }
    } else {
      // Try database check
      try {
        const emailExists = await checkEmailExists(email.trim());
        if (emailExists) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Email already registered' }),
            { status: 409, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
          );
        }
      } catch (dbError) {
        console.warn('Database check failed, but proceeding with email send:', dbError.message);
      }
    }

    // Define URLs for website & socials (fixed)
    const siteUrl = 'https://sndchain.xyz/';
    const xUrl = 'https://x.com/joinsoundchain';
    const igUrl = 'https://www.instagram.com/joinsoundchain/?utm_source=ig_web_button_share_sheet';

    const result = await resend.emails.send({
      from: 'SoundChain <noreply@sndchain.xyz>',
      to: email,
      subject: "Welcome to SoundChain - We're excited to have you on board",
      html: getWelcomeEmailHtml(siteUrl, xUrl, igUrl),
    });

    console.log('Resend API response:', result);

    if (result?.error) {
      return new Response(
        JSON.stringify({ ok: false, error: result.error }),
        { status: 422, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
      );
    }

    // Try to add email to database and get updated progress
    let emailAdded = false;
    let progress = { count: 0, goal: 5000, percentage: 0 };
    
    if (usingFallbackStorage) {
      // Using fallback storage - add directly to memory
      const normalizedEmail = email.trim().toLowerCase();
      tempEmailStore.add(normalizedEmail);
      tempCount++;
      emailAdded = true;
      
      progress = {
        count: tempCount,
        goal: 5000,
        percentage: Math.min(100, (tempCount / 5000) * 100)
      };
      
      console.log(`Email added to fallback storage. Total count: ${tempCount}`);
    } else {
      // Try database storage
      try {
        emailAdded = await addSignup(email.trim());
        progress = await getProgress();
        console.log('Email successfully added to database');
      } catch (dbError) {
        console.warn('Database operation failed after successful DB check:', dbError.message);
        // If database fails here, still return success since email was sent
      }
    }
    
    // Return appropriate response based on whether email was stored
    if (emailAdded) {
      // Email was successfully stored (either in database or fallback)
      return new Response(
        JSON.stringify({ 
          id: result?.data?.id, 
          count: progress.count, 
          goal: progress.goal,
          percentage: progress.percentage,
          message: usingFallbackStorage ? 'Email sent and stored locally (dev mode)' : 'Email sent and recorded successfully'
        }),
        { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
      );
    } else {
      // Email wasn't stored but was sent successfully
      console.log('Email not stored but was sent successfully');
      
      return new Response(
        JSON.stringify({ 
          id: result?.data?.id, // Important: include the email ID to indicate success
          count: progress.count,
          goal: progress.goal,
          percentage: progress.percentage,
          message: 'Email sent successfully'
        }),
        { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
      );
    }
  } catch (error) {
    console.error("Error processing signup:", error);
    return new Response(
      JSON.stringify({ ok: false, message: error?.message || 'signup_failed' }),
      { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
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
    <!-- Preview text for notifications -->
    <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">Welcome to SoundChain Thanks for joining the waitlist. We'll keep you updated. What you'll get: Early access • Tester features • Special rewards. Support artists directly through NFTs with fair revenue sharing for everyone who contributed to the track and discover new ways for artists to engage with their fanbases.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
    <div style="background-color:#ffffff;padding:40px 20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:480px;margin:0 auto;">
        
        <!-- Main Content Card -->
        <tr>
          <td>
            <!-- Gradient Border Wrapper -->
            <div style="background:linear-gradient(135deg,#8B5FFF 0%,#A78BFA 25%,#4FC3F7 50%,#C084FC 75%,#8B5FFF 100%);padding:4px;border-radius:20px;">
              <div style="background-color:#ffffff;border-radius:16px;padding:48px 32px;text-align:center;">
            
            <!-- Logo -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 32px auto;">
              <tr>
                <td style="width:64px;height:64px;background:linear-gradient(135deg,#8B5FFF,#4FC3F7);border-radius:16px;text-align:center;vertical-align:middle;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-1px;line-height:1;">SC</td>
              </tr>
            </table>
            
            <!-- Main Message -->
            <h1 style="margin:0 0 16px 0;font-size:28px;font-weight:700;color:#000000;letter-spacing:-0.5px;">Welcome to SoundChain</h1>
            
            <p style="margin:0 0 24px 0;font-size:16px;line-height:1.5;color:#6b7280;">Thanks for joining the waitlist.<br>We'll keep you updated.</p>
            
            <p style="margin:0 0 32px 0;font-size:16px;line-height:1.5;color:#374151;">Support artists directly through NFTs with fair revenue sharing for everyone who contributed to the track and discover new ways for artists to engage with their fanbases.</p>
            
            <!-- Minimal Features -->
            <div style="margin-bottom:32px;padding:24px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
              <p style="margin:0;font-size:14px;color:#8B5FFF;font-weight:600;margin-bottom:8px;">What you'll get:</p>
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                Early access • Tester features • Special rewards
              </p>
            </div>
            
            <!-- Social Links -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px auto;">
              <tr>
                <td style="padding:0 6px;">
                  <a href="${xUrl}" style="display:block;background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;text-decoration:none;color:#000000;width:44px;height:44px;text-align:center;vertical-align:middle;line-height:44px;font-size:16px;font-weight:700;">X</a>
                </td>
                <td style="padding:0 6px;">
                  <a href="${igUrl}" style="display:block;background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;text-decoration:none;color:#000000;width:44px;height:44px;text-align:center;vertical-align:middle;line-height:44px;font-size:16px;font-weight:700;">IG</a>
                </td>
              </tr>
            </table>
            
            <!-- Footer -->
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

export async function GET() {
  // Check if we should use fallback storage based on environment
  const hasValidKV = process.env.KV_URL && !process.env.KV_URL.includes('placeholder');
  const hasValidDB = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('placeholder');
  const usingFallbackStorage = !hasValidKV && !hasValidDB;
  
  if (usingFallbackStorage) {
    // Return fallback count directly
    const fallbackProgress = {
      count: tempCount,
      goal: 5000,
      percentage: Math.min(100, (tempCount / 5000) * 100)
    };
    
    console.log(`GET: Returning fallback progress: ${tempCount}/5000 (${fallbackProgress.percentage.toFixed(2)}%)`);
    
    return new Response(
      JSON.stringify(fallbackProgress),
      { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
    );
  }
  
  // Try database
  try {
    const progress = await getProgress();
    console.log(`GET: Returning database progress: ${progress.count}/${progress.goal} (${progress.percentage?.toFixed(2)}%)`);
    
    return new Response(
      JSON.stringify({ 
        count: progress.count, 
        goal: progress.goal,
        percentage: progress.percentage
      }),
      { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
    );
  } catch (e) {
    console.error('Error fetching progress from database, using fallback:', e);
    
    // Return fallback count if database fails
    const fallbackProgress = {
      count: tempCount,
      goal: 5000,
      percentage: Math.min(100, (tempCount / 5000) * 100)
    };
    
    console.log(`GET: Database failed, returning fallback progress: ${tempCount}/5000 (${fallbackProgress.percentage.toFixed(2)}%)`);
    
    return new Response(
      JSON.stringify(fallbackProgress),
      { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
    );
  }
}
