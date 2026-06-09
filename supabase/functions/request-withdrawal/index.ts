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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimErr } = await userClient.auth.getClaims(token);
    if (claimErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const userType: "producer" | "referrer" = body.user_type;
    if (!["producer", "referrer"].includes(userType)) {
      return new Response(JSON.stringify({ error: "Invalid user_type" }), { status: 400, headers: corsHeaders });
    }

    const balanceTable = userType === "producer" ? "wallet_balances" : "referrer_wallet_balances";
    const balanceKey = userType === "producer" ? "producer_id" : "referrer_id";
    const txTable = userType === "producer" ? "wallet_transactions" : "referrer_wallet_transactions";
    const minKey = userType === "producer" ? "producer_min_withdrawal" : "referrer_min_withdrawal";

    const { data: minRow } = await supabase.from("platform_settings").select("value").eq("key", minKey).maybeSingle();
    const MIN = Number(minRow?.value ?? (userType === "producer" ? 1000 : 500));

    const { data: wallet } = await supabase.from(balanceTable).select("*").eq(balanceKey, userId).maybeSingle();
    if (!wallet) return new Response(JSON.stringify({ error: "No wallet found" }), { status: 400, headers: corsHeaders });

    const available = Number(wallet.available_balance || 0);
    const amount = Number(body.amount || available);
    if (amount < MIN) {
      return new Response(JSON.stringify({ error: `Minimum withdrawal is ${MIN} ${wallet.currency}` }), { status: 400, headers: corsHeaders });
    }
    if (amount > available) {
      return new Response(JSON.stringify({ error: "Insufficient available balance" }), { status: 400, headers: corsHeaders });
    }

    const { data: bank } = await supabase.from("producer_bank_accounts")
      .select("id, paystack_recipient_code")
      .eq("producer_id", userId).eq("is_verified", true).maybeSingle();
    if (!bank?.paystack_recipient_code) {
      return new Response(JSON.stringify({ error: "No verified bank account on file" }), { status: 400, headers: corsHeaders });
    }

    // Create withdrawal request row
    const { data: wr, error: wrErr } = await supabase.from("withdrawal_requests").insert({
      user_id: userId, user_type: userType, amount, currency: wallet.currency,
      bank_account_id: bank.id, status: "processing",
    }).select().single();
    if (wrErr) throw wrErr;

    // Debit available immediately
    await supabase.from(balanceTable).update({
      available_balance: available - amount,
    }).eq(balanceKey, userId);

    await supabase.from(txTable).insert({
      [balanceKey]: userId, type: "debit_withdrawal", amount: -amount,
      withdrawal_id: wr.id, description: `Withdrawal request ${wr.id}`,
      balance_after: available - amount,
    });

    // Fire Paystack transfer
    const reference = `wd_${wr.id.slice(0, 12)}`;
    const tr = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "balance", amount: Math.round(amount * 100),
        recipient: bank.paystack_recipient_code,
        reason: `OdungaMarket ${userType} withdrawal`,
        reference, currency: wallet.currency || "KES",
      }),
    });
    const trData = await tr.json();
    if (!tr.ok || !trData.status) {
      // Refund the balance
      await supabase.from(balanceTable).update({ available_balance: available }).eq(balanceKey, userId);
      await supabase.from("withdrawal_requests").update({
        status: "failed", failure_reason: trData.message || "transfer_failed", processed_at: new Date().toISOString(),
      }).eq("id", wr.id);
      return new Response(JSON.stringify({ error: trData.message || "Transfer failed" }), { status: 502, headers: corsHeaders });
    }

    await supabase.from("withdrawal_requests").update({
      paystack_transfer_code: trData.data.transfer_code,
      paystack_reference: reference,
    }).eq("id", wr.id);

    return new Response(JSON.stringify({ ok: true, withdrawal_id: wr.id, amount, reference }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
