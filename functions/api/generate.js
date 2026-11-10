
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

    const isScriptRequest = /स्क्रिप्ट|व्हॉइस.?ओव्हर|voice.?over|documentary script|youtube script|write a script/i.test(prompt);
    const isEnglishRequest = /(?:IMPORTANT:\s*Write the complete response in clear, natural English only|Act as an experienced English|reply entirely in English|write.*English documentary)/i.test(prompt);

    const durationInstruction = isScriptRequest
      ? (isEnglishRequest
        ? `\n\nMandatory script requirements:
- Write one complete, ready-to-record script only. Do not include meta commentary or explanations.
- Structure: Title, Introduction, Main Content, Conclusion, and one brief audience-question call to action at the end.
- Keep every paragraph relevant. Do not invent events, dates, names, quotations, statistics, or claims.
- For historical topics, distinguish established facts from legends and omit unsupported details.
- Use fluent, natural English. Avoid repetition, broken sentences, markup, and HTML entities.
- Stop immediately after the final call to action.
${minutes ? `\nTarget duration: ${minutes} minutes. Aim for approximately 115–125 speakable English words per minute; do not pad with repetition.` : ""}`
        : `\n\nस्क्रिप्टसाठी बंधनकारक संपादकीय नियम:
- उत्तर एकाच पूर्ण स्क्रिप्टचे असावे; सूचना, स्पष्टीकरण किंवा मेटा-टिप्पणी देऊ नका.
- रचना नेमकी अशी ठेवा: शीर्षक, प्रस्तावना, मुख्य माहिती, निष्कर्ष, आणि शेवटी एकच छोटा प्रेक्षकांना प्रश्न विचारणारा Call to Action.
- "Call to Action" हा विभाग फक्त एकदाच द्या. "Call to Error", पुनरावृत्तीचे CTA, किंवा CTA नंतर अतिरिक्त परिच्छेद देऊ नका.
- प्रत्येक परिच्छेद विषयाशी थेट संबंधित असावा. विषयाशी संबंध नसलेली पार्श्वभूमी, काल्पनिक घटना, बनावट दावे किंवा अंदाज लिहू नका.
- ऐतिहासिक विषयात संशोधन संदर्भात स्पष्ट आधार नसलेली तारीख, व्यक्ती, संस्था, उद्धरण, आकडेवारी किंवा घटना जोडू नका. माहिती निश्चित नसेल तर ती वगळा; अंदाजाने भर घालू नका.
- मराठीमध्ये नैसर्गिक, व्याकरणदृष्ट्या योग्य वाक्ये लिहा. शब्दशः भाषांतर, चुकीचे शब्दप्रयोग, तुटक वाक्ये आणि निरर्थक पुनरावृत्ती टाळा.
- "द्या. द्या. द्या." सारखी पुनरावृत्ती, HTML entities, तुटलेला मजकूर किंवा अपूर्ण वाक्ये अजिबात देऊ नका.
- शेवटचा Call to Action पूर्ण झाल्यावर उत्तर थांबवा. त्यानंतर दुसरे शीर्षक किंवा मजकूर देऊ नका.
${minutes ? `\nअपेक्षित कालावधी: ${minutes} मिनिटे. साधारण 115 ते 125 बोलण्यायोग्य मराठी शब्द प्रति मिनिट लिहा. एक मिनिटासाठी साधारण 115–125 शब्दांचा सलग निवेदनयोग्य मजकूर द्या. अनावश्यक पुनरावृत्ती करून शब्दसंख्या वाढवू नका.` : ""}
`)
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

    // विषयाधारित संशोधन: फक्त YouTube / माहितीपट स्क्रिप्टसाठी
    let researchContext = "";
    if (isScriptRequest) {
      // संपूर्ण सूचना न शोधता प्रत्यक्ष विषय शोधा.
      const topicMatch = prompt.match(/(?:विषय|topic)\s*[:：]\s*([^\r\n]+)/i);
      const researchQuery = (topicMatch ? topicMatch[1] : prompt)
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180);

      if (researchQuery) {
        try {
          const searchWikipedia = async (language) => {
            const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
            url.search = new URLSearchParams({
              action: "query",
              list: "search",
              srsearch: researchQuery,
              srlimit: "2",
              format: "json",
              utf8: "1"
            });

            const response = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
            if (!response.ok) return [];
            const data = await response.json();
            return data?.query?.search || [];
          };

          // दोन भाषांतील शोध समांतर; Wikidata च्या अतिरिक्त दोन विनंत्या टाळल्या.
          const [mrResults, enResults] = await Promise.all([
            searchWikipedia("mr"),
            searchWikipedia("en")
          ]);

          const extractPages = async (language, results) => {
            const pageIds = results
              .map(item => item.pageid)
              .filter(Boolean);
            if (!pageIds.length) return "";

            const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
            url.search = new URLSearchParams({
              action: "query",
              prop: "extracts",
              exintro: "1",
              explaintext: "1",
              pageids: pageIds.join("|"),
              format: "json",
              utf8: "1"
            });

            const response = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
            if (!response.ok) return "";
            const data = await response.json();

            return Object.values(data?.query?.pages || {})
              .map(page => page.extract || "")
              .filter(Boolean)
              .map(text => text.slice(0, 2200))
              .join("\n\n");
          };

          const [mrExtract, enExtract] = await Promise.all([
            extractPages("mr", mrResults),
            extractPages("en", enResults)
          ]);

          researchContext = `\n\nप्राथमिक ऑनलाइन संदर्भ (फक्त स्क्रिप्टच्या विषयाशी संबंधित माहिती वापरा):
मराठी Wikipedia:
${mrExtract || "संबंधित माहिती उपलब्ध नाही."}

English Wikipedia:
${enExtract || "संबंधित माहिती उपलब्ध नाही."}

तथ्यतपासणी सूचना: Wikipedia हा प्राथमिक संदर्भ आहे; अंतिम किंवा निर्विवाद पुरावा नाही. दोन्ही भाषांतील माहिती विसंगत असल्यास वादग्रस्त तपशील निश्चित म्हणून मांडू नका. उपलब्ध संदर्भात नसलेली तारीख, संस्था, पुस्तक, व्यक्ती, उद्धरण किंवा घटना बनवू नका. माहिती अपुरी असल्यास ते स्पष्ट करा. अंतिम स्क्रिप्टमध्ये स्रोतांच्या लिंक देऊ नका.`;
        } catch (researchError) {
          researchContext = "\n\nऑनलाइन संशोधन सध्या उपलब्ध नाही. खात्री नसलेली माहिती, तारखा किंवा ऐतिहासिक तपशील बनवू नका.";
        }
      }
    }

    const result = await env.AI.run(
      "@cf/zai-org/glm-4.7-flash",
      {
        messages: [
          {
            role: "system",
            content: systemPrompt + durationInstruction + (isEnglishRequest ? "\\n\\nIMPORTANT: The user explicitly selected English. Write the entire response in English only, including all headings and the call to action. Do not write Marathi." : "")
          },
          {
            role: "user",
            content: prompt + "\n\n" + researchContext
          }
        ],
        // अनावश्यक पुनरावृत्ती/लूप कमी करण्यासाठी स्क्रिप्टला कालावधीनुसार मर्यादित टोकन्स.
        max_completion_tokens: isScriptRequest
          ? (minutes ? Math.min(6000, Math.max(1200, minutes * 1000)) : 3000)
          : 6000,
        temperature: isScriptRequest ? 0.25 : 0.45,
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

    let answer = String(rawAnswer || "").trim();

    if (!answer) {
      return new Response(JSON.stringify({
        error: "AI कडून रिकामे उत्तर मिळाले. कृपया पुन्हा प्रयत्न करा."
      }), { status: 502, headers });
    }

    // स्क्रिप्ट आउटपुटची मूलभूत गुणवत्ता तपासणी; खराब मजकूर ग्राहकाला दाखवू नका.
    const inspectScript = (value) => {
      const text = String(value || "").trim();
      const words = text.split(/\s+/).filter(Boolean);
      const sentences = text.split(/[.!?।]+/).map(s => s.trim()).filter(s => s.length > 18);
      const normalized = sentences.map(s => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim());
      const unique = new Set(normalized);
      const repeatedSentenceRatio = sentences.length
        ? 1 - (unique.size / sentences.length)
        : 0;
      const hasCorruption = text.includes("\uFFFD") || /\uFFFD/.test(text);
      const leaksInstructions = isEnglishRequest
        ? /Call to Error|Mandatory script requirements|Final Output Generation|Self-Correction|provided script|based on general historical knowledge|Disclaimer:/i.test(text)
        : /वापरकर्त्याने दिलेली माहिती संशयास्पद|अंतिम स्क्रिप्टमध्ये स्रोतांच्या लिंक|Call to Error|स्क्रिप्टसाठी बंधनकारक|Disclaimer:|Final Output Generation|Self-Correction|provided script|based on general historical knowledge|Title:|Introduction|Main Content|Conclusion|Disclaimer/i.test(text);
      const tooShort = minutes > 0 && words.length < Math.max(70, minutes * 75);
      const tooLong = minutes > 0 && words.length > minutes * 165;
      const repeated = repeatedSentenceRatio > 0.15;
      const brokenPunctuation = /[?]{6,}|(?:\.\.\.\s*){5,}|[\uFFFD]/u.test(text);
      const latinWords = (text.match(/[A-Za-z]{3,}/g) || []).length;
      const excessiveEnglish = !isEnglishRequest && words.length > 0 && latinWords / words.length > 0.08;
      const repeatedCta = (text.match(/Call\s*to\s*Action|कॉल\s*टू\s*ॲक्शन/gi) || []).length > 1;
      const hasScriptBody = /प्रस्तावना|मुख्य माहिती|मुख्य भाग|निष्कर्ष|समारोप|आढावा|\n/.test(text);
      return { valid: !hasCorruption && !leaksInstructions && !tooShort && !tooLong && !repeated && !brokenPunctuation && !excessiveEnglish && !repeatedCta && hasScriptBody, words: words.length };
    };

    if (isScriptRequest && !inspectScript(answer).valid) {
      // एकदाच पुनर्लेखनाचा प्रयत्न; खराब पहिला मसुदा अंतिम वापरकर्त्याला दाखवू नका.
      const repair = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
        messages: [
          {
            role: "system",
            content: isEnglishRequest
              ? "You are an English documentary scriptwriter. Write the complete script in natural English only: Title, Introduction, Main Content, Conclusion, and one brief audience-question call to action. Do not add explanations, disclaimers, internal notes, or alternate versions. Use only supported facts; never invent people, dates, places, institutions, or events. Avoid repetition, broken sentences, and typos. Aim for 115–125 speakable English words per minute. Output only the final script."
              : "तुम्ही मराठी माहितीपट लेखक आहात. उत्तर संपूर्णपणे मराठीत द्या. फक्त एकच स्क्रिप्ट लिहा: शीर्षक, प्रस्तावना, मुख्य माहिती, निष्कर्ष आणि शेवटी एक छोटा प्रेक्षक प्रश्न. इंग्रजी शीर्षके, Disclaimer, Self-Correction, स्पष्टीकरण, स्रोतांविषयी टिप्पणी, अंतर्गत सूचना किंवा दुसरी आवृत्ती लिहू नका. विषयाशी थेट संबंधित व पडताळलेल्या संदर्भातील माहितीच वापरा. व्यक्ती, वर्ष, गाव, संस्था किंवा घटना बनवू नका. पुनरावृत्ती, तुटकी वाक्ये आणि अक्षरदोष नकोत. एक मिनिटासाठी 115 ते 125 मराठी शब्द लिहा. फक्त अंतिम स्क्रिप्ट द्या."
          },
          {
            role: "user",
            content: prompt + "\n\n" + researchContext + "\n\nपहिला मसुदा वापरू नका आणि त्याची नक्कल करू नका. फक्त मूळ विषय व वरील संदर्भ वापरून नव्याने पूर्ण स्क्रिप्ट लिहा. संदर्भात आधार नसलेले तपशील घालू नका."
          }
        ],
        max_completion_tokens: minutes ? Math.min(6000, Math.max(1800, minutes * 1200)) : 3000,
        temperature: 0.2,
        frequency_penalty: 0.35,
        presence_penalty: 0.1,
        chat_template_kwargs: { enable_thinking: false }
      });

      const repairedMessage = repair?.choices?.[0]?.message || repair?.result?.choices?.[0]?.message || {};
      let repairedText = repairedMessage.content ?? repair?.response ?? repair?.result?.response ?? "";
      if (Array.isArray(repairedText)) {
        repairedText = repairedText.map(part => typeof part === "string" ? part : (part?.text || part?.content || "")).join("\n");
      } else if (repairedText && typeof repairedText === "object") {
        repairedText = repairedText.text || repairedText.content || "";
      }
      const candidate = String(repairedText || "").trim();
      if (candidate && inspectScript(candidate).valid) {
        answer = candidate;
      } else {
        return new Response(JSON.stringify({
          error: "AI ने दोन प्रयत्नांनंतरही गुणवत्ता तपासणी पूर्ण करणारी स्क्रिप्ट तयार केली नाही. कृपया काही वेळाने पुन्हा प्रयत्न करा. अपूर्ण किंवा चुकीचा मजकूर दाखवलेला नाही."
        }), { status: 502, headers });
      }
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
