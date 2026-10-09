# QuoteProof

**Know before you approve.** Audit supplier quotes against current market search results, inspect why offers were accepted or rejected, discover alternatives, and watch exact models over time.

**[Open the live app](https://quoteproof.quoteproof.workers.dev/)** · **Track: Commerce & Market Intelligence** · SerpApi India Hackathon 2026

## Why QuoteProof exists

A low search price can belong to a different model, a smaller SSD, a refurbished keyboard, or a printer spare part. Comparing that price with a supplier's quote creates a misleading negotiation target.

QuoteProof checks whether each listing is comparable before using it in a benchmark. Buyers see the evidence, exclusions, source links and search provenance. If coverage is too sparse or inconsistent, the app reports insufficient evidence rather than inventing a confident price recommendation.

Designed for small businesses and procurement teams buying new, individually sold electronics in India. No runtime LLM or paid model account is required.

## Try the deployed app

Visit **https://quoteproof.quoteproof.workers.dev/** and choose a search mode:

| Mode | How it works |
| --- | --- |
| Synthetic demo | Labelled fictional offers; no account or SerpApi requests required. |
| QuoteProof credits | Open Search settings, choose Use QuoteProof credits, sign in with Google, then choose Use live search. Shared request limits apply. |
| Your own SerpApi key | Choose Use my SerpApi key and paste your key. The entered key stays in page memory; refreshing clears it. |

If shared allowance is exhausted or unavailable, switch explicitly to your own key or the synthetic demo. Personal-key mode never silently uses the owner's key.

Google sign-in uses Supabase Auth. The owner SerpApi key remains a Cloudflare Worker secret. Sessions last up to one hour; sign in again after expiry. Watches, drafts and the last audit are stored in the current browser, not synchronized between devices.

## What the workspace pages do

| Page or tab | Purpose |
| --- | --- |
| Quote audit | Enter up to three supplier quote lines and compare matching market offers. |
| Overview | See coverage, usable benchmarks and indicative negotiation gaps; add models to Market watch. |
| Evidence ledger | Inspect accepted/rejected offers, reasons, source links and search IDs. |
| Checkout costs | Inspect supplied base price, estimated tax, shipping and total; missing costs stay unknown. |
| Negotiation brief | Turn the evidence into a reviewable discussion brief; export JSON or print/save as PDF. |
| Find alternatives | Discover candidates from category, quantity, total base-price budget and requirements. |
| Market watch | Select up to three watched models, manually recheck prices and inspect target signals/history. |
| Last saved audit | Reopen the last audit saved in this browser without performing another search. |
| Methodology | Understand comparison rules and evidence limitations. |

## Main workflows

### 1. Audit an exact-model supplier quote

Enter a product name, required model/variant identifiers, quantity and quoted unit price. You can also paste up to three lines into **Import quote**:

```text
HP LaserJet Pro M404dn printer | HP M404dn | 5 | 36500
Logitech MX Keys Mini keyboard | Logitech MX Keys Mini | 8 | 11995
Samsung 980 PRO 1TB SSD | Samsung 980 PRO 1TB | 10 | 10500
```

Run the audit, review the Overview and Evidence ledger, inspect Checkout costs, and export the Negotiation brief. Listing prices in live results may differ from these example quote amounts.

The filters exclude obvious wrong models/variants, accessories, spare parts, refurbished goods, bundles, unrequested keyboard layouts, ambiguous currencies, installment/range prices and unusable sources. A seller's presence in search results is not an endorsement.

A usable median requires **at least three normalized seller names** and a price spread of **at most 60%**. Distinct displayed names do not prove independent businesses. A negotiation gap is indicative listing-price evidence, not guaranteed savings.

### 2. Discover alternatives from requirements

Example inputs:

- Category: `office laser printer`
- Quantity: `5`
- Total base-price budget: `160000` INR
- Requirements, one per line: `automatic duplex` and `Ethernet`

The shortlist shows feature mentions, conflicts and unknowns with source text. Expand **Specification sources** to inspect provenance and why evidence was withheld. Manufacturer-domain snippets need exact model/capacity checks; community/forum posts are **discovery only** and never supply feature evidence. Conditional statements and questions cannot establish features.

Choose a usable candidate to create a separate quote draft. Review its identifiers and enter your supplier's quoted amount before auditing it. Alternative models are never merged into an exact-model price median. Source mentions are not independently verified specifications.

### 3. Watch models and target prices

After an audit, choose **Watch model** in Overview. Set a target unit price, select up to three products and click **Recheck selected**.

A target signal requires a fresh, traceable, usable median at or below the target. Reused search IDs, cached results, sparse coverage and failures do not create fresh chart points or target signals. Changes in seller coverage can change a median even when individual seller prices do not change.

**Fetch new upstream results** bypasses the app cache and requests SerpApi `no_cache=true`. **Bypass QuoteProof's 30-minute cache** alone does not guarantee fresh upstream evidence. Fresh requests can consume credits.

Up to ten watches and thirty checks per watch are retained in this browser. Live and synthetic watches are separate. Watchlist JSON can be exported. Rechecks are manual; there is no background scheduler or email alert delivery.

## How SerpApi powers the product

QuoteProof calls SerpApi's HTTP API directly; it does not use MCP, a Python SDK, or an agent framework.

| Engine | Role |
| --- | --- |
| `google_shopping` | Price listings, candidate discovery and exact-model watch rechecks. |
| `google` | Specification/warranty discovery and model-specific manufacturer search snippets. |
| `google_immersive_product` | Bounded product details, buying options and available checkout components. |

Searches are localized using `gl=in`, `hl=en`, `google_domain=google.co.in` and a New Delhi search origin. Flat, inline and categorized Shopping results are normalized. Search IDs, queries and cache/reuse status make evidence traceable.

### Request budgets

| Operation | Maximum outbound requests per run |
| --- | --- |
| Three-line audit without checkout enrichment | 9 |
| Three-line audit with checkout enrichment | 12 |
| Requirements discovery | 7 |
| Watch recheck | 1 per selected model; at most 3 per batch |
| Synthetic demo | 0 |

These are bounded attempts, not guaranteed billed SerpApi credits. Actual usage depends on available tokens, follow-ups and caches. SerpApi's billing rules remain authoritative.

Shared mode defaults to **200 attempts per UTC month globally**, **30 per UTC day per user**, and **12 per rolling minute per user**. D1 reserves attempts atomically before upstream searches. Failed attempts count; app-cache hits do not. Limits do not represent the owner's remaining SerpApi account balance.

## Run locally on Windows

Install **Node.js 22.13 or later**. Node 24 LTS is suitable. The local server uses Node's built-in SQLite; older Node versions fail with `node:sqlite` errors.

From the project folder:

```powershell
npm run assemble
npm start
```

Open **http://127.0.0.1:3000/**. No third-party runtime packages need installation. The synthetic demo works immediately.

For live searches, enter your SerpApi key in Search settings. Alternatively, create a local `.env` from `.env.example`, paste your key into `SERPAPI_API_KEY`, restart the server and select QuoteProof credits. The loopback server uses local-owner access; Google login is tested on the deployed HTTPS app.

If port 3000 is occupied, stop the previous server with Ctrl+C or set `PORT=3001` in `.env`. Open the matching port; browser storage is separate per origin.

## Deployment: Cloudflare Workers + D1 + Supabase Auth

The current hosted app uses Cloudflare Workers for server/UI delivery, D1 for durable shared usage counters, and Supabase Google sign-in for verified user identity. **Cloudflare Access onboarding is not required for this deployment.**

Follow **[the complete Google-auth deployment guide](docs/SUPABASE_DEPLOY.md)** for D1-preserving configuration, Google credentials, redirect URLs, deployment and verification. Google Client secrets belong only in Supabase provider settings; no Supabase secret/service-role key is needed by QuoteProof.

For a first Cloudflare deployment, sign in with Wrangler, create/reuse D1, configure the real database UUID and apply the initial migration:

```powershell
npx --yes wrangler@4 login
npx --yes wrangler@4 d1 create quoteproof
$databaseUuid = Read-Host "Paste the database_id UUID printed above"
npm run cloudflare:configure -- $databaseUuid
npx --yes wrangler@4 d1 migrations apply DB --remote
npm run supabase:configure
npm run assemble
npm test
npx --yes wrangler@4 deploy
npx --yes wrangler@4 secret put SERPAPI_API_KEY
```

If D1 already exists, reuse its UUID from `npx --yes wrangler@4 d1 list`; do not create another database. `supabase:configure` preserves the existing D1 ID and limits and writes this project's public Supabase configuration. To fork the project, change its public URL/key in the configuration script and configure your own Google provider. Never deploy the template's all-zero D1 UUID.

### Update an existing deployment

Keep the existing `.git`, `.env` and configured `wrangler.json` when copying an updated project over your checkout. Then:

```powershell
npm run assemble
npm test
git add src scripts package.json worker tests README.md docs wrangler.json .gitignore .env.example
git commit -m "Update QuoteProof"
git push
npx --yes wrangler@4 deploy
```

GitHub pushes do not automatically deploy the Worker. Reuse the existing D1 database and Worker secret. Apply remote migrations only when a new SQL migration is added.

## Security and data handling

- Owner-funded searches use a server secret; it is never returned to visitors or reports.
- Personal keys are sent to the app server for SerpApi requests, kept in page memory, and excluded from saved reports/browser storage.
- Google login uses PKCE, state checking and HttpOnly, Secure, host-only session cookies. Shared requests validate the user with Supabase; cross-origin cookie-authenticated mutations are rejected.
- D1 stores hashed user identifiers and attempt timestamps/counting fields, not quote contents or raw emails.
- Drafts, audits and watches remain browser-local. Avoid using confidential quotes on a shared device.
- `.env`, `.local`, `.wrangler`, dependencies and generated archives are ignored by Git. Never commit keys, credentials or private exports.

## Tests and verification

```powershell
npm run assemble
npm test
```

**116 automated tests** cover product matching, benchmark abstention, provenance, checkout fields, watch history, UI state, atomic usage limits, authentication and OAuth callback handling. Automated tests use mocked SerpApi/Supabase responses; they are not proof of live merchant prices or hosted account configuration.

The project owner reports the deployed Google login and app are working after live testing. Verify your own deployment with a real search, sign-out, personal-key mode and synthetic mode. Synthetic demo prices are explicitly fictional; they are not current prices or measured customer savings.

## Project structure

```text
src/
  core.js                 Matching, benchmarks, evidence rules and demo fixtures
  api.js                  Search workflows, bounded requests and temporary cache
  access.js               Shared identity, account selection and atomic quotas
  supabase.js             Google OAuth, secure session cookies and verification
  page.html               Workspace UI and browser-local persistence
worker/index.js           Generated Worker; regenerate after editing src/
scripts/                  Local server, assembly and deployment configuration
db/ and drizzle/          Shared usage schema and migration
tests/                    Core, API, UI, access and OAuth tests
docs/                     Deployment, live validation, demo and submission guides
wrangler.json             Worker configuration and D1 binding
.env.example              Blank local settings template
```

## Limitations

Title/snippet checks are heuristics and can miss genuine offers or accept misleading ones. Verify seller pages, exact models, taxes, stock, warranty and full-quantity availability before purchasing.

Checkout totals describe a single listing. Missing tax/shipping is unknown, not zero; conflicting totals are flagged. Bulk landed costs and supplier tax/freight terms are not verified, so no full-order total-cost negotiation gap is calculated.

Some links open Google Shopping product pages instead of merchant pages; the UI labels them. Choose a seller there to inspect the offer. Results may change after the search. QuoteProof does not approve purchases, contact suppliers or execute transactions.

## Hackathon submission

**Selected track: Commerce & Market Intelligence.** See [submission description](docs/SUBMISSION.md) and [demo outline](docs/DEMO_SCRIPT.md).

In addition to the public repository and this live app, submit a public/unlisted **video under three minutes showing the project running locally**, a project description explaining meaningful SerpApi usage, participant/team details, project-history and AI-tool disclosures, event-discovery source, and acceptance of the Rules and Terms. Complete the actual submission; a saved draft is not an entry.

**AI disclosure:** OpenAI ChatGPT / Codex assisted with product design, implementation, debugging, tests and documentation. The running application does not use an LLM.

The official deadline is **10 October 2026, 23:59 IST**. Review eligibility and requirements in the [official Rules](https://serpapi.github.io/serpapi-india-hackathon-2026/rules.html) and [Terms](https://serpapi.github.io/serpapi-india-hackathon-2026/terms.html).

## License

MIT — see [LICENSE](LICENSE). Synthetic fixtures were authored for the project. SerpApi and searched websites retain their respective rights and terms.
