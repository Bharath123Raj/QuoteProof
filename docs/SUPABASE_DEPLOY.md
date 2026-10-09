# Google sign-in on Cloudflare Workers

This setup replaces Cloudflare Access with Supabase Auth. Workers and D1 continue hosting QuoteProof and recording search usage. Supabase is used only for Google authentication. No Supabase secret/service-role key is required. Revoke any secret key that was accidentally shared.

## Update an existing Windows checkout

Replace the supplied files at the same relative paths. Add new files and directories if missing. Preserve `.git`, your filled `.env`, and your existing `wrangler.json` with the real D1 UUID. Do not replace wrangler.json with the template.

Updated files:
- `src/supabase.js` (new)
- `src/access.js`
- `src/page.html`
- `scripts/assemble.mjs`
- `scripts/supabase-configure.mjs` (new)
- `package.json`
- `worker/index.js`
- `tests/supabase.test.mjs` (new)
- `tests/page.test.mjs`
- `README.md`
- `docs/SUPABASE_DEPLOY.md` (new)

## Supabase configuration

In Authentication → URL Configuration:

Site URL: `https://quoteproof.quoteproof.workers.dev/`

Redirect URLs: keep the existing URLs and add:

```
https://quoteproof.quoteproof.workers.dev/auth/callback?state=*
```

The wildcard covers the random state query parameter. The Worker always constructs this fixed callback on its own origin. Google credentials use a different redirect URL:

```
https://blvorawnwbcnujiapmgg.supabase.co/auth/v1/callback
```

Google Auth Platform → Clients → Web application: authorized JavaScript origin `https://quoteproof.quoteproof.workers.dev`; authorized redirect URI as above. In Audience, add test users while in Testing, and publish to production before opening the demo to arbitrary Google users. Configure only identity scopes (openid, email, profile).

Supabase → Authentication → Sign In / Providers → Google: enable and save the Google Client ID and Client secret. Keep the client secret private.

## Configure and deploy

From the existing project folder in PowerShell:

```powershell
npm run supabase:configure
npm run cloudflare:check
npm run assemble
npm test
npx --yes wrangler@4 deploy
```

The configuration script contains only the public Supabase URL and publishable key supplied for this project. It preserves the existing D1 UUID, limits and other configuration. SERPAPI_API_KEY remains the existing Worker secret. No new migration is required. If cloudflare:check reports an all-zero UUID, configure the existing real database UUID before deploying.

If Cloudflare Access was successfully enabled later, disable its protection on this Worker so users can reach the new login page. This is unnecessary if Access never activated.

## Verify

Open QuoteProof → Search settings → Use QuoteProof credits → Sign in with Google. On return, reopen Search settings and select Use live search. Health `/api/health` should show `authProvider: "supabase"`, `signedIn: true`, and `liveConfigured: true` when storage/key are configured. Run one live discovery or audit and confirm traceable SerpApi evidence and reduced usage. Sign out and verify shared mode requires login again. Test personal-key and synthetic modes separately.

Automated tests mock Supabase and SerpApi responses. Passing tests do not validate real Google credentials, callback allowlists, your SerpApi key, or hosted D1 schema. Those require the live steps above.

## Session behavior and security

Google login uses PKCE and a random state linked to a 10-minute HttpOnly Secure SameSite=Lax host-only cookie. The server exchanges the code and checks the user with Supabase before creating a session cookie. Shared API requests validate the session with Supabase and use a hashed verified user ID for existing atomic D1 quotas. Cross-origin cookie-authenticated mutations are rejected. Auth responses are no-store and do not reveal provider errors or tokens. No auth tokens are stored in localStorage or saved reports.

Sessions last up to one hour, subject to Supabase's configured token lifetime. Refresh tokens are discarded; users sign in again after expiry. Sign-out clears the browser session and requests provider logout. Supabase availability is required for shared mode; personal-key and synthetic modes remain usable during outages. No authentication bypass is enabled.

Local `npm start` retains its existing loopback owner behavior; Google login is tested on the deployed HTTPS URL.

## Push to GitHub after testing

```powershell
git add src scripts package.json worker tests README.md docs wrangler.json
git commit -m "Add Supabase Google sign-in for shared search"
git push origin main
```

A GitHub push alone does not redeploy the Worker. Use Wrangler for future deployment updates.
