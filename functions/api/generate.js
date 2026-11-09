export async function onRequestPost({ request, env }) {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

  try {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "फक्त POST विनंती स्वीकारली जाते." }), { status: 405, headers });
    }

    const origin = request.headers.get("Origin");
    const host = request.headers.get("Host");
    if (origin && host) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return new Response(JSON.stringify({ error: "ही विनंती या वेबसाइटवरून आलेली नाही." }), { status: 403, headers });
      }
    }

    const body = await request.json();
    const prompt = String(body.prompt || "").trim();
    if (!prompt || prompt.length > 12000) {
      return new Response(JSON.stringify({ error: "कृपया योग्य मजकूर द्या (कमाल 12,000 अक्षरे)." }), { status: 400, headers });
    }

    if (!env.AI || typeof env.AI.run !== "function") {
      return new Response(JSON.stringify({
        error: "Cloudflare Workers AI अजून जोडलेले नाही. Pages > Settings > Bindings मध्ये Workers AI binding चे नाव AI ठेवा आणि पुन्हा Deploy करा."
      }), { status: 503, headers });
    }

    const result = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
      messages: [
        {
          role: "system",
          content: "तुम्ही SGGVISION AI चे मराठी डिजिटल सहाय्यक आहात. स्पष्ट, शुद्ध आणि उपयोगी मराठीत उत्तर द्या. वापरकर्त्याने वेगळी भाषा मागितल्यास त्या भाषेत उत्तर द्या. तथ्य बनवू नका; खात्री नसल्यास स्पष्ट सांगा. YouTube शीर्षक 100 अक्षरांच्या मर्यादेत द्या, जेव्हा ते मागितले असेल."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 1800,
      temperature: 0.65
    });

    const answer = typeof result === "string"
      ? result
      : (result?.response || result?.result?.response || "");

    if (!answer || typeof answer !== "string") {
      return new Response(JSON.stringify({ error: "AI कडून रिकामे उत्तर मिळाले. कृपया पुन्हा प्रयत्न करा." }), { status: 502, headers });
    }

    return new Response(JSON.stringify({ text: answer }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "AI सेवा सध्या उत्तर देऊ शकत नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा."
    }), { status: 502, headers });
  }
}
