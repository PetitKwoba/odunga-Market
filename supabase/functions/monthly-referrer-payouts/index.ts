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
      .from("platform_settings").select("value").eq("key", "referrer_min_withdrawal").maybeSingle();
    const MIN = Number(minRow?.value ?? 500);

    const batch_id = crypto.randomUUID();
    const { data: wallets } = await supabase
      .from("referrer_wallet_balances")
      .select("referrer_id, available_balance, currency, lifetime_paid_out")
      .gte("available_balance", MIN);

    const results: any[] = [];
    for (const w of wallets ?? []) {
      // Referrers also use producer_bank_accounts table (we treat producer_id as user_id)
      const { data: bank } = await supabase
        .from("producer_bank_accounts")
        .select("paystack_recipient_code")
        .eq("producer_id", w.referrer_id).eq("is_verified", true).maybeSingle();

      if (!bank?.paystack_recipient_code) { results.push({ referrer_id: w.referrer_id, skipped: "no_recipient" }); continue; }

      const amount = Number(w.available_balance);
      const reference = `refpay_${batch_id.slice(0, 8)}_${w.referrer_id.slice(0, 8)}`;

      const tr = await fetch("https://api.paystack.co/transfer", {
        method: "POST",
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "balance", amount: Math.round(amount * 100),
          recipient: bank.paystack_recipient_code,
          reason: "OdungaMarket monthly referrer payout", reference, currency: w.currency || "KES",
        }),
      });
      const trData = await tr.json();
      if (!tr.ok || !trData.status) { results.push({ referrer_id: w.referrer_id, error: trData.message }); continue; }

      await supabase.from("referrer_wallet_balances").update({
        available_balance: 0,
        lifetime_paid_out: Number(w.lifetime_paid_out || 0) + amount,
        last_payout_at: new Date().toISOString(),
      }).eq("referrer_id", w.referrer_id);

      await supabase.from("referrer_wallet_transactions").insert({
        referrer_id: w.referrer_id, type: "debit_payout", amount: -amount,
        description: `Monthly referrer payout (${reference})`, balance_after: 0,
      });

      results.push({ referrer_id: w.referrer_id, amount, transfer_code: trData.data.transfer_code });
    }

    return new Response(JSON.stringify({ batch_id, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
