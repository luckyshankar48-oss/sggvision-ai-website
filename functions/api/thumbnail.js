function jsonResponse(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers });
}

function parsePlannerOutput(value) {
  const raw = String(value || "").trim();
  const cleaned = raw.replace(/^\u0060\u0060\u0060(?:json)?\s*/i, "").replace(/\s*\u0060\u0060\u0060$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

function relevanceScore(item, query) {
  const haystack = [item.title, ...(item.tags || []).map(tag => tag.name)].join(" ").toLowerCase();
  const words = String(query || "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 2);
  return words.reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0);
}

async function findReferenceImage(query) {
  if (!query) return null;
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", query.slice(0, 200));
  url.searchParams.set("page_size", "8");
  url.searchParams.set("license", "cc0,pdm");
  url.searchParams.set("mature", "false");
  const response = await fetch(url.toString(), {
    headers: { "Accept": "application/json", "User-Agent": "SGGVISION-AI-Thumbnail/1.0" }
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const items = Array.isArray(payload.results) ? payload.results : [];
  if (!items.length) return null;
  const ranked = items
    .map(item => ({ item, score: relevanceScore(item, query) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  // Avoid feeding a weakly related image into the generator.
  const wordCount = String(query).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 2).length;
  if (!best || best.score < Math.min(2, wordCount) || !best.item.thumbnail) return null;
  const imageResponse = await fetch(best.item.thumbnail);
  if (!imageResponse.ok) return null;
  const blob = await imageResponse.blob();
  if (!blob.type.startsWith("image/") || blob.size > 5 * 1024 * 1024) return null;
  return {
    blob,
    source: {
      title: String(best.item.title || "Openly licensed image").slice(0, 180),
      creator: String(best.item.creator || "Unknown creator").slice(0, 120),
      license: String(best.item.license || "See source page").slice(0, 40),
      licenseUrl: best.item.license_url || "",
      pageUrl: best.item.foreign_landing_url || "",
      attribution: best.item.attribution || ""
    }
  };
}

export async function onRequestPost({ request, env }) {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  try {
    if (request.method !== "POST") {
      return jsonResponse({ error: "फक्त POST विनंती स्वीकारली जाते." }, 405, headers);
    }
    const origin = request.headers.get("Origin");
    const host = request.headers.get("Host");
    if (origin && host && new URL(origin).host !== host) {
      return jsonResponse({ error: "ही विनंती या वेबसाइटवरून आलेली नाही." }, 403, headers);
    }
    const body = await request.json();
    const prompt = String(body.prompt || "").trim();
    if (!prompt || prompt.length > 2048) {
      return jsonResponse({ error: "कृपया 2048 अक्षरांच्या आत संपूर्ण थंबनेल Prompt लिहा." }, 400, headers);
    }
    if (!env.AI || typeof env.AI.run !== "function") {
      return jsonResponse({ error: "Workers AI binding उपलब्ध नाही. Cloudflare Pages > Settings > Bindings मध्ये AI binding तपासा." }, 503, headers);
    }

    // Stage 1: interpret any customer topic. No topic-specific assumptions or fixed design template.
    const planResult = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
      messages: [
        {
          role: "system",
          content: "You are a universal YouTube thumbnail art director and visual researcher. Understand the user's complete prompt in its original language. Do not assume the topic. Identify the exact subject, named people, place, event, product, factual context, emotional tone, and any exact headline/subtitle text. Never invent a person's identity, a real location's architecture, a product model, or a news event. Return ONLY valid JSON with these keys: search_query (short English query for a relevant real reference photo; empty string if no specific real-world visual is needed), image_prompt (detailed English prompt for a cinematic, professional thumbnail background that faithfully depicts the user's topic; no words, letters, captions, logos, watermarks or graphic text), visual_subject (short plain-language subject label), category (one of: history, news, travel, product, festival, education, sports, nature, culture, general), and design_direction (short description of a suitable composition and mood). Make the design specific to this topic, not a reusable generic poster. If the prompt names a real person, do not fabricate their face; use a reference photo if found, otherwise compose without a recognizable portrait. For real places, prioritize recognizable authentic features and avoid substituting unrelated famous landmarks. The user's requested text will be typeset separately by the website. Compose the image so the main subject is visually dominant and leave a clean, low-detail text-safe zone in the lower third without making the whole image a dark generic background."
        },
        { role: "user", content: prompt }
      ],
      max_completion_tokens: 900,
      temperature: 0.15,
      chat_template_kwargs: { enable_thinking: false }
    });
    const plannerText = String(
      planResult?.choices?.[0]?.message?.content ??
      planResult?.result?.choices?.[0]?.message?.content ??
      planResult?.response ?? ""
    ).trim();
    const plan = parsePlannerOutput(plannerText);
    if (!plan || !String(plan.image_prompt || "").trim()) {
      return jsonResponse({ error: "AI कडून विषयाचे योग्य डिझाइन नियोजन मिळाले नाही. कृपया पुन्हा प्रयत्न करा." }, 502, headers);
    }

    // Stage 2: find an openly licensed reference image when a relevant real-world subject is named.
    let reference = null;
    try { reference = await findReferenceImage(String(plan.search_query || "").trim()); } catch { reference = null; }

    // Stage 3: generate the background, using the reference only when a relevant licensed image was found.
    const ratio = body.ratio === "9:16" ? "9:16" : "16:9";
    const width = ratio === "9:16" ? 768 : 1280;
    const height = ratio === "9:16" ? 1365 : 720;
    const form = new FormData();
    const imagePrompt = String(plan.image_prompt).slice(0, 3500);
    form.append("prompt", reference
      ? imagePrompt + " Use the supplied reference image as the factual visual anchor for the requested subject. Preserve its recognizable real-world identity and architecture while creating a polished cinematic thumbnail composition. Do not replace it with a different landmark."
      : imagePrompt + " No unrelated stock subject or substitute landmark. Keep the composition faithful to the user brief.");
    form.append("width", String(width));
    form.append("height", String(height));
    if (reference) form.append("input_image_0", reference.blob, "reference-image");
    const serialized = new Response(form);
    const generated = await env.AI.run("@cf/black-forest-labs/flux-2-klein-4b", {
      multipart: {
        body: serialized.body,
        contentType: serialized.headers.get("content-type")
      }
    });
    const image = generated?.image || generated?.result?.image;
    if (!image || typeof image !== "string") {
      return jsonResponse({ error: "AI मॉडेलकडून इमेज मिळाली नाही. कृपया पुन्हा प्रयत्न करा." }, 502, headers);
    }
    return jsonResponse({
      image,
      subject: String(plan.visual_subject || "").slice(0, 160),
      designDirection: String(plan.design_direction || "").slice(0, 300),
      category: ["history","news","travel","product","festival","education","sports","nature","culture","general"].includes(String(plan.category || "").toLowerCase()) ? String(plan.category).toLowerCase() : "general",
      imageSource: reference ? reference.source : null
    }, 200, headers);
  } catch (error) {
    return jsonResponse({ error: "थंबनेल तयार करताना सर्व्हर त्रुटी आली. कृपया पुन्हा प्रयत्न करा." }, 502, headers);
  }
}
