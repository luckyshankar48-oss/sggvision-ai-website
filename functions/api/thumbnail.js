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

function extractRequestedCopy(prompt) {
  const text = String(prompt || "").replace(/Prompt कॉपी करा/gi, "").trim();
  const labels = {
    headline: /(?:मुख्य\s*शीर्षक|मुख्य\s*मजकूर|थंबनेलवरील\s*मजकूर|शीर्षक|headline|title)\s*[:：-]\s*([\s\S]*?)(?=(?:दुय्यम\s*शीर्षक|उपशीर्षक|उपमजकूर|छोटा\s*मजकूर|उपमथळा|ठळक\s*माहिती|खालील\s*संदेश|डिझाइन\s*सूचना|रचना\s*सूचना|design\s*(?:notes|instructions)|subline|subtitle|supporting\s*points)\s*[:：-]|$)/i,
    subtitle: /(?:दुय्यम\s*शीर्षक|उपशीर्षक|उपमजकूर|छोटा\s*मजकूर|उपमथळा|subline|subtitle)\s*[:：-]\s*([\s\S]*?)(?=(?:ठळक\s*माहिती|खालील\s*संदेश|डिझाइन\s*सूचना|रचना\s*सूचना|design\s*(?:notes|instructions)|supporting\s*points)\s*[:：-]|$)/i,
    points: /(?:ठळक\s*माहिती|supporting\s*points)\s*[:：-]\s*([\s\S]*?)(?=(?:खालील\s*संदेश|closing\s*line|डिझाइन\s*सूचना|रचना\s*सूचना|design\s*(?:notes|instructions))\s*[:：-]|$)/i,
    closing: /(?:खालील\s*संदेश|closing\s*line)\s*[:：-]\s*([\s\S]*?)(?=(?:डिझाइन\s*सूचना|design\s*(?:notes|instructions)|रचना\s*सूचना)\s*[:：-]|$)/i
  };
  const clean = value => String(value || "").replace(/Prompt कॉपी करा/gi, "").replace(/\*\*/g, "").replace(/^[\s"'“”]+|[\s"'“”]+$/g, "").replace(/\s+/g, " ").trim();
  const get = key => clean(text.match(labels[key])?.[1] || "");
  const pointBlock = text.match(labels.points)?.[1] || "";
  const points = pointBlock.split(/\r?\n|[;；]/).map(line => clean(line.replace(/^\s*(?:[-•*▪]+|\d+[.)、])\s*/, ""))).filter(Boolean).slice(0,4);
  return { headline: get("headline"), subtitle: get("subtitle"), supporting_points: points, closing_line: get("closing") };
}

function relevanceScore(item, query) {
  const haystack = [item.title, ...(item.tags || []).map(tag => tag.name)].join(" ").toLowerCase();
  const words = String(query || "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 2);
  const matched = words.filter(word => haystack.includes(word));
  const title = String(item.title || "").toLowerCase();
  const titleHits = words.filter(word => title.includes(word)).length;
  return { score: matched.length + titleHits * 1.5, matched: matched.length };
}

async function prepareReferenceBlob(blob) {
  // FLUX.2 Klein accepts reference images smaller than 512x512.
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 510 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Reference image canvas is unavailable.");
  }
  try {
    context.drawImage(bitmap, 0, 0, width, height);
    return await canvas.convertToBlob({ type: "image/jpeg", quality: 0.88 });
  } finally {
    bitmap.close();
  }
}

async function readImageBlobLimited(response, maxBytes = 5 * 1024 * 1024) {
  const declaredLength = Number(response.headers.get("Content-Length") || 0);
  if (declaredLength > maxBytes) return null;
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const type = response.headers.get("Content-Type") || "";
  if (!type.toLowerCase().startsWith("image/")) return null;
  return new Blob(chunks, { type });
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
    signal: AbortSignal.timeout(6500)
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
  const originalBlob = await readImageBlobLimited(imageResponse);
  if (!originalBlob) return null;
  const blob = await prepareReferenceBlob(originalBlob);
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

async function readJsonBodyLimited(request, maxBytes = 262144) {
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > maxBytes) return { tooLarge: true };
  if (!request.body) return { invalid: true };
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { tooLarge: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { body: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { invalid: true };
  }
}

export async function onRequestPost({ request, env }) {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  try {
    if (request.method !== "POST") {
      return jsonResponse({ error: "फक्त POST विनंती स्वीकारली जाते." }, 405, headers);
    }
    const origin = request.headers.get("Origin");
    const host = request.headers.get("Host");
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return jsonResponse({ error: "ही विनंती या वेबसाइटवरून आलेली नाही." }, 403, headers);
        }
      } catch {
        return jsonResponse({ error: "अवैध वेबसाइट विनंती." }, 403, headers);
      }
    }
    const contentType = request.headers.get("Content-Type") || "";
    if (!/^application\/json(?:\s*;|$)/i.test(contentType.trim())) {
      return jsonResponse({ error: "JSON स्वरूपातील विनंती आवश्यक आहे." }, 415, headers);
    }
    const parsedRequest = await readJsonBodyLimited(request);
    if (parsedRequest.tooLarge) {
      return jsonResponse({ error: "विनंतीचा आकार मर्यादेपेक्षा जास्त आहे." }, 413, headers);
    }
    if (parsedRequest.invalid) {
      return jsonResponse({ error: "विनंतीतील JSON माहिती वाचता आली नाही." }, 400, headers);
    }
    const body = parsedRequest.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse({ error: "विनंतीचा डेटा योग्य स्वरूपात नाही." }, 400, headers);
    }
    if (typeof body.prompt !== "string") {
      return jsonResponse({ error: "Prompt मजकूर स्वरूपात देणे आवश्यक आहे." }, 400, headers);
    }
    const prompt = body.prompt.trim();
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
          content: "You are a universal YouTube thumbnail art director and visual researcher. Understand the user's complete prompt in its original language. Do not assume the topic. Identify the exact subject, named people, place, event, product, factual context, emotional tone, and any exact headline/subtitle text. Never invent a person's identity, a real location's architecture, a product model, or a news event. Return ONLY valid JSON with these keys: headline (the exact short main title requested by the user, in the same original language and spelling; do not invent or paraphrase; if not explicitly provided, infer a concise 2-6 word title), subtitle (the exact secondary line requested by the user; if absent return empty string), supporting_points (array of up to 4 short exact factual points explicitly requested by the user; do not invent facts; otherwise empty array), closing_line (exact closing slogan requested by the user or empty string), place_search_query (short exact English query for a photograph of the named real place/landmark; empty if none), person_search_query (short exact English query for a public-domain photograph/portrait of a named real person; empty if none), search_query (fallback concise English query for the main real-world subject), image_prompt (detailed English prompt for ONLY a clean cinematic photographic background faithfully depicting the topic. Absolutely no text, letters, numbers, signs, labels, inscriptions, captions, logos, watermarks, UI, posters, banners, ribbons, blank panels, parchment, brush-stroke shapes, title plates, text boxes, frames, or text-like marks. Do not leave designed blank panels; just a natural uncluttered photographic composition, with the main subject clear and some visual breathing room.), visual_subject (short plain-language subject label), category (one of: history, news, travel, product, festival, birthday, education, sports, nature, culture, general), and design_direction (short description of a suitable composition and mood). Make the design specific to this topic, not a reusable generic poster. If the prompt names a real person, do not fabricate their face; search for that exact person and use a reference photo only if a strong exact match is found, otherwise compose without a recognizable portrait. For a named real place, search that exact place separately and use its photo as the primary architectural anchor; do not invent domes, arches, gates, or other architecture. Never substitute an unrelated fort, palace, monument, or landmark. Carefully inspect the user's prompt for every explicitly requested visible physical element, person, vehicle, action, and environmental detail. Every such visual requirement must be represented clearly in image_prompt; do not silently omit any. For emergency or fire scenes, when requested, visibly include firefighters in protective uniforms and helmets actively operating a hose, a fire engine when requested, strong visible water spray, a burning building, and thick smoke; do not depict only flames and an empty building. Keep all requested visible elements clearly identifiable and compose them without text. The user's requested text will be typeset separately by the website. Compose the image so the main subject is visually dominant in the upper 62 percent. The entire lower 38 percent must be a clean, uninterrupted, low-detail dark-to-transparent text-safe zone with no lettering, signs, structures, people, or objects. The image itself must contain zero typography."
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
    const parsedPlan = parsePlannerOutput(plannerText);
    const plan = parsedPlan && typeof parsedPlan === "object" && !Array.isArray(parsedPlan)
      ? parsedPlan
      : null;
    if (plan) {
      // Accept only expected scalar/list types from the model; malformed fields must not
      // leak as "[object Object]" into the UI or image prompt.
      for (const key of ["headline", "subtitle", "closing_line", "place_search_query", "person_search_query", "search_query", "image_prompt", "visual_subject", "design_direction", "category"]) {
        if (typeof plan[key] !== "string") plan[key] = "";
      }
      plan.supporting_points = Array.isArray(plan.supporting_points)
        ? plan.supporting_points.filter(point => typeof point === "string").slice(0, 4)
        : [];
      // Preserve copy explicitly supplied by the customer; the model may classify/design,
      // but must not silently rewrite Marathi wording or omit requested bullet points.
      const requestedCopy = extractRequestedCopy(prompt);
      if (requestedCopy.headline) plan.headline = requestedCopy.headline;
      if (requestedCopy.subtitle) plan.subtitle = requestedCopy.subtitle;
      if (requestedCopy.supporting_points.length) plan.supporting_points = requestedCopy.supporting_points;
      if (requestedCopy.closing_line) plan.closing_line = requestedCopy.closing_line;
    }
    if (!plan || !String(plan.image_prompt || "").trim()) {
      return jsonResponse({ error: "AI कडून विषयाचे योग्य डिझाइन नियोजन मिळाले नाही. कृपया पुन्हा प्रयत्न करा." }, 502, headers);
    }

    // Stage 2: search exact place/person references concurrently to reduce waiting time.
    let placeReference = null;
    let personReference = null;
    const placeQueries = [...new Set([
      String(plan.place_search_query || "").trim(),
      String(plan.search_query || "").trim()
    ].filter(Boolean))].slice(0, 2);
    const personQueries = [...new Set([String(plan.person_search_query || "").trim()].filter(Boolean))];
    const referenceJobs = [
      ...placeQueries.map(query => findReferenceImage(query, "place").catch(() => null)),
      ...personQueries.map(query => findReferenceImage(query, "person").catch(() => null))
    ];
    const referenceResults = await Promise.all(referenceJobs);
    placeReference = referenceResults.slice(0, placeQueries.length).find(Boolean) || null;
    personReference = referenceResults.slice(placeQueries.length).find(Boolean) || null;
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
    // Bound the generated payload before serializing it into a JSON response.
    // Cloudflare's image output is base64; reject malformed or unexpectedly large data.
    if (image.length > 10 * 1024 * 1024 || image.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
      return jsonResponse({ error: "AI कडून मिळालेली इमेज योग्य स्वरूपात नाही किंवा आकाराने खूप मोठी आहे. पुन्हा प्रयत्न करा." }, 502, headers);
    }
    return jsonResponse({
      image,
      headline: String(plan.headline || "").slice(0, 180),
      subtitle: String(plan.subtitle || "").slice(0, 240),
      supportingPoints: Array.isArray(plan.supporting_points) ? plan.supporting_points.slice(0,4).map(x=>String(x).slice(0,100)) : [],
      closingLine: String(plan.closing_line || "").slice(0, 180),
      subject: String(plan.visual_subject || "").slice(0, 160),
      designDirection: String(plan.design_direction || "").slice(0, 300),
      category: ["history","news","travel","product","festival","birthday","education","sports","nature","culture","general"].includes(String(plan.category || "").toLowerCase()) ? String(plan.category).toLowerCase() : "general",
      imageSource: references.map(item => item.source),
      referenceStatus: { placeFound: !!placeReference, personFound: !!personReference, count: references.length }
    }, 200, headers);
  } catch (error) {
    return jsonResponse({ error: "थंबनेल तयार करताना सर्व्हर त्रुटी आली. कृपया पुन्हा प्रयत्न करा." }, 502, headers);
  }
}
