# Admin email OTP setup

Admin access is restricted in code to `sggvisiondigitalservices@gmail.com`. The dashboard uses a 6-digit, 5-minute OTP, 60-second resend cooldown, and five-attempt limit. OTP hashes (not plaintext codes) are stored in D1. The session cookie is HttpOnly, Secure, SameSite=Strict and expires after 8 hours.

## Required Cloudflare setup
1. Create a Resend account using `sggvisiondigitalservices@gmail.com`.
2. Create a **Sending access** API key. Never put it in GitHub or chat.
3. For initial testing only, Resend's `onboarding@resend.dev` sender can deliver only to the Resend account owner's email. Production sending to other recipients requires a verified sending domain. See Resend docs: https://resend.com/docs and https://resend.com/features/email-api
4. In Cloudflare Pages > project > Settings > Environment variables and secrets (Production), add secrets:
   - `RESEND_API_KEY` = the Resend sending key
   - `ADMIN_OTP_SECRET` = a long random secret (32+ random bytes)
   - `ADMIN_SESSION_SECRET` = a different long random secret (32+ random bytes)
   - `ADMIN_OTP_FROM` = `SGGVISION Admin <onboarding@resend.dev>` for test only; after verifying a domain, use a sender on that domain.
5. Ensure D1 binding is named `DB`.
6. Apply `migrations/0003_admin_otp.sql` to the production D1 database.
7. Redeploy Pages after the secrets and migration are configured.

Do not enable production OTP login until the secrets and migration are configured and a real OTP delivery test succeeds. Never share API keys, passwords, or OTPs in chat.
