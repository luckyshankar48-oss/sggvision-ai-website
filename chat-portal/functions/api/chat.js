const MAX_BODY = 256 * 1024;
const MAX_MESSAGES = 16;
const MAX_CHARS = 12000;

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  const host = request.headers.get("Host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return json({ error: "Origin not allowed." }, 403);
    } catch { return json({ error: "Invalid origin." }, 403); }
  }
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ error: "Content-Type must be application/json." }, 415);
  }
  if (!env.AI || typeof env.AI.run !== "function") {
    return json({ error: "AI service is not configured. Add a Cloudflare Workers AI binding named AI." }, 503);
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY) return json({ error: "Request too large." }, 413);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > MAX_MESSAGES) {
    return json({ error: "Send between 1 and 16 messages." }, 400);
  }
  const allowed = new Set(["user", "assistant"]);
  const messages = [];
  for (const item of body.messages) {
    if (!item || !allowed.has(item.role) || typeof item.content !== "string" || !item.content.trim() || item.content.length > MAX_CHARS) {
      return json({ error: "Invalid message format or message too long." }, 400);
    }
    messages.push({ role: item.role, content: item.content.trim() });
  }
  const language = ["mr", "hi", "en"].includes(body.language) ? body.language : "auto";
  const languageRule = language === "mr" ? "Reply in natural, correct Marathi." :
    language === "hi" ? "Reply in natural Hindi." :
    language === "en" ? "Reply in clear English." :
    "Reply in the same language as the user's latest message. Support Marathi, Hindi and English.";
  const system = [
    "You are SGGVISION AI, a helpful, honest and capable general-purpose assistant.",
    languageRule,
    "Be accurate, clear and practical. If uncertain, say so; never invent facts, citations, links, prices or completed actions.",
    "Use readable headings and lists when useful. For requests involving current facts, explain when live verification is needed.",
    "For Marathi, use correct Devanagari spelling and natural grammar."
  ].join(" ");
  try {
    const result = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
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
