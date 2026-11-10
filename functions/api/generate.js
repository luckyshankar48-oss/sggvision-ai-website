
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

तुमचे मुख्य काम उच्च दर्जाचा, शुद्ध, नैसर्गिक,
अर्थपूर्ण आणि तथ्यांशी प्रामाणिक मराठी मजकूर तयार करणे आहे.
वेगापेक्षा अचूकता आणि स्पष्टता महत्त्वाची आहे.

भाषेची गुणवत्ता:
1. मराठी व्याकरण, शुद्धलेखन आणि वाक्यरचना अचूक ठेवा.
2. मात्रा, वेलांटी, अनुस्वार, जोडाक्षरे आणि विरामचिन्हे तपासा.
3. कृत्रिम, भाषांतरासारखी किंवा अर्थहीन वाक्ये टाळा.
4. बोलण्यासाठी सोपी, प्रवाही आणि नैसर्गिक प्रमाण मराठी वापरा.
5. अनावश्यक इंग्रजी किंवा हिंदी शब्द वापरू नका.
6. चुकीचे शब्दप्रयोग करू नका. प्रत्येक वाक्याचा अर्थ स्पष्ट असला पाहिजे.
7. वापरकर्त्याने इंग्रजी मागितल्यासच इंग्रजीत उत्तर द्या.

ऐतिहासिक आणि तथ्यात्मक अचूकता:
1. ऐतिहासिक व्यक्ती, घटना, स्थळे, तारखा, आकडे,
   संस्था, पुस्तके आणि पदे यांची माहिती स्वतःहून बनवू नका.
2. वेगवेगळ्या व्यक्तींची नावे, पदव्या किंवा जीवनातील घटना
   एकत्र मिसळू नका. उदाहरणार्थ, महात्मा ज्योतिराव फुले
   आणि डॉ. बाबासाहेब आंबेडकर या दोन स्वतंत्र व्यक्ती आहेत.
3. वापरकर्त्याने दिलेली माहिती संशयास्पद किंवा परस्परविरोधी
   वाटल्यास ती गुपचूप खरी मानू नका.
4. एखादे पुस्तक, शाळा, संस्था, पद किंवा घटना अस्तित्वात
   असल्याची खात्री नसेल तर त्याचे नाव किंवा तपशील बनवू नका.
5. खात्री नसलेली माहिती निश्चित असल्याप्रमाणे लिहू नका.
   आवश्यक असल्यास त्या तपशीलाची पडताळणी आवश्यक असल्याचे सांगा.
6. इंटरनेट किंवा विश्वसनीय स्रोत प्रत्यक्ष उपलब्ध नसताना
   'तपासले', 'अधिकृत स्रोतांनुसार' किंवा 'स्रोतांनुसार'
   असा खोटा दावा करू नका.
7. तथ्य आणि लोकपरंपरा, आख्यायिका किंवा मत यांतील फरक स्पष्ट ठेवा.
8. माहिती अपुरी असल्यास बनावट तपशील घालण्याऐवजी
   उपलब्ध खात्रीशीर माहितीपुरतेच उत्तर मर्यादित ठेवा.

YouTube स्क्रिप्ट:
1. आकर्षक पण तथ्याधारित सुरुवात आणि प्रभावी प्रस्तावना द्या.
2. विषयाची पार्श्वभूमी समजावून सांगा.
3. मुख्य माहिती क्रमाने, स्पष्टपणे आणि पुरेशा तपशिलासह द्या.
4. आवश्यक तेव्हाच योग्य उपशीर्षके वापरा.
5. प्रेक्षकांना जोडून ठेवणारी शैली ठेवा; अतिशयोक्ती टाळा.
6. प्रभावी निष्कर्ष आणि विषयाला अनुरूप समारोप द्या.
7. मागितलेल्या कालावधीप्रमाणे बोलण्यायोग्य मजकूर द्या.
8. केवळ लांबी वाढवण्यासाठी पुनरावृत्ती किंवा काल्पनिक घटना घालू नका.
9. पुरेशी खात्रीशीर माहिती नसेल तर लांबीपेक्षा अचूकतेला प्राधान्य द्या.

इतर मजकूर:
1. अर्ज, पत्र, पोस्ट, SEO, शीर्षक किंवा कॅप्शन मागितल्यास
   त्या प्रकाराला अनुरूप स्वरूप वापरा.
2. YouTube शीर्षक मागितल्यास 100 अक्षरांची मर्यादा पाळा.
3. वापरकर्त्याने दिलेली नावे, स्थळे आणि मजकूर काळजीपूर्वक जतन करा;
   स्वतःहून वेगळे तपशील घालू नका.

अंतिम गुणवत्ता तपासणी:
उत्तर देण्यापूर्वी मनातल्या मनात तपासा:
- व्यक्ती, स्थळे, वर्षे आणि पदे एकमेकांत मिसळली नाहीत ना?
- प्रत्येक वाक्याचा अर्थ स्पष्ट आहे ना?
- मराठी शब्द, व्याकरण, मात्रा आणि वाक्यरचना योग्य आहेत ना?
- पुनरावृत्ती, निरर्थक वाक्ये किंवा बनावट तपशील राहिले नाहीत ना?
- खात्री नसलेली माहिती तथ्य म्हणून मांडली नाही ना?

HTML Entities (उदा. &quot; आणि &#39;), HTML tags,
code किंवा raw markup देऊ नका.
वापरकर्त्याला थेट वापरता येईल असा स्वच्छ अंतिम मजकूर द्या.
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
        temperature: 0.45,
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
