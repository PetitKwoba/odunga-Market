import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: minRow } = await supabase
      .from("platform_settings").select("value").eq("key", "producer_min_withdrawal").maybeSingle();
    const MIN = Number(minRow?.value ?? 1000);

    const batch_id = crypto.randomUUID();
    const { data: wallets } = await supabase
      .from("wallet_balances")
      .select("producer_id, available_balance, currency, lifetime_paid_out")
      .gte("available_balance", MIN);

    const results: any[] = [];
    for (const w of wallets ?? []) {
      const { data: bank } = await supabase
        .from("producer_bank_accounts")
        .select("paystack_recipient_code")
        .eq("producer_id", w.producer_id).eq("is_verified", true).maybeSingle();

      if (!bank?.paystack_recipient_code) { results.push({ producer_id: w.producer_id, skipped: "no_recipient" }); continue; }

      const amount = Number(w.available_balance);
      const reference = `bipay_${batch_id.slice(0, 8)}_${w.producer_id.slice(0, 8)}`;

      const tr = await fetch("https://api.paystack.co/transfer", {
        method: "POST",
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "balance", amount: Math.round(amount * 100),
          recipient: bank.paystack_recipient_code,
          reason: "OdungaMarket biweekly payout", reference, currency: w.currency || "KES",
        }),
      });
      const trData = await tr.json();
      if (!tr.ok || !trData.status) {
        results.push({ producer_id: w.producer_id, error: trData.message }); continue;
      }

      await supabase.from("wallet_balances").update({
        available_balance: 0,
        lifetime_paid_out: Number(w.lifetime_paid_out || 0) + amount,
        last_payout_at: new Date().toISOString(),
      }).eq("producer_id", w.producer_id);

      await supabase.from("wallet_transactions").insert({
        producer_id: w.producer_id, type: "debit_payout", amount: -amount,
        description: `Biweekly payout (${reference})`, balance_after: 0,
      });

      await supabase.from("payouts").insert({
        producer_id: w.producer_id, order_id: w.producer_id,
        gross_amount: amount, net_amount: amount, status: "processing", batch_id,
        paystack_transfer_code: trData.data.transfer_code,
        paystack_recipient_code: bank.paystack_recipient_code,
      });

      await supabase.functions.invoke("send-notification", { body: {
        event_type: "auto_payout_paid", user_id: w.producer_id,
        metadata: {
          amount, currency: w.currency || "KES", reference,
          cadence: "biweekly",
          batch_name: `Biweekly producer payout ${new Date().toISOString().slice(0,10)} (batch ${batch_id.slice(0,8)})`,
        },
      }}).catch(() => {});

      results.push({ producer_id: w.producer_id, amount, transfer_code: trData.data.transfer_code });

    }

    return new Response(JSON.stringify({ batch_id, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
