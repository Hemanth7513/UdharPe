import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8"
import { getCorsHeaders } from "../_shared/cors.ts"
import { timingSafeEqual } from "../_shared/security.ts"
import { renderPendingBillEmail } from "../_shared/email-templates.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'UdharPe Reminders <onboarding@resend.dev>'
const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    if (!CRON_SECRET) {
      console.error('CRON_SECRET is not configured')
      return new Response(JSON.stringify({ error: 'Reminders not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization') || ''
    const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!provided || !timingSafeEqual(provided, CRON_SECRET)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const today = new Date().toISOString().split('T')[0]
    const { data: overdueBills, error: billsError } = await supabaseClient
      .from('bills')
      .select(`
        id,
        amount,
        remaining_amount,
        bill_no,
        due_date,
        business_id,
        customers ( id, name, email )
      `)
      .in('status', ['pending', 'partial'])
      .lt('due_date', today)
      .gt('remaining_amount', 0)

    if (billsError) throw billsError

    if (!overdueBills || overdueBills.length === 0) {
      return new Response(JSON.stringify({ message: 'No overdue bills found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const businessIds = [...new Set(overdueBills.map((b) => b.business_id).filter(Boolean))]
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, firm_name')
      .in('id', businessIds)

    const firmMap = new Map((profiles || []).map((p) => [p.id, p.firm_name]))

    const emailsToSend = overdueBills
      .filter((bill) => bill.customers && bill.customers.email && Number(bill.remaining_amount) > 0)
      .map((bill) => {
        const firmName = firmMap.get(bill.business_id) || 'A Business'
        const remaining = Number(bill.remaining_amount).toLocaleString('en-IN')
        const rendered = renderPendingBillEmail({
          customerName: bill.customers.name,
          firmName,
          amountFormatted: remaining,
          billNo: bill.bill_no || undefined,
          dueDate: bill.due_date || undefined,
        })

        return fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: bill.customers.email,
            subject: rendered.subject,
            html: rendered.html,
          }),
        })
      })

    const results = await Promise.allSettled(emailsToSend)
    const successful = results.filter((r) => r.status === 'fulfilled' && (r.value as Response).ok).length

    return new Response(JSON.stringify({
      message: `Successfully sent ${successful} out of ${emailsToSend.length} reminders.`,
    }), {
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
