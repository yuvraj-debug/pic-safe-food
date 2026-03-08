import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANALYSIS_SYSTEM_PROMPT = `You are a food ingredient safety expert. Analyze food ingredient lists and return a JSON object with this EXACT structure (no markdown, no extra text, ONLY valid JSON):
{
  "safety_score": <number 0-100>,
  "safety_level": "<string like Safe to Consume / Moderately Safe / Unsafe>",
  "product_summary": "<short description of product>",
  "simple_summary": "<2-3 sentence explanation in very simple language that anyone can understand, like explaining to a child>",
  "harmful_ingredients": ["<list of harmful ingredients>"],
  "beneficial_ingredients": ["<list of good ingredients>"],
  "allergens": ["<detected allergens like milk, gluten, soy, nuts, eggs>"],
  "ingredient_explanations": [{"ingredient": "<name>", "use": "<purpose>", "health_impact": "<effect on health>", "risk_level": "<low/medium/high>"}],
  "health_warnings": ["<health warnings>"],
  "recommendation": "<simple advice: safe to eat regularly / eat occasionally / avoid frequently>",
  "overall_verdict": "<one line verdict like: This snack is okay sometimes but not daily>"
}`;

// Try to get a key from DB first, fall back to env
async function getApiKey(keyName: string): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", keyName)
      .maybeSingle();

    if (data?.value) {
      console.log(`Using ${keyName} from database settings`);
      return data.value;
    }
  } catch (e) {
    console.log(`DB lookup for ${keyName} failed, using env:`, e);
  }

  const envVal = Deno.env.get(keyName);
  if (!envVal) throw new Error(`${keyName} is not configured`);
  console.log(`Using ${keyName} from environment`);
  return envVal;
}

async function tryOpenFoodFacts(barcode: string): Promise<string | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const parts: string[] = [];
    if (p.product_name) parts.push(`Product: ${p.product_name}`);
    if (p.brands) parts.push(`Brand: ${p.brands}`);
    if (p.ingredients_text) parts.push(`Ingredients: ${p.ingredients_text}`);
    if (p.allergens_tags?.length) parts.push(`Allergens: ${p.allergens_tags.join(", ")}`);
    if (p.nutriments) {
      const n = p.nutriments;
      const nutrients: string[] = [];
      if (n.sugars_100g !== undefined) nutrients.push(`Sugar: ${n.sugars_100g}g/100g`);
      if (n.fat_100g !== undefined) nutrients.push(`Fat: ${n.fat_100g}g/100g`);
      if (n.salt_100g !== undefined) nutrients.push(`Salt: ${n.salt_100g}g/100g`);
      if (n["energy-kcal_100g"] !== undefined) nutrients.push(`Energy: ${n["energy-kcal_100g"]}kcal/100g`);
      if (nutrients.length) parts.push(`Nutrition: ${nutrients.join(", ")}`);
    }

    return parts.length >= 2 ? parts.join("\n") : null;
  } catch {
    return null;
  }
}

function extractBarcode(text: string): string | null {
  const cleaned = text.replace(/\s+/g, "").trim();
  const match = cleaned.match(/\b(\d{8}|\d{12,13})\b/);
  return match ? match[1] : null;
}

function isInsufficientText(text: string): boolean {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (/^\d{8,13}$/.test(cleaned)) return true;
  if (cleaned.length < 30) return true;
  if (cleaned.toLowerCase().includes("no text found")) return true;
  if (cleaned.toLowerCase().includes("unable to extract")) return true;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { image, ingredients_text } = body;

    if (!image && !ingredients_text) {
      return new Response(JSON.stringify({ error: "No image or ingredients text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let extractedText: string;

    if (ingredients_text) {
      extractedText = ingredients_text;
      console.log("Using provided ingredients text directly");
    } else {
      const LOVABLE_API_KEY = await getApiKey("LOVABLE_API_KEY");

      const ocrResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "You are an OCR specialist. Extract ALL text visible in the image. Focus especially on finding the ingredients list, product name, brand name, nutrition info, and any barcodes. Return ONLY the extracted text, nothing else.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Extract all text from this food product image, especially the ingredients list, product name, brand, and any barcode numbers.",
                  },
                  {
                    type: "image_url",
                    image_url: { url: image },
                  },
                ],
              },
            ],
            temperature: 0.1,
            max_tokens: 1000,
          }),
        }
      );

      if (!ocrResponse.ok) {
        const errText = await ocrResponse.text();
        console.error("OCR error:", ocrResponse.status, errText);
        if (ocrResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`OCR failed: ${ocrResponse.status}`);
      }

      const ocrData = await ocrResponse.json();
      extractedText = ocrData.choices?.[0]?.message?.content || "";
    }

    console.log("Text for analysis:", extractedText.substring(0, 200));

    // If text is insufficient, try barcode lookup via Open Food Facts
    if (isInsufficientText(extractedText)) {
      const barcode = extractBarcode(extractedText);
      if (barcode) {
        console.log("Insufficient text, trying Open Food Facts for barcode:", barcode);
        const offData = await tryOpenFoodFacts(barcode);
        if (offData) {
          console.log("Found product on Open Food Facts:", offData.substring(0, 200));
          extractedText = offData;
        } else {
          console.log("Barcode not found on Open Food Facts, returning unable to fetch");
          return new Response(JSON.stringify({
            unable_to_fetch: true,
            message: "Unable to fetch product details. The barcode was not found in our database. Please try scanning the ingredients list instead."
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        console.log("Insufficient text extracted, no barcode found, returning unable to fetch");
        return new Response(JSON.stringify({
          unable_to_fetch: true,
          message: "Unable to fetch product details. Not enough information could be extracted from the image. Please try taking a clearer photo of the ingredients list."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const GROQ_API_KEY = await getApiKey("GROQ_API_KEY");

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: ANALYSIS_SYSTEM_PROMPT + `\n\nIMPORTANT: Always provide a meaningful analysis. If you can identify the product (by name, brand, or barcode), use your knowledge of its typical ingredients. Never return a generic "lack of information" response — always score the product to the best of your ability.`
          },
          {
            role: "user",
            content: `Analyze this food product and return ONLY valid JSON:\n\n${extractedText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq error:", groqResponse.status, errText);
      if (groqResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Groq analysis failed: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content;
    console.log("Groq response:", content);

    if (!content) {
      throw new Error("No analysis returned from Groq");
    }

    let result;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Content:", content);
      throw new Error("Failed to parse analysis result");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-food error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
