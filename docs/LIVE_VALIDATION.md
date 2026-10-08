# Live validation before submission

1. Run `npm test`: expect 103 passing tests.
2. Start with `npm start`; open http://localhost:3000.
3. Click Audit in Demo mode. Confirm SYNTHETIC labels, zero searches, a ₹64,210 gap, and one rejected trap per product.
4. In Evidence ledger, confirm the M404dw printer, renewed keyboard and 500GB SSD are excluded. Demo URLs are example.com fixture links, not real merchant offers.
5. Create your SerpApi account, then enter its key in Search settings. Never show the key in the video.
6. Shopping, Google discovery and product-details lookup have completed in live runs. A subsequent 4004dn live-mode app export produces the checked ₹29,923 benchmark and excludes the formatter board. Its search IDs match a prior run; refreshed merchant prices and seller-page verification remain pending. See LIVE_RESULT.md. For a live test, use one line with an exact model sold in India. Maximum four requests per line with cost enrichment (three without it), including at most one sparse-coverage follow-up and one extra cost lookup if a matching token exists. Confirm search IDs, queries, timestamps, New Delhi origin, google.co.in domain and actual result links.
7. Expect live Shopping coverage to vary. If fewer than three matching sellers are found, the app must show insufficient evidence, not a made-up target. Adjust the query or identifiers only when the product identity remains correct.
8. Open at least three seller pages before treating any target as usable. Confirm model, capacity, condition and currency; manually check GST, delivery and stock.
9. Run the same audit again: cached queries should show zero new outbound requests if the same server instance retains its memory cache. This does not promise upstream billing behaviour.
10. Change the quoted price and run again: cached market evidence should produce an updated negotiation gap without fresh requests when the cache is still present.
11. Export the JSON. Search it for your actual API key; it must not appear. Search IDs and sanitized source evidence should appear.
12. Reload the page: the entered key should be cleared. Quote inputs and mode should be restored in the same browser; old results must not automatically return. Last saved audit remains accessible unless cleared in Methodology. Changing or importing inputs must hide the old results until another audit completes.
13. Test an intentionally invalid key. Expect a visible account/search failure and no invented prices.
14. Check a narrow browser window, quote import, tabs, brief copying and Print / PDF manually. Draft and import handlers were tested using a simulated DOM; complete browser interactions were not automatically exercised during creation.
15. Record locally using live results. Clearly identify any synthetic segment. No claim of live accuracy, savings or user adoption should be based on the fixture.

Archive your real exported report as evidence for reviewers, after checking that it contains no credentials or sensitive procurement data.

16. Inspect any excluded amount with missing currency. It must show the supplied currency text or “currency unconfirmed”, never an inferred rupee label. Confirm that a missing price is not displayed as ₹0.
17. Check each accepted offer’s source search ID. No benchmark should combine undocumented prices. Follow-up request counts must appear in the export.

18. A keyboard with a bundled webcam or mouse must be excluded even when its title lacks the word “bundle”. A Mac edition needs “for Mac” explicitly in the quote name.
19. A price ending in +, a range price or a monthly installment must not enter the benchmark. Aggregate cards need actual merchant offers from product details.
20. If a matching product token is supplied by Shopping, the optional third request should be google_immersive_product; otherwise it may be a targeted Shopping query. Never expect both follow-ups in one line.

21. Mini must not match inside aluminium. French AZERTY and QWERTZ listings require those layouts explicitly in the quote. Generic keyboard titles still need manual layout verification.
22. Inspect Shopping followupStrategy in the export: it records token availability and the reason for the selected follow-up without leaking token values. A targeted Shopping search does not validate product-details expansion.

23. Logic cards, formatter boards, fuser assemblies and other spare parts must not count as complete printers even when their titles contain the exact model. With the observed 4004dn offers of ₹27,082, ₹29,923 and ₹41,999, the median is ₹29,923. The ₹1,00,300 board must be excluded.


## New cost and requirements flows

24. In Demo, open Checkout costs. Confirm two sellers have explicit synthetic tax/shipping amounts, the third remains unknown, and the total is not added to its components again. Base-price benchmark stays unchanged.
25. Run a one-line live audit with cost enrichment enabled. Export JSON. It may add one product-details lookup only when a matching token exists; all unknown cost fields must remain null. Inspect returned total/tax/shipping against the merchant checkout for the same item and location. A missing field is a valid abstention, not proof of zero cost.
26. Choose Find alternatives → Demo. Use five office laser printers, ₹160000 base budget, automatic duplex and Ethernet. Confirm one fixture mentions both, one conflicts on manual duplex, and one needs verification. All prices are synthetic.
27. Choose Live search for the same requirements. Capture the shortlist JSON. It must show at most six candidates and at most seven outbound requests. Record the actual engines, errors, titles, spec evidence and price coverage; no result should be described as a verified manufacturer match.
28. Inspect every source before claiming requirement suitability. Absent text is unknown. A returned detail title that differs from the candidate must not fill its price/specs. Numeric thresholds must be checked manually.
29. Choose a usable candidate. Confirm it creates a separate quote draft, review brand/model/variant identifiers, replace the listing price with a supplier quote, and run a new audit. Old results must be hidden and alternatives must never enter another model's median.
30. Refresh after editing requirements. Confirm the draft restores while the entered key clears. During a search, change the budget: the old response must not display as the current shortlist. Clear saved data removes quote/requirement drafts and the saved audit.

User-exported live shortlists and quote audits have exercised the new flows. Complete manufacturer/merchant verification and a real browser walkthrough of the latest fixes remain pending. Automated checks use mocked responses and a simulated DOM; do not claim these establish real-world matching accuracy.


## Manufacturer specification fallback

31. Run the same live requirements search again: office laser printer, quantity 5, budget ₹160000, automatic duplex and Ethernet. Do not assume the earlier candidates or prices will recur. Discovery must make no more than seven requests. Expect up to three Google searches after product-detail lookups if candidates have missing features and recognized manufacturer/model identifiers.
32. Expand **Specification sources**. Inspect its query, search ID, clickable URL and snippet. A manufacturer hostname alone is not enough: the source title must match the requested model/capacity. Wrong suffixes, mixed-model printer snippets and lookalike domains must not fill features. Community/forum posts must say discovery only and must not contribute feature evidence, even on a manufacturer hostname. Conditional wording such as “If Ethernet is an option” and questions must stay unknown.
33. Open source pages manually. “Mentioned in source” means search text includes the feature, not that the application fetched or independently verified the page. Confirm regional variant, automatic vs manual duplex and wired Ethernet. Missing text stays unknown; explicit conflicting text remains a conflict even if another source mentions the feature.
34. Export the new shortlist. Check candidate `specSearch` states, `specSources`, per-feature evidence URLs and request counts. Some candidates may show budget-limit or unsupported-identity states: only three Google fallbacks are allowed, and the initial recognized manufacturer list is HP, Brother, Samsung and Logitech.
35. Re-run without cache bypass to check app-cache reporting; repeating a search ID does not prove a new price/specification observation. The fallback has 103 automated core/API/simulated-page checks and has been replayed against a user-exported live shortlist. A fresh run of the latest filtering fixes and manufacturer-page verification remain necessary.

36. After refreshing the updated app, run or restore a completed audit. Print separately while Overview, Evidence ledger, Checkout costs and Negotiation brief are selected. Each preview must contain the overview table plus all three other sections; the report should start below the summary without an artificial full-page gap. Cancel printing and confirm the selected screen tab is unchanged. Actual PDF pagination depends on paper size and the browser/driver and has not been automatically verified.


## Market watchlist

37. Run a Demo quote audit. In Overview choose Watch model. Market watch must show SYNTHETIC DEMO, exact identifiers, quoted-unit target and an audit baseline. Re-save the same model in the same mode: it must select the existing watch without duplicating it.
38. Select the watch, choose 15% below target, and Recheck selected. It must show a synthetic target signal, a new labelled fixture observation and zero outbound requests. Choose 15% above target: the signal must clear and the displayed change must be synthetic. Fixtures generate check-time examples, not prior live history.
39. Refresh: watch history and edited quantity/target must restore, but the key must be empty. Clear saved data in Methodology: all watches, drafts and saved reports must disappear.
40. Save a live audit model as a separate LIVE WATCH. Enter the key in Search settings. Set an appropriate target, select the watch and enable Fetch new upstream results. Recheck once: at most one google_shopping request per selected live model; no immersive product or Google follow-up. Record search ID, sourceCreatedAt when supplied, exact identifiers, request counts, benchmark and coverage.
41. Disable the fresh option and recheck within the app cache window. If the response is cached or its search ID repeats any retained check, it must say Reused evidence, add no fresh chart point, report no fresh target signal and retain the original evidence. If a new server instance performs another outbound request, a repeated upstream ID must still be detected.
42. Sparse coverage (<3 seller names) or spread above 60% must show no target signal; failed searches must retain older history but cannot invent current prices. If the median changes and seller coverage or audit-versus-Shopping scope changed, inspect those cautions before calling it a market price movement.
43. Select at most three watches per batch. Demo and live watches must use separate endpoints and preserve their labels. Change a target/quantity or remove a watch while a recheck is pending: the old response must be skipped. No automatic recheck must occur on refresh or on editing a target.
44. Export Watchlist JSON and check for your actual key: it must not appear. Verify all saved queries, IDs, times, seller prices, demo/live modes and sampleState values. Compare any live listing to its merchant page for current model, stock, quantity, tax and shipping. Watch history is local to this browser and retains thirty checks per product.

45. Recheck Brother DCP-L2520D after refreshing the updated app, with Fetch new upstream results enabled. A title such as “Brother DCP-L2520D / DCP-L2540 / DCP-L2541DW / MFC-L2701DW CCD Scanner with Scanning Unit” must not enter matching sellers or the lowest matching price. Desidime posts must be discovery only, not seller coverage. Complete multifunction printer titles mentioning a flatbed scanner must remain eligible. Historical checks retain their original values; the next recheck records a new observation. Do not claim the offline replay median is a new live price.

## Shared account and fallback

46. Follow SHARED_SEARCH.md to set a local `.env` key. Restart the loopback server, choose Use QuoteProof credits and run one live watch. Refresh: the server key must remain available without re-entry. The browser must not receive that key in the page, health response or exports.
47. On Sites, configure the key as a runtime secret and AUTH_PROVIDER=sites, then deploy. Anonymous shared requests must require sign-in; personal-key and synthetic routes must not consume the shared counter. Verify top-level sign-in/sign-out. Existing sharing restrictions remain in effect.
48. With small temporary app limits in a test deployment, exhaust shared attempts. The UI must offer your own key or demo, make no silent account switch and never exceed the configured budget through parallel requests. Restore the intended limits afterward. Test cached rechecks: no shared attempt is charged.
49. Restart local server with the same `.local/usage.sqlite`: used attempts must remain. A storage failure must prevent shared upstream calls. Do not claim provider billed credits equal app attempt counts.
50. Confirm `git check-ignore .env` returns `.env`, and `git ls-files .env` returns nothing. The distributed `.env` must have an empty key. The hosted shared-key walkthrough remains pending until that secret is supplied outside chat.

51. For a standard Logitech MX Keys Mini quote, titles explicitly naming “for Business” or “Business Edition” must be excluded. If the buyer explicitly requests Business, the offer must identify that edition; standard retail titles cannot benchmark it. The 8 October watch export accepted a standard ₹5,999 listing and a ₹23,700 Business listing before this fix. Replaying its accepted listings after the fix leaves one seller and no median/target signal. A fresh recheck remains required.

52. Inspect an offer whose URL opens Google Shopping. Confirm the app labels it as a Google product page, then choose a seller there; the app does not guarantee that later buying options equal the recorded listing price.
53. On GitHub, check the first Actions run after pushing. Before staging, `git check-ignore .env` must return `.env`; after staging, `git ls-files .env` must be empty. Keep `.local/` and uploaded private reports out of the repository.
54. On the intended host, configure the key as a server secret, verify the shared-mode identity and DB adapter, and check remaining allowance before/after a fresh search. A local `.env` does not configure a hosted deployment. Confirm judges can open the chosen demo link.
