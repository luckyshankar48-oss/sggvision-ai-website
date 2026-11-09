export async function onRequestPost({ request, env }) {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  try {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "फक्त POST विनंती स्वीकारली जाते." }), { status: 405, headers });
    }
    const origin = request.headers.get("Origin");
    const host = request.headers.get("Host");
    if (origin && host && new URL(origin).host !== host) {
      return new Response(JSON.stringify({ error: "ही विनंती या वेबसाइटवरून आलेली नाही." }), { status: 403, headers });
    }
    const body = await request.json();
    const prompt = String(body.prompt || "").trim();
    if (!prompt || prompt.length > 2048) {
      return new Response(JSON.stringify({ error: "कृपया 2048 अक्षरांच्या आत इमेजचे वर्णन द्या." }), { status: 400, headers });
    }
    if (!env.AI || typeof env.AI.run !== "function") {
      return new Response(JSON.stringify({ error: "Workers AI binding उपलब्ध नाही. Cloudflare Pages > Settings > Bindings मध्ये AI binding तपासा." }), { status: 503, headers });
    }
    // Stage 1: understand the customer's single Marathi prompt and convert it into a precise visual brief.
    const plan = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
      messages: [
        {
          role: "system",
          content: "You are a senior art director creating premium, high-click-through YouTube thumbnails. Read the complete user brief and infer the exact subject, location, people, event, emotional tone, and visual hierarchy. Preserve every named subject accurately; never substitute a famous unrelated monument or generic palace. For known Indian heritage sites, describe authentic regional architecture and landscape only. Design a cinematic, richly layered photographic composition with a strong foreground subject, dramatic depth, vivid but believable lighting, and clear separation between foreground and background. For history, Maratha, and fort topics, when relevant place a respectful historically inspired Chhatrapati Shivaji Maharaj portrait on the left and the requested real hill fort or gateway on the right, with Sahyadri landscape and saffron flag; do not add unrelated Mughal domes or palace architecture. Keep the lower 35 percent visually darker and uncluttered so the website can add Marathi title graphics. Return ONLY one detailed English image-generation prompt. Do not render any text, letters, logos, watermarks, poster templates, or borders. Never invent a specific monument feature if unsure."
        },
        { role: "user", content: prompt }
      ],
      max_completion_tokens: 700,
      temperature: 0.2,
      chat_template_kwargs: { enable_thinking: false }
    });
    const visualPrompt = String(
      plan?.choices?.[0]?.message?.content ??
      plan?.result?.choices?.[0]?.message?.content ??
      plan?.response ?? ""
    ).trim();
    if (!visualPrompt) {
      return new Response(JSON.stringify({ error: "AI ला तुमचा विषय समजून घेता आला नाही. कृपया पुन्हा प्रयत्न करा." }), { status: 502, headers });
    }

    // Stage 2: generate the actual thumbnail background from the interpreted brief.
    const ratio = body.ratio === "9:16" ? "9:16" : "16:9";
    const width = ratio === "9:16" ? 768 : 1280;
    const height = ratio === "9:16" ? 1365 : 720;
    // FLUX.2 Klein 4B supports image generation and editing with a more capable composition model.
    const form = new FormData();
    form.append("prompt", visualPrompt);
    form.append("width", String(width));
    form.append("height", String(height));
    const serialized = new Response(form);
    const result = await env.AI.run("@cf/black-forest-labs/flux-2-klein-4b", {
      multipart: {
        body: serialized.body,
        contentType: serialized.headers.get("content-type")
      }
    });
    const image = result?.image || result?.result?.image;
    if (!image || typeof image !== "string") {
      return new Response(JSON.stringify({ error: "AI मॉडेलकडून इमेज मिळाली नाही." }), { status: 502, headers });
    }
    return new Response(JSON.stringify({ image }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: "इमेज तयार करताना सर्व्हर त्रुटी आली. कृपया पुन्हा प्रयत्न करा." }), { status: 502, headers });
  }
}
