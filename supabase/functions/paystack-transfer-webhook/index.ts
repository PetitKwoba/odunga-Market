import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
    const body = await req.text();
    const sig = req.headers.get("x-paystack-signature");
    const hash = createHmac("sha512", PAYSTACK_SECRET_KEY).update(body).digest("hex");
    if (sig !== hash) return new Response("Invalid signature", { status: 401 });

    const event = JSON.parse(body);
    const code = event?.data?.transfer_code;
    if (!code) return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let status = "processing";
    if (event.event === "transfer.success") status = "paid";
    else if (event.event === "transfer.failed") status = "failed";
    else if (event.event === "transfer.reversed") status = "reversed";

    // --- 1) Update batched payouts row (producer batch payouts) ---
    const { data: payout } = await supabase.from("payouts").update({
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
      failure_reason: status === "failed" ? (event?.data?.reason ?? "failed") : null,
    }).eq("paystack_transfer_code", code).select().maybeSingle();

    if ((status === "failed" || status === "reversed") && payout) {
      const amount = Number(payout.gross_amount);
      const { data: w } = await supabase.from("wallet_balances")
        .select("available_balance").eq("producer_id", payout.producer_id).maybeSingle();
      if (w) {
        await supabase.from("wallet_balances")
          .update({ available_balance: Number(w.available_balance) + amount })
          .eq("producer_id", payout.producer_id);
        await supabase.from("wallet_transactions").insert({
          producer_id: payout.producer_id, type: "adjustment", amount,
          description: `Payout ${status} — refunded`,
          balance_after: Number(w.available_balance) + amount,
        });
      }
    }

    // --- 2) Update withdrawal_requests (on-demand withdrawals) ---
    const { data: wr } = await supabase.from("withdrawal_requests").update({
      status,
      processed_at: ["paid", "failed", "reversed"].includes(status) ? new Date().toISOString() : null,
      failure_reason: status === "failed" ? (event?.data?.reason ?? "failed") : null,
    }).eq("paystack_transfer_code", code).select().maybeSingle();

    if (wr) {
      if (status === "paid") {
        // Increment lifetime_paid_out
        const table = wr.user_type === "producer" ? "wallet_balances" : "referrer_wallet_balances";
        const key = wr.user_type === "producer" ? "producer_id" : "referrer_id";
        const { data: bal } = await supabase.from(table)
          .select("lifetime_paid_out").eq(key, wr.user_id).maybeSingle();
        if (bal) {
          await supabase.from(table).update({
            lifetime_paid_out: Number(bal.lifetime_paid_out || 0) + Number(wr.amount),
            last_payout_at: new Date().toISOString(),
          }).eq(key, wr.user_id);
        }
        await supabase.functions.invoke("send-notification", { body: {
          event_type: "withdrawal_completed", user_id: wr.user_id,
          metadata: { amount: Number(wr.amount), currency: wr.currency, reference: wr.paystack_reference },
        }}).catch(() => {});
      } else if (status === "failed" || status === "reversed") {
        // Refund available balance
        const table = wr.user_type === "producer" ? "wallet_balances" : "referrer_wallet_balances";
        const txTable = wr.user_type === "producer" ? "wallet_transactions" : "referrer_wallet_transactions";
        const key = wr.user_type === "producer" ? "producer_id" : "referrer_id";
        const { data: bal } = await supabase.from(table)
          .select("available_balance").eq(key, wr.user_id).maybeSingle();
        if (bal) {
          const newBal = Number(bal.available_balance) + Number(wr.amount);
          await supabase.from(table).update({ available_balance: newBal }).eq(key, wr.user_id);
          await supabase.from(txTable).insert({
            [key]: wr.user_id, type: "adjustment", amount: Number(wr.amount),
            withdrawal_id: wr.id, description: `Withdrawal ${status} — refunded`,
            balance_after: newBal,
          });
        }
        await supabase.functions.invoke("send-notification", { body: {
          event_type: "withdrawal_failed", user_id: wr.user_id,
          metadata: { amount: Number(wr.amount), currency: wr.currency, reason: event?.data?.reason || status, reference: wr.paystack_reference },
        }}).catch(() => {});
      }
    }


    return new Response(JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (_e) {
    return new Response(JSON.stringify({ error: "webhook_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
