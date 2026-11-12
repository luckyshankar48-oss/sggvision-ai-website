# SGGVISION AI quality benchmark

## Purpose

Choose the production model by measured performance on the actual SGGVISION use cases, not by brand name, parameter count, marketing claims or one impressive answer. This is a human-reviewed benchmark; a passing syntax check is not an AI-quality test.

## Candidate models

Run the same prompts with each available candidate, one at a time, using the Cloudflare Pages environment variable `SGGVISION_MODEL`:

- Current baseline: `@cf/zai-org/glm-4.7-flash`
- `@cf/zai-org/glm-5.3`
- `@cf/deepseek-ai/deepseek-v4.1-flash-1017`
- `@cf/google/gemma-4-26b-a4b-it`
- `@cf/openai/gpt-oss-120b`

The model catalogue and availability can change. Confirm that a candidate is currently available in the account before testing it. The allowlist in `functions/api/chat.js` must also contain the model ID. Do not switch production to a candidate merely because it is newer or larger.

## Test set

Use the exact same prompt, language setting and task mode for every candidate. Start a fresh chat for each test. Do not give one model extra context that another model did not receive.

### Marathi — 10 tests

1. **Natural Marathi:** "मराठीमध्ये कृत्रिम बुद्धिमत्ता म्हणजे काय ते इयत्ता आठवीच्या विद्यार्थ्याला समजेल अशा सोप्या आणि शुद्ध भाषेत समजावून सांगा."
2. **Matras and spelling:** "खालील वाक्य शुद्धलेखन आणि व्याकरणदृष्ट्या दुरुस्त करा; अर्थ बदलू नका: 'महाराष्ट्रातील ऐतिहासिक किल्ल्यांची माहिती पर्यटकांना उपयोगी पडतात आणि त्यांचे संवर्धन करणे गरजेचे आहे.'"
3. **Instruction following:** "फक्त तीन मुद्द्यांत उत्तर द्या. प्रत्येक मुद्दा एका वाक्याचा असावा. विषय: पाणी बचत."
4. **Uncertainty:** "काल मुंबईत नेमकी किती मिलिमीटर पावसाची नोंद झाली? आकडा माहीत नसेल तर स्पष्ट सांगा; अंदाज लावू नका."
5. **Proper nouns:** "या नावांची अक्षररचना जसाच्या तशी ठेवा आणि त्यावर ४ ओळींची सूचना लिहा: अंजिरवाडी, छत्रपती शिवाजी महाराज टर्मिनस, भीमाशंकर."
6. **Historical caution:** "रायगड किल्ल्याचा इतिहास २०० शब्दांत सांगा. खात्री नसलेल्या तारखा किंवा दावे बनवू नका; संदिग्ध बाबी स्पष्ट करा."
7. **Government information:** "आधार नोंदणीसाठी आज कोणती कागदपत्रे मान्य आहेत? अधिकृत स्रोत तपासता येत नसल्यास तसे स्पष्ट करा आणि खात्रीशीर माहिती असल्याचा दावा करू नका."
8. **Summarization:** "खालील मजकूर ५० शब्दांत संक्षिप्त करा. नवीन माहिती जोडू नका: [इथे सर्व मॉडेलना समान मजकूर द्या]."
9. **Tone control:** "ग्रामस्थांना पाणीपुरवठा बंद राहणार असल्याची नम्र, स्पष्ट आणि अधिकृत सूचना तयार करा. वेळ आणि तारीख दिलेली नाही; ती स्वतःहून तयार करू नका."
10. **Correction discipline:** "या वाक्यातील फक्त व्याकरण दुरुस्त करा; व्यक्तींची नावे, गावांची नावे आणि आकडे बदलू नका: '[सर्व मॉडेलना समान तपासणी-वाक्य द्या]'."

### Hindi — 5 tests

11. "जल संरक्षण पर कक्षा 8 के विद्यार्थी के लिए सरल और स्वाभाविक हिंदी में 120 शब्द लिखिए।"
12. "इस वाक्य का व्याकरण सुधारें, अर्थ न बदलें: 'महाराष्ट्र के ऐतिहासिक किले पर्यटकों को आकर्षित करता है।'"
13. "यदि आपको आज की मुंबई की स्थानीय खबर की पुष्टि करने का साधन नहीं है, तो क्या आप उसे सत्यापित बताकर लिखेंगे? स्पष्ट उत्तर दें।"
14. "नीचे दिए गए नाम और तारीख बिल्कुल वैसे ही रखें और 4 पंक्तियों की सूचना लिखें: [सभी मॉडलों को समान नाम/तारीख दें]।"
15. "इस अनुच्छेद का 5 बिंदुओं में सारांश दें; कोई नई जानकारी न जोड़ें: [सभी मॉडलों को समान अनुच्छेद दें]।"

### English — 5 tests

16. "Explain how a solar panel works to a 12-year-old in 120 words."
17. "Correct the grammar without changing meaning or numbers: 'The team have completed 3 reports and submit it yesterday.'"
18. "What is the current price of a named product today? If live price lookup is unavailable, say so instead of guessing."
19. "Summarize this text in exactly three bullets without adding facts: [same supplied text for all models]."
20. "Write a polite notice about a meeting. The date, time and venue are unknown; do not invent them."

### SGGVISION creator tasks — 10 tests

21. **Marathi travel script:** "गंधारपाले बुद्ध लेणी यावर ५ मिनिटांची मराठी व्हिडिओ स्क्रिप्ट लिहा. इतिहासातील अनिश्चित दावे ठामपणे मांडू नका."
22. **Marathi heritage script:** "चवदार तळे, महाड यावर ३ मिनिटांची माहितीपूर्ण स्क्रिप्ट लिहा. ऐतिहासिक तथ्ये आणि निवेदन वेगळे ठेवा."
23. **YouTube SEO:** "मुंबईतील डोंगरी परिसरातील आगीच्या घटनेवरील व्हिडिओसाठी १०० अक्षरांच्या आत शीर्षक, संक्षिप्त वर्णन, संबंधित टॅग आणि हॅशटॅग द्या. दिलेल्या माहितीबाहेर तपशील बनवू नका."
24. **Thumbnail brief:** "भीमाशंकर जंगलातील वृक्षतोडविरोधी आंदोलनासाठी १६:९ न्यूज थंबनेलची सूचना द्या. मुख्य मजकूर लहान, अचूक मराठीत असावा; वरच्या उजव्या कोपऱ्यात चॅनेल लोगोकरिता जागा ठेवा."
25. **Shorts SEO:** "एका मराठी YouTube Shorts साठी शीर्षक, वर्णन आणि ५ संबंधित हॅशटॅग द्या. शीर्षक १०० अक्षरांच्या आत ठेवा."
26. **Application:** "दिलेल्या माहितीवरून मराठीत औपचारिक अर्ज तयार करा. दिलेली तारीख, पत्ता आणि कागदपत्रांची नावे तशीच ठेवा; माहिती नसलेली बाब रिकामी/स्पष्ट ठेवा: [सर्व मॉडेलना समान माहिती द्या]."
27. **Translation:** "या इंग्रजी परिच्छेदाचा अर्थ न बदलता नैसर्गिक मराठीत अनुवाद करा. व्यक्तींची नावे आणि आकडे जसेच्या तसे ठेवा: [सर्व मॉडेलना समान परिच्छेद द्या]."
28. **Fact separation:** "या दिलेल्या मजकुरातून पडताळता येणारी तथ्ये आणि मत/अंदाज वेगळे दाखवा. मजकुराबाहेरील तथ्ये जोडू नका: [समान मजकूर द्या]."
29. **Character limit:** "१०० अक्षरांच्या आत तीन वेगवेगळी YouTube शीर्षके तयार करा. प्रत्येक शीर्षकाची अक्षरसंख्या शीर्षकानंतर कंसात द्या. विषय: [सर्व मॉडेलना समान विषय द्या]."
30. **Revision discipline:** "खालील मजकूर अधिक स्पष्ट आणि शुद्ध करा. अर्थ, नावे, तारखा, ठिकाणे किंवा आकडे बदलू नका. आधी सुधारित मजकूर द्या आणि नंतर केलेल्या बदलांची छोटी यादी द्या: [समान मजकूर द्या]."

Replace bracketed placeholders with one fixed reference input before running the benchmark; keep that exact input identical for every model.

## Scoring rubric

Score every test from 0 to 5 in each category:

- Factual reliability and appropriate uncertainty: **30%**
- Marathi/Hindi/English language quality, spelling and grammar: **25%**
- Following exact instructions and preserving names/numbers: **20%**
- Completeness and usefulness for the requested task: **15%**
- Clarity and presentation: **10%**

Weighted score = category score / 5 × category weight, summed to 100.

### Automatic fail conditions

A test fails regardless of its numeric score if the model:
- invents a current fact, date, legal rule, number, citation or source;
- changes a user-provided name, date, place or number without permission;
- claims it checked a live/official source when it did not;
- ignores a critical format, language or character-limit instruction.

## Decision rule

- Test each candidate on all 30 prompts, ideally twice on a smaller subset to check consistency.
- Have a Marathi-fluent reviewer score Marathi answers; do not let the model grade itself.
- Record model ID, date, latency, any usage cost, each score and each failure.
- Choose the highest-scoring model only if it passes every critical safety/factuality check and its price/latency are acceptable.
- If no candidate passes, do not call the portal production-ready. Improve retrieval, source verification or specialist translation/proofreading rather than pretending a model alone guarantees accuracy.

## Current limitations

The current chat endpoint has no web-search or official-source retrieval integration. Prompt instructions can reduce confident guessing but cannot independently verify facts. The quality benchmark is not a live runtime test; it must be run against a deployed preview with a working Workers AI binding.
