# Merchant social access and nearby advertisements

## Implemented
- Google, Microsoft (Supabase `azure`) and Apple OAuth use PKCE and the existing fixed callback origin. Only enabled providers are actionable, discovered from Supabase public Auth settings.
- Password login and successful merchant OAuth return to `/merchant`.
- Global nearby offers panel: explicit location permission, 500 m/1 km/3 km radius, verified live promotions only. Precise coordinates stay on device. Stale (>2 min), inaccurate (>250 m), invalid or out-of-radius positions are excluded.
- Optional foreground phone notifications via the service worker; one alert per offer per day per browser. Turning off nearby mode stops location watching. GPS does not run in the service worker.

## Required provider configuration
At review time Google, Azure and Apple were all disabled. Configure these in Supabase Auth Providers; never commit client secrets.

Provider callback URI (configure at Google/Microsoft/Apple):
`https://dwvmkmdrekovuckcyvfq.supabase.co/auth/v1/callback`

Application redirect URI (allowlist in Supabase):
`https://navibori.onrender.com/auth/callback?flow=merchant`

- Google: OAuth web client ID and secret; consent screen and production audience.
- Microsoft: Entra web application client ID and secret; supported account audience must include the intended personal/organization accounts; email scope requested by code.
- Apple: Sign in with Apple web configuration, Services ID and signing credentials; track secret expiry.

Current provider documentation:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/social-login/auth-azure
- https://supabase.com/docs/guides/auth/social-login/auth-apple

## Remaining operational requirements
Social authentication does not grant merchant or administrator privileges. A venue administrator must assign merchant access and review business ownership/location. At review time businesses and venue memberships were both empty. Public merchant onboarding and initial administrator provisioning still require completion; no role has been silently assigned.

Existing remote push notifications are a separate general-specials subscription, not proximity targeting. Automatic arrival notifications while the app is closed require a native background-location/geofencing implementation and corresponding permission UX. Do not market existing general broadcasts as nearby notifications.

On iPhone/iPad Web Push requires opening the installed Home Screen web app and granting notification permission. Device/browser tests and real provider sign-in remain necessary after credentials are configured. No real push subscriptions or user accounts were created during verification.
