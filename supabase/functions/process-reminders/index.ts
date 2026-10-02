// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This code runs as a Supabase Edge Function triggered by Cron schedule (e.g. daily at 08:00 UTC)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const todayIso = new Date().toISOString().split('T')[0]

    // 1. Fetch pending reminders due today or earlier
    const { data: dueReminders, error: fetchErr } = await supabaseClient
      .from('reminders')
      .select(`
        id,
        user_id,
        scan_id,
        reminder_date,
        reminder_type,
        user_scans (
          id,
          expiry_date,
          status,
          products (
            product_name,
            brand,
            category
          )
        ),
        profiles (
          full_name,
          email
        )
      `)
      .eq('notification_status', 'pending')
      .lte('reminder_date', todayIso)
      .limit(100)

    if (fetchErr) throw fetchErr

    const processedIds: string[] = []

    for (const rem of dueReminders || []) {
      const scan = rem.user_scans
      if (scan && scan.status !== 'consumed' && scan.status !== 'discarded') {
        // Formulate reminder notification
        const productName = scan.products?.product_name || 'Your scanned item'
        const expDate = scan.expiry_date || 'soon'
        
        console.log(`[Reminder Notification Dispatch] Sending ${rem.reminder_type} alert to ${rem.profiles?.email || rem.user_id} for ${productName} (Expires: ${expDate})`)
        processedIds.push(rem.id)
      }
    }

    // 2. Mark dispatched reminders as 'sent'
    if (processedIds.length > 0) {
      const { error: updateErr } = await supabaseClient
        .from('reminders')
        .update({
          notification_status: 'sent',
          sent_at: new Date().toISOString()
        })
        .in('id', processedIds)

      if (updateErr) throw updateErr
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_count: processedIds.length,
        processed_ids: processedIds,
        date: todayIso
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
