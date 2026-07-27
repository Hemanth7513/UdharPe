import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { checkRateLimit } from "../_shared/security.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const clientIp = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    checkRateLimit(clientIp, 60000, 5); // Max 5 emails per minute

    const bodyText = await req.text();
    if (new Blob([bodyText]).size > 5120) {
      throw new Error("Payload too large");
    }

    const { to, subject, html, attachments } = JSON.parse(bodyText);

    if (!to || !subject || !html) {
      throw new Error('Missing required fields: to, subject, html')
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'UdharPe Support <onboarding@resend.dev>', // Resend testing email
        to: to,
        subject: subject,
        html: html,
        attachments: attachments || []
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'Failed to send email')
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
