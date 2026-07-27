import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8"
import { corsHeaders } from "../_shared/cors.ts"

// Initialize Resend API Key
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, type } = await req.json()

    if (!email || type !== 'recovery') {
      throw new Error("Missing required parameters or invalid type.")
    }

    // 1. Initialize Admin Supabase Client to generate the link
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 2. Generate the recovery link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: Deno.env.get('FRONTEND_URL') || 'http://localhost:5173/auth'
      }
    })

    if (linkError) {
      console.error("Link Generation Error:", linkError)
      throw new Error("Could not generate recovery link.")
    }

    const resetLink = linkData.properties.action_link

    // 3. Construct the beautiful HTML Email using the generated link
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
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your UdharPe password. Click the button below to set a new password.</p>
          <a href="${resetLink}" class="btn" style="color: white;">Reset My Password</a>
          <div class="footer">
            This link will expire in <strong>15 minutes</strong> and can only be used once.<br><br>
            If you did not request a password reset, you can safely ignore this email. Your password will not change.
          </div>
        </div>
      </div>
    </body>
    </html>
    `

    // 4. Send the email directly via Resend API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "UdharPe Security <onboarding@resend.dev>", // Or your verified domain
        to: [email],
        subject: "Reset Your UdharPe Password",
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
