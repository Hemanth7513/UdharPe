import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8"
import { getCorsHeaders } from "../_shared/cors.ts"
import { checkRateLimit, escapeHtml, getClientIp, sanitizeStrings, validatePayloadSize } from "../_shared/security.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'UdharPe Security <onboarding@resend.dev>'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const clientIp = getClientIp(req)
    checkRateLimit(`auth-email-ip:${clientIp}`, 60000, 5)
    await validatePayloadSize(req, 5120)

    const rawPayload = await req.json()
    const sanitizedPayload = sanitizeStrings(rawPayload)
    const { email, type, password, options } = sanitizedPayload

    if (!email || typeof email !== 'string' || !['recovery', 'magiclink', 'signup'].includes(type)) {
      throw new Error('Missing required parameters or invalid type.')
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      throw new Error('Invalid email address.')
    }

    checkRateLimit(`auth-email:${normalizedEmail}`, 60000, 3)

    if (type === 'signup' && (!password || typeof password !== 'string' || password.length < 8)) {
      throw new Error('Password is required for signup (min 8 characters).')
    }

    if (type === 'signup' && password.length > 128) {
      throw new Error('Password is too long.')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'
    const generateOptions: any = {
      type,
      email: normalizedEmail,
      options: {
        redirectTo: type === 'recovery' ? `${frontendUrl}/auth` : `${frontendUrl}/dashboard`,
      },
    }

    if (type === 'signup') {
      generateOptions.password = password
      if (options?.data) {
        generateOptions.options.data = {
          firm_name: String(options.data.firm_name || '').slice(0, 120),
          owner_name: String(options.data.owner_name || '').slice(0, 120),
        }
      }
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink(generateOptions)

    // Uniform response for recovery/magiclink to reduce email enumeration
    const genericOk = () =>
      new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    if (linkError) {
      console.error('Link Generation Error:', linkError.message)
      if (type === 'recovery' || type === 'magiclink') {
        return genericOk()
      }
      throw new Error('Could not generate auth link.')
    }

    const actionLink = linkData.properties.action_link

    let subject = ''
    let title = ''
    let message = ''
    let buttonText = ''

    if (type === 'recovery') {
      subject = 'Reset Your UdharPe Password'
      title = 'Password Reset Request'
      message = 'We received a request to reset your UdharPe password. Click the button below to set a new password.'
      buttonText = 'Reset My Password'
    } else if (type === 'magiclink') {
      subject = 'Your UdharPe Magic Link'
      title = 'Magic Link Login'
      message = 'Click the button below to securely log into your UdharPe account. No password required!'
      buttonText = 'Log In to UdharPe'
    } else if (type === 'signup') {
      const firmName = escapeHtml(options?.data?.firm_name || 'your firm')
      const ownerName = escapeHtml(options?.data?.owner_name || '')
      const greeting = ownerName ? `Dear ${ownerName},` : 'Hello,'

      subject = `Welcome to UdharPe, ${String(options?.data?.firm_name || 'your firm').slice(0, 80)}!`
      title = 'Confirm Your Email'
      message = `${greeting}<br/><br/>We are thrilled to welcome <strong>${firmName}</strong> to UdharPe. <br/><br/>UdharPe is designed to help you manage your business ledgers effortlessly, securely, and privately. No more messy notebooks or confusing spreadsheets—just a clean, professional way to track your business finances.<br/><br/>Please confirm your email address by clicking the button below to secure your account and open your ledger.`
      buttonText = 'Confirm Email Address'
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
        .btn { display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; margin-bottom: 32px; }
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

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [normalizedEmail],
        subject,
        html: htmlContent,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend API Error:', data)
      if (type === 'recovery' || type === 'magiclink') {
        return genericOk()
      }
      throw new Error('Failed to send email via Resend.')
    }

    if (type === 'recovery' || type === 'magiclink') {
      return genericOk()
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
