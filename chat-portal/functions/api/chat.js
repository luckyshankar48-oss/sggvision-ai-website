import { consumeUsage, releaseUsage } from "./_lib/usage.js";
const MAX_BODY = 256 * 1024;
const MAX_MESSAGES = 16;
const MAX_CHARS = 12000;
const MAX_TOTAL_CHARS = 24000;
const DEFAULT_MODEL = "@cf/zai-org/glm-4.7-flash";
const ALLOWED_MODELS = new Set([
  DEFAULT_MODEL,
  "@cf/zai-org/glm-5.3",
  "@cf/deepseek-ai/deepseek-v4.1-flash-1017",
  "@cf/google/gemma-4-26b-a4b-it",
  "@cf/openai/gpt-oss-120b"
]);

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  const host = new URL(request.url).host;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return json({ error: "Origin not allowed." }, 403);
    } catch { return json({ error: "Invalid origin." }, 403); }
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type")?.trim() || "")) {
    return json({ error: "Content-Type must be application/json." }, 415);
  }
  const declaredLength = request.headers.get("Content-Length");
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_BODY)) {
    return json({ error: "Request too large." }, 413);
  }
  let raw;
  try {
    raw = await request.arrayBuffer();
  } catch {
    return json({ error: "Could not read request body." }, 400);
  }
  if (raw.byteLength > MAX_BODY) return json({ error: "Request too large." }, 413);
  let body;
  try {
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "Request body must be a JSON object." }, 400);
  }
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > MAX_MESSAGES) {
    return json({ error: "Send between 1 and 16 messages." }, 400);
  }
  const allowed = new Set(["user", "assistant"]);
  const messages = [];
  let totalChars = 0;
  for (const item of body.messages) {
    if (!item || typeof item !== "object" || !allowed.has(item.role) || typeof item.content !== "string" || !item.content.trim() || item.content.length > MAX_CHARS) {
      return json({ error: "Invalid message format or message too long." }, 400);
    }
    totalChars += item.content.length;
    if (totalChars > MAX_TOTAL_CHARS) {
      return json({ error: "Conversation is too long. Start a new chat or shorten the messages." }, 413);
    }
    messages.push({ role: item.role, content: item.content.trim() });
  }
  if (!env.AI || typeof env.AI.run !== "function") {
    return json({ error: "AI service is not configured. Add a Cloudflare Workers AI binding named AI." }, 503);
  }
  const usage = await consumeUsage(request, env).catch(() => ({ ok:false, status:503, error:"वापर मर्यादा तपासता आली नाही." }));
  if (!usage.ok) return json({ error: usage.error, remaining: 0 }, usage.status, usage.setCookie);
  const language = ["mr", "hi", "en"].includes(body.language) ? body.language : "auto";
  const languageRule = language === "mr" ? "Reply in natural, correct Marathi written in Devanagari." :
    language === "hi" ? "Reply in natural Hindi written in Devanagari." :
    language === "en" ? "Reply in clear English." :
    "Automatically identify the language and writing style of the user's latest request. Customers may write in any language, including Marathi, Hindi, English, Romanized Marathi (Marathi written with English letters), Romanized Hindi, Hinglish, mixed-language sentences, or other languages. Understand transliteration and spelling variations; do not mistake Romanized Marathi or Hindi for English. Reply in the same language the customer used. For Romanized Marathi, reply in natural Devanagari Marathi by default; for Romanized Hindi, reply in Devanagari Hindi by default. If the customer clearly asks for Roman letters/transliteration, mirror that. For mixed-language requests, use the dominant language and retain necessary technical terms. Never force Marathi on customers who use another language.";
  const mode = ["general", "script", "seo", "thumbnail", "translate", "writing", "support"].includes(body.mode) ? body.mode : "general";
  const modeRules = {
    general: "Handle the user's request directly. Ask one concise clarification only when essential information is missing.",
    script: "Act as a professional Marathi/Hindi/English video scriptwriter. Structure scripts with a strong opening hook, factual context, clear sections, smooth narration and a memorable close. Respect the requested duration and do not fabricate historical or current facts. For Marathi, proofread every word and matra.",
    seo: "Create YouTube-ready title options, a clear description, relevant tags and hashtags. Keep the title within the user's character limit when specified. Do not stuff irrelevant keywords. Put copy-ready items in separate labelled sections.",
    thumbnail: "Create a detailed YouTube thumbnail brief: exact headline, short subtitle, visual hierarchy, background, subject placement, contrast and 16:9 or 9:16 size as requested. Preserve the user's exact Marathi wording and spelling. Do not claim an image file was generated; provide the brief unless an image-generation tool is actually available.",
    translate: "Translate faithfully while preserving meaning, names, dates and tone. For Marathi, use correct Devanagari spelling, grammar and matras. If asked to proofread, return the corrected text and briefly list important corrections.",
    writing: "Draft polished, ready-to-use applications, letters, notices and professional messages. Preserve all supplied facts, dates and names. Never add legal or personal facts that the user did not provide.",
    support: "You are the SGGVISION AI customer-support assistant. Help users operate this portal with short, step-by-step instructions in their language. Cover changing language, starting a new chat, choosing task modes, sending messages, browser refresh, connection errors, and how to contact support. Be patient and never blame the user. Do not claim access to their account, billing, device, Cloudflare, or server logs. Do not claim to have fixed anything. Never ask for passwords, OTPs, API keys, payment-card details, or other secrets. If the issue cannot be solved from the information provided, explain that a human support response is not instant and direct them to sggvisiondigitalservices@gmail.com; suggest including the error message, browser/device, and approximate time, but no passwords or secret tokens. Do not invent response times or support availability."
  };
  const system = [
    "You are SGGVISION AI, a helpful, honest and capable general-purpose assistant.",
    languageRule,
    modeRules[mode],
    "Accuracy is more important than sounding confident. If a detail is unknown or not supported by the conversation, say so or ask one necessary question. Never guess names, dates, locations, figures, legal rules, quotations, sources, citations, links, prices or completed actions.",
    "Do not claim that you searched the web, checked an official source, verified a fact, or performed an action unless a tool actually did it in this request. No web-search tool is connected to this endpoint yet; for current news, government rules, prices, schedules or changing facts, clearly say that live source verification is unavailable and identify what needs checking.",
    "Preserve every user-provided proper name, date, number, place and exact wording unless the user asks to correct it. Never silently replace a specific fact with an invented one.",
    "Language handling is essential for a multilingual customer portal: detect the customer's actual language from the latest message, including Romanized Indian languages and code-switching. Do not assume every customer speaks Marathi. Do not interpret Romanized Marathi such as 'mala script dya' as English; understand its Marathi meaning and answer in fluent Devanagari Marathi by default. Apply equivalent native-script handling to Romanized Hindi. If the customer requests a particular language or script, follow that request. For Marathi, check spelling, मात्रा, वेलांटी, अनुस्वार, जोडाक्षरे and grammar; preserve proper nouns.",
    "Before responding, silently review the answer for factual consistency, instruction compliance, missing requested parts, spelling and grammar. This review is not independent fact verification; disclose uncertainty where appropriate.",
    "Use readable headings and lists when useful. Keep the answer focused on the requested task."
  ].join(" ");
  try {
    const requestedModel = typeof env.SGGVISION_MODEL === "string" ? env.SGGVISION_MODEL.trim() : DEFAULT_MODEL;
    const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : DEFAULT_MODEL;
    const input = {
      messages: [{ role: "system", content: system }, ...messages],
      max_tokens: 4096
    };
    let result;
    let response = "";
    // Workers AI can occasionally return an empty payload during a transient
    // inference issue. Retry once before returning an error to the visitor.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      result = await env.AI.run(model, input);
      // Support the legacy { response } shape and OpenAI-compatible choices.
      const choiceContent = result?.choices?.[0]?.message?.content;
      response = typeof result?.response === "string"
        ? result.response
        : typeof choiceContent === "string"
          ? choiceContent
          : Array.isArray(choiceContent)
            ? choiceContent
                .filter((part) => part && typeof part.text === "string")
                .map((part) => part.text)
                .join("")
            : "";
      if (response.trim()) break;
    }
    if (!response.trim()) {
      console.error("SGGVISION AI returned no text after one retry. Result keys:", Object.keys(result || {}).join(", "));
      await releaseUsage(usage, env).catch(() => {});
      return json({ error: "AI returned an empty response after retry. Please try again." }, 502, usage.setCookie);
    }
    return json({ response: response.trim(), remaining: usage.remaining ?? null }, 200, usage.setCookie);
  } catch (error) {
    // Keep provider details and secrets out of the public response.
    console.error("SGGVISION AI request failed:", error?.message || "unknown error");
    await releaseUsage(usage, env).catch(() => {});
    return json({ error: "AI सेवा सध्या उपलब्ध नाही. थोड्या वेळाने पुन्हा प्रयत्न करा." }, 502, usage.setCookie);
  }
}
function json(data, status, cookie) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff", ...(cookie ? { "Set-Cookie": cookie } : {})
    }
  });
}
