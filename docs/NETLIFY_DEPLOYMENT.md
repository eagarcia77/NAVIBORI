# NAVIBORI: Netlify trial deployment

Status: preparation only; a live Netlify deployment and migration have not yet been verified.

## Import

Use an owner-controlled Netlify Free account. Import `eagarcia77/NAVIBORI` from GitHub.
Select the branch containing this change (`deploy/netlify-20261114` for the trial,
`foundation/navibori-v0.1` only after merge); `main` does not contain the application.
Use repository root, `npm run build`, publish directory `.next`, Node 22.
Netlify automatically supplies the Next.js adapter; do not use static export or an SPA catch-all redirect.
Select the final available site name before setting callback URLs. Do not assume `navibori.netlify.app` is available.

## Environment

Set these values in Netlify for build AND function runtime:

- `NEXT_PUBLIC_APP_URL`: exact owned HTTPS Netlify origin (no path), or future custom domain.
- `NEXT_PUBLIC_SUPABASE_URL`: the existing NAVIBORI Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: its public publishable key, never service-role/secret credentials.

Keep production credentials out of untrusted branch previews. Deploy previews are for visual checks;
authentication must use the explicitly configured, allowlisted origin in the same browser.
This prevents using arbitrary request Host headers as credential redirect destinations.
Missing APP_URL on Netlify deliberately fails the build rather than sending users back to Render.
Existing Render deployments retain the previous origin when no APP_URL is set.

## Supabase and cutover prerequisites

Add exact URLs for the owned trial origin to Auth Redirect URLs:
`https://<owned-site>/auth/callback` and `https://<owned-site>/auth/callback?flow=merchant`.
Keep the Render URLs during testing. Change Supabase Site URL only at verified cutover.
Review email templates for hardcoded origins. SMTP remains a separate unresolved requirement.
OAuth provider callbacks remain at the Supabase project, not Netlify.

Push functions `push-subscribe` and `send-promotion-push` currently allow the Render origin.
Before enabling push on Netlify, add only the verified owned Netlify origin to their CORS allowlists
and redeploy those functions. Do not allow `*.netlify.app` or reflect arbitrary origins.
PWA installs, cookies, local drafts and push subscriptions are origin-specific: switching host
requires signing in and subscribing again, and existing local drafts must be preserved/exported first.
The experimental iOS target also contains a Render API origin in `NavigationData.swift`; update and
rebuild it separately if that native client is in use.

## Acceptance checks before changing traffic

1. `npm ci`, `npm run typecheck`, `npm test`, `npm run build`.
2. Verify Netlify adapter build and function deployment succeed (a local Next build alone is insufficient).
3. Open home, map, commerce directory and a real business detail; verify API routes return expected data.
4. Verify protected merchant/admin routes reject signed-out users.
5. Test signup, confirmation, login, logout and recovery on the same owned origin using a test account.
6. Verify merchant ownership/RLS, promotion publishing and expiration without sending real broadcasts.
7. Test PWA install, location permission and push with a consenting test device after CORS setup.
8. Only then select the new public origin and migrate links. Keep Render available for rollback.

Use the Free plan without paid upgrades. Its monthly credits can pause all projects when exhausted;
check current pricing and usage in the account. Avoid repeated production builds for minor trial changes.

References:
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- https://www.netlify.com/pricing/
