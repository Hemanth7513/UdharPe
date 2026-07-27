import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8"
import { corsHeaders } from "../_shared/cors.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Initialize Supabase Admin client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Fetch all bills that are overdue and unpaid
    const today = new Date().toISOString().split('T')[0];
    const { data: overdueBills, error: billsError } = await supabaseClient
      .from('bills')
      .select(`
        id, 
        amount, 
        remaining_amount, 
        bill_no, 
        due_date,
        business_id,
        customers ( id, name, email ),
        businesses ( id, firm_name )
      `)
      .eq('status', 'pending')
      .lt('due_date', today);

    if (billsError) throw billsError;

    if (!overdueBills || overdueBills.length === 0) {
      return new Response(JSON.stringify({ message: "No overdue bills found." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const emailsToSend = overdueBills
      .filter(bill => bill.customers && bill.customers.email && bill.remaining_amount > 0)
      .map(bill => {
        const firmName = bill.businesses?.firm_name || 'A Business';
        const billNo = bill.bill_no || 'Unknown';
        
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9ff; border-radius: 12px; border: 1px solid #eaeaea;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #4f46e5; margin-bottom: 8px;">Payment Reminder</h1>
            </div>
            
            <div style="background-color: white; padding: 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <h2 style="color: #1e1e24; margin-top: 0; font-size: 20px;">Hello ${bill.customers.name},</h2>
              
              <p style="color: #4a4a55; font-size: 16px; line-height: 1.6;">
                This is a friendly reminder from <strong>${firmName}</strong> that your payment for Bill <strong>${billNo}</strong> is now overdue.
              </p>
              
              <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
                <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Remaining Balance</p>
                <p style="margin: 8px 0 0 0; color: #ef4444; font-size: 32px; font-weight: 900;">₹${Number(bill.remaining_amount).toLocaleString()}</p>
              </div>
              
              <p style="color: #4a4a55; font-size: 16px; line-height: 1.6;">
                Please arrange for payment at your earliest convenience. If you have already made this payment, please disregard this email.
              </p>
              
              <p style="color: #4a4a55; font-size: 16px; line-height: 1.6; margin-top: 24px;">
                Thank you,<br/>
                <strong>${firmName}</strong>
              </p>
            </div>
          </div>
        `;

        return fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'UdharPe Reminders <onboarding@resend.dev>',
            to: bill.customers.email,
            subject: `Payment Reminder: Bill ${billNo} from ${firmName}`,
            html: html
          })
        });
      });

    // Fire off all emails in parallel
    const results = await Promise.allSettled(emailsToSend);
    const successful = results.filter(r => r.status === 'fulfilled').length;

    return new Response(JSON.stringify({ 
      message: `Successfully sent ${successful} out of ${emailsToSend.length} reminders.`
    }), {
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
