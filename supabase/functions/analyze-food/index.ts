import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    let extractedText: string;

    if (ingredients_text) {
      // Direct text input — skip OCR
      extractedText = ingredients_text;
      console.log("Using provided ingredients text directly");
    } else {
      // Image input — run OCR
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

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
                  "You are an OCR specialist. Extract ALL text visible in the image. Focus especially on finding the ingredients list. Return ONLY the extracted text, nothing else.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Extract all text from this food product image, especially the ingredients list.",
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
      extractedText = ocrData.choices?.[0]?.message?.content || "No text found";
    }

    console.log("Text for analysis:", extractedText.substring(0, 200));

    // Analyze ingredients using Groq
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
            content: `You are a food ingredient safety expert. Analyze food ingredient lists and return a JSON object with this EXACT structure (no markdown, no extra text, ONLY valid JSON):
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
}`
          },
          {
            role: "user",
            content: `Analyze these food product ingredients and return ONLY valid JSON:\n\n${extractedText}`
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
