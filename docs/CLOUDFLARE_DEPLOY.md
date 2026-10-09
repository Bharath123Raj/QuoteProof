# Deploy QuoteProof on Cloudflare Workers + D1

Use Workers, not Pages. The app serves its page and API from one Worker; D1 stores shared-search usage. Cloudflare Access handles email sign-in. No paid domain is required: Wrangler returns a workers.dev URL.

## 1. Update, commit and push your existing project

Extract the latest ZIP to a separate temporary folder. Copy the files inside its `QuoteProof` folder into your existing local Git checkout, replacing source, scripts, docs, tests and configuration. Keep your existing `.git`, filled `.env` and `.local` directory; skip the ZIP's blank `.env`. Copy the contents into the existing root, rather than creating another nested `QuoteProof` directory. If your Cloudflare database ID was already configured, preserve it when replacing `wrangler.json`.

Open PowerShell in the folder containing `package.json`, using Node 22.13+:

```powershell
git rev-parse --show-toplevel
npm run assemble
npm test
git check-ignore .env
git status
git add .
git diff --cached --name-only
git commit -m "Add Cloudflare Workers deployment and email authentication"
git push
```

Expect 110 passing tests and `.env` reported as ignored. Review staged filenames before committing. Open your repository's Actions tab and wait for Tests and build to pass. GitHub push does not automatically deploy to Cloudflare in this project.

## Create D1 and deploy from the same folder

```powershell
npx --yes wrangler@4 login
npx --yes wrangler@4 whoami
npx --yes wrangler@4 d1 create quoteproof
```

The login command opens Cloudflare's sign-in page. Choose the account you want to host under. No Cloudflare credentials or SerpApi key belong in chat.

Copy the new **database_id** UUID shown by `d1 create`. If Wrangler offers to add/update a binding automatically, decline: the supplied configuration already contains the `DB` binding. Replace `YOUR_DATABASE_ID` below with the actual UUID, without angle brackets:

```powershell
npm run cloudflare:configure -- YOUR_DATABASE_ID
npm run cloudflare:check
git add wrangler.json
git commit -m "Configure Cloudflare D1 database"
git push
npx --yes wrangler@4 d1 migrations apply DB --remote
npx --yes wrangler@4 deploy
```

Confirm applying the initial migration when prompted. If the database already exists, use `npx --yes wrangler@4 d1 list` to find its ID rather than creating a second one. Use the same account and database on future deployments so counters persist. If the same database ID is already committed, Git may report nothing to commit; continue with migration and deployment.

The configuration helper prevents deployment with the supplied all-zero placeholder ID. Database IDs are non-secret configuration and may be committed. The Cloudflare build runs Node commands and works on Windows without Bash. The existing `npm run build` remains the separate Sites/Linux artifact build.

Copy the actual workers.dev URL printed by Wrangler. At this stage the Worker serves synthetic and personal-key modes. Shared mode fails closed until both the server key and verified Cloudflare identity are available.

## 2. Enable email sign-in

In [Cloudflare](https://dash.cloudflare.com), enable **Zero Trust** on your account and choose the Free plan for the initial demo.

1. In **Zero Trust → Integrations → Identity providers**, add **One-time PIN**. New accounts do not necessarily have OTP enabled by default.
2. In **Workers & Pages → quoteproof → Access**, select **Protect this Worker behind Access**, choose **All traffic**, configure an initial policy that lets you sign in, and apply it. Dashboard labels can vary; older layouts show an Access card under Settings.
3. Open the created application in **Zero Trust → Access → Applications**. Set an **Allow** policy with **Include → Emails**, adding your email, teammates and any known reviewer emails. Enable **One-time PIN** as a login method for that application. Remove unintended broad email-domain policies if you created one during initial setup. Do not use a Bypass policy for shared credits.
4. Open the deployed URL in a private browser window. Enter an allowed email, get the emailed PIN, and sign in. An unapproved address should not reach the app. **Search settings → Sign out** ends the Access session.

This protects the **whole application**, including synthetic and personal-key modes. Every visitor needs an allowed email and a PIN; they do not need a Cloudflare account. Reviewer access must be arranged before submitting the demo URL. This is an allowlist demo setup, not unrestricted public signup. Keep the submission video publicly accessible.

The app reads identity exclusively from Cloudflare's verified `ctx.access.getIdentity()` runtime context. It does not trust incoming Sites headers, a supplied email header, or an unverified JWT. D1 stores a hash of the normalized verified email with a provider prefix, never the raw address. If identity lookup fails, shared use is blocked while personal/demo functionality remains available to visitors already admitted by Access. The frontend never displays the raw identity.

Keep this Worker serving its embedded page directly. Adding Cloudflare Static Assets or calling it through a Service Binding can remove `ctx.access` from the user Worker; shared mode would then fail closed. Do not configure `AUTH_PROVIDER=sites` or local-owner access on direct Cloudflare hosting.

## 3. Add your server key privately

After enabling and checking Access, run:

```powershell
npx --yes wrangler@4 secret put SERPAPI_API_KEY
```

Paste your real key **only at Wrangler's secret prompt**, not in the command line, GitHub, `wrangler.json` or this chat. Wrangler stores it as a Worker secret and deploys the secret update. The downloadable `.env` is for `npm start` on your computer and is not uploaded by Wrangler.

The deployed non-secret configuration already sets:

```text
AUTH_PROVIDER=cloudflare-access
SHARED_MONTHLY_LIMIT=200
SHARED_USER_DAILY_LIMIT=30
SHARED_USER_MINUTE_LIMIT=12
```

Shared limits count actual outbound attempts, including failed attempts, rather than reporting your SerpApi balance. Cached results consume no attempt. Uses of the same key elsewhere can exhaust it sooner. Each user can explicitly choose their own SerpApi key if app or provider limits are reached.

## 4. Verify before submission

1. Sign in and open **Search settings**. Expect Cloudflare Access sign-in status and remaining shared allowance.
2. Choose QuoteProof credits, then perform one live exact-model watch recheck with fresh upstream results enabled. Expect one attempt deducted and traceable SerpApi search metadata. This consumes a real search.
3. Repeat with fresh results disabled. If served from the app cache, expect zero new attempts and reused evidence.
4. Choose a personal key and recheck; shared usage must stay unchanged. Refresh must clear the entered personal key. Inspect `/api/health` while signed in: it must contain neither your secret nor raw email.
5. Sign out and reopen the URL in a private window. Access should ask for email/PIN again; confirm an unapproved email cannot enter.
6. Check mobile layout, discovery, audit and report tabs, exports and print. Browser data from localhost does not automatically move to the deployed origin.
7. Check **Workers & Pages → quoteproof → Metrics/Logs** for deployment errors and CPU-limit failures during a full audit/discovery. The Workers Free plan has a 10 ms CPU limit; waiting for SerpApi is separate from CPU time, but large responses still require processing. Choose a paid plan only if actual measurements require it.

Automated tests use mocked upstream responses and simulated Cloudflare context. A Wrangler upload dry run is not a real deployment or real Access/PIN/SerpApi validation. Do the above in your account before claiming hosted end-to-end verification.

## 5. Future updates

From your existing Git checkout, after editing source and checking `.env` is ignored:

```powershell
npm run assemble
npm test
git status
git add .
git diff --cached --name-only
git commit -m "Update QuoteProof"
git push
```

Wait for the GitHub Tests and build workflow to pass, then deploy:

```powershell
npx --yes wrangler@4 deploy
```

This command preserves the Worker secret. Run remote migrations before deployment when SQL migrations change. No automatic Cloudflare deployment is configured in GitHub Actions. Reuse the existing D1 database so usage counters persist.

`.gitignore` excludes `.env`, `.dev.vars`, `.local`, `.wrangler`, node_modules and ZIP/build outputs. Never commit a filled secret file.

## Pricing and references

Workers and D1 have Free plans with quotas. Cloudflare Access's Free plan is intended for small teams under 50 users, so this approach suits a limited demo rather than unlimited public registration. SerpApi credits are a separate allowance. Review current account plan limits before increasing access.

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Cloudflare Access plans](https://www.cloudflare.com/sase/products/access/)
- [Worker Access and trusted runtime identity](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [Email one-time PIN setup](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/)
- [Access logout](https://developers.cloudflare.com/cloudflare-one/faq/authentication-faq/)
- [D1 migrations](https://developers.cloudflare.com/d1/wrangler-commands/#migrations-apply)
