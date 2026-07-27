import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8"
import { corsHeaders } from "../_shared/cors.ts"
import { sanitizeStrings, validatePayloadSize, checkRateLimit } from "../_shared/security.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Security Checks
    const clientIp = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    checkRateLimit(clientIp, 60000, 5); // Max 5 requests per minute per IP
    await validatePayloadSize(req, 5120); // 5kb limit

    const rawPayload = await req.json();
    const sanitizedPayload = sanitizeStrings(rawPayload);
    const { email, type, password, options } = sanitizedPayload;

    if (!email || !['recovery', 'magiclink', 'signup'].includes(type)) {
      throw new Error("Missing required parameters or invalid type.")
    }
    
    if (type === 'signup' && !password) {
      throw new Error("Password is required for signup.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Generate the Auth Link using Admin API
    const generateOptions: any = {
      type: type,
      email: email,
      options: {
        redirectTo: Deno.env.get('FRONTEND_URL') || 'http://localhost:5173/dashboard'
      }
    };
    
    // Recovery redirects to auth instead of dashboard
    if (type === 'recovery') {
      generateOptions.options.redirectTo = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173/auth';
    }
    
    if (type === 'signup') {
      generateOptions.password = password;
      if (options?.data) {
        generateOptions.options.data = options.data;
      }
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink(generateOptions)

    if (linkError) {
      console.error("Link Generation Error:", linkError)
      throw new Error("Could not generate auth link.")
    }

    const actionLink = linkData.properties.action_link

    // 2. Determine Email Content based on Type
    let subject = "";
    let title = "";
    let message = "";
    let buttonText = "";
    
    if (type === 'recovery') {
      subject = "Reset Your UdharPe Password";
      title = "Password Reset Request";
      message = "We received a request to reset your UdharPe password. Click the button below to set a new password.";
      buttonText = "Reset My Password";
    } else if (type === 'magiclink') {
      subject = "Your UdharPe Magic Link";
      title = "Magic Link Login";
      message = "Click the button below to securely log into your UdharPe account. No password required!";
      buttonText = "Log In to UdharPe";
    } else if (type === 'signup') {
      const firmName = options?.data?.firm_name || "your firm";
      const ownerName = options?.data?.owner_name || "";
      const greeting = ownerName ? `Dear ${ownerName},` : 'Hello,';

      subject = `Welcome to UdharPe, ${firmName}!`;
      title = "Confirm Your Email";
      message = `${greeting}<br/><br/>We are thrilled to welcome <strong>${firmName}</strong> to UdharPe. <br/><br/>UdharPe is designed to help you manage your business ledgers effortlessly, securely, and privately. No more messy notebooks or confusing spreadsheets—just a clean, professional way to track your business finances.<br/><br/>Please confirm your email address by clicking the button below to secure your account and open your ledger.`;
      buttonText = "Confirm Email Address";
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); text-align: center; }
        .header { background-color: #1a1a1a; padding: 32px 20px; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .content { padding: 40px 32px; color: #333333; }
        .content h2 { margin-top: 0; font-size: 20px; color: #1a1a1a; }
        .content p { font-size: 16px; line-height: 1.5; color: #555555; margin-bottom: 32px; }
        .btn { display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; margin-bottom: 32px; }
        .footer { font-size: 13px; color: #888888; line-height: 1.5; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eeeeee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>UdharPe Security</h1>
        </div>
        <div class="content">
          <h2>${title}</h2>
          <p>${message}</p>
          <a href="${actionLink}" class="btn" style="color: white;">${buttonText}</a>
          <div class="footer">
            If you did not request this email, you can safely ignore it.
          </div>
        </div>
      </div>
    </body>
    </html>
    `

    // 3. Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "UdharPe Security <onboarding@resend.dev>", 
        to: [email],
        subject: subject,
        html: htmlContent,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error("Resend API Error:", data)
      throw new Error("Failed to send email via Resend.")
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
