import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8"
import { getCorsHeaders } from "../_shared/cors.ts"
import {
  checkPersistentRateLimit,
  getClientIp,
  isDisposableEmail,
  logSecurityEvent,
  validatePayloadSize,
} from "../_shared/security.ts"
import {
  renderForgotPasswordEmail,
  renderMagicLinkEmail,
  renderOnboardingEmail,
} from "../_shared/email-templates.ts"

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
    await validatePayloadSize(req, 5120)

    const rawPayload = await req.json()
    const { email, type, password, options, website, formLoadedAt } = rawPayload

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Honeypot & minimum form-fill timing check against automated bots
    if (typeof website === 'string' && website.trim().length > 0) {
      await logSecurityEvent(supabaseAdmin, 'bot_honeypot_triggered', clientIp, { type })
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
    if (typeof formLoadedAt === 'number' && Date.now() - formLoadedAt < 700) {
      await logSecurityEvent(supabaseAdmin, 'bot_fast_submit', clientIp, { type })
      throw new Error('Please take a moment before submitting.')
    }

    try {
      await checkPersistentRateLimit(supabaseAdmin, `auth-email-ip:${clientIp}`, 60, 5)
    } catch (rlErr) {
      await logSecurityEvent(supabaseAdmin, 'rate_limit_hit', clientIp, { scope: 'auth-email-ip' })
      throw rlErr
    }

    if (!email || typeof email !== 'string' || !['recovery', 'magiclink', 'signup'].includes(type)) {
      throw new Error('Missing required parameters or invalid type.')
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      throw new Error('Invalid email address.')
    }

    if (type === 'signup' && isDisposableEmail(normalizedEmail)) {
      await logSecurityEvent(supabaseAdmin, 'disposable_email_blocked', normalizedEmail, { clientIp })
      throw new Error('Please use a valid business or personal email address.')
    }

    try {
      await checkPersistentRateLimit(supabaseAdmin, `auth-email:${normalizedEmail}`, 60, 3)
    } catch (rlErr) {
      await logSecurityEvent(supabaseAdmin, 'rate_limit_hit', normalizedEmail, { scope: 'auth-email', clientIp })
      throw rlErr
    }

    if (type === 'signup' && (!password || typeof password !== 'string' || password.length < 8)) {
      throw new Error('Password is required for signup (min 8 characters).')
    }

    if (type === 'signup' && password.length > 128) {
      throw new Error('Password is too long.')
    }

    const allowedFrontendOrigins = new Set([
      'https://udhar-pe.vercel.app',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ])
    const requestOrigin = req.headers.get('Origin') ?? ''
    const frontendUrl = allowedFrontendOrigins.has(requestOrigin)
      ? requestOrigin
      : (Deno.env.get('FRONTEND_URL') || 'https://udhar-pe.vercel.app')
    const redirectTo = type === 'recovery' ? `${frontendUrl}/auth` : `${frontendUrl}/dashboard`

    // Uniform response for recovery/magiclink to reduce email enumeration
    const genericOk = () =>
      new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    // In Resend sandbox (onboarding@resend.dev), send directly via Supabase Auth for other recipients
    // so generateLink doesn't consume the 60s rate-limit before fallback runs.
    const isResendSandbox = FROM_EMAIL.includes('resend.dev')
    if (isResendSandbox && (type === 'recovery' || type === 'magiclink')) {
      if (type === 'recovery') {
        const { error: directErr } = await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, { redirectTo })
        if (directErr) {
          throw new Error(directErr.message || 'Failed to send password reset email.')
        }
        return genericOk()
      }
      const { error: directErr } = await supabaseAdmin.auth.signInWithOtp({
        email: normalizedEmail,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
      })
      if (directErr) {
        throw new Error(directErr.message || 'Failed to send magic link email.')
      }
      return genericOk()
    }

    const generateOptions: any = {
      type,
      email: normalizedEmail,
      options: {
        redirectTo,
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

    if (linkError) {
      console.error('Link Generation Error:', linkError.message)
      const isRateLimit = linkError.message.includes('once every') || 
                          linkError.message.includes('rate limit') || 
                          linkError.message.includes('seconds') ||
                          linkError.status === 429;
      if (isRateLimit) {
        return new Response(JSON.stringify({ error: 'Please wait before requesting another reset link.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        })
      }
      if (type === 'recovery' || type === 'magiclink') {
        return genericOk()
      }
      throw new Error('Could not generate auth link.')
    }

    const actionLink = linkData.properties.action_link

    let rendered: { subject: string; html: string }
    if (type === 'recovery') {
      rendered = renderForgotPasswordEmail({ actionLink })
    } else if (type === 'magiclink') {
      rendered = renderMagicLinkEmail({ actionLink })
    } else {
      rendered = renderOnboardingEmail({
        firmName: options?.data?.firm_name,
        ownerName: options?.data?.owner_name,
        actionLink,
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [normalizedEmail],
        subject: rendered.subject,
        html: rendered.html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend API Error:', data)
      const isSandboxRestriction =
        res.status === 403 ||
        String(data?.message || '').toLowerCase().includes('verify a domain')

      if (isSandboxRestriction) {
        const redirectTo = type === 'recovery' ? `${frontendUrl}/auth` : `${frontendUrl}/dashboard`
        if (type === 'recovery') {
          const { error: fallbackErr } = await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, { redirectTo })
          if (fallbackErr) {
            throw new Error(fallbackErr.message || 'Failed to send password reset email.')
          }
          return genericOk()
        }
        if (type === 'magiclink') {
          const { error: fallbackErr } = await supabaseAdmin.auth.signInWithOtp({
            email: normalizedEmail,
            options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
          })
          if (fallbackErr) {
            throw new Error(fallbackErr.message || 'Failed to send magic link email.')
          }
          return genericOk()
        }
        if (type === 'signup') {
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          })
        }
      }

      throw new Error(data?.message || 'Failed to send email via Resend.')
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
