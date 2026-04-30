// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Deno remote import is provided by Supabase function runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

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

type AnalysisResult = {
  safety_score: number;
  safety_level: string;
  product_summary: string;
  simple_summary: string;
  harmful_ingredients: string[];
  beneficial_ingredients: string[];
  allergens: string[];
  ingredient_explanations: Array<{
    ingredient: string;
    use: string;
    health_impact: string;
    risk_level?: "low" | "medium" | "high";
  }>;
  health_warnings: string[];
  recommendation: string;
  overall_verdict: string;
};

type NvidiaChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
    };
  }>;
};

// Normalize base64 input to valid Data URI
function normalizeBase64(input: string): string | null {
  if (!input || typeof input !== "string") return null;

  // Already has data URI prefix
  if (input.startsWith("data:image")) return input;

  // Raw base64 - add PNG prefix (most common)
  return `data:image/png;base64,${input}`;
}

function normalizeBarcode(input: unknown): string | null {
  if (typeof input !== "string" && typeof input !== "number") return null;
  const barcode = String(input).replace(/\D/g, "").trim();
  return /^\d{8,14}$/.test(barcode) ? barcode : null;
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") return JSON.stringify(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

function parseField(text: string, field: string): string {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.match(new RegExp(`^${escaped}:\\s*(.+)$`, "im"))?.[1]?.trim() || "";
}

function getDisplayName(text: string): string {
  const productName = parseField(text, "Product");
  const brandName = parseField(text, "Brand");
  return [brandName, productName]
    .filter(Boolean)
    .filter((item, index, items) => items.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index)
    .join(" ")
    .trim();
}

function getIngredientText(text: string): string {
  return parseField(text, "Ingredients") || text;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json/gi, "```").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth++;
    if (char === "}") depth--;
    if (depth === 0) {
      try {
        const parsed = JSON.parse(cleaned.slice(start, i + 1));
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
  }

  return null;
}

function normalizeRiskLevel(value: unknown): "low" | "medium" | "high" | undefined {
  const normalized = asString(value).toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") return normalized;
  return undefined;
}

function safetyLevelForScore(score: number, providedLevel = ""): string {
  const normalized = providedLevel.toLowerCase();
  if (score <= 30) {
    if (normalized.includes("avoid") || normalized.includes("unsafe") || normalized.includes("caution") || normalized.includes("limit")) {
      return providedLevel;
    }
    return "Limit or Avoid";
  }
  if (score <= 50) {
    if (normalized.includes("caution") || normalized.includes("moderate") || normalized.includes("limit")) return providedLevel;
    return "Use with Caution";
  }
  if (score <= 70) {
    if (normalized.includes("moderate") || normalized.includes("caution")) return providedLevel;
    return "Moderately Safe";
  }
  return providedLevel || "Generally Safe";
}

function normalizeAnalysisResult(input: Record<string, unknown>, sourceText: string): AnalysisResult {
  const fallback = generateFallbackAnalysis(sourceText);
  const score = Math.max(0, Math.min(100, Math.round(asNumber(input.safety_score, fallback.safety_score))));
  const providedSafetyLevel = asString(input.safety_level, fallback.safety_level);
  const ingredientExplanations = Array.isArray(input.ingredient_explanations)
    ? input.ingredient_explanations
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .map((item) => ({
          ingredient: asString(item.ingredient, "Ingredient"),
          use: asString(item.use, "Used in the product recipe"),
          health_impact: asString(item.health_impact, "Review this ingredient in the full label context"),
          risk_level: normalizeRiskLevel(item.risk_level),
        }))
    : fallback.ingredient_explanations;

  return {
    safety_score: score,
    safety_level: safetyLevelForScore(score, providedSafetyLevel),
    product_summary: asString(input.product_summary, fallback.product_summary),
    simple_summary: asString(input.simple_summary, fallback.simple_summary),
    harmful_ingredients: asStringArray(input.harmful_ingredients).length ? asStringArray(input.harmful_ingredients) : fallback.harmful_ingredients,
    beneficial_ingredients: asStringArray(input.beneficial_ingredients),
    allergens: asStringArray(input.allergens).length ? asStringArray(input.allergens) : fallback.allergens,
    ingredient_explanations: ingredientExplanations,
    health_warnings: asStringArray(input.health_warnings).length ? asStringArray(input.health_warnings) : fallback.health_warnings,
    recommendation: asString(input.recommendation, fallback.recommendation),
    overall_verdict: asString(input.overall_verdict, fallback.overall_verdict),
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readNvidiaStream(response: Response, timeoutMs: number): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const deadline = Date.now() + timeoutMs;
  let buffer = "";
  let output = "";

  try {
    while (Date.now() < deadline) {
      const remaining = deadline - Date.now();
      const readResult = await Promise.race([
        reader.read(),
        new Promise<ReadableStreamReadResult<Uint8Array>>((resolve) => {
          setTimeout(() => resolve({ done: true, value: undefined }), Math.max(1, remaining));
        }),
      ]);

      const { value, done } = readResult;
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta;
        const content = typeof delta?.content === "string" ? delta.content : "";
        const reasoning = typeof delta?.reasoning_content === "string" ? delta.reasoning_content : "";
        output += content || reasoning;

        if (extractJsonObject(output)) {
          await reader.cancel();
          return output.trim();
        }
      } catch (e) {
        console.error("Failed to parse NVIDIA stream chunk:", e);
      }
    }
  }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Ignore cancel errors after the stream has already closed.
    }
  }

  return output.trim();
}

// Perform OCR using OCR.space API
async function performOCR(imageBase64: string): Promise<string> {
  const OCR_API_KEY = Deno.env.get("OCR_API_KEY");
  if (!OCR_API_KEY) {
    throw new Error("OCR_API_KEY is not configured");
  }

  console.log("Performing OCR with OCR.space...");

  // Normalize base64 to valid Data URI
  const cleanBase64 = normalizeBase64(imageBase64);
  if (!cleanBase64) {
    throw new Error("Invalid image input");
  }

  console.log("Base64 preview:", cleanBase64.slice(0, 50));

  const formData = new FormData();
  formData.append("base64Image", cleanBase64);
  formData.append("apikey", OCR_API_KEY);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");

  const response = await fetchWithTimeout("https://api.ocr.space/parse/image", {
    method: "POST",
    body: formData,
  }, 30000);

  if (!response.ok) {
    const errText = await response.text();
    console.error("OCR.space error:", response.status, errText);
    if (response.status === 403 || /api key is invalid/i.test(errText)) {
      throw new Error("OCR.space rejected OCR_API_KEY. Set a valid OCR_API_KEY Supabase secret and redeploy the function.");
    }
    throw new Error(`OCR failed: ${response.status}`);
  }

  const data = await response.json();
  console.log("OCR.space response:", JSON.stringify(data).slice(0, 500));

  // Validate OCR response
  if (!data || data.IsErroredOnProcessing || !data.ParsedResults?.[0]?.ParsedText) {
    const errorMsg = data?.ErrorMessage?.[0] || "No text extracted from image";
    throw new Error(`OCR processing failed: ${errorMsg}`);
  }

  const extractedText = data.ParsedResults[0].ParsedText.trim();

  if (extractedText.length === 0) {
    throw new Error("No text extracted from image");
  }

  console.log("OCR extracted text:", extractedText.substring(0, 200));
  return extractedText;
}

async function tryOpenFoodFacts(barcode: string): Promise<string | null> {
  try {
    console.log("Looking up barcode on Open Food Facts:", barcode);
    const res = await fetchWithTimeout(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      method: "GET",
    }, 12000);
    console.log("Open Food Facts response status:", res.status);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const parts: string[] = [];
    parts.push(`Barcode: ${barcode}`);
    if (p.product_name) parts.push(`Product: ${p.product_name}`);
    if (p.brands) parts.push(`Brand: ${p.brands}`);
    const ingredientsText = p.ingredients_text_en || p.ingredients_text;
    if (ingredientsText) parts.push(`Ingredients: ${ingredientsText}`);
    if (p.allergens_tags?.length) parts.push(`Allergens: ${p.allergens_tags.join(", ")}`);
    if (p.additives_tags?.length) parts.push(`Additives: ${p.additives_tags.join(", ")}`);
    if (p.categories) parts.push(`Categories: ${p.categories}`);
    if (p.nutriscore_grade) parts.push(`Nutri-Score: ${String(p.nutriscore_grade).toUpperCase()}`);
    if (p.nutriments) {
      const n = p.nutriments;
      const nutrients: string[] = [];
      if (n.sugars_100g !== undefined) nutrients.push(`Sugar: ${n.sugars_100g}g/100g`);
      if (n.fat_100g !== undefined) nutrients.push(`Fat: ${n.fat_100g}g/100g`);
      if (n["saturated-fat_100g"] !== undefined) nutrients.push(`Saturated fat: ${n["saturated-fat_100g"]}g/100g`);
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

// Generate fallback analysis when AI fails
function generateFallbackAnalysis(text: string): AnalysisResult {
  const words = text.split(/\s+/).length;
  const lowerText = text.toLowerCase();
  const ingredients = getIngredientText(text);
  const lowerIngredients = ingredients.toLowerCase();
  const displayName = getDisplayName(text);
  const sugar = asNumber(text.match(/Sugar:\s*([\d.]+)g\/100g/i)?.[1]);
  const fat = asNumber(text.match(/^Fat:\s*([\d.]+)g\/100g/im)?.[1]);
  const saturatedFat = asNumber(text.match(/Saturated fat:\s*([\d.]+)g\/100g/i)?.[1]);
  const salt = asNumber(text.match(/Salt:\s*([\d.]+)g\/100g/i)?.[1]);

  const signals = [
    {
      re: /palmolein|palm oil|hydrogenated|shortening/i,
      ingredient: "Refined palm-based oil",
      warning: "Refined palm oil or palmolein can make the snack high in less healthy fats.",
      score: 15,
      risk: "medium" as const,
    },
    {
      re: /flavour enhancer|flavor enhancer|monosodium glutamate|\bmsg\b|ins\s*621|e621|ins\s*627|e627|ins\s*631|e631|ins\s*635|e635/i,
      ingredient: "Flavour enhancers",
      warning: "Flavour enhancers are common in ultra-processed snacks and may bother sensitive people.",
      score: 12,
      risk: "medium" as const,
    },
    {
      re: /artificial colour|artificial color|colour\s*\(|color\s*\(|tartrazine|sunset yellow|ins\s*102|e102|ins\s*110|e110|ins\s*124|e124/i,
      ingredient: "Added colours",
      warning: "Added colours are not nutritionally useful and can be an issue for sensitive children.",
      score: 10,
      risk: "medium" as const,
    },
    {
      re: /refined wheat|maida|wheat flour|rice meal|corn meal|starch/i,
      ingredient: "Refined cereal base",
      warning: "Refined cereal ingredients digest quickly and do not add much fibre.",
      score: 8,
      risk: "low" as const,
    },
    {
      re: /sugar|glucose|maltodextrin|dextrose/i,
      ingredient: "Added sugar or fast carbohydrates",
      warning: "Added sugar or fast carbohydrates can raise the glycemic load.",
      score: 8,
      risk: "medium" as const,
    },
    {
      re: /preservative|sodium benzoate|potassium sorbate|bha|bht|tbhq|ins\s*319|e319|ins\s*320|e320|ins\s*321|e321/i,
      ingredient: "Preservatives or antioxidants",
      warning: "Preservatives are usually permitted but are another ultra-processed food marker.",
      score: 8,
      risk: "low" as const,
    },
  ].filter((signal) => signal.re.test(text));

  const harmful = signals.map((signal) => signal.ingredient);
  const warnings = signals.map((signal) => signal.warning);
  const ingredientExplanations = signals.map((signal) => ({
    ingredient: signal.ingredient,
    use: "Used for taste, texture, shelf life, or processing",
    health_impact: signal.warning,
    risk_level: signal.risk,
  }));

  const allergens = [
    /milk|dairy|cheese|casein|whey/i.test(text) ? "Milk/dairy" : "",
    /gluten|wheat|maida/i.test(text) ? "Wheat/gluten" : "",
    /soy|soya|lecithin/i.test(text) ? "Soy" : "",
    /peanut|groundnut/i.test(text) ? "Peanut" : "",
    /tree nut|almond|cashew|hazelnut/i.test(text) ? "Tree nuts" : "",
  ].filter(Boolean);

  if (sugar >= 10) {
    harmful.push("High sugar");
    warnings.push(`Sugar is ${sugar}g per 100g, which is high for frequent snacking.`);
  }
  if (saturatedFat >= 5) {
    harmful.push("High saturated fat");
    warnings.push(`Saturated fat is ${saturatedFat}g per 100g, so keep portions small.`);
  } else if (fat >= 20) {
    harmful.push("High fat");
    warnings.push(`Total fat is ${fat}g per 100g, which makes this a calorie-dense snack.`);
  }
  if (salt >= 1) {
    harmful.push("High salt");
    warnings.push(`Salt is ${salt}g per 100g, which can add up quickly.`);
  }

  let safetyScore = 70;
  safetyScore -= signals.reduce((sum, signal) => sum + signal.score, 0);
  if (sugar >= 10) safetyScore -= 10;
  if (fat >= 20) safetyScore -= 8;
  if (saturatedFat >= 5) safetyScore -= 12;
  if (salt >= 1) safetyScore -= 10;
  if (/fried|snack|chips|namkeen|extruded|seasoning/i.test(lowerText)) safetyScore -= 8;

  if (words < 20) {
    safetyScore = 50;
  }

  safetyScore = Math.max(15, Math.min(90, Math.round(safetyScore)));
  const safetyLevel =
    safetyScore >= 75 ? "Generally Safe" :
    safetyScore >= 55 ? "Moderately Safe" :
    safetyScore >= 35 ? "Use with Caution" :
    "Limit or Avoid";

  const isProcessedSnack = /snack|chips|namkeen|extruded|seasoning|palmolein|flavour enhancer|flavor enhancer/i.test(lowerText);
  const summaryName = displayName || "This product";
  const simpleSummary = isProcessedSnack
    ? `${summaryName} looks like a processed packaged snack. It is okay occasionally, but it is not a good daily choice because of refined ingredients, oil, seasoning additives, and possible salt/fat load.`
    : `${summaryName} has been reviewed from the available label data. Use the score as guidance and still check the pack for serving size and allergens.`;

  return {
    safety_score: safetyScore,
    safety_level: safetyLevel,
    product_summary: displayName ? `${displayName} ingredient analysis` : "Food product ingredient analysis",
    simple_summary: simpleSummary,
    harmful_ingredients: [...new Set(harmful)].slice(0, 8),
    beneficial_ingredients: /spices|condiments|rice|corn|cereal/i.test(lowerIngredients) ? ["Contains cereal ingredients and spices"] : [],
    allergens: [...new Set(allergens)],
    ingredient_explanations: ingredientExplanations.slice(0, 8),
    health_warnings: [...new Set(warnings)].slice(0, 8),
    recommendation: safetyScore >= 55 ? "Eat occasionally and keep portions moderate." : "Limit this product; choose less processed snacks more often.",
    overall_verdict: safetyScore >= 55
      ? "Acceptable once in a while, but not ideal as a daily snack."
      : "Better as an occasional treat, not a regular snack."
  };
}

async function callAIAnalysis(extractedText: string, apiKey: string): Promise<AnalysisResult | null> {
  const configuredModel = Deno.env.get("AI_ANALYSIS_MODEL")?.trim();
  const models = [
    configuredModel,
    "stepfun-ai/step-3.5-flash",
    "meta/llama-3.1-8b-instruct",
    "qwen/qwen2.5-coder-32b-instruct",
    "google/gemma-2-2b-it",
    "openai/gpt-oss-20b",
  ].filter((model, index, arr): model is string => Boolean(model) && arr.indexOf(model) === index);

  const compactPrompt = `${ANALYSIS_SYSTEM_PROMPT}

Rules:
- Return the JSON object only.
- safety_score must be 0-100 where 100 is healthiest/safest.
- Penalize ultra-processed snacks, refined oils, high salt/sugar/fat, artificial colours, preservatives, and flavour enhancers.
- Use the exact product, ingredient, allergen, additive, and nutrition data below. Do not invent unrelated ingredients.

Product data:
${extractedText.slice(0, 6000)}`;

  for (const model of models) {
    console.log("Calling AI analysis model:", model);
    let response: Response;
    const isStepFun = model === "stepfun-ai/step-3.5-flash";

    try {
      response = await fetchWithTimeout("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "You are a strict JSON API for food safety analysis. Return only one valid JSON object and no markdown.",
            },
            {
              role: "user",
              content: compactPrompt,
            },
          ],
          temperature: isStepFun ? 1 : 0.1,
          top_p: isStepFun ? 0.9 : 0.8,
          max_tokens: isStepFun ? 16384 : 1000,
          stream: isStepFun,
        }),
      }, isStepFun ? 45000 : 12000);
    } catch (e) {
      console.error("AI model request failed or timed out:", model, e);
      continue;
    }

    console.log("AI model response status:", model, response.status);
    if (!response.ok) continue;

    let content = "";
    if (isStepFun) {
      content = await readNvidiaStream(response, 22000);
      console.log("AI model stream text:", model, content.slice(0, 1200));
    } else {
      const raw = await response.text();
      console.log("AI model raw:", model, raw.slice(0, 1200));

      let data: NvidiaChatResponse;
      try {
        data = JSON.parse(raw) as NvidiaChatResponse;
      } catch {
        continue;
      }

      const message = data?.choices?.[0]?.message;
      content = typeof message?.content === "string" ? message.content : "";
      if (!content.trim() && typeof message?.reasoning_content === "string") {
        content = message.reasoning_content;
      }
    }

    if (!content.trim()) {
      console.error("AI model returned empty content:", model);
      continue;
    }

    const parsed = extractJsonObject(content);
    if (!parsed) {
      console.error("AI model returned non-JSON content:", model);
      continue;
    }

    return normalizeAnalysisResult(parsed, extractedText);
  }

  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { image, ingredients_text, barcode } = body;

    let extractedText: string;

    if (ingredients_text) {
      extractedText = ingredients_text;
      console.log("Using provided ingredients text directly");
    } else if (barcode) {
      const normalizedBarcode = normalizeBarcode(barcode);
      if (!normalizedBarcode) {
        return new Response(JSON.stringify({
          unable_to_fetch: true,
          message: "Please enter a valid barcode number."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const offData = await tryOpenFoodFacts(normalizedBarcode);
      if (!offData) {
        console.log("Barcode not found on Open Food Facts:", normalizedBarcode);
        return new Response(JSON.stringify({
          unable_to_fetch: true,
          message: "Unable to fetch product details. The barcode was not found in our database. Please try scanning or pasting the ingredients list instead."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Using Open Food Facts data for barcode:", normalizedBarcode);
      extractedText = offData;
    } else if (image) {
      try {
        extractedText = await performOCR(image);
      } catch (e) {
        console.error("OCR failed:", e);
        return new Response(
          JSON.stringify({
            error: e instanceof Error ? e.message : "Could not extract text from image. Please enter ingredients manually."
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      return new Response(JSON.stringify({ error: "No image, barcode, or ingredients text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // Step 1: Check for STEPFUN_API_KEY
    const STEPFUN_API_KEY = Deno.env.get("STEPFUN_API_KEY");
    if (!STEPFUN_API_KEY) {
      console.error("Missing STEPFUN_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "AI service not configured. Please contact administrator." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResult = await callAIAnalysis(extractedText, STEPFUN_API_KEY);
    const parsedResult = aiResult ?? generateFallbackAnalysis(extractedText);

    return new Response(JSON.stringify({
      success: true,
      data: parsedResult,
      source: aiResult ? "ai" : "deterministic"
    }), {
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
