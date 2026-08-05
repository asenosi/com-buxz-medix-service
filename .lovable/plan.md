# Google sign-in that actually works

## Problem

The sign-in page already has a "Continue with Google" button, but it calls the raw Supabase OAuth method with a redirect straight to `/dashboard`. Two issues:

- The Google provider is not enabled through Lovable Cloud's managed social login, so the sign-in attempt fails ("Unsupported provider").
- The redirect target points at a protected page instead of the app's public origin, which drops the session in preview/iframe contexts.

Email + password sign-in and sign-up stay exactly as they are.

## What will change

1. Enable Google as a managed sign-in method on the backend (no Google Cloud account or keys needed from you) while keeping email/password enabled.
2. Rewire the Google button to the managed sign-in helper, redirecting back to the app origin and then on to the dashboard once the session is confirmed.
3. Make sure a Google user gets the same profile record that email signups get, so the dashboard and profile page show their name.
4. Verify the flow in the preview: click Google, complete consent, land on the dashboard signed in; then confirm email/password login still works.

## Technical details

- Run the Configure Social Login tool with `providers: ["google"]` (email left enabled). This generates `src/integrations/lovable/` and installs `@lovable.dev/cloud-auth-js`.
- In `src/pages/Auth.tsx`, replace `supabase.auth.signInWithOAuth` with `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`, handling the `error` / `redirected` results; navigate to `/dashboard` only after a session exists.
- Add an `onAuthStateChange` listener on the auth page so returning OAuth users are routed to `/dashboard` once the session hydrates, instead of relying on the OAuth redirect URL.
- Ensure a `profiles` row exists after sign-in (upsert on `user_id` using the Google display name) rather than only on the email signup path.
- No changes to the password form, validation, or existing toasts.
