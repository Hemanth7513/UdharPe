import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8"
import { corsHeaders } from "../_shared/cors.ts"
import { checkRateLimit } from "../_shared/security.ts"

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Security Checks
    const clientIp = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    checkRateLimit(clientIp, 60000, 20); // Max 20 admin stats requests per min

    // 2. Initialize Supabase Admin Client using Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 2. Verify requesting user is the Admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error("No authorization header")
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error("Unauthorized")
    }

    // Strict check: Only hemaxtth@gmail.com is allowed
    if (user.email !== 'hemaxtth@gmail.com') {
      return new Response(
        JSON.stringify({ error: "Forbidden: You do not have superadmin privileges." }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Parse Action (if any)
    let action = 'dashboard';
    let businessId = null;
    
    // We try to parse the body. Since we added size limits, we can safely do this.
    try {
      const bodyText = await req.text();
      if (bodyText) {
        const body = JSON.parse(bodyText);
        action = body.action || 'dashboard';
        businessId = body.businessId;
      }
    } catch (e) {
      // ignore
    }

    if (action === 'get_businesses') {
      const { data: users, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
      if (authErr) throw authErr;
      
      const businesses = users.users.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at
      }));

      return new Response(JSON.stringify({ businesses }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (action === 'get_business_details' && businessId) {
      const { data: customers } = await supabaseAdmin.from('customers').select('*').eq('business_id', businessId);
      const { data: bills } = await supabaseAdmin.from('bills').select('*').eq('business_id', businessId);
      
      return new Response(JSON.stringify({ customers: customers || [], bills: bills || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // Default: Dashboard Stats
    const { data: users, error: authErr } = await supabaseAdmin.auth.admin.listUsers()
    const totalBusinesses = users?.users?.length || 0;

    // Total Customers (across all businesses)
    const { count: totalCustomers, error: custErr } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // Total Transactions & Volume (across all businesses)
    const { data: bills, error: billsErr } = await supabaseAdmin
      .from('bills')
      .select('amount');

    let totalVolume = 0;
    let totalTransactions = bills?.length || 0;

    if (bills) {
      bills.forEach(bill => {
        totalVolume += Number(bill.amount);
      });
    }

    // Send back the payload
    const payload = {
      totalBusinesses,
      totalCustomers: totalCustomers || 0,
      totalTransactions,
      totalVolume,
      adminEmail: user.email,
      businesses: users && users.users ? users.users.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at
      })) : []
    }

    return new Response(
      JSON.stringify(payload),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
