# SGGVISION AI — सुरक्षित पेमेंट सुरू करण्याची तपासणी यादी

## सध्याची स्थिती

- ग्राहक खाते आणि सर्व्हरवरील वापर मर्यादा यांचे कोड अस्तित्वात आहे.
- एकच ३० दिवसांचा प्रस्तावित प्लॅन ₹199 आहे.
- पेमेंट बटण आणि QR सध्या मुद्दाम बंद आहेत.
- कोणतेही ग्राहक पेमेंट स्वीकारू नये, जोपर्यंत खालील सर्व चाचण्या पूर्ण होत नाहीत.
- `migrations/0002_payment_audit.sql` webhook audit आणि duplicate-event नोंदीसाठी आहे; ती D1 मध्ये लागू केल्याशिवाय त्यावर अवलंबून राहू नये.

## निवडलेली दिशा

प्रथम Razorpay merchant account आणि UPI QR सुविधा उपलब्ध आहे का ते तपासायचे. व्यापारी खाते मंजूर झाले आणि QR API सक्षम झाली तरच Dynamic QR वापरायचा. ग्राहक कोणत्याही समर्थित UPI app मधून पैसे भरू शकेल. Static personal UPI QR किंवा ग्राहकाने पाठवलेला screenshot हा पेमेंटचा पुरावा मानायचा नाही.

## Merchant onboarding

1. अधिकृत Razorpay वेबसाइटवरून व्यवसाय/व्यापारी खाते उघडा.
2. व्यवसायाचे नाव, मालकाची माहिती, PAN/KYC आणि स्वतःच्या नावाचे बँक खाते provider च्या अधिकृत portal मध्येच द्या.
3. वेबसाइट URL म्हणून SGGVISION AI पोर्टल द्या आणि सेवा/किंमत स्पष्ट लिहा.
4. UPI QR / Dynamic QR सुविधा आणि वेबसाइटवरून पेमेंट स्वीकारण्याची परवानगी मागा.
5. शुल्क, settlement schedule, refund/dispute प्रक्रिया आणि लागू अटी वाचा.
6. Live API credentials आणि webhook secret फक्त Cloudflare Pages Production secrets मध्ये ठेवा. GitHub, browser JavaScript, source files किंवा chat मध्ये कधीही ठेवू नका.

## Production secrets (फक्त व्यापारी खाते मंजूर झाल्यावर)

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `SESSION_PEPPER` — मजबूत, यादृच्छिक secret; आधीच्या session hashes शी सुसंगत ठेवण्याची काळजी घ्या.

## पेमेंट सुरक्षिततेचे अनिवार्य नियम

1. Order amount आणि plan ID server कडून ठरवले जातील; browser ने पाठवलेली किंमत मान्य करू नये.
2. प्रत्येक order साठी unique internal order ID वापरावा.
3. QR/order तयार होण्यापूर्वी customer login आणि active account तपासावे.
4. Webhook चा raw request body घेऊन provider signature constant-time पद्धतीने verify करावी.
5. Signature invalid असेल तर कोणतीही payment/subscription row बदलू नये.
6. फक्त provider ने पुष्टी केलेला captured/paid व्यवहारच स्वीकारावा; pending/failed/authorized पुरेसे नाहीत.
7. Provider order ID, payment ID, amount आणि INR currency आपल्या D1 मधील अपेक्षित order शी जुळवावेत.
8. Duplicate webhook पुन्हा आल्यास पुन्हा subscription देऊ नये. Event ID आणि payment ID दोन्ही idempotent ठेवावेत.
9. Payment paid झाल्यानंतरच एका transaction मध्ये payment नोंदवून subscription सुरू करावी; ३० दिवसांची मुदत server time ने ठरवावी.
10. Refund झाल्यास किंवा dispute आल्यास admin audit trail राखावा; refund स्थितीमुळे access बदलण्याचे नियम स्पष्ट असावेत.
11. Customer ला success page दाखवणे हे payment proof नाही. UI ने status API कडून server-side स्थिती वाचावी.
12. API secrets, full payment payloads मधील वैयक्तिक माहिती किंवा card/UPI credentials logs मध्ये टाकू नयेत.

## Live करण्यापूर्वीच्या चाचण्या

- चुकीची signature — reject.
- वेगळा amount / currency — reject.
- दुसऱ्या order चा payment ID — reject.
- pending किंवा failed payment — access बंद.
- एकच webhook २ किंवा अधिक वेळा — एकच subscription.
- payment captured — योग्य ग्राहकाला ३० दिवस.
- refund/dispute — admin नोंद आणि ठरलेली प्रक्रिया.
- webhook उशिरा आला — ग्राहकाला pending status दिसावा; बनावट success नाही.
- gateway/API outage — ग्राहकाचे पैसे घेतल्याचा खोटा संदेश नाही.

## सध्या काय बाकी आहे

Merchant account मंजुरी, QR API access, D1 migration लागू करणे, Cloudflare secrets/bindings पडताळणे, backend order/webhook implementation आणि end-to-end test. ही कामे पूर्ण होईपर्यंत पेमेंट सुरू करू नये.
