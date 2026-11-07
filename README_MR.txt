SGGVISION AI — Live starter project (Cloudflare Pages)

या प्रोजेक्टमध्ये:
- मराठी वेबसाइट
- YouTube SEO आणि स्क्रिप्टसाठी AI UI
- Cloudflare Pages Function backend
- OpenAI API key browser मध्ये न दाखवता server-side secret म्हणून वापरणे

महत्त्वाचे:
- हे deploy केलेले नाही; तुमच्या Cloudflare खात्यातून publish करावे लागेल.
- ChatGPT Go subscription मध्ये API usage समाविष्ट नसते. API usage स्वतंत्रपणे बिल होते.
- API Key मला किंवा कोणालाही chat मध्ये पाठवू नका.
- आधी API usage budget/limits सेट करा. सार्वजनिक वेबसाइटवर login/rate-limit/abuse protection जोडण्यापूर्वी जास्त traffic घेऊ नका.
- या starter मध्ये पेमेंट gateway नाही. ग्राहकांकडून पैसे घेण्यासाठी आधी manually order + UPI तपासणी करा; नंतर Razorpay इ. payment gateway जोडता येईल.
- वेबसाइटचे AI फीचर API Key सेट केल्यावरच चालेल.

Cloudflare Pages deploy:
1. Cloudflare account तयार करा आणि Pages मध्ये हा प्रोजेक्ट GitHub repository द्वारे जोडून deploy करा.
2. Project Settings > Variables and Secrets मध्ये OPENAI_API_KEY नावाचा Secret जोडा.
3. OPENAI_MODEL नावाचा variable (पर्यायी) सेट करा; तुमच्या API project मध्ये उपलब्ध model निवडा.
4. Redeploy करा. नंतर वेबसाइटवरील AI टूल्स तपासा.
5. स्वतःचे domain नंतर Cloudflare Pages > Custom domains मधून जोडा.

API Key तयार करण्यासाठी:
https://platform.openai.com/api-keys
OpenAI API billing स्वतंत्रपणे सेट करावी लागते:
https://platform.openai.com/settings/organization/billing

Cloudflare:
https://dash.cloudflare.com/
Pages docs:
https://developers.cloudflare.com/pages/

पेमेंट QR:
- payment-qr.jpeg वेबसाइटच्या payment section मध्ये दाखवला जातो.
- UPI ID: shankar.gaikwad7@axisbank
- UPI व्यवहार प्रत्यक्ष खात्यात जमा झाला आहे का ते स्वतः बँक/UPI app मध्ये तपासा. वेबसाइट सध्या पेमेंटची स्वयंचलित पडताळणी करत नाही.
