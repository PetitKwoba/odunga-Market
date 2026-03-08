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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: string[] = [];

    // 1. Create admin user
    const adminEmail = "admin@waholo.market";
    const adminPassword = "Admin@Waholo2024!";

    const { data: existingAdmin } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", adminEmail)
      .maybeSingle();

    let adminId: string;
    if (existingAdmin) {
      adminId = existingAdmin.user_id;
      results.push("Admin already exists");
    } else {
      const { data: adminAuth, error: adminError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { name: "Waholo Admin", role: "admin", country: "Kenya" },
      });
      if (adminError) throw new Error("Admin creation failed: " + adminError.message);
      adminId = adminAuth.user!.id;
      results.push(`Admin created: ${adminEmail} / ${adminPassword}`);
    }

    // 2. Create sample producer
    const producerEmail = "producer@waholo.market";
    const producerPassword = "Producer@2024!";

    const { data: existingProducer } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", producerEmail)
      .maybeSingle();

    let producerId: string;
    if (existingProducer) {
      producerId = existingProducer.user_id;
      results.push("Producer already exists");
    } else {
      const { data: prodAuth, error: prodError } = await supabase.auth.admin.createUser({
        email: producerEmail,
        password: producerPassword,
        email_confirm: true,
        user_metadata: {
          name: "Kenya Fresh Farms",
          role: "producer",
          country: "Kenya",
          business_name: "Kenya Fresh Farms Ltd",
        },
      });
      if (prodError) throw new Error("Producer creation failed: " + prodError.message);
      producerId = prodAuth.user!.id;

      // Approve the producer
      await supabase
        .from("profiles")
        .update({ is_approved: true, is_verified: true })
        .eq("user_id", producerId);

      // Update producer profile
      await supabase
        .from("producer_profiles")
        .update({
          categories: ["Fresh Produce", "Beverages"],
          shipping_regions: ["Kenya", "Uganda", "Tanzania", "Rwanda"],
          referral_reward_type: "percentage",
          referral_reward_value: 5,
        })
        .eq("user_id", producerId);

      results.push(`Producer created & approved: ${producerEmail} / ${producerPassword}`);
    }

    // 3. Create sample wholesaler
    const wholesalerEmail = "wholesaler@waholo.market";
    const wholesalerPassword = "Wholesaler@2024!";

    const { data: existingWholesaler } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", wholesalerEmail)
      .maybeSingle();

    if (!existingWholesaler) {
      const { data: wsAuth, error: wsError } = await supabase.auth.admin.createUser({
        email: wholesalerEmail,
        password: wholesalerPassword,
        email_confirm: true,
        user_metadata: {
          name: "Nairobi Wholesale Co",
          role: "wholesaler",
          country: "Kenya",
          business_name: "Nairobi Wholesale Co",
        },
      });
      if (wsError) throw new Error("Wholesaler creation failed: " + wsError.message);

      await supabase
        .from("profiles")
        .update({ is_approved: true, is_verified: true })
        .eq("user_id", wsAuth.user!.id);

      results.push(`Wholesaler created & approved: ${wholesalerEmail} / ${wholesalerPassword}`);
    } else {
      results.push("Wholesaler already exists");
    }

    // 4. Create sample products
    const { data: existingProducts } = await supabase
      .from("products")
      .select("id")
      .eq("producer_id", producerId)
      .limit(1);

    if (!existingProducts || existingProducts.length === 0) {
      const products = [
        {
          producer_id: producerId,
          name: "Premium Kenyan AA Coffee Beans",
          description: "High-altitude Arabica coffee beans from Mt. Kenya region. Rich, full-bodied flavor with notes of citrus and dark chocolate. Perfect for specialty roasters and cafés.",
          category: "Beverages",
          base_price: 12.50,
          moq: 50,
          stock_quantity: 5000,
          lead_time_days: 5,
          bulk_pricing: [
            { min_qty: 50, max_qty: 199, price: 12.50 },
            { min_qty: 200, max_qty: 499, price: 11.00 },
            { min_qty: 500, max_qty: null, price: 9.50 },
          ],
          images: ["https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600"],
          is_active: true,
        },
        {
          producer_id: producerId,
          name: "Organic Macadamia Nuts (Raw)",
          description: "Sustainably grown macadamia nuts from Thika. Grade A, hand-sorted. Ideal for snack brands, bakeries, and health food distributors.",
          category: "Fresh Produce",
          base_price: 18.00,
          moq: 25,
          stock_quantity: 2000,
          lead_time_days: 3,
          bulk_pricing: [
            { min_qty: 25, max_qty: 99, price: 18.00 },
            { min_qty: 100, max_qty: 249, price: 16.00 },
            { min_qty: 250, max_qty: null, price: 14.50 },
          ],
          images: ["https://images.unsplash.com/photo-1604871000636-074fa5117945?w=600"],
          is_active: true,
        },
        {
          producer_id: producerId,
          name: "Cold-Pressed Avocado Oil (1L)",
          description: "Pure cold-pressed Hass avocado oil from Murang'a County. Food-grade, unrefined. Great for cooking brands and cosmetic manufacturers.",
          category: "Fresh Produce",
          base_price: 8.50,
          moq: 100,
          stock_quantity: 3000,
          lead_time_days: 7,
          bulk_pricing: [
            { min_qty: 100, max_qty: 299, price: 8.50 },
            { min_qty: 300, max_qty: 999, price: 7.50 },
            { min_qty: 1000, max_qty: null, price: 6.80 },
          ],
          images: ["https://images.unsplash.com/photo-1611575648780-498f7dbd840e?w=600"],
          is_active: true,
        },
        {
          producer_id: producerId,
          name: "Dried Hibiscus Flowers (Roselle)",
          description: "Sun-dried hibiscus petals from Coastal Kenya. Perfect for beverage companies making hibiscus tea, juice concentrates, and health drinks.",
          category: "Beverages",
          base_price: 6.00,
          moq: 50,
          stock_quantity: 8000,
          lead_time_days: 4,
          bulk_pricing: [
            { min_qty: 50, max_qty: 199, price: 6.00 },
            { min_qty: 200, max_qty: 499, price: 5.20 },
            { min_qty: 500, max_qty: null, price: 4.50 },
          ],
          images: ["https://images.unsplash.com/photo-1597481499750-3bc118f34e67?w=600"],
          is_active: true,
        },
      ];

      const { error: prodInsertError } = await supabase.from("products").insert(products);
      if (prodInsertError) throw new Error("Products insert failed: " + prodInsertError.message);
      results.push(`4 sample products created for Kenya Fresh Farms`);
    } else {
      results.push("Products already exist for this producer");
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
