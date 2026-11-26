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
      const { data: outstandingRows, error: outErr } = await supabaseAdmin
        .from('customers')
        .select('total_outstanding')
        .eq('business_id', businessId)
      if (outErr) throw outErr

      const { data: billRows, error: billErr } = await supabaseAdmin
        .from('bills')
        .select('id')
        .eq('business_id', businessId)
      if (billErr) throw billErr

      const customerCount = (outstandingRows || []).length
      const billCount = (billRows || []).length
      const totalOutstanding = (outstandingRows || []).reduce(
        (sum, row) => sum + Number(row.total_outstanding || 0),
        0
      )

      return new Response(JSON.stringify({
        customerCount,
        billCount,
        totalOutstanding,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const { data: users, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (authErr) throw authErr
    const totalBusinesses = users?.users?.length || 0

    const { data: customerRows, error: totalCustErr } = await supabaseAdmin
      .from('customers')
      .select('id, business_id, total_outstanding')
    if (totalCustErr) throw totalCustErr
    const totalCustomers = (customerRows || []).length
    const totalOutstanding = (customerRows || []).reduce(
      (sum, c) => sum + Number(c.total_outstanding || 0),
      0
    )

    const { data: bills, error: billsErr } = await supabaseAdmin
      .from('bills')
      .select('amount, business_id')
    if (billsErr) throw billsErr

    let totalVolume = 0
    const totalTransactions = bills?.length || 0

    const custByBiz: Record<string, { count: number; outstanding: number }> = {}
    for (const c of customerRows || []) {
      if (!c.business_id) continue
      if (!custByBiz[c.business_id]) custByBiz[c.business_id] = { count: 0, outstanding: 0 }
      custByBiz[c.business_id].count += 1
      custByBiz[c.business_id].outstanding += Number(c.total_outstanding || 0)
    }

    const billsByBiz: Record<string, { count: number; volume: number }> = {}
    if (bills) {
      bills.forEach((bill) => {
        const amt = Number(bill.amount || 0)
        totalVolume += amt
        if (bill.business_id) {
          if (!billsByBiz[bill.business_id]) billsByBiz[bill.business_id] = { count: 0, volume: 0 }
          billsByBiz[bill.business_id].count += 1
          billsByBiz[bill.business_id].volume += amt
        }
      })
    }

    const totalSettled = Math.max(0, totalVolume - totalOutstanding)

    const payload = {
      totalBusinesses,
      totalCustomers,
      totalTransactions,
      totalVolume,
      totalOutstanding,
      totalSettled,
      adminEmail: user.email,
      businesses: (users?.users || []).map((u) => {
        const meta = (u.user_metadata || {}) as Record<string, unknown>
        const cStats = custByBiz[u.id] || { count: 0, outstanding: 0 }
        const bStats = billsByBiz[u.id] || { count: 0, volume: 0 }
        return {
          id: u.id,
          email: u.email,
          firm_name: typeof meta.firm_name === 'string' ? meta.firm_name.trim() : '',
          owner_name: typeof meta.owner_name === 'string' ? meta.owner_name.trim() : '',
          is_admin: isSuperAdmin(u),
          customerCount: cStats.count,
          billCount: bStats.count,
          totalVolume: bStats.volume,
          totalOutstanding: cStats.outstanding,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        }
      }),
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errMsg = error instanceof Error
      ? (error.message || JSON.stringify(error))
      : (typeof error === 'object' && error !== null
          ? ((error as { message?: string; code?: string; details?: string; hint?: string }).message || JSON.stringify(error))
          : String(error))
    return new Response(
      JSON.stringify({ error: errMsg }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
