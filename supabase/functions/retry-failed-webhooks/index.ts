import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pending } = await supabase
      .from("webhook_failures")
      .select("*")
      .eq("status", "pending")
      .lte("next_retry_at", new Date().toISOString())
      .lt("retry_count", MAX_RETRIES)
      .limit(20);

    const results: any[] = [];
    for (const wf of pending ?? []) {
      try {
        let ok = false;
        if (wf.source === "paystack-transfer") {
          // Re-invoke the transfer webhook handler with stored payload
          const { error } = await supabase.functions.invoke("paystack-transfer-webhook", {
            body: wf.payload,
            headers: { "x-internal-retry": "true" },
          });
          ok = !error;
        }

        if (ok) {
          await supabase.from("webhook_failures").update({
            status: "resolved", resolved_at: new Date().toISOString(),
          }).eq("id", wf.id);
          results.push({ id: wf.id, status: "resolved" });
        } else {
          throw new Error("Retry handler returned error");
        }
      } catch (e: any) {
        const newCount = (wf.retry_count || 0) + 1;
        const backoffMin = Math.min(60, Math.pow(2, newCount)); // 2,4,8,16,32,60
        const isFinal = newCount >= MAX_RETRIES;
        await supabase.from("webhook_failures").update({
          retry_count: newCount,
          status: isFinal ? "dead_letter" : "pending",
          next_retry_at: new Date(Date.now() + backoffMin * 60_000).toISOString(),
          error_message: e?.message || "retry_failed",
        }).eq("id", wf.id);

        if (isFinal) {
          // Alert admins
          const { data: admins } = await supabase
            .from("user_roles").select("user_id").eq("role", "admin");
          for (const a of admins ?? []) {
            await supabase.functions.invoke("send-notification", { body: {
              event_type: "admin_alert", user_id: a.user_id,
              metadata: {
                subject: `Webhook dead-lettered: ${wf.source}`,
                message: `Webhook ${wf.source} ref=${wf.reference || '—'} failed ${MAX_RETRIES}× and was moved to dead-letter. Last error: ${e?.message}`,
              },
            }}).catch(() => {});
          }
        }
        results.push({ id: wf.id, status: isFinal ? "dead_letter" : "pending", retry_count: newCount });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
