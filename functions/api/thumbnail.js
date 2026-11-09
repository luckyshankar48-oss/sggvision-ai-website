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
  const matched = words.filter(word => haystack.includes(word));
  const title = String(item.title || "").toLowerCase();
  const titleHits = words.filter(word => title.includes(word)).length;
  return { score: matched.length + titleHits * 1.5, matched: matched.length };
}

async function findReferenceImage(query, kind = "subject") {
  if (!query) return null;
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", query.slice(0, 200));
  url.searchParams.set("page_size", "12");
  url.searchParams.set("license", "cc0,pdm");
  url.searchParams.set("mature", "false");
  url.searchParams.set("category", "photograph");
  url.searchParams.set("size", "medium");
  const response = await fetch(url.toString(), {
    headers: { "Accept": "application/json", "User-Agent": "SGGVISION-AI-Thumbnail/1.0" },
    signal: AbortSignal.timeout(9000)
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const items = Array.isArray(payload.results) ? payload.results : [];
  const ranked = items.map(item => ({ item, relevance: relevanceScore(item, query) }))
    .sort((a, b) => b.relevance.score - a.relevance.score);
  const best = ranked[0];
  if (!best || best.relevance.matched < 2 || !best.item.thumbnail) return null;
  const imageResponse = await fetch(best.item.thumbnail, { signal: AbortSignal.timeout(9000) });
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
      attribution: best.item.attribution || "",
      matchedTerms: best.relevance.matched,
      kind
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
          content: "You are a universal YouTube thumbnail art director and visual researcher. Understand the user's complete prompt in its original language. Do not assume the topic. Identify the exact subject, named people, place, event, product, factual context, emotional tone, and any exact headline/subtitle text. Never invent a person's identity, a real location's architecture, a product model, or a news event. Return ONLY valid JSON with these keys: place_search_query (short exact English query for a photograph of the named real place/landmark; empty if none), person_search_query (short exact English query for a public-domain photograph/portrait of a named real person; empty if none), search_query (fallback concise English query for the main real-world subject), image_prompt (detailed English prompt for a cinematic, professional thumbnail background that faithfully depicts the user's topic; no words, letters, captions, logos, watermarks or graphic text), visual_subject (short plain-language subject label), category (one of: history, news, travel, product, festival, education, sports, nature, culture, general), and design_direction (short description of a suitable composition and mood). Make the design specific to this topic, not a reusable generic poster. If the prompt names a real person, do not fabricate their face; search for that exact person and use a reference photo only if a strong exact match is found, otherwise compose without a recognizable portrait. For a named real place, search that exact place separately and use its photo as the primary architectural anchor; do not invent domes, arches, gates, or other architecture. Never substitute an unrelated fort, palace, monument, or landmark. The user's requested text will be typeset separately by the website. Compose the image so the main subject is visually dominant and leave a clean, low-detail text-safe zone in the lower third without making the whole image a dark generic background."
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
    let placeReference = null;
    let personReference = null;
    try {
      const placeQuery = String(plan.place_search_query || "").trim();
      const personQuery = String(plan.person_search_query || "").trim();
      if (placeQuery) placeReference = await findReferenceImage(placeQuery, "place");
      if (personQuery) personReference = await findReferenceImage(personQuery, "person");
      if (!placeReference && !personReference && plan.search_query) {
        placeReference = await findReferenceImage(String(plan.search_query).trim(), "subject");
      }
    } catch { /* A failed reference search must not stop image generation. */ }
    const references = [
      ...(placeReference ? [{ ...placeReference, kind: "place" }] : []),
      ...(personReference ? [{ ...personReference, kind: "person" }] : [])
    ];

    // Stage 3: generate the background, using the reference only when a relevant licensed image was found.
    const ratio = body.ratio === "9:16" ? "9:16" : "16:9";
    const width = ratio === "9:16" ? 768 : 1280;
    const height = ratio === "9:16" ? 1365 : 720;
    const form = new FormData();
    const imagePrompt = String(plan.image_prompt).slice(0, 3500);
    const referenceInstruction = references.length
      ? references.map((ref, index) => ref.kind === "place"
          ? "Image " + index + " is the exact real-world place/landmark reference. Preserve its authentic recognizable architecture; do not add domes, arches, gates, or features absent from the reference."
          : "Image " + index + " is the exact named-person reference. Preserve the person's recognizable face and appearance; do not substitute or invent a different face."
        ).join(" ")
      : "No unrelated stock subject or substitute landmark. For named real places, avoid fabricated signature architecture; depict only features supported by the brief. Do not invent a recognizable face for any named real person.";
    form.append("prompt", imagePrompt + " " + referenceInstruction + " Create a polished, cinematic YouTube thumbnail background with a clear visual hierarchy and deliberate space for separately typeset title text.");
    form.append("width", String(width));
    form.append("height", String(height));
    if (references[0]) form.append("input_image_0", references[0].blob, references[0].kind + "-reference");
    if (references[1]) form.append("input_image_1", references[1].blob, references[1].kind + "-reference");
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
      imageSource: references.map(item => item.source),
      referenceStatus: { placeFound: !!placeReference, personFound: !!personReference, count: references.length }
    }, 200, headers);
  } catch (error) {
    return jsonResponse({ error: "थंबनेल तयार करताना सर्व्हर त्रुटी आली. कृपया पुन्हा प्रयत्न करा." }, 502, headers);
  }
}
