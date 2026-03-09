import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all open and in_progress tickets
    const { data: tickets, error: ticketsError } = await supabaseClient
      .from('support_tickets')
      .select('*, sla_configurations!inner(first_response_hours, resolution_hours, escalation_enabled)')
      .in('status', ['open', 'in_progress'])
      .eq('escalated', false);

    if (ticketsError) throw ticketsError;

    const now = new Date();
    const escalatedTickets = [];

    for (const ticket of tickets || []) {
      const createdAt = new Date(ticket.created_at);
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      // Get SLA config for this priority
      const { data: slaConfig } = await supabaseClient
        .from('sla_configurations')
        .select('*')
        .eq('priority', ticket.priority)
        .single();

      if (!slaConfig || !slaConfig.escalation_enabled) continue;

      let shouldEscalate = false;
      let breachReason = '';

      // Check first response SLA
      if (!ticket.first_response_at && hoursSinceCreation > slaConfig.first_response_hours) {
        shouldEscalate = true;
        breachReason = `No response within ${slaConfig.first_response_hours} hours`;
      }

      // Check resolution SLA
      if (ticket.status === 'in_progress' && hoursSinceCreation > slaConfig.resolution_hours) {
        shouldEscalate = true;
        breachReason = `Not resolved within ${slaConfig.resolution_hours} hours`;
      }

      if (shouldEscalate) {
        // Update ticket
        await supabaseClient
          .from('support_tickets')
          .update({
            escalated: true,
            escalated_at: now.toISOString(),
            sla_breached: true,
            priority: ticket.priority === 'low' ? 'medium' : ticket.priority === 'medium' ? 'high' : 'urgent'
          })
          .eq('id', ticket.id);

        escalatedTickets.push({
          id: ticket.id,
          subject: ticket.subject,
          reason: breachReason
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        escalated_count: escalatedTickets.length,
        escalated_tickets: escalatedTickets
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('SLA check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});