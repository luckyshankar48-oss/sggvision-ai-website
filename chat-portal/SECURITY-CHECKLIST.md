# SGGVISION AI — Security checklist

This document records the security controls in the current portal build and the Cloudflare settings still required.

## Implemented in the repository

- `_headers` sets a Content Security Policy, blocks framing, disables MIME sniffing, limits browser permissions, sets a restrictive referrer policy, and enables HSTS.
- The Pages Function checks request Origin against the request URL host when an Origin header is present.
- The API requires JSON, validates the request structure and roles, limits each message to 12,000 characters, limits a conversation to 24,000 characters and 16 messages, and rejects oversized bodies.
- API responses are not cached. Provider exception details are not returned to visitors.
- No user file-upload endpoint exists in this version. Do not add uploads without file-type allowlisting, size limits, malware scanning and safe storage.
- The portal does not request passwords, OTPs, payment-card data or API keys.

## Production configuration verified on 2026-11-12

- Cloudflare Pages project: `sggvision-ai-website`.
- Production branch: `main`; Root Directory: `chat-portal`; Build Command: empty; Output Directory: `.`.
- Production Workers AI binding: `AI` (type: Workers AI).
- Production secret name `OPENAI_API_KEY` exists. The current Pages Function calls `env.AI` and does not read this secret; review and remove it only after confirming no other deployment workflow depends on it.
- Production deployment is successful at `https://sggvision-ai-website.pages.dev`. The default Pages hostname is the only custom-domain entry currently confirmed.
- The separate Worker service `sggvision-ai-website` had a redundant deploy command (`wrangler pages deploy`) and failed with Cloudflare API authentication error 10000. Its Git-triggered builds have been disabled to stop duplicate failed deployments. The Worker and Pages project were not deleted or modified otherwise.

## Remaining security work

1. Configure Cloudflare managed WAF protections and review Security Events.
2. Add request throttling for `/api/chat` before broad public promotion.
3. Enable bot protections available on the account, and keep Cloudflare, GitHub and domain registrar accounts protected with MFA.
4. Confirm Preview environment bindings separately; do not assume Production bindings are copied to Preview.
5. Review Workers AI usage/limits and configure account alerts or limits where available to reduce abuse and unexpected costs.
6. Keep domain registrar, Cloudflare and GitHub recovery methods current. Never share passwords, OTPs or API tokens in chat or screenshots.

## Rate-limiting deployment constraint

- This project currently uses Cloudflare Pages Functions and the default `pages.dev` hostname. A Cloudflare zone-level WAF rate-limiting rule cannot be assumed to protect this hostname; a custom domain attached to a Cloudflare zone is needed for the usual zone WAF rule.
- Cloudflare's Pages-to-Workers migration comparison lists the Rate Limiting binding as supported for Workers but not Pages. Do not add `env.MY_RATE_LIMITER` code to this Pages Function unless the runtime architecture is migrated and the binding is actually available.
- Options to complete this control are: attach a custom domain managed in Cloudflare and configure a WAF rule for `/api/chat`, or deliberately migrate the API to a standalone Worker and configure a Rate Limiting binding. Choose and test one approach before claiming server-side rate limiting is active.
- Cloudflare's Worker Rate Limiting binding is approximate and local to each Cloudflare location; strict global limits require a Durable Object design. See the official documentation: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ and https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/.

## Known limitations

- No server-side durable rate limiter is configured in this Pages build.
- HSTS applies only while HTTPS is correctly active for the hostname.
- The current inline script/style architecture requires `'unsafe-inline'` in the Content Security Policy. Moving scripts and styles to separate files with nonces/hashes would permit a stricter policy later.
- No website can promise zero risk or immunity from every attack or virus. Security needs ongoing updates, monitoring and backups.

## Final security checklist

- [x] Production `AI` binding confirmed.
- [x] Production Pages deployment and live Marathi/Hindi/English chat smoke tests completed.
- [ ] Confirm Preview `AI` binding.
- [ ] Choose and configure an applicable WAF/rate-limiting architecture.
- [ ] Turn on MFA for GitHub, Cloudflare and domain registrar.
- [ ] Review privacy/terms against actual provider settings and logging.
- [ ] Verify response headers in browser developer tools and test API rejection cases in production.
- [ ] Set a backup and incident-response process.
