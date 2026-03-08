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

    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { order_id, callback_url } = await req.json();
    if (!order_id || !callback_url) throw new Error("order_id and callback_url required");

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .eq("wholesaler_id", user.id)
      .single();

    if (orderError || !order) throw new Error("Order not found");
    if (order.payment_status === "paid") throw new Error("Order already paid");

    // Fetch user profile for email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name, phone")
      .eq("user_id", user.id)
      .single();

    // Initialize Paystack transaction (amount in kobo/cents — Paystack uses smallest currency unit)
    // For KES, amount is in cents
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: profile?.email || user.email,
        amount: Math.round(order.total_amount * 100), // Convert to cents
        currency: "KES",
        reference: `waholo_${order_id}`,
        callback_url,
        metadata: {
          order_id,
          wholesaler_id: user.id,
          custom_fields: [
            { display_name: "Order ID", variable_name: "order_id", value: order_id },
            { display_name: "Customer", variable_name: "customer_name", value: profile?.name || "N/A" },
          ],
        },
        channels: ["card", "bank", "mobile_money", "bank_transfer"],
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      throw new Error(`Paystack error: ${paystackData.message || "Unknown error"}`);
    }

    // Save reference on order
    await supabase
      .from("orders")
      .update({ payment_status: "pending" })
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
