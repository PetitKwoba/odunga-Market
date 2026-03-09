import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { products } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `You are a B2B demand forecasting analyst. Analyze the following product sales data and provide demand forecasts.

Products data:
${JSON.stringify(products, null, 2)}

For each product, return a JSON forecast. Use the sales data to predict monthly demand, estimate days until stockout, and provide actionable recommendations.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "forecasts": [
    {
      "product_id": "...",
      "product_name": "...",
      "current_stock": number,
      "avg_monthly_sales": number,
      "predicted_demand": number,
      "confidence": "high" | "medium" | "low",
      "trend": "up" | "down" | "stable",
      "recommendation": "brief actionable recommendation",
      "reorder_point": number,
      "days_until_stockout": number or null
    }
  ]
}

Rules:
- If total_sold is 0, set predicted_demand to a conservative estimate, confidence to "low", trend to "stable"
- days_until_stockout = current_stock / (predicted_demand / 30), null if predicted_demand is 0
- reorder_point should be ~2 weeks of predicted demand
- Keep recommendations under 100 characters`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_forecasts",
              description: "Return demand forecasts for products",
              parameters: {
                type: "object",
                properties: {
                  forecasts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        product_id: { type: "string" },
                        product_name: { type: "string" },
                        current_stock: { type: "number" },
                        avg_monthly_sales: { type: "number" },
                        predicted_demand: { type: "number" },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                        trend: { type: "string", enum: ["up", "down", "stable"] },
                        recommendation: { type: "string" },
                        reorder_point: { type: "number" },
                        days_until_stockout: { type: ["number", "null"] }
                      },
                      required: ["product_id", "product_name", "current_stock", "avg_monthly_sales", "predicted_demand", "confidence", "trend", "recommendation", "reorder_point", "days_until_stockout"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["forecasts"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_forecasts" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    
    // Extract tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const forecasts = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(forecasts), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse from content
    const content = aiData.choices?.[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    throw new Error("Could not parse AI response");
  } catch (e) {
    console.error("Forecast error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
