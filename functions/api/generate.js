export async function onRequestPost({ request, env }) {
  const cors = {
    "Content-Type": "application/json; charset=utf-8"
  };

  try {
console.log("OPENAI_API_KEY configured:", Boolean(env && env.OPENAI_API_KEY));
    if (!env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Cloudflare मध्ये OPENAI_API_KEY उपलब्ध नाही." }),
        { status: 503, headers: cors }
      );
    }

    const body = await request.json();
    const prompt = String(body.prompt || "").trim();

    if (!prompt || prompt.length > 12000) {
      return new Response(
        JSON.stringify({ error: "कृपया योग्य मजकूर द्या (कमाल 12,000 अक्षरे)." }),
        { status: 400, headers: cors }
      );
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-6-astra",
        instructions: "तुम्ही SGGVISION AI चे मराठी डिजिटल सहाय्यक आहात. स्पष्ट, शुद्ध आणि उपयोगी मराठीत उत्तर द्या. बनावट तथ्य, संदर्भ किंवा दावे करू नका.",
        input: prompt,
        max_output_tokens: 1800
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "AI सेवा त्रुटी: " + (data.error?.message || "विनंती पूर्ण झाली नाही.") }),
        { status: 502, headers: cors }
      );
    }

    const text = (data.output || [])
      .flatMap(x => x.content || [])
      .filter(x => x.type === "output_text")
      .map(x => x.text)
      .join("\n");

    return new Response(JSON.stringify({ text }), { headers: cors });

  } catch (e) {
    return new Response(
      JSON.stringify({ error: "सर्व्हर त्रुटी. कृपया पुन्हा प्रयत्न करा." }),
      { status: 500, headers: cors }
    );
  }
}
