# SGGVISION AI — Chat Portal v1

A clean, independent ChatGPT-style chat interface for SGGVISION. It is not a copy of ChatGPT or OpenAI's private software.

## Included
- Responsive chat interface for desktop and mobile
- Marathi, Hindi, English and automatic language mode
- New conversations and recent conversation list
- Browser-local conversation history (localStorage)
- Cloudflare Pages Function at `/api/chat`
- Default Workers AI model: `@cf/zai-org/glm-4.7-flash`
- Allowlisted model override through the `SGGVISION_MODEL` Pages environment variable
- Strict accuracy, uncertainty, proper-name preservation and Marathi proofreading instructions
- Request validation, payload limits, same-host Origin check and safe public errors

## Advertising foundation

- Reserved desktop right-rail and mobile banner placements are present but remain hidden by default.
- No third-party ad scripts, tracking pixels, or paid placements are loaded in v1.
- Ad inventory must be enabled only after a verified campaign is approved; every paid placement must be labelled “जाहिरात” or “प्रायोजित”.
- Ads must remain separate from AI answers and must never cover the chat composer, messages, or navigation.
- An advertiser inquiry form and authenticated campaign-management workflow are not connected yet. Do not present a non-functional form as a live contact channel.

## Cloudflare Pages deployment
Configure the Pages project to deploy this folder as its **Root directory**:

`chat-portal`

Build command: leave empty (static HTML and Pages Functions).
Build output directory: `.`

In Cloudflare Pages → Settings → Functions → Workers AI, add a binding:
- Variable name: `AI`
- Cloudflare Workers AI binding: enabled

Optional model selection: set the Pages environment variable `SGGVISION_MODEL` to one of the allowlisted IDs in `functions/api/chat.js`. If it is unset or not allowlisted, the endpoint uses the default model. Candidate availability can change; confirm availability in the Cloudflare model catalogue before switching. Do not select a model based on its name alone.

Deploy the `chat-portal-v1` branch to a separate Pages preview/project first. Do not change the existing production project's branch or root directory until the preview is tested and approved.

## Quality testing and model selection

Use [QUALITY-BENCHMARK.md](./QUALITY-BENCHMARK.md) to compare the baseline with alternative models on the same 30 Marathi, Hindi, English and SGGVISION creator prompts. Score answers with a human reviewer, including a Marathi-fluent reviewer. Do not treat automated syntax checks or model self-review as proof of factual accuracy.

The endpoint currently has no web-search or official-source retrieval integration. Its instructions explicitly tell the model not to claim live verification and to disclose when current facts cannot be checked. This reduces unsupported certainty but does not guarantee truth.

## Important limitations in v1
- Chat history is stored only in the current browser; there is no account sync or server-side database.
- No login, billing, subscriptions, file uploads, image generation, voice mode, web search, or conversation sharing is included yet.
- AI availability and usage depend on the Cloudflare account, binding, model availability and account limits.
- No production deployment is claimed by this repository change alone.

## Verification checklist
1. Open the Pages preview URL.
2. Confirm the interface loads on desktop and mobile.
3. Send one Marathi, one Hindi and one English prompt.
4. Confirm a new chat and previous chat switching work.
5. Confirm the AI binding is present and the endpoint returns a valid answer.
6. Test missing binding and invalid request paths.
7. Review browser console and Pages Function logs before production.
