import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature, x-internal-retry",
};

async function alertAdmins(supabase: any, subject: string, message: string) {
  const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  for (const a of admins ?? []) {
    await supabase.functions.invoke("send-notification", { body: {
      event_type: "admin_alert", user_id: a.user_id, metadata: { subject, message },
    }}).catch(() => {});
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let event: any = null;
  let rawBody = "";
  const isRetry = req.headers.get("x-internal-retry") === "true";

  try {
    rawBody = await req.text();

    if (!isRetry) {
      const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
      const sig = req.headers.get("x-paystack-signature");
      const hash = createHmac("sha512", PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
      if (sig !== hash) return new Response("Invalid signature", { status: 401 });
      event = JSON.parse(rawBody);
    } else {
      event = JSON.parse(rawBody);
    }

    const code = event?.data?.transfer_code;
    const reference = event?.data?.reference;
    if (!code) return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });

    let status = "processing";
    if (event.event === "transfer.success") status = "paid";
    else if (event.event === "transfer.failed") status = "failed";
    else if (event.event === "transfer.reversed") status = "reversed";

    // --- 1) Update batched payouts row ---
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
      await alertAdmins(supabase,
        `Payout ${status}: ${reference || code}`,
        `Producer ${payout.producer_id} payout of ${amount} ${status}. Reason: ${event?.data?.reason || status}`);
    }

    // --- 2) Update withdrawal_requests ---
    const { data: wr } = await supabase.from("withdrawal_requests").update({
      status,
      processed_at: ["paid", "failed", "reversed"].includes(status) ? new Date().toISOString() : null,
      failure_reason: status === "failed" ? (event?.data?.reason ?? "failed") : null,
    }).eq("paystack_transfer_code", code).select().maybeSingle();

    if (wr) {
      const batchName = (payout as any)?.batch_id
        ? `Batch ${(payout as any).batch_id.slice(0, 8)}`
        : "On-demand withdrawal";

      if (status === "paid") {
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
          metadata: {
            amount: Number(wr.amount), currency: wr.currency,
            reference: wr.paystack_reference,
            paystack_reference: reference || wr.paystack_reference,
            batch_name: batchName,
            transfer_code: code,
          },
        }}).catch(() => {});
      } else if (status === "failed" || status === "reversed") {
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
          metadata: {
            amount: Number(wr.amount), currency: wr.currency,
            reason: event?.data?.reason || status,
            reference: wr.paystack_reference,
            batch_name: batchName,
          },
        }}).catch(() => {});
        await alertAdmins(supabase,
          `Withdrawal ${status}: ${wr.paystack_reference || code}`,
          `${wr.user_type} ${wr.user_id} withdrawal ${wr.amount} ${wr.currency} ${status}. Reason: ${event?.data?.reason || status}`);
      }
    }

    if (!payout && !wr) {
      // No matching record — log so admin can investigate
      await supabase.from("webhook_failures").insert({
        source: "paystack-transfer", event_type: event.event,
        reference: reference || code, payload: event,
        error_message: "No matching payout or withdrawal_request found",
        status: "pending",
      });
      await alertAdmins(supabase,
        `Orphan Paystack webhook: ${reference || code}`,
        `Received ${event.event} for transfer_code=${code} but no matching record. Logged for retry.`);
    }

    return new Response(JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("paystack-transfer-webhook error:", e);
    try {
      await supabase.from("webhook_failures").insert({
        source: "paystack-transfer",
        event_type: event?.event || "unknown",
        reference: event?.data?.reference || event?.data?.transfer_code || null,
        payload: event || { raw: rawBody.slice(0, 4000) },
        error_message: e?.message || "processing_error",
        status: "pending",
      });
      await alertAdmins(supabase,
        `Paystack webhook failed`,
        `Event ${event?.event || 'unknown'} failed to process: ${e?.message}. Logged for retry.`);
    } catch (_) { /* swallow */ }

    return new Response(JSON.stringify({ error: "webhook_error", logged: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
