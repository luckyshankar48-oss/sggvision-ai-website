
export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };

  try {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({
        error: "फक्त POST विनंती स्वीकारली जाते."
      }), { status: 405, headers });
    }

    const origin = request.headers.get("Origin");
    const host = request.headers.get("Host");

    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return new Response(JSON.stringify({
            error: "ही विनंती या वेबसाइटवरून आलेली नाही."
          }), { status: 403, headers });
        }
      } catch {
        return new Response(JSON.stringify({
          error: "अवैध वेबसाइट विनंती."
        }), { status: 403, headers });
      }
    }

    const body = await request.json();
    const prompt = String(body.prompt || "").trim();

    if (!prompt || prompt.length > 12000) {
      return new Response(JSON.stringify({
        error: "कृपया योग्य मजकूर द्या (कमाल 12,000 अक्षरे)."
      }), { status: 400, headers });
    }

    if (!env.AI || typeof env.AI.run !== "function") {
      return new Response(JSON.stringify({
        error: "Cloudflare Workers AI जोडलेले नाही. Settings > Bindings तपासा."
      }), { status: 503, headers });
    }

    // मराठी अंकांचे इंग्रजी अंकांमध्ये रूपांतर
    const normalizedPrompt = prompt.replace(/[०-९]/g, digit =>
      String("०१२३४५६७८९".indexOf(digit))
    );

    // व्हिडिओची अपेक्षित कालमर्यादा शोधणे
    const durationMatch = normalizedPrompt.match(
      /(?:कालावधी|duration)?\s*[:：]?\s*(\d+)\s*(?:मिनिटे?|मिनिट|minutes?|mins?)/i
    );

    const minutes = durationMatch
      ? Math.min(60, Math.max(1, Number(durationMatch[1])))
      : 0;

    const durationInstruction = minutes
      ? `\n\nविशेष सूचना: वापरकर्त्याने ${minutes} मिनिटांची स्क्रिप्ट मागितली आहे.
साधारण 115 ते 125 बोलण्यायोग्य शब्द प्रति मिनिट या प्रमाणात
स्क्रिप्ट तयार करा. आवश्यक तेवढा सविस्तर मजकूर द्या.
स्क्रिप्ट अकाली संपवू नका.`
      : "";

    const systemPrompt = `
तुम्ही SGGVISION AI चे अनुभवी मराठी लेखक,
बातमी संपादक आणि माहितीपट पटकथा लेखक आहात.

तुमचे मुख्य काम उच्च दर्जाचा, शुद्ध आणि नैसर्गिक
मराठी मजकूर तयार करणे आहे.

भाषेची गुणवत्ता:
1. मराठी व्याकरण, शुद्धलेखन आणि वाक्यरचना अचूक ठेवा.
2. कान, मात्रा, वेलांटी, अनुस्वार आणि विरामचिन्हे तपासा.
3. कृत्रिम किंवा भाषांतरासारखी वाटणारी वाक्ये टाळा.
4. बोलण्यासाठी सोपी, प्रवाही आणि नैसर्गिक मराठी वापरा.
5. अनावश्यक इंग्रजी शब्द वापरू नका.
6. AI हा संक्षेप आवश्यक त्या ठिकाणी इंग्रजीतच लिहा.
7. वापरकर्त्याने इंग्रजी मागितल्यासच इंग्रजीत उत्तर द्या.

ऐतिहासिक आणि माहितीपूर्ण मजकूर:
1. ऐतिहासिक व्यक्ती, घटना, स्थळे आणि तारखा यांची
   माहिती काळजीपूर्वक मांडा.
2. चुकीची माहिती, बनावट संदर्भ किंवा काल्पनिक तथ्ये देऊ नका.
3. खात्री नसलेली माहिती निश्चित असल्याप्रमाणे लिहू नका.
4. तथ्य आणि लोकपरंपरा यांतील फरक स्पष्ट ठेवा.

YouTube स्क्रिप्ट:
1. आकर्षक सुरुवात आणि प्रभावी प्रस्तावना द्या.
2. विषयाची पार्श्वभूमी समजावून सांगा.
3. मुख्य माहिती क्रमाने आणि सविस्तर द्या.
4. आवश्यक ठिकाणी योग्य उपशीर्षके वापरा.
5. प्रेक्षकांना शेवटपर्यंत जोडून ठेवणारी शैली ठेवा.
6. प्रभावी निष्कर्ष आणि योग्य समारोप द्या.
7. मागितलेल्या कालावधीप्रमाणे स्क्रिप्टची लांबी ठेवा.
8. एकाच माहितीची वारंवार पुनरावृत्ती करू नका.

अंतिम गुणवत्ता तपासणी:
उत्तर देण्यापूर्वी मनातल्या मनात संपूर्ण मजकूर तपासा.
मराठी शब्द, व्याकरण, मात्रा आणि वाक्यरचना दुरुस्त करा.
अनावश्यक HTML Entities जसे &quot; आणि &#39;
यांचा वापर करू नका.
वापरकर्त्याला थेट वापरता येईल असा अंतिम मजकूर द्या.

YouTube शीर्षक मागितल्यास 100 अक्षरांची मर्यादा पाळा.
`;

    const result = await env.AI.run(
      "@cf/zai-org/glm-4.7-flash",
      {
        messages: [
          {
            role: "system",
            content: systemPrompt + durationInstruction
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 6000,
        temperature: 0.55,
        chat_template_kwargs: {
          enable_thinking: false
        }
      }
    );

    const message =
      result?.choices?.[0]?.message ||
      result?.result?.choices?.[0]?.message ||
      {};

    let rawAnswer =
      message.content ??
      result?.response ??
      result?.result?.response ??
      result?.choices?.[0]?.text ??
      result?.result?.choices?.[0]?.text ??
      result?.output_text ??
      "";

    if (Array.isArray(rawAnswer)) {
      rawAnswer = rawAnswer.map(part =>
        typeof part === "string"
          ? part
          : (part?.text || part?.content || "")
      ).join("\n");
    } else if (rawAnswer && typeof rawAnswer === "object") {
      rawAnswer = rawAnswer.text || rawAnswer.content || "";
    }

    const answer = String(rawAnswer || "").trim();

    if (!answer) {
      return new Response(JSON.stringify({
        error: "AI कडून रिकामे उत्तर मिळाले. कृपया पुन्हा प्रयत्न करा."
      }), { status: 502, headers });
    }

    return new Response(JSON.stringify({
      text: answer
    }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({
      error: "AI सेवा सध्या उत्तर देऊ शकत नाही. कृपया थोड्या वेळाने प्रयत्न करा."
    }), { status: 502, headers });
  }
}
