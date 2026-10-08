# QuoteProof

**Know before you approve.** QuoteProof audits supplier quotes against SerpApi market evidence, checks whether discovered offers describe the same product, builds a traceable negotiation brief, exposes checkout cost gaps, discovers alternatives from buyer requirements, and tracks watched models with target-price signals and traceable history.

Track: **Commerce & Market Intelligence** · SerpApi India Hackathon 2026

## The problem

A small business receives a quote for five printers, eight keyboards and ten SSDs. Searching for the cheapest price gives misleading results: a different printer model, a refurbished keyboard and a smaller SSD. Using those prices can lead to an unrealistic negotiation or a bad purchasing decision.

QuoteProof challenges the evidence before making a price recommendation. It shows the cheap listings it rejected, the reasons, the accepted sellers, and the exact search provenance.

## Run locally — no dependencies

Install **Node.js 22.13 or later**, extract this project, open a terminal in the `QuoteProof` directory, and run:

```powershell
npm start
```

If port 3000 is occupied, stop the earlier server with Ctrl+C, or change `PORT=3001` in `.env` and open http://localhost:3001. Browser history is separate per port.

Open **http://localhost:3000**. Use the labelled synthetic demo immediately. It contains fabricated example offers and never calls SerpApi.

For live data:

1. Create a SerpApi account: https://serpapi.com/users/sign_up
2. Copy your key from https://serpapi.com/manage-api-key
3. Open **Search settings** in QuoteProof and enter the key.
4. Choose **Live search**, enter a quote, and click **Audit this quote**.
5. Inspect **Evidence ledger**, **Checkout costs** and **Negotiation brief**. Export a JSON report or use Print / PDF.

No LLM account or paid model is required. The API key is held in page memory and sent to the app server, which calls SerpApi. It is never written into localStorage or exported reports. Reloading clears the entered key. For owner-funded local searches, paste your key into the ignored `.env` file, restart `npm start`, then choose **Search settings → Use QuoteProof credits**. The server loads `.env` automatically. For hosted shared mode the key must be set separately as a server secret, with Sites sign-in and the persistent D1 usage counter. See `docs/SHARED_SEARCH.md` for complete local/hosted setup, limits and Git protection.

The free account advertised by the hackathon provides 250 monthly credits; check your dashboard for the current allowance. A 3-line uncached audit makes up to 12 outbound search requests with optional cost enrichment (9 without it): Shopping, Google discovery, one sparse-coverage follow-up and at most one extra product-details lookup per line. An existing product-details follow-up is reused for costs. Requirements discovery uses at most seven requests: one Shopping search, up to three product-details lookups and up to three model-specific Google specification searches for unresolved candidates. Budget counters describe requests, not billed credits. QuoteProof does not determine SerpApi billing: upstream caching, account rules, retries and failures can affect charged credits. Watch rechecks use one Shopping request per selected live model, up to three per batch, with no automatic refresh loops.

## Shared searches and personal keys

Search settings offers **Use QuoteProof credits** and **Use my SerpApi key**. Shared mode requires sign-in on Sites, has persistent global monthly, per-user daily and rolling-minute request caps, and never exposes the owner key to visitors. The loopback Node server uses local-owner access instead of simulating a hosted login. Default limits are 200 shared upstream attempts per UTC month, 30 per user per UTC day and 12 per rolling minute; failures count and cache hits do not. These counters are not provider billing credits. Exhaustion or missing shared configuration offers an explicit personal-key/synthetic-demo fallback. Personal mode never silently uses the hosted key. The ZIP includes a blank `.env`; `.env.example` is tracked while `.env` and the local usage database are ignored. No key is bundled. Production shared live mode remains unavailable until its server secret is configured.

## Example quote import

Paste up to three lines using **Import quote**:

```text
HP LaserJet Pro M404dn printer | HP M404dn | 5 | 36500
Logitech MX Keys Mini keyboard | Logitech MX Keys Mini | 8 | 11995
Samsung 980 PRO 1TB SSD | Samsung 980 PRO 1TB | 10 | 10500
```

In synthetic mode, the fixture produces a ₹64,210 indicative negotiation gap and rejects three misleading listings. This is a deterministic demonstration, not measured customer savings or current pricing. Live results will differ and may be insufficient for a benchmark.

## New: buy by requirements and inspect checkout costs

Choose **Find alternatives**. Try category `office laser printer`, quantity `5`, total base-price budget `160000`, and requirements on separate lines: `automatic duplex` and `Ethernet`. Select Demo for labelled fictional printer fixtures, or Live search to discover real candidate listings. Expand each feature row to inspect its source text and search ID. Outcomes are **Mentioned in source**, **Conflicting text**, or **Needs verification**; these are text checks, not independently verified specifications. Numeric thresholds need manual checking.

Discovery shows at most six unique listing titles. Up to three candidate tokens are expanded for product details. Detail/store titles must match the candidate title after normalization; otherwise their specs and prices are not applied. For unresolved features, up to three candidates receive a quoted-model Google query restricted to recognized manufacturer domains (HP, Brother, Samsung, Logitech), prioritizing candidates within base budget. A model/capacity match in the source title and the manufacturer hostname are required before its snippet can add feature evidence. Wrong variants, lookalike domains and mixed-model printer snippets remain discovery links or are rejected. Community/forum posts, including those hosted on manufacturer domains, are discovery only and never fill checks. Conditional statements and questions cannot establish feature mentions or conflicts; explicit assertions in separate sentences/clauses can still contribute. External sources never fill checks. Feature conflicts are preserved rather than overridden. Expand **Specification sources** to see links, snippets, query, search ID and why evidence was accepted or withheld. Incomplete cards stay incomplete. A candidate whose price and source are usable can be chosen for a separate quote draft, unless its evidence conflicts. Review the suggested identifiers and replace its listing price with your supplier quote, then run an exact-model audit. Alternatives are never mixed into a model's price median. The shortlist has its own JSON export with `specSources` and `specSearch` status per candidate, and requirement drafts restore after refresh without saving the key.

The audit's **Checkout costs** tab compares eligible seller listings with separate columns for base price, estimated tax, shipping and reported total. Missing tax/shipping remains unknown. A checkout comparison amount is only calculated when base price, tax and shipping are supplied and any reported total agrees; the reported total is never added again. Conflicting totals are flagged. These are estimates for one listing, not verified full-quantity landed costs. No total-cost negotiation gap is calculated because supplier tax/freight basis and bulk fulfilment are unverified. Synthetic examples illustrate how a cheaper base price can have a higher checkout estimate.

Cost enrichment is enabled in the UI and can be turned off to conserve requests. If no matching product token exists, costs remain unknown instead of triggering speculative searches. New endpoints: `/api/alternatives`, `/api/alternatives-demo`; quote audits accept optional `enrichCosts: true`.

## Market watchlist and target signals

1. Complete a quote audit, then choose **Watch model** in its Overview table. The watch saves the exact query, identifiers, quantity and report mode. The initial target is the quoted unit amount; edit it in Market watch.
2. Select up to three products and click **Recheck selected**. Live watches make one Google Shopping request per product, with the same identity/condition/currency filters and median abstention rules as the audit. Sparse coverage stays unknown; watch rechecks do not expand store tokens or run follow-ups.
3. Enable **Fetch new upstream results** to bypass QuoteProof's cache and send SerpApi `no_cache=true`. Fresh searches can consume credits. Ordinary checks can reuse the 30-minute app cache or SerpApi's upstream cache. Request counts do not establish billed credits.
4. The in-app target signal appears when the latest traceable usable median is at or below the target. A usable median needs at least three normalized seller names and a spread at most 60%. Reused IDs, cached rechecks, missing search IDs, sparse/wide-spread results and failures do not create fresh target signals or chart points. A saved audit baseline can be shown even if the audit itself used cached evidence; it remains labelled as a baseline.
5. Inspect median changes, lowest matching prices, coverage, search IDs and returned source-creation times. Changing seller coverage can change a median without any seller changing price. The audit baseline can include expanded store offers, whereas watch rechecks use Shopping only; this scope change is flagged. No historic prices or historic dates are generated. The chart shows check-order observations and its values are available in the history table.
6. Export **Watchlist JSON**. Up to ten watches and the latest thirty checks per watch persist in this browser. Demo/live watches remain separate, the key is excluded, and clearing saved data removes all watches. Removal or target/quantity changes during a recheck prevent the arriving result from being saved against the changed watch.

Synthetic watches have explicit **At target**, **15% below target** and **15% above target** scenarios. They generate labelled fixture offers at the current check time and make zero requests. These are illustrations, not historical observations of a real product. Alerts appear in this app after manual rechecks; there is no unattended scheduler or email delivery. An 8 October user-exported live watch confirms an uncached Shopping response with upstream bypass requested. It exposed a ₹500 scanner-part mismatch and a Desidime deal post counted as a seller. The corrected filters were replayed offline against the exported listings; a subsequent fresh user-exported check confirms four matching seller names, a ₹14,200 low and a ₹15,744.50 median. Screenshots of the following cached check show zero outbound requests, reused evidence and one usable chart point across four checks. Reload validation remains pending.

Endpoints: `POST /api/watch` and `POST /api/watch-demo`. Both accept one to three ordinary item objects (`name`, `identity`, `quantity`, `quote`); `quote` represents the target unit amount in this route. Live accepts `fresh: true` for upstream bypass or `force: true` for app-cache bypass only. Demo accepts `demoScenario: "steady"`, `"drop"` or `"rise"`. These routes return price observations, not a purchase recommendation or tax-inclusive bulk estimate.

## Cloudflare deployment

Cloudflare Workers + D1 configuration and a Windows-friendly setup command are included. Follow [the deployment guide](docs/CLOUDFLARE_DEPLOY.md) to create the database, apply migrations, enable Cloudflare Access email PIN sign-in, and set your SerpApi key as a Worker secret. Shared credits accept only Cloudflare-verified runtime identity; forged client identity headers cannot enable them. The initial setup protects the whole app with an email allowlist. Personal-key and synthetic modes remain available after sign-in. Actual deployment and hosted PIN/real-key verification must be completed in your Cloudflare account.

## Core functionality

- Editable quote lines and a structured paste importer.
- Core SerpApi engines, with a single bounded product-details lookup or Shopping follow-up for sparse coverage: **Google Shopping** for offers and **Google Search** for specification / warranty discovery.
- Identifier, currency, condition, accessory / spare-part, bundle, link and seller checks. Mouse/webcam add-ons, unrequested Mac or MX Mini Business editions, starting/range prices and installment amounts are excluded.
- Evidence challenge: explicitly shows a cheap rejected offer instead of silently treating it as a saving.
- One lowest eligible listing per distinct normalized seller name; repeated listings do not count as independent support.
- A median listing-price benchmark with at least three distinct seller names.
- Abstention when coverage is insufficient or price spread exceeds 60% of the median.
- A negotiation flag when a quote exceeds the usable median by more than 10%.
- Search IDs, query, engine and timestamp for each evidence retrieval.
- Partial-search errors appear prominently above the results, with no inferred fallback prices.
- Shopping calls run first; when fewer than three matching sellers are found, one matching product card can be expanded through google_immersive_product to retrieve actual store prices; otherwise one targeted Shopping query is permitted. Independent Google discovery searches then run together with a 60-second allowance. No repeated retry loop occurs.
- Flat, inline and categorized Shopping offers are normalized, with source-query provenance on each listing. Unknown-currency amounts are never formatted as INR in the ledger.
- Temporary 30-minute server cache, isolated by a SHA-256 key fingerprint; explicit bypass control.
- Browser-local quote draft and last audit, portable JSON export, printable evidence and a copyable brief. Refresh restores the latest draft (or quote fields from the last audit for existing users); API keys are never saved. Editing or importing a quote hides old results until a new audit completes. Print / PDF includes Overview, Evidence ledger, Checkout costs and Negotiation brief regardless of the active tab; the report can flow across pages while offer cards and table rows stay together where possible.

## Why SerpApi is essential

The live report depends on SerpApi's structured search results. Without its Shopping results, the app has no current offer prices, seller counts or benchmark. Google Search results supply follow-up evidence pages; the app never turns their snippets into verified warranty claims.

Calls use `https://serpapi.com/search.json` with `engine=google_shopping` or `engine=google`, `q`, `gl=in`, `hl=en`, `google_domain=google.co.in`, `location=New Delhi,Delhi,India`, and the server-side request key. When a matching card supplies a product token, one bounded `engine=google_immersive_product` request uses `page_token` and `more_stores=true`. Store-level titles, names, links and prices are checked individually; aggregate starting prices do not enter the benchmark. The key is not shipped in source code. This project calls the HTTP API directly; it does not use SerpApi MCP or the search-tools Python package.

Official references:

- https://serpapi.com/google-shopping-api
- https://serpapi.com/search-api
- https://serpapi.com/google-immersive-product-api

## Verification

```powershell
npm test
```

110 tests cover wrong variants, misleading offers, currency and link checks, duplicate sellers, median calculations, abstention, failed searches, credential redaction, cache isolation and API contracts. Upstream API calls are mocked. The page script is executed with a simulated DOM to check quote restoration, key exclusion, and stale-result invalidation, requirement drafts, candidate selection and cost-tab rendering. Regression checks exclude CCD scanner replacement units from printer benchmarks and Desidime deal posts from seller coverage while preserving complete multifunction printers. Shared-access checks use real local SQLite statements with mocked upstream responses to verify sign-in enforcement, concurrent caps, failure accounting, persistent counters, cache reuse and explicit account fallback. Simulated-page checks cover account choice restoration and exclusion of personal keys from shared headers. Watch checks cover request limits, upstream cache bypass, price coverage, history restore, mode separation, target signals, reused IDs, stale responses and exports without keys. Regression checks also cover manufacturer-hosted forums, conditional feature wording, and all report sections printing from every selected tab. New checks cover missing costs, inconsistent totals, requirement negation, wrong-variant detail rejection and bounded discovery/specification requests, manufacturer hostname and exact-model checks, and conflict preservation. Additional checks cover SerpApi’s structured second-hand condition and installment fields, mixed currencies, invalid identifiers, and Google Shopping link labels. Cloudflare regressions cover forged headers, missing/failed identity, normalized-email quotas, Worker context forwarding, and provider-specific sign-out links. These checks do not replace real browser testing.

**Observed live-mode result:** a user-exported 6 October 2026 report for HP 4004dn accepts three seller names, excludes 21 of 24 offers (including a wrong 4004d variant and a formatter board), and produces a ₹29,923 median. Against an example ₹36,500 unit quote for five printers, it reports a ₹32,885 indicative negotiation gap. The arithmetic and exclusion records were checked. Search IDs match a prior run, so this confirms processing of those search results, not independently refreshed prices or verified purchase savings. See `docs/LIVE_RESULT.md`.

Shopping, Google discovery and a product-details request have completed in user-exported live-mode runs. Sparse coverage can still prevent a benchmark and Google discovery can time out. An 8 October live-mode shortlist returned six candidates with four successful requests, two automatic-duplex source mentions, but no Ethernet evidence. This prompted the new manufacturer-search fallback. A later user-exported shortlist on 8 October exercised the fallback with seven attempted requests, six successes and one timeout. HP 323sdnw had explicit Ethernet snippets from HP support specification pages; Brother DCP-L2520D remained unknown for Ethernet. An HP community snippet was incorrectly eligible as specification evidence; the forum exclusion and conditional-text fix were replayed offline against that export, and the HP Ethernet mention still comes from genuine support snippets. Reused upstream Shopping/detail search IDs do not establish refreshed prices. Full manufacturer and merchant-page checks for regional specifications, taxes, shipping, stock and warranty remain pending. Full browser interactions were not automated in the build environment; simulated page tests cover draft restoration and stale-result invalidation. A further user-uploaded PDF on 8 October confirms that the Overview now prints on page one and the evidence, costs and brief all appear without the former first-page gap. Run `docs/LIVE_VALIDATION.md` before recording or submitting; the latest fresh watch export confirms the scanner-part filter fix, while shared-account hosted sign-in and real-key validation remain pending.

The included `.github/workflows/test.yml` runs tests and validates the build on pushes and pull requests without a SerpApi key. Its commands pass locally. A user-provided screenshot confirmed a green GitHub run for the preceding version; these Cloudflare changes require a new hosted run.

After editing `src/`, regenerate the portable worker before starting:

```powershell
npm run assemble
npm test
npm start
```

The included `worker/index.js` is already assembled. Linux deployment build: `npm run build`, then `npm run validate`. This build uses Bash; Windows users do not need it to run locally.

## Architecture

```text
Buyer requirements → SerpApi Shopping + product details → candidate evidence
→ buyer chooses a model → separate quote draft

Quote input → SerpApi Shopping + Google → evidence normalization
→ identifier / variant checks → distinct seller median
→ recommendation or abstention → evidence ledger + export
→ saved exact-model watch → manual Shopping recheck → target signal + history
```

- `src/core.js`: validation, comparison logic and clearly labelled fixtures.
- `src/api.js`: bounded searches, error handling, provenance and temporary cache.
- `src/access.js`: trusted shared identity, account choice and persistent atomic usage reservations.
- `db/` and `drizzle/`: shared usage schema and initial migration.
- `scripts/local-db.mjs`: local SQLite adapter; its private data stays in ignored `.local/`.
- `src/page.html`: responsive UI; no external dependencies or asset requests.
- `scripts/assemble.mjs`: assembles the UI and server into one Worker module.
- `worker/index.js`: portable Cloudflare Worker module, also used by the Node server.
- `scripts/serve.mjs`: local Node HTTP server bound to 127.0.0.1.
- `tests/`: core and integration contract tests.
- `docs/`: live validation, observed result, demo script, GitHub publishing instructions and submission description.

## Matching and limitations

This MVP focuses on new, individually sold electronics with explicit model / variant identifiers. Required identifiers must match complete title words; adjacent words can be joined to handle 1 TB and 980-PRO. Unrequested AZERTY, QWERTZ and DVORAK layouts are excluded; an explicitly requested layout must agree. Generic keyboard titles do not establish a layout. These checks reject obvious conflicts, but heuristic title matching can still produce false matches and missed offers. Be specific with brand, model, capacity, generation and connectivity. Do not use the tool for bundles, commodity consumables or products whose condition / specification cannot be described in the title without human review.

Some result links open a Google Shopping product page rather than a merchant website. The UI identifies these links; choose a seller on Google to inspect its offer. Product-page prices and buying options can change after a search. No seller URL is guessed.

The benchmark compares **listing prices**, not landed cost. Available checkout components are shown separately; missing costs remain unknown. GST inclusion, delivery costs, live inventory, seller legitimacy, warranty and full-quantity availability are unknown unless manually checked. Distinct names do not guarantee distinct businesses. The quoted price must be on a comparable tax basis. A lower market listing does not prove a supplier quote is unreasonable: service, warranty and procurement terms may justify the difference.

The report supplies discovery evidence for human decisions; it does not approve purchases or contact suppliers. No automatic procurement action occurs.

## Hackathon submission

See `docs/SUBMISSION.md` and the under-three-minute demo script in `docs/DEMO_SCRIPT.md`. The rules require a public GitHub repository and an accessible video under three minutes showing the project **running locally**. A private preview does not satisfy public repository / video access requirements.

AI disclosure: **OpenAI ChatGPT / Codex** assisted with product design, implementation, documentation and tests. No runtime LLM is used. Participants should confirm dates, personal eligibility, project history and terms on the official website before submission.

## License

MIT; see `LICENSE`. Synthetic fixture data was authored for this project. SerpApi and searched websites retain their respective rights and terms.
