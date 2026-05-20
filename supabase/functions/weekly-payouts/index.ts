import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MIN_PAYOUT = 1000; // KES

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const batch_id = crypto.randomUUID();
    const { data: wallets } = await supabase
      .from("wallet_balances")
      .select("producer_id, available_balance, currency")
      .gte("available_balance", MIN_PAYOUT);

    const results: any[] = [];

    for (const w of wallets ?? []) {
      const { data: bank } = await supabase
        .from("producer_bank_accounts")
        .select("paystack_recipient_code, account_name")
        .eq("producer_id", w.producer_id)
        .eq("is_verified", true)
        .maybeSingle();

      if (!bank?.paystack_recipient_code) {
        results.push({ producer_id: w.producer_id, skipped: "no_recipient" });
        continue;
      }

      const amount = Number(w.available_balance);
      const reference = `payout_${batch_id.slice(0, 8)}_${w.producer_id.slice(0, 8)}`;

      const tr = await fetch("https://api.paystack.co/transfer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "balance",
          amount: Math.round(amount * 100), // kobo
          recipient: bank.paystack_recipient_code,
          reason: `OdungaMarket weekly payout`,
          reference,
          currency: w.currency || "KES",
        }),
      });
      const trData = await tr.json();

      if (!tr.ok || !trData.status) {
        await supabase.from("payouts").insert({
          producer_id: w.producer_id,
          order_id: w.producer_id, // placeholder for batch payouts
          gross_amount: amount,
          net_amount: amount,
          status: "failed",
          batch_id,
          failure_reason: trData.message || "transfer_failed",
          paystack_recipient_code: bank.paystack_recipient_code,
        });
        results.push({ producer_id: w.producer_id, error: trData.message });
        continue;
      }

      // Debit wallet (read-modify-write)
      const { data: current } = await supabase
        .from("wallet_balances")
        .select("available_balance, lifetime_paid_out")
        .eq("producer_id", w.producer_id)
        .single();
      await supabase
        .from("wallet_balances")
        .update({
          available_balance: Math.max(0, Number(current?.available_balance || 0) - amount),
          lifetime_paid_out: Number(current?.lifetime_paid_out || 0) + amount,
        })
        .eq("producer_id", w.producer_id);

      await supabase.from("wallet_transactions").insert({
        producer_id: w.producer_id,
        type: "debit_payout",
        amount: -amount,
        description: `Weekly payout (ref ${reference})`,
        balance_after: 0,
      });

      await supabase.from("payouts").insert({
        producer_id: w.producer_id,
        order_id: w.producer_id, // placeholder; aggregated batch
        gross_amount: amount,
        net_amount: amount,
        status: "processing",
        batch_id,
        paystack_transfer_code: trData.data.transfer_code,
        paystack_recipient_code: bank.paystack_recipient_code,
      });

      results.push({ producer_id: w.producer_id, amount, transfer_code: trData.data.transfer_code });
    }

    return new Response(JSON.stringify({ batch_id, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
