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
  if (declaredLength && (!/^\\d+$/.test(declaredLength) || Number(declaredLength) > MAX_BODY)) {
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
  const language = ["mr", "hi", "en"].includes(body.language) ? body.language : "auto";
  const languageRule = language === "mr" ? "Reply in natural, correct Marathi." :
    language === "hi" ? "Reply in natural Hindi." :
    language === "en" ? "Reply in clear English." :
    "Reply in the same language as the user's latest message. Support Marathi, Hindi and English.";
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
    "For Marathi, write natural, fluent Devanagari Marathi, not literal word-for-word translation. Check spelling, मात्रा, वेलांटी, अनुस्वार, जोडाक्षरे and grammar. Do not alter proper nouns merely to make them look familiar. Avoid unnecessary English words.",
    "Before responding, silently review the answer for factual consistency, instruction compliance, missing requested parts, spelling and grammar. This review is not independent fact verification; disclose uncertainty where appropriate.",
    "Use readable headings and lists when useful. Keep the answer focused on the requested task."
  ].join(" ");
  try {
    const requestedModel = typeof env.SGGVISION_MODEL === "string" ? env.SGGVISION_MODEL.trim() : DEFAULT_MODEL;
    const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : DEFAULT_MODEL;
    const result = await env.AI.run(model, {
      messages: [{ role: "system", content: system }, ...messages],
      max_tokens: 1800
    });
    const response = result?.response;
    if (typeof response !== "string" || !response.trim()) {
      return json({ error: "AI returned an empty response. Please try again." }, 502);
    }
    return json({ response: response.trim() }, 200);
  } catch (error) {
    // Keep provider details and secrets out of the public response.
    console.error("SGGVISION AI request failed:", error?.message || "unknown error");
    return json({ error: "AI सेवा सध्या उपलब्ध नाही. थोड्या वेळाने पुन्हा प्रयत्न करा." }, 502);
  }
}
function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
