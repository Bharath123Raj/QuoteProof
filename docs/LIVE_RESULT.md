# Observed live-mode report · 6 October 2026

This records a user-exported app report, generated at 23:15:34 IST. It is evidence of the app's observed search-result processing, not an independent verification of merchant prices or a purchase saving.

Product: HP LaserJet Pro 4004dn printer. Required identifiers: HP 4004dn. Quantity: five. The ₹36,500 quoted unit price is an example test input, not a documented supplier offer.

| Included seller name | Observed unit listing price |
| --- | ---: |
| HP Store India | ₹27,082 |
| Flipkart | ₹29,923 |
| Microworld Infosol | ₹41,999 |

The report includes 24 offers and excludes 21. It rejects the ₹18,860 4004d variant and the ₹1,00,300 logic card / formatter board. The accepted prices yield a ₹29,923 median. Their range divided by the median is 49.85%, below the application's 60% review threshold.

Calculation: (₹36,500 − ₹29,923) × 5 = ₹32,885 indicative negotiation gap. The example quote is 21.98% above the median, so the app returns `negotiate`.

The export reports two successful uncached outbound requests and no search errors. This is an app request counter, not a billing-credit measurement.

- Shopping query: `HP LaserJet Pro 4004dn printer`
- Shopping search ID: `6ac52cbf2f47f868a8433848`
- Google query: `HP LaserJet Pro 4004dn printer specifications warranty India`
- Google search ID: `6ac52cceff596eebfc1e1922`

These search IDs match a prior run. The export establishes corrected processing of those search results; it does not establish independently refreshed prices. GST, delivery, live stock, warranty, seller legitimacy and full-quantity availability remain unverified.

An earlier M404dn run also completed a product-details lookup. Its wrong-model store listings were excluded and it produced no benchmark. Product-details coverage therefore varies by product.

The 81 automated checks use mocked upstream responses or simulated page state. They support software behavior; they do not establish universal product-matching accuracy. Keep the original export separately for review, after checking it for private data.

## 8 October: live watch export and scanner-part regression

A user-exported Brother DCP-L2520D watch contains an initial audit baseline with zero matching sellers, followed by a Shopping-only check at 15:43:24 UTC. Its evidence records search ID `6ac7ba1b1b6c6ef50410822e`, `cached: false`, `upstreamFreshRequested: true`, and source creation at 15:43:23 UTC. The uploaded file establishes what the app recorded; we did not issue this search independently.

The later check counted six seller names and reported a ₹500 low, with no usable median because the spread exceeded 60%. The ₹500 Aajjo title describes a **CCD Scanner with Scanning Unit** for several Brother models, a component rather than a complete printer. The other unsuitable source was **Desidime**, a deal community rather than an identified seller offer. The filter now excludes both, retains explicit reasons in audit evidence, and applies the same exclusions to watch observations and alternative offer classification. Scanner feature wording on complete multifunction printers remains eligible.

Replaying only the six exported matching listings offline leaves four seller names at ₹14,200, ₹15,599, ₹15,890 and ₹16,399, with a ₹15,744.50 median and a spread below 60%. At the saved ₹15,599 target, this would not produce a target signal. This is an offline recalculation of those listings, not a refreshed search, verified checkout price or proven purchase saving. The export does not include the ten rejected raw listings, so the replay cannot reclassify the complete original response. Historical checks are preserved; a fresh recheck of the deployed fix remains necessary.

Desidime's own site describes it as an online shopping community sharing deals, coupons and offers: https://www.desidime.com/new.html and https://business.desidime.com/. The exclusion is a known-source heuristic, not universal seller verification.

## 8 October: fresh watch and cached recheck after the fix

A later user export records a Shopping-only check at 16:54:50 UTC, with a new search ID `6ac7cada0676dcc9f1bbb363`, app cache false and upstream bypass requested. It includes four matching seller names at ₹14,200, ₹15,599, ₹15,890 and ₹16,399; the median is ₹15,744.50, with thirteen rejected results and a 13.97% spread. Neither the scanner unit nor Desidime is present in accepted sellers. The saved target is ₹15,599, so the usable median does not trigger a target signal. This validates processing of this user-issued search, not merchant checkout, stock or purchasing savings.

The user's following screenshots show cache bypass disabled, zero outbound requests, “Reused evidence · no fresh alert”, four history checks and one usable chart point. The displayed median is rounded to ₹15,745. This confirms the observed cached UI path; independent browser automation and a full reload walkthrough remain outside this evidence. Older incorrect ₹500 observations remain historical records rather than being rewritten into new price evidence.

## 8 October: MX Keys Mini edition mismatch

A later user export contains a baseline at 17:35:52 UTC and a fresh Shopping-only watch check at 17:36:32 UTC. The latter records ID `6ac7d4a2ac17653d2b98cc6f`, app cache false and upstream bypass requested. It accepted gpuheaven.com at ₹5,999 (“Logitech MX Keys Mini Wireless Keyboard”) and cart2india at ₹23,700 (“Logitech MX Keys Mini for Business”). With only two seller names the benchmark was correctly withheld, but including the Business edition for an unspecified standard-edition quote was a matching defect. The key source (shared or personal) is not recorded in this export, so it does not establish that `.env` shared mode was used.

The filter now requires an explicit Business request for MX Mini Business-labelled listings. A Business quote also requires that edition to be identified in the offer. Offline replay of the two exported accepted listings leaves one standard-edition seller at ₹5,999, with no usable median or target alert. The export omits the thirty rejected raw listings, so it cannot establish that this is the sole eligible seller in the complete response after all revised rules. Historical observations are preserved; a fresh recheck must validate the new filter.

Logitech lists MX Keys Mini for Business as a separate edition with its own package contents: https://www.logitech.com/en-us/products/keyboards/mx-keys-mini-for-business.html. This justifies treating its explicit edition label as a variant requirement; it does not verify a seller's regional stock, condition or checkout price.


## Final review: M404dn audit and watch on 8 October

A user-exported live audit at 17:51:42 UTC quotes five HP M404dn printers at ₹36,500 each (₹182,500 total). Three uncached successful responses have distinct SerpApi search IDs. All 37 normalized offers failed matching checks; the report correctly withholds its benchmark and negotiation gap. Replaying the exported listing fields against the reviewed code reproduces seller count, rejection count, status and benchmark. This is a replay of exported data, not a fresh API call.

The watch export contains that audit baseline and two Shopping-only fresh checks. The 17:52 check found one Ubuy listing at ₹107,160 (ID `6ac7d85dfbe53bce3b7c8497`); the 17:55 check found zero matching sellers (ID `6ac7d92228b27b200213fa26`). Neither qualifies for a median, chart point or target signal. The user's screenshot opens the Google product page with the same ₹107,160 Ubuy offer; these links are now explicitly labelled as Google Shopping pages. Buying options can change, and the evidence does not verify checkout or stock.

Code review also closed two API schema gaps: `second_hand_condition` and `installment` now block new-unit comparisons even with clean product titles. Mixed currency labels and punctuation-only identities are rejected. An occupied local port now produces an actionable message. The uploaded `test3.pdf` copy ends at 1,048,576 bytes without a PDF trailer; it could not be rendered, so this review makes no new print-layout claim. 103 automated tests, build and deployment-module validation pass; browser automation and hosted shared-key end-to-end checks remain unavailable or pending.


## Follow-up screenshot: Desertcart MX combination

A later user screenshot shows an MX Keys Mini watch with Amazon.in at ₹9,495 and Desertcart.ae at ₹27,474. Desertcart’s title is “Logitech MX Keys Mini Wireless QWERTY + Logitech MX Anywhere 3S Compact keyboard”. The previous category-based bundle rule missed it because the second model was labelled as a keyboard, which was also the requested category. This was an eligible-listing defect despite the median already being withheld for two sellers.

The filter now excludes separated MX product names in either a listing title or its parent variant context, including combinations that omit or mislabel the second product’s category. Plain connectivity text and a repeated parent model title do not create a combination by themselves. Core and mocked watch-API replay of the two screenshot listings leaves Amazon as the single eligible seller, lowest ₹9,495, with no median or alert. This does not establish that Amazon is the sole matching seller in the full raw API response, which was not supplied. No fresh upstream call was made during this replay; a new live recheck is required. Original saved observations are retained unchanged.

A simulated-DOM regression verifies Quote audit, Find alternatives, Market watch and Methodology navigation plus Last saved audit restoration without a new fetch. 106 tests, build and module validation pass after the fix.

## Cloudflare deployment preparation

The direct Cloudflare configuration now binds `DB`, serves the embedded page from the Worker, and accepts shared identity only from `ctx.access.getIdentity()`. Client-supplied identity/JWT headers are ignored. Verified email addresses are normalized and hashed with a provider prefix for persistent per-user limits; raw emails and secrets do not enter health responses or counters. Cloudflare logout replaces Sites logout on this provider.

110 automated tests pass, including failed/missing identity, spoofing, durable concurrent caps, Worker context forwarding and provider-specific links. Build and ESM validation pass. Wrangler 4.149.0 successfully bundles the Worker in an upload dry run with a temporary test database binding, and its initial migration applies successfully to a local D1 database. The production configuration intentionally contains a placeholder database ID and its predeploy check rejects it until the user configures their own database. No real Cloudflare deployment, email PIN flow, remote D1 database or hosted SerpApi secret/search has been validated in this step. Follow `CLOUDFLARE_DEPLOY.md` in the user's Cloudflare account.
