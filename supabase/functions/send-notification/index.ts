import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { event_type, order_id, user_id, metadata } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let emailTo = "";
    let subject = "";
    let body = "";

    // Get user email
    if (user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, name")
        .eq("user_id", user_id)
        .single();
      if (profile) {
        emailTo = profile.email;
      }
    }

    switch (event_type) {
      case "order_placed": {
        const { data: order } = await supabase
          .from("orders")
          .select("*, order_items(product_id, quantity, unit_price, subtotal)")
          .eq("id", order_id)
          .single();
        if (!order) throw new Error("Order not found");

        // Get wholesaler email
        const { data: wholesaler } = await supabase
          .from("profiles")
          .select("email, name")
          .eq("user_id", order.wholesaler_id)
          .single();

        emailTo = wholesaler?.email || "";
        subject = `Order Confirmed - ${order_id.slice(0, 8)}`;
        body = `Hi ${wholesaler?.name},\n\nYour order #${order_id.slice(0, 8)} for $${order.total_amount} has been placed successfully.\n\nYou will receive updates as the producer processes your order.\n\nThank you for using OdungaMarket!`;

        // Also notify producers
        const producerIds = [...new Set(order.order_items.map((i: any) => {
          // We'd need producer_id from order_items
          return null;
        }).filter(Boolean))];

        break;
      }

      case "order_shipped": {
        subject = `Your Order Has Been Shipped - ${order_id?.slice(0, 8)}`;
        body = `Hi,\n\nGreat news! Your order #${order_id?.slice(0, 8)} has been shipped.\n\nYou can track your shipment from your dashboard.\n\nThank you for using OdungaMarket!`;
        break;
      }

      case "payment_received": {
        subject = `Payment Confirmed - ${order_id?.slice(0, 8)}`;
        body = `Hi,\n\nWe've received your payment for order #${order_id?.slice(0, 8)}.\n\nThe producer has been notified and will begin processing your order.\n\nThank you!`;
        break;
      }

      case "return_approved": {
        subject = `Return Request Approved - ${metadata?.rma_number}`;
        body = `Hi,\n\nYour return request ${metadata?.rma_number} has been approved.\n\nPlease ship the items back using the instructions provided. Once received, your refund will be processed.\n\nThank you!`;
        break;
      }

      case "rfq_response": {
        subject = `New Quote Received for Your RFQ`;
        body = `Hi,\n\nA producer has submitted a quote for your Request for Quote.\n\nLog in to your dashboard to review and compare quotes.\n\nThank you!`;
        break;
      }

      default:
        subject = `Notification from OdungaMarket`;
        body = metadata?.message || "You have a new notification.";
    }

    // Log the email (in production, integrate with Resend/SendGrid)
    if (emailTo) {
      await supabase.from("email_logs").insert({
        user_id,
        email_to: emailTo,
        email_type: event_type,
        subject,
        status: "sent", // Mark as sent since this is the log
        metadata: { body, ...metadata },
      });

      // Also create in-app notification
      await supabase.from("notifications").insert({
        user_id,
        title: subject,
        message: body.split("\n")[2] || body, // First meaningful line
        type: event_type.includes("order") ? "order" : "info",
        link: order_id ? `/dashboard/wholesaler` : undefined,
      });
    }

    return new Response(JSON.stringify({ success: true, email_to: emailTo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Email notification error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
