# SGGVISION AI — Chat Portal v1

A clean, independent ChatGPT-style chat interface for SGGVISION. It is not a copy of ChatGPT or OpenAI's private software.

## Included
- Responsive chat interface for desktop and mobile
- Marathi, Hindi, English and automatic language mode
- New conversations and recent conversation list
- Browser-local conversation history (localStorage)
- Cloudflare Pages Function at `/api/chat`
- Workers AI model: `@cf/zai-org/glm-4.7-flash`
- Request validation, payload limits, same-host Origin check and safe public errors

## Cloudflare Pages deployment
Configure the Pages project to deploy this folder as its **Root directory**:

`chat-portal`

Build command: leave empty (static HTML and Pages Functions).
Build output directory: `.`

In Cloudflare Pages → Settings → Functions → Workers AI, add a binding:
- Variable name: `AI`
- Cloudflare Workers AI binding: enabled

Deploy the `chat-portal-v1` branch to a separate Pages preview/project first. Do not change the existing production project's branch or root directory until the preview is tested and approved.

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
