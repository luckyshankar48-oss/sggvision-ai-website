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
    const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt, steps: 4 });
    const image = result?.image || result?.result?.image;
    if (!image || typeof image !== "string") {
      return new Response(JSON.stringify({ error: "AI मॉडेलकडून इमेज मिळाली नाही." }), { status: 502, headers });
    }
    return new Response(JSON.stringify({ image }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: "इमेज तयार करताना सर्व्हर त्रुटी आली. कृपया पुन्हा प्रयत्न करा." }), { status: 502, headers });
  }
}
