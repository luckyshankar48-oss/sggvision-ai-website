import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/chat.js";

const endpoint = "https://portal.example/api/chat";
const headers = { "Content-Type": "application/json", Origin: "https://portal.example" };
const context = (body, env = { AI: { run: async () => ({ response: "नमस्कार!" }) } }, extraHeaders = headers) => ({
  request: new Request(endpoint, { method: "POST", headers: extraHeaders, body }),
  env
});
const payload = (messages = [{ role: "user", content: "नमस्कार" }]) => JSON.stringify({ messages, language: "mr", mode: "general" });
const read = async response => ({ status: response.status, body: await response.json() });

test("rejects malformed JSON", async () => {
  const result = await read(await onRequestPost(context("{")));
  assert.equal(result.status, 400);
  assert.equal(result.body.error, "Invalid JSON.");
});

test("rejects a JSON null root without throwing", async () => {
  const result = await read(await onRequestPost(context("null")));
  assert.equal(result.status, 400);
  assert.equal(result.body.error, "Request body must be a JSON object.");
});

test("rejects cross-origin requests", async () => {
  const result = await read(await onRequestPost(context(payload(), undefined, {
    "Content-Type": "application/json", Origin: "https://attacker.example"
  })));
  assert.equal(result.status, 403);
});

test("rejects unsupported content types", async () => {
  const result = await read(await onRequestPost(context("{}", undefined, {
    "Content-Type": "text/plain", Origin: "https://portal.example"
  })));
  assert.equal(result.status, 415);
});

test("rejects misleading JSON-like content types", async () => {
  const result = await read(await onRequestPost(context("{}", undefined, {
    "Content-Type": "application/jsonp", Origin: "https://portal.example"
  })));
  assert.equal(result.status, 415);
});

test("rejects conversations that exceed the aggregate input limit", async () => {
  const messages = [9000, 9000, 7000].map((length, index) => ({
    role: index % 2 ? "assistant" : "user", content: "x".repeat(length)
  }));
  const result = await read(await onRequestPost(context(payload(messages))));
  assert.equal(result.status, 413);
});

test("reports a missing AI binding only after validating the request", async () => {
  const result = await read(await onRequestPost(context(payload(), {})));
  assert.equal(result.status, 503);
});

test("returns the AI response and calls the configured default model", async () => {
  let calledModel = "";
  const env = { AI: { run: async model => { calledModel = model; return { response: "नमस्कार!" }; } } };
  const result = await read(await onRequestPost(context(payload(), env)));
  assert.equal(result.status, 200);
  assert.equal(result.body.response, "नमस्कार!");
  assert.equal(calledModel, "@cf/zai-org/glm-4.7-flash");
});

test("does not expose provider exception details", async () => {
  const env = { AI: { run: async () => { throw new Error("private provider detail"); } } };
  const result = await read(await onRequestPost(context(payload(), env)));
  assert.equal(result.status, 502);
  assert.doesNotMatch(result.body.error, /private provider detail/);
});

test("accepts a valid numeric Content-Length header", async () => {
  const body = payload();
  const request = {
    url: endpoint,
    headers: new Headers({ ...headers, "Content-Length": String(new TextEncoder().encode(body).byteLength) }),
    arrayBuffer: async () => new TextEncoder().encode(body).buffer
  };
  const result = await read(await onRequestPost({
    request,
    env: { AI: { run: async () => ({ response: "नमस्कार!" }) } }
  }));
  assert.equal(result.status, 200);
});

test("rejects a non-numeric Content-Length header", async () => {
  const body = payload();
  const request = {
    url: endpoint,
    headers: new Headers({ ...headers, "Content-Length": "unknown" }),
    arrayBuffer: async () => new TextEncoder().encode(body).buffer
  };
  const result = await read(await onRequestPost({
    request,
    env: { AI: { run: async () => ({ response: "नमस्कार!" }) } }
  }));
  assert.equal(result.status, 413);
});

test("returns OpenAI-compatible Workers AI chat completion content", async () => {
  const env = { AI: { run: async () => ({ choices: [{ message: { content: "नमस्कार, मी SGGVISION AI आहे." } }] }) } };
  const result = await read(await onRequestPost(context(payload(), env)));
  assert.equal(result.status, 200);
  assert.equal(result.body.response, "नमस्कार, मी SGGVISION AI आहे.");
});

test("returns text parts from a multimodal chat completion content array", async () => {
  const env = { AI: { run: async () => ({ choices: [{ message: { content: [{ type: "text", text: "पहिले वाक्य. " }, { type: "text", text: "दुसरे वाक्य." }] } }] }) } };
  const result = await read(await onRequestPost(context(payload(), env)));
  assert.equal(result.status, 200);
  assert.equal(result.body.response, "पहिले वाक्य. दुसरे वाक्य.");
});
