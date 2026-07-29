import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8"
import { getCorsHeaders } from "../_shared/cors.ts"
import { checkRateLimit, escapeHtml, getClientIp, sanitizeStrings } from "../_shared/security.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'UdharPe Support <onboarding@resend.dev>'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    checkRateLimit(`send-email:${user.id}`, 60000, 5)

    const bodyText = await req.text()
    // Allow PDF attachments (base64) up to ~1.5MB JSON body
    if (new Blob([bodyText]).size > 1_500_000) {
      throw new Error('Payload too large')
    }

    const raw = sanitizeStrings(JSON.parse(bodyText))
    const { customer_id, subject, message, attachments, template } = raw

    if (!customer_id || !subject) {
      throw new Error('Missing required fields: customer_id, subject')
    }

    if (typeof subject !== 'string' || subject.length > 200) {
      throw new Error('Invalid subject')
    }

    const { data: customer, error: custError } = await supabaseUser
      .from('customers')
      .select('id, name, email, business_id')
      .eq('id', customer_id)
      .eq('business_id', user.id)
      .single()

    if (custError || !customer) {
      return new Response(JSON.stringify({ error: 'Customer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!customer.email) {
      throw new Error('Customer does not have an email address on file')
    }

    const safeName = escapeHtml(customer.name)
    const safeSubject = escapeHtml(subject)
    let html: string

    if (template === 'statement') {
      html = `
        <p>Hello ${safeName},</p>
        <p>Please find attached your latest statement from UdharPe.</p>
        <p>Thank you!</p>
      `
    } else {
      if (!message || typeof message !== 'string') {
        throw new Error('Missing required field: message')
      }
      if (message.length > 5000) {
        throw new Error('Message too long')
      }
      const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>')
      html = `<p>${safeMessage}</p>`
    }

    const safeAttachments = Array.isArray(attachments)
      ? attachments.slice(0, 3).map((a: { filename?: string; content?: string }) => ({
          filename: String(a.filename || 'attachment.pdf').replace(/[^\w.\-]/g, '_').slice(0, 120),
          content: String(a.content || ''),
        })).filter((a: { content: string }) => a.content.length > 0 && a.content.length < 1_400_000)
      : []

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: customer.email,
        subject: subject.slice(0, 200),
        html,
        attachments: safeAttachments,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || 'Failed to send email')
    }

    return new Response(JSON.stringify({ id: data.id, to: customer.email, subject: safeSubject }), {
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
