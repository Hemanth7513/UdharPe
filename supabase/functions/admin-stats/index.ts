import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8"
import { getCorsHeaders } from "../_shared/cors.ts"
import { checkRateLimit, getClientIp, isSuperAdmin } from "../_shared/security.ts"

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      throw new Error('Method not allowed')
    }

    const clientIp = getClientIp(req)
    checkRateLimit(`admin-stats:${clientIp}`, 60000, 20)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isSuperAdmin(user)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not have superadmin privileges.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let action = 'dashboard'
    let businessId: string | null = null

    try {
      const bodyText = await req.text()
      if (bodyText) {
        const body = JSON.parse(bodyText)
        action = body.action || 'dashboard'
        businessId = body.businessId || null
      }
    } catch {
      // ignore empty/invalid body — default dashboard
    }

    if (action === 'get_businesses') {
      const { data: users, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      if (authErr) throw authErr

      const businesses = (users.users || []).map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }))

      return new Response(JSON.stringify({ businesses }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Aggregates only — no raw customer/bill PII
    if (action === 'get_business_details' && businessId) {
      const { count: customerCount } = await supabaseAdmin
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)

      const { count: billCount } = await supabaseAdmin
        .from('bills')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)

      const { data: outstandingRows } = await supabaseAdmin
        .from('customers')
        .select('total_outstanding')
        .eq('business_id', businessId)

      const totalOutstanding = (outstandingRows || []).reduce(
        (sum, row) => sum + Number(row.total_outstanding || 0),
        0
      )

      return new Response(JSON.stringify({
        customerCount: customerCount || 0,
        billCount: billCount || 0,
        totalOutstanding,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const { data: users, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (authErr) throw authErr
    const totalBusinesses = users?.users?.length || 0

    const { count: totalCustomers } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true })

    const { data: bills } = await supabaseAdmin
      .from('bills')
      .select('amount')

    let totalVolume = 0
    const totalTransactions = bills?.length || 0
    if (bills) {
      bills.forEach((bill) => {
        totalVolume += Number(bill.amount)
      })
    }

    const payload = {
      totalBusinesses,
      totalCustomers: totalCustomers || 0,
      totalTransactions,
      totalVolume,
      adminEmail: user.email,
      businesses: (users?.users || []).map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      })),
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
