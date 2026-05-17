import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optionally authenticate the request — guests can also initialize payments
    let authedUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) authedUserId = user.id;
    }

    const { order_id, callback_url, guest_email } = await req.json();
    if (!order_id || !callback_url) throw new Error("order_id and callback_url required");

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) throw new Error("Order not found");
    if (order.payment_status === "paid") throw new Error("Order already paid");

    // Authorize: order must belong to the auth'd user, or be a guest order
    if (order.wholesaler_id) {
      if (order.wholesaler_id !== authedUserId) throw new Error("Unauthorized");
    } else {
      // Guest order — require matching email
      if (!guest_email || guest_email.trim().toLowerCase() !== (order.guest_email || "").toLowerCase()) {
        throw new Error("Unauthorized");
      }
    }

    // Resolve buyer email/name for Paystack
    let buyerEmail = order.guest_email || guest_email;
    let buyerName = order.guest_name || "Guest";
    if (order.wholesaler_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, name")
        .eq("user_id", order.wholesaler_id)
        .single();
      buyerEmail = profile?.email || buyerEmail;
      buyerName = profile?.name || buyerName;
    }
    if (!buyerEmail) throw new Error("No email found for order");

    // Initialize Paystack transaction
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: buyerEmail,
        amount: Math.round(order.total_amount * 100),
        currency: "KES",
        reference: `odunga_${order_id}`,
        callback_url,
        metadata: {
          order_id,
          wholesaler_id: order.wholesaler_id,
          is_guest: !order.wholesaler_id,
          custom_fields: [
            { display_name: "Order ID", variable_name: "order_id", value: order_id },
            { display_name: "Customer", variable_name: "customer_name", value: buyerName },
          ],
        },
        channels: ["card", "bank", "mobile_money", "bank_transfer"],
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      throw new Error(`Paystack error: ${paystackData.message || "Unknown error"}`);
    }

    await supabase
      .from("orders")
      .update({ payment_status: "pending", payment_reference: paystackData.data.reference })
      .eq("id", order_id);

    return new Response(
      JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
