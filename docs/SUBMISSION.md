# Suggested submission

**Project:** QuoteProof — Know before you approve

**Track:** Commerce & Market Intelligence

**Short description:**
QuoteProof helps small businesses audit supplier quotes using current SerpApi market evidence. It rejects misleading price comparisons, benchmarks matching offers across distinct named sellers, and creates a traceable negotiation brief with an explicit “insufficient evidence” outcome. Buyers can also discover alternative models by requirements and budget, and inspect checkout tax/shipping fields without treating unknown costs as zero. A market watchlist adds manual exact-model price rechecks, target signals and exportable observation history.

**What it does:**
Users enter up to three products with required model / variant identifiers, quantity and quoted unit price. SerpApi Google Shopping provides listing offers; Google Search provides specification and warranty discovery links. For sparse coverage, a bounded google_immersive_product lookup can expand a matching product card into actual merchant offers, or a targeted Shopping query can run instead. The app normalizes flat, inline and categorized results, then excludes wrong variants, refurbished goods, accessories, spare parts, unrequested keyboard layouts, bundles, ambiguous currencies and unusable sources before calculating a median. It shows accepted and rejected evidence, retains search provenance, and exports the report. An optional bounded lookup enriches checkout component fields. A separate requirements workflow discovers up to six candidates, expands at most three product-detail tokens, shows source mentions/conflicts/unknowns for every feature, and uses up to three Google searches to find missing feature evidence on recognized manufacturer domains, and lets the buyer choose a candidate for a separate exact-model quote audit. The UI preserves clickable snippets, exact-model/domain checks and unresolved outcomes; it does not claim to fetch or verify full manufacturer pages.

**Distinctive approach:**
The product challenges whether a price is comparable before treating it as evidence. Watched models extend the workflow beyond a one-time audit: repeated IDs are marked as reused, changing seller coverage is flagged, and target signals require a usable traceable median. A visibly cheaper result can be rejected. Sparse or inconsistent results trigger abstention instead of a confident recommendation. This combines commercial usefulness, transparent decision rules, bounded search usage and testable failure behaviour.

**SerpApi usage:**
Direct HTTP API calls to google_shopping and google, with bounded google_immersive_product lookups for sparse coverage, optional checkout cost fields and candidate specifications and model-specific manufacturer discovery, via search.json, localized with gl=in, hl=en, google_domain=google.co.in and a New Delhi, India search origin. Watch rechecks use one localized google_shopping request per selected model, at most three per batch; an explicit fresh option sends no_cache=true. SerpApi is essential to every live price benchmark, watch recheck and source-discovery step. No MCP or Python search-tools package is used.

**Current scope:**
Working MVP for new individually sold electronics in India. No purchase execution, automated supplier contact, verified seller scoring, guaranteed savings, verified bulk landed-cost calculation or warranty verification. Checkout estimates require explicit components; source text mentions do not establish verified product specifications. The initial alternative flow has a user-exported live-mode run (six candidates, four requests, no complete Ethernet evidence). A later user-exported run exercised manufacturer searches: seven attempts, six successes, one timeout, with usable HP support snippets and Brother Ethernet remaining unknown. The forum/conditional-text fix was replayed against that response, and a later printed report confirms the PDF layout repair. A watchlist is implemented with browser-local persistence, manual rechecks and in-app target signals; its API contract and page-state checks use mocked upstream responses. User-exported real-key watch checks include a four-seller Brother benchmark and sparse HP / Logitech observations; hosted shared-key sign-in validation remains pending. Synthetic data is explicitly labelled. A user-exported 4004dn live-mode report demonstrates a three-seller benchmark and exclusion of a formatter board. The search IDs match a prior run; no claim of fresh merchant pricing or verified savings is made. See LIVE_RESULT.md and complete the remaining seller-page checks.

**AI disclosure:**
OpenAI ChatGPT / Codex assisted with concept design, code, tests and documentation. The running application does not use an LLM.

**Project history:**
This project was created for this request during the hackathon period. Review and complete the form’s existing-project disclosure based on your actual development history and any subsequent reused work.

## GitHub from Windows

For the GitHub CLI publishing route and checks, see GITHUB_PUBLISH.md. The commands below are an alternative for an empty repository created on github.com.

Create an empty public repository named QuoteProof in your GitHub account. Then, from the extracted project folder:

```powershell
git init
git add .
git commit -m "Build QuoteProof SerpApi procurement MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/QuoteProof.git
git push -u origin main
```

Replace YOUR_USERNAME. Do not commit keys, .env files, private quote reports or generated archives. The included .gitignore excludes common secret and build files.

Before submitting:

- Run the live validation checklist and record a local demo under three minutes.
- Make repository and video links accessible in an incognito window.
- Add participant / teammate details yourself.
- Read and accept the official rules and terms yourself.
- Deadline currently listed: 10 October 2026, 23:59 IST. Confirm on the event website.

Rules: https://serpapi.github.io/serpapi-india-hackathon-2026/rules.html
