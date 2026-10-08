# Shared credits, personal keys and sign-in

## Local setup (Windows / PowerShell)

Use Node.js 22.13 or later. The downloadable ZIP includes a blank `.env` and a tracked `.env.example`. In the extracted QuoteProof directory:

```powershell
notepad .env
```

Change only the blank key line:

```dotenv
SERPAPI_API_KEY=your_actual_key_here
```

Save the file and run:

```powershell
npm start
```

Open http://localhost:3000, choose **Search settings → Use QuoteProof credits → Use live search**. The Node server loads `.env` on startup. Restart it after changing this file. You no longer need to paste the owner key after refreshing the browser. A real process environment variable takes precedence over the corresponding `.env` value.

The local server binds only to 127.0.0.1 and treats that loopback session as local-owner access. This is not an email-login system and must not be exposed publicly through a tunnel. It strips incoming Sites identity headers. Its persistent request counter is `.local/usage.sqlite`; `.local/` is ignored by Git. Retain this file to retain local usage limits. A deleted database resets local counters.

## Two account choices

- **Use QuoteProof credits:** the key stays on the server. Shared mode requires a trusted identity and a working persistent usage database. It fails closed if either is unavailable.
- **Use my SerpApi key:** the user's explicit key is kept only in page memory, sent to this app server and then SerpApi. It is cleared on refresh and excluded from localStorage and exports. An empty personal key never falls back silently to the owner's account.
- **Synthetic demo:** labelled fabricated fixtures, with zero upstream searches.

Only the account-choice preference persists in the browser. Switching accounts during a watch recheck prevents the arriving observation from being applied to the changed selection. Exhausted app/provider allowances open Search settings with an explanation; users choose a personal key or the synthetic demo. There is no silent retry using another account.

## Usage limits

Defaults in `.env.example`:

```dotenv
SHARED_MONTHLY_LIMIT=200
SHARED_USER_DAILY_LIMIT=30
SHARED_USER_MINUTE_LIMIT=12
```

The monthly budget is global to this app; daily and rolling-minute limits apply per signed-in user. Calendar boundaries use UTC. One atomic conditional SQL insert reserves each shared outbound attempt before the SerpApi fetch. Attempts include failures/timeouts; they are not refunded. Cache hits do not make an upstream attempt and are not counted. These limits are conservative app controls, not actual SerpApi credit balances. Other projects using the same key can exhaust the provider account before this app reaches its own limit. Limits can also stop a multi-search audit midway; the UI gives an actionable error and does not invent a complete report.

Counters store a hashed platform user identifier (or provider-prefixed verified email on Cloudflare), timestamp, UTC day/month and an attempt UUID. They do not store keys, email addresses, quotes or search results. Hashes are pseudonymous identifiers, not a claim of anonymization. The current version retains usage records until the owner removes them; there is no automatic retention cleanup.

## Hosted Sites setup

A local `.env` is **not uploaded** and does not configure the hosted site. Set `SERPAPI_API_KEY` as a production runtime **secret**, and `AUTH_PROVIDER=sites` as a non-secret runtime value. Apply environment changes by deploying a saved version. Never place a real key in the hosting manifest, HTML, Worker source or GitHub Actions workflow.

The manifest declares D1 binding `DB`. The deployment package carries the initial SQL migration under `.openai/drizzle`. Sites provisions the database and applies hosted migrations. The app uses Sites dispatch's authenticated user headers, plus top-level **Sign in with ChatGPT / Sign out** links. There is no custom email/password database or email OTP provider.

`AUTH_PROVIDER=sites` is only valid behind the Sites platform's trusted authentication boundary. Do not set it on another publicly exposed server that forwards arbitrary client identity headers. For direct Cloudflare hosting, use the included `cloudflare-access` adapter and D1 configuration described in [CLOUDFLARE_DEPLOY.md](CLOUDFLARE_DEPLOY.md). Other providers need a trusted authentication adapter and persistent DB; until then, use personal-key or synthetic mode. The loopback Node adapter is for local use only.

The site's current sharing policy is preserved. Adding this feature does not make an owner-private site public or grant judges access automatically. Production shared live searches remain unavailable until the owner configures the server key. Sign-in and quota routes have offline/API/simulated-DOM coverage; a hosted key/sign-in walkthrough is still required before claiming end-to-end validation.

## Cloudflare Workers + D1

Follow [CLOUDFLARE_DEPLOY.md](CLOUDFLARE_DEPLOY.md). Cloudflare Access supplies verified email identity through the Worker runtime, handles emailed PINs, and gates the whole application for allowed visitors. Shared usage fails closed without that identity. Owner key setup uses `wrangler secret put SERPAPI_API_KEY`, not `.env` upload. The frontend uses Cloudflare Access logout instead of Sites sign-in routes on this provider.

## Git protection

`.gitignore` excludes `.env`, `.env.*` (except `.env.example`), `.local/`, `.wrangler/`, `.dev.vars` files, build output and ZIPs. Confirm locally:

```powershell
git check-ignore .env
```

Expected: `.env`. Commit `.env.example`, never the filled `.env`. Ignore rules do not untrack a previously committed secret. If you accidentally commit one, revoke/regenerate that key and remove it from Git history.
