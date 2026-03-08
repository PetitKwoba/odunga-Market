import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const body = await req.text();

    // Verify webhook signature
    const signature = req.headers.get("x-paystack-signature");
    const hash = createHmac("sha512", PAYSTACK_SECRET_KEY)
      .update(body)
      .digest("hex");

    if (signature !== hash) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event !== "charge.success") {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reference, metadata, amount, currency } = event.data;
    const orderId = metadata?.order_id || reference?.replace("waholo_", "");

    if (!orderId) throw new Error("No order_id in webhook payload");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update order payment status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "Confirmed",
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order:", updateError);
      throw new Error("Failed to update order");
    }

    // Log payment in payouts table for Monday disbursement
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("producer_id, subtotal")
      .eq("order_id", orderId);

    if (orderItems && orderItems.length > 0) {
      // Group by producer
      const producerTotals: Record<string, number> = {};
      for (const item of orderItems) {
        producerTotals[item.producer_id] = (producerTotals[item.producer_id] || 0) + Number(item.subtotal);
      }

      const payoutRecords = Object.entries(producerTotals).map(([producerId, gross]) => ({
        order_id: orderId,
        producer_id: producerId,
        gross_amount: gross,
        platform_fee: gross * 0.05, // 5% platform fee
        net_amount: gross * 0.95,
        status: "pending",
      }));

      await supabase.from("payouts").insert(payoutRecords);
    }

    // Handle referral commissions
    const { data: order } = await supabase
      .from("orders")
      .select("wholesaler_id")
      .eq("id", orderId)
      .single();

    if (order) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("referred_by_user_id")
        .eq("user_id", order.wholesaler_id)
        .single();

      if (profile?.referred_by_user_id && orderItems) {
        // Calculate referral commission (from producer profile settings)
        for (const item of orderItems) {
          const { data: producerProfile } = await supabase
            .from("producer_profiles")
            .select("referral_reward_type, referral_reward_value")
            .eq("user_id", item.producer_id)
            .single();

          if (producerProfile) {
            const commission =
              producerProfile.referral_reward_type === "percentage"
                ? Number(item.subtotal) * (producerProfile.referral_reward_value / 100)
                : producerProfile.referral_reward_value;

            await supabase.from("product_referral_sales").insert({
              referrer_user_id: profile.referred_by_user_id,
              product_id: item.producer_id, // We don't have product_id in order_items grouped, use producer_id
              order_id: orderId,
              quantity: 1,
              subtotal: Number(item.subtotal),
              commission_earned: commission,
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
