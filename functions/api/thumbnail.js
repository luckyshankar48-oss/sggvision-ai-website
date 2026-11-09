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
          content: "You are an expert visual researcher and YouTube thumbnail art director. Understand the user's full brief. Identify the exact subject, place, people, event, mood, and composition. Never replace the requested subject with a famous but unrelated monument. For named real places, describe only recognizable, relevant features and do not invent architecture. Return ONLY a concise English image-generation prompt for a photorealistic, premium YouTube thumbnail background. No text, letters, logos, watermarks, poster templates, or borders. Leave a clean lower area for Marathi title overlay. If the subject is uncertain, keep the prompt conservative and do not invent specifics."
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
    const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
      prompt: visualPrompt,
      steps: 4
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
