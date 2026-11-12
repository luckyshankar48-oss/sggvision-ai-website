# SGGVISION AI — Security checklist

This document records the security controls in the current portal build and the Cloudflare settings still required before a public launch.

## Implemented in the repository

- `_headers` sets a Content Security Policy, blocks framing, disables MIME sniffing, limits browser permissions, sets a restrictive referrer policy, and enables HSTS.
- The Pages Function checks request Origin against the request URL host when an Origin header is present.
- The API requires JSON, validates the request structure and roles, limits each message to 12,000 characters, limits a conversation to 24,000 characters and 16 messages, and rejects oversized bodies.
- API responses are not cached. Provider exception details are not returned to visitors.
- No user file-upload endpoint exists in this version. Do not add uploads without file-type allowlisting, size limits, malware scanning and safe storage.
- The portal does not request passwords, OTPs, payment-card data or API keys.

## Required Cloudflare dashboard controls before public launch

1. Enable Cloudflare managed WAF rules and review Security Events for false positives.
2. Add a rate-limiting rule for `/api/chat`. Start conservatively (for example, 10 requests per minute per IP with a short block/challenge action), then tune from real usage and Cloudflare plan capabilities. This is an example starting point, not a guarantee against distributed abuse.
3. Enable bot protections available on the account, and keep the Pages project and GitHub account protected with MFA.
4. Keep production and preview environments separate. Restrict preview access if the Cloudflare plan supports it; do not expose secrets in frontend code or Git.
5. Review Workers AI usage/limits and configure account alerts or limits where available to reduce abuse and unexpected costs.
6. Keep domain registrar, Cloudflare and GitHub recovery methods current. Never share passwords, OTPs or API tokens in chat or screenshots.

## Important limitations

- The repository cannot independently enable Cloudflare WAF, bot protection, account MFA, billing alerts or dashboard rate-limiting rules. These require account-owner action.
- No server-side durable rate limiter is configured in this build; Cloudflare dashboard rate limiting is required before public traffic.
- HSTS applies only after HTTPS is correctly active for the hostname.
- A Content Security Policy is included, but the current inline script/style architecture requires `'unsafe-inline'`. Moving scripts and styles to separate files with nonces/hashes would permit a stricter policy later.
- No website can promise zero risk or immunity from every attack or virus. Security needs ongoing updates, monitoring and backups.

## Security review before release

- [ ] Confirm the Preview and Production `AI` bindings separately.
- [ ] Configure WAF and `/api/chat` rate limiting.
- [ ] Turn on MFA for GitHub, Cloudflare and domain registrar.
- [ ] Review privacy/terms against actual provider settings and logging.
- [ ] Verify headers in browser developer tools and test the public API.
- [ ] Set a backup and incident-response process.
