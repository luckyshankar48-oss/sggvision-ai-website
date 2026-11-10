SGGVISION AI Digital Services — Cloudflare Pages package

मुख्य फाईल्स:
- index.html: SGGVISION AI Digital Services वेबसाइट
- payment-qr.jpeg: पेमेंटसाठी QR प्रतिमा (साइटवर वापरली असल्यास)
- functions/api/generate.js: Cloudflare Pages Function — /api/generate
- functions/api/thumbnail.js: Cloudflare Pages Function — /api/thumbnail

प्रकाशन:
1. GitHub repository च्या root मध्ये index.html ठेवा.
2. functions फोल्डर index.html च्या शेजारी root level वर असावा.
3. Cloudflare Pages प्रकल्प GitHub च्या main branch शी जोडलेला असावा.
4. Workers & Pages > प्रकल्प > Settings > Functions/Bindings मध्ये Workers AI binding चे नाव AI असावे.
5. Binding बदलल्यास नवीन Production deployment पूर्ण होऊ द्या.

महत्त्वाचे:
- सध्याचा generate.js Cloudflare Workers AI मधील @cf/zai-org/glm-4.7-flash मॉडेल वापरतो. या कोडसाठी OPENAI_API_KEY आवश्यक नाही.
- Workers AI वापरासाठी Cloudflare खात्यात संबंधित Workers AI सुविधा आणि वापर मर्यादा/बिलिंग लागू होऊ शकतात.
- AI तयार केलेला मजकूर प्रकाशित करण्यापूर्वी तथ्य, नावे, तारखा आणि मराठी शुद्धलेखन तपासा.
- लॉगिन, ग्राहक ऑर्डर साठवणूक, ईमेल पाठवणे आणि पेमेंटची स्वयंचलित पडताळणी उपलब्ध असल्याचा दावा करू नका, जोपर्यंत त्या सुविधा स्वतंत्रपणे जोडून तपासलेल्या नाहीत.
- QR पेमेंटची प्राप्ती ग्राहकाच्या UPI ॲप/बँक खात्यात स्वतंत्रपणे तपासा.
- API secrets किंवा वैयक्तिक credentials HTML, GitHub repository, screenshots किंवा chat मध्ये कधीही टाकू नका.

मुख्य AI साधने:
- YouTube SEO मजकूर
- YouTube व्हिडिओ स्क्रिप्ट
- थंबनेलसाठी AI सुविधा

ही माहिती repository च्या सध्याच्या कोडनुसार आहे. प्रत्यक्ष साइटवरील प्रत्येक सुविधा स्वतंत्रपणे तपासल्याशिवाय ती पूर्ण झाली आहे असे समजू नका.
