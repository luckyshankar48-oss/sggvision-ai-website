SGGVISION AI Digital Services — Cloudflare Pages package

या ZIP मध्ये:
- index.html: मराठी वेबसाइट आणि OpenAI API वापरणारी AI साधने
- payment-qr.jpeg: पेमेंट QR प्रतिमा
- functions/api/generate.js: Cloudflare Pages Function (OpenAI Responses API)

Cloudflare Pages मध्ये GitHub repo च्या root मध्ये या फाईल्स अपलोड करा. functions फोल्डर index.html च्या शेजारी root level वरच असावा.

Cloudflare Pages > Settings > Variables and Secrets मध्ये Production environment साठी Secret तयार करा:
Name: OPENAI_API_KEY
Value: तुमची OpenAI API key

Secret save केल्यानंतर Deployments मधून नवीन deployment/retry करा. API key HTML, GitHub repo, screenshot किंवा chat मध्ये कधीही टाकू नका.

AI साधने: YouTube SEO मजकूर आणि मराठी व्हिडिओ स्क्रिप्ट. दोन्ही /api/generate endpoint वापरतात.

महत्त्वाच्या मर्यादा: ही आवृत्ती AI text generation जोडते. लॉगिन, ग्राहक ऑर्डर साठवणूक, ईमेल पाठवणे आणि पेमेंटची स्वयंचलित पडताळणी यात समाविष्ट नाहीत. QR पेमेंट स्वतंत्रपणे ग्राहकाच्या UPI ॲपमध्ये तपासावे. API वापरासाठी OpenAI API खात्यात बिलिंग/क्रेडिट आणि योग्य model access आवश्यक असू शकतो.
