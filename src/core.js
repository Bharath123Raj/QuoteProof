export const VERSION = '1.0.0';
export const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function containsIdentifier(title, identifier) {
  const required = normalize(identifier);
  if (!required) return false;
  const words = String(title).toLowerCase().match(/[a-z0-9]+/g) ?? [];
  // Join complete adjacent words for variants such as 1 TB or 980-PRO.
  // Never match inside an unrelated word: Mini is not part of aluminium.
  return words.some((_, start) => {
    let joined = '';
    for (let end = start; end < words.length && joined.length < required.length; end++) {
      joined += words[end];
      if (joined === required) return true;
    }
    return false;
  });
}
export function collectShoppingOffers(data) {
  const array = value => Array.isArray(value) ? value : [];
  return [...array(data.shopping_results), ...array(data.inline_shopping_results), ...array(data.categorized_shopping_results).flatMap(group => array(group.shopping_results))];
}
export function safeUrl(value) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; } }
export function validateItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 3) throw new Error('Enter between 1 and 3 quote lines.');
  return items.map((x, i) => {
    const name = String(x.name ?? '').trim();
    const identity = String(x.identity ?? '').trim();
    const quantity = Number(x.quantity), quote = Number(x.quote);
    if (!name || name.length > 140 || identity.length < 2 || identity.length > 100 || !identity.split(/[\s,;]+/).some(normalize)) throw new Error('Line ' + (i + 1) + ': enter a product and required model / variant identifiers.');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000 || !Number.isFinite(quote) || quote <= 0 || quote > 10000000) throw new Error('Line ' + (i + 1) + ': quantity must be 1–10,000 and unit price must be positive.');
    return { name, identity, quantity, quote };
  });
}
// All costs describe one listing checkout, never a bulk order estimate.
export function listingCosts(raw, base, currency) {
  const read = (text, extracted, free = false) => {
    const s = String(text ?? '').trim();
    if (currency !== 'INR' || /[$€£]|\b(?:USD|EUR|GBP)\b/i.test(s) || /^\s*-/.test(s)) return null;
    if (free && /^(?:free|free shipping|free delivery)$/i.test(s)) return 0;
    if (!s && (extracted === undefined || extracted === null || extracted === '')) return null;
    if (extracted === undefined && !/₹|\bINR\b|\bRs\.?\s/i.test(s)) return null;
    const n = Number(extracted ?? s.replace(/[^\d.]/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const estimatedTax = read(raw.estimated_tax, raw.extracted_estimated_tax);
  const shipping = read(raw.shipping, raw.shipping_extracted, true);
  const reportedTotal = read(raw.total, raw.extracted_total);
  const calculatedTotal = base !== null && estimatedTax !== null && shipping !== null ? base + estimatedTax + shipping : null;
  const inconsistent = reportedTotal !== null && (reportedTotal < base || (calculatedTotal !== null && Math.abs(reportedTotal - calculatedTotal) > .1));
  const complete = calculatedTotal !== null && !inconsistent;
  return { base, estimatedTax, shipping, reportedTotal, calculatedTotal, complete, inconsistent,
    comparisonTotal: complete ? (reportedTotal ?? calculatedTotal) : null,
    scope: 'single-listing checkout; bulk quantity not verified',
    missing: [estimatedTax === null ? 'Tax not supplied' : null, shipping === null ? 'Shipping not supplied' : null, inconsistent ? 'Reported total conflicts with component amounts' : null].filter(Boolean) };
}
export function validateRequirements(input) {
  const category = String(input?.category ?? '').trim();
  const quantity = Number(input?.quantity), budget = Number(input?.budget);
  const requirements = String(input?.requirements ?? '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (category.length < 3 || category.length > 100 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000 || !Number.isFinite(budget) || budget <= 0 || budget > 10000000) throw new Error('Enter a product category, quantity (1–10,000) and a positive total INR budget.');
  if (!requirements.length || requirements.length > 6 || requirements.some(x => x.length > 80)) throw new Error('Enter 1–6 requirements, one per line, up to 80 characters each.');
  return {category, quantity, budget, requirements};
}
export function requirementCheck(requirement, sources) {
  // Evidence labels describe text, not independent specification verification.
  const escaped = requirement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const literal = new RegExp('\\b' + escaped.replace(/\s+/g, '\\s+') + '\\b', 'i');
  const autoDuplex = /^(?:automatic|auto) duplex$/i.test(requirement);
  const positive = autoDuplex ? /\b(?:(?:automatic|auto)(?:\s+two[- ]sided)?\s+duplex|duplex\s*[:=-]\s*(?:automatic|auto)|automatic\s+two[- ]sided)\b/i : literal;
  const negative = autoDuplex ? /\b(?:manual\s+duplex|duplex(?:\s+printing)?\s*[:=-]\s*manual|(?:no|without|not|does not support)\s+(?:auto(?:matic)?\s+)?duplex|(?:auto(?:matic)?\s+)?duplex(?:\s+printing)?\s*[:=-]\s*(?:no|none|not supported))\b/i : new RegExp('\\b(?:no|without|not|does not support)\\s+' + escaped + '\\b|\\b' + escaped + '\\s*[:=-]\\s*(?:no|none|not supported)\\b', 'i');
  // Check each sentence/clause separately: a hypothetical or question is not
  // a specification assertion, even when it contains the exact feature name.
  const assertions = sources.flatMap(s => String(s.text ?? '').match(/[^.!?;\n]+[.!?;]?/g)?.map(text => ({...s,text:text.trim()})) ?? [])
    .filter(s => !/\?|\b(?:if|unless|whether|may|might|could|would|optional|depending)\b|\b(?:on selected models|where available|when supported)\b/i.test(s.text) && !(/^(?:does|do|is|are|can)\b.*\b(?:support|have|include|available)\b/i.test(s.text) && !/\b(?:not|no)\b/i.test(s.text)));
  const conflicts = assertions.filter(s => negative.test(s.text));
  const matches = assertions.filter(s => positive.test(s.text));
  const evidence = conflicts.length ? conflicts : matches;
  return { requirement, status: conflicts.length ? 'conflict' : matches.length ? 'mentioned' : 'unknown',
    evidence: evidence.slice(0, 2).map(s => {
      const match = s.text.search(conflicts.length ? negative : positive);
      const start = Math.max(0, match - 150);
      return {label:s.label, text:(start ? '…' : '') + s.text.slice(start, start + 700), url:safeUrl(s.url), searchId:s.searchId ?? null};
    }) };
}
export function alternativeCandidate(spec, raw, detail = null) {
  const title = String(raw.title ?? '').slice(0, 350);
  const identity = title;
  const offer = classifyOffer({name: title, identity}, raw);
  const sources = [{label:'Shopping listing title', text:title, url:offer.url, searchId:raw.evidenceSearchId}];
  const listingText = [String(raw.snippet ?? ''), ...(Array.isArray(raw.extensions) ? raw.extensions.map(String) : [])].join(' ').slice(0, 1500);
  if (listingText) sources.push({label:'Shopping listing description', text:listingText, url:offer.url, searchId:raw.evidenceSearchId});
  if (detail) {
    sources.push({label:'Product details', text:detail.text, url:detail.url, searchId:detail.searchId});
  }
  const checks = spec.requirements.map(r => requirementCheck(r, sources));
  const baseQuantityEstimate = offer.price === null || offer.currency !== 'INR' ? null : offer.price * spec.quantity;
  const budgetStatus = baseQuantityEstimate === null ? 'unknown' : baseQuantityEstimate <= spec.budget ? 'within-base-budget' : 'over-base-budget';
  const incompleteCardReasons = new Set(['Seller not identified', 'Missing safe evidence link', 'Missing valid unit price', 'INR currency not explicit', 'Starting or range price is not a fixed unit price']);
  const blocked = offer.reasons.some(r => !incompleteCardReasons.has(r));
  return {title, identity, offer, checks, baseQuantityEstimate, budgetStatus, blocked,
    readiness: blocked || checks.some(c => c.status === 'conflict') ? 'conflict' : checks.every(c => c.status === 'mentioned') && offer.eligible && budgetStatus === 'within-base-budget' ? 'review-candidate' : 'needs-verification',
    specSource: detail ? {url:detail.url, searchId:detail.searchId} : null};
}
// Known manufacturers for the current electronics scope. No hostname guessing.
const MANUFACTURERS = {hp:['hp.com'], brother:['brother.in','brother.com'], samsung:['samsung.com'], logitech:['logitech.com']};
export function specificationIdentity(title) {
  const brand = Object.keys(MANUFACTURERS).find(b => containsIdentifier(String(title).split(/\s+/)[0], b));
  const words = String(title).match(/[a-z0-9]+(?:[-/][a-z0-9]+)*/gi) ?? [];
  const models = words.filter(w => /[a-z]/i.test(w) && /\d/.test(w) && !/^\d+(?:gb|tb|mb|ppm|ghz|hz|inch)$/i.test(w));
  const named = String(title).match(/\b\d{3,5}\s+(?:PRO|EVO(?:\s+Plus)?)\b|\bMX\s+(?:Keys(?:\s+(?:Mini|S))?|Mechanical(?:\s+Mini)?)\b/i)?.[0];
  if (named) models.push(named);
  const capacities = words.filter(w => /^\d+(?:gb|tb)$/i.test(w));
  return {brand:brand ?? null, models:[...new Set(models)], capacities, domains:brand ? MANUFACTURERS[brand] : []};
}
export function specificationSources(title, organic, meta) {
  const identity = specificationIdentity(title);
  const required = [...identity.models, ...identity.capacities];
  const sources = (Array.isArray(organic) ? organic : []).slice(0, 10).map(raw => {
    const url = safeUrl(raw.link);
    if (!url || /(?:api_key|apikey)=/i.test(url)) return null;
    const parsed = new URL(url), host = parsed.hostname.toLowerCase();
    const official = identity.domains.some(d => host === d || host.endsWith('.' + d));
    const sourceTitle = String(raw.title ?? '').slice(0, 350);
    const community = /(?:^|\.)(?:community|communities|forum|forums)\./i.test(host)
      || host === 'h30434.www3.hp.com'
      || /\/(?:t5|community|communities|forum|forums|discussions)(?:\/|$)/i.test(parsed.pathname)
      || /\b(?:support community|community forum|user forum|discussion forum)\b/i.test(sourceTitle);
    const snippet = String(raw.snippet ?? '').slice(0, 1500);
    const exactModel = required.length > 0 && required.every(t => containsIdentifier(sourceTitle, t));
    const otherModels = specificationIdentity((identity.brand ?? '') + ' ' + sourceTitle).models.filter(m => !identity.models.some(x => normalize(x) === normalize(m)));
    // Printer family snippets sometimes mix the feature rows of several models.
    const snippetWords = (snippet.match(/[a-z0-9]+(?:-[a-z0-9]+)*/gi) ?? []).map(normalize);
    const printerPattern = identity.brand === 'brother' ? /^(?:dcpl|hll|mfcl)\d+[a-z]*$/ : identity.brand === 'hp' ? /^(?:m)?\d{3,5}[a-z]{1,6}$/ : null;
    if (printerPattern) otherModels.push(...snippetWords.filter(m => printerPattern.test(m) && !/\d+(?:ppm|mhz|ghz|gb|tb)$/.test(m) && !identity.models.some(x => normalize(x) === m)));
    const usedForChecks = official && !community && exactModel && !otherModels.length;
    return {title:sourceTitle, url, snippet, official, sourceType:community ? 'community' : official ? 'manufacturer' : 'external', exactModel, usedForChecks,
      reason:community ? 'Community / forum source: discovery only.' : !official ? 'External source: discovery only.' : !exactModel ? 'Exact model / capacity missing from source title.' : otherModels.length ? 'Source text covers additional models; verify manually.' : 'Manufacturer-domain search snippet; only explicit feature assertions are checked; open the page to verify.',
      searchId:meta.searchId ?? null};
  }).filter(Boolean);
  return sources.sort((a,b) => Number(b.usedForChecks) - Number(a.usedForChecks) || Number(b.official) - Number(a.official)).slice(0, 6);
}
export function applySpecificationSources(candidate, spec, sources) {
  const accepted = sources.filter(s => s.usedForChecks).map(s => ({label:'Manufacturer-domain Google snippet', text:s.snippet, url:s.url, searchId:s.searchId}));
  candidate.checks = candidate.checks.map(check => {
    const next = requirementCheck(check.requirement, accepted);
    if (next.status === 'unknown') return check;
    const conflict = check.status === 'conflict' || next.status === 'conflict';
    const evidence = conflict ? [...(check.status === 'conflict' ? check.evidence : []), ...(next.status === 'conflict' ? next.evidence : [])] : [...next.evidence, ...check.evidence];
    return {...check, status:conflict ? 'conflict' : 'mentioned', evidence:evidence.slice(0, 2)};
  });
  candidate.readiness = candidate.blocked || candidate.checks.some(c => c.status === 'conflict') ? 'conflict' : candidate.checks.every(c => c.status === 'mentioned') && candidate.offer.eligible && candidate.budgetStatus === 'within-base-budget' ? 'review-candidate' : 'needs-verification';
  candidate.specSources = sources;
  return candidate;
}
export function classifyOffer(item, raw) {
  const title = String(raw.title ?? '').slice(0, 350);
  const tokens = item.identity.split(/[\s,;]+/).map(normalize).filter(Boolean);
  const missing = tokens.filter(t => !containsIdentifier(title, t));
  const url = safeUrl(raw.link ?? raw.product_link);
  const seller = String(raw.source ?? 'Unknown seller').slice(0, 100);
  const priceText = String(raw.price ?? '');
  const currency = /₹|\bINR\b|\bRs\.?\s/i.test(priceText) && !/[$€£]|\b(?:USD|EUR|GBP)\b/i.test(priceText) ? 'INR' : null;
  const price = Number(raw.extracted_price ?? priceText.replace(/[^\d.]/g, ''));
  const badCondition = Boolean(String(raw.second_hand_condition ?? '').trim()) || /\b(refurbished|renewed|pre[- ]?owned|used|open box)\b/i.test(title + ' ' + (raw.snippet ?? '') + ' ' + (Array.isArray(raw.extensions) ? raw.extensions.join(' ') : ''));
  const accessory = /\b(case for|cover for|compatible with|replacement for|toner|cartridge|screen protector|keyboard cover)\b/i.test(title);
  const context = title + ' ' + String(raw.variant_context ?? '');
  const requested = item.name + ' ' + item.identity;
  const printerRequested = /\b(printer|mfp|multi[- ]?function)\b/i.test(requested);
  // Scanner features are valid on multifunction printers; replacement scanner
  // units are not complete printers. Do not reject standalone scanner requests.
  const scannerPart = printerRequested && /\b(ccd\s+scanner|scanning\s+unit|scanner\s+(?:unit|assembly|module))\b/i.test(context);
  const component = scannerPart || /\b(logic\s+card|formatter(?:\s+board)?|(?:main|control|circuit|power\s+supply)\s+board|printhead|fuser(?:\s+(?:unit|assembly))?|(?:imaging|drum)\s+(?:unit|assembly)|pick[- ]?up\s+roller|transfer\s+belt)\b/i.test(context);
  const evidenceHost = url ? new URL(url).hostname.toLowerCase() : '';
  // An indexed deal post can have a price and model but is still a discovery
  // lead. Do not count the community itself as an independent named seller.
  const discoverySeller = ['desidime', 'desidimecom'].includes(normalize(seller)) || evidenceHost === 'desidime.com' || evidenceHost.endsWith('.desidime.com');
  const extraTypes = [...context.matchAll(/(?:&|\+|\band\b|\bwith\b)\s+(?:[\w-]+\s+){0,6}(mouse|webcam|headset|monitor|printer|keyboard|speaker|tablet)\b/gi)];
  const pairedGoods = extraTypes.some(match => !new RegExp('\\b' + match[1] + '\\b', 'i').test(requested));
  // Marketplace titles can mislabel the second MX product as a keyboard or
  // omit its category. Separate MX model names still establish a combination.
  // Check title/context independently so a repeated parent title is not counted
  // as another product after a harmless connectivity phrase.
  const multipleMxProducts = [title, String(raw.variant_context ?? '')].some(text =>
    text.split(/\s*(?:[+&]|\band\b|\bwith\b)\s*/i).filter(part => /\bmx\s+(?:keys|mechanical|anywhere|master)\b/i.test(part)).length > 1);
  const bundle = /\b(bundle|pack of|combo|mouse included)\b/i.test(context) || pairedGoods || multipleMxProducts;
  const macEdition = /\bmx\s+(?:keys|mechanical)\s+mini(?:\s+keyboard)?\s+for\s+mac\b/i.test(context) && !/\bfor\s+mac\b/i.test(requested);
  const mxMini = /\bmx\s+(?:keys|mechanical)\s+mini\b/i.test(requested);
  const businessLabel = text => /\b(?:for\s+business|business\s+edition)\b/i.test(text) || /\bmx\s+(?:keys|mechanical)\s+mini\s+business\b/i.test(text);
  const requestedBusiness = businessLabel(requested) || tokens.includes('business');
  const businessEdition = mxMini && businessLabel(context) && !requestedBusiness;
  const missingBusinessEdition = mxMini && requestedBusiness && !businessLabel(context);
  const layouts = [...new Set((context.match(/\b(?:AZERTY|QWERTZ|DVORAK|QWERTY)\b/gi) ?? []).map(x => x.toUpperCase()))];
  const requestedLayouts = requested.match(/\b(?:AZERTY|QWERTZ|DVORAK|QWERTY)\b/gi) ?? [];
  const unrequestedLayouts = layouts.filter(x => !requestedLayouts.some(y => y.toUpperCase() === x) && (x !== 'QWERTY' || requestedLayouts.length));
  const nonFixedPrice = /\d[\d,.]*\s*\+|^\s*(?:from|starting|as low as)\b|\d[\d,.]*\s*[-–]\s*[₹$\d]/i.test(priceText);
  const installment = Boolean(raw.installment || raw.monthly_payment_duration || raw.installments_description) || /\/\s*(?:mo(?:nth)?|month)|\bper\s+month\b/i.test(priceText);
  const reasons = [];
  if (missing.length) reasons.push('Missing identifiers: ' + missing.join(', '));
  if (badCondition) reasons.push('Used / refurbished condition');
  if (accessory) reasons.push('Accessory or replacement');
  if (component) reasons.push('Component / spare part is not a complete unit');
  if (discoverySeller) reasons.push('Deal community: discovery only, not a seller offer');
  if (bundle) reasons.push('Bundle / pack is not a unit comparison');
  if (macEdition) reasons.push('Mac-specific edition not requested');
  if (businessEdition) reasons.push('Business edition not requested');
  if (missingBusinessEdition) reasons.push('Business edition required but not identified');
  if (unrequestedLayouts.length) reasons.push('Unrequested keyboard layout: ' + unrequestedLayouts.join(', '));
  if (nonFixedPrice) reasons.push('Starting or range price is not a fixed unit price');
  if (installment) reasons.push('Installment payment is not a unit purchase price');
  if (currency !== 'INR') reasons.push('INR currency not explicit');
  if (!Number.isFinite(price) || price <= 0) reasons.push('Missing valid unit price');
  if (!url) reasons.push('Missing safe evidence link');
  if (!normalize(seller) || seller === 'Unknown seller') reasons.push('Seller not identified');
  const validPrice = Number.isFinite(price) && price > 0 ? price : null;
  return { title, seller, price: validPrice, priceText, currency, url, eligible: reasons.length === 0, reasons, costs: listingCosts(raw, validPrice, currency), delivery: String(raw.delivery ?? 'Not provided'), rating: Number.isFinite(raw.rating) ? raw.rating : null, matchedIdentifiers: tokens.filter(t => !missing.includes(t)), provenance: { searchId: raw.evidenceSearchId ?? null, query: raw.evidenceQuery ?? null } };
}
export function analyzeItem(item, shopping, web) {
  const raw = collectShoppingOffers(shopping);
  const seen = new Map();
  for (const x of raw.map(x => classifyOffer(item, x))) {
    const k = x.seller + '|' + x.title + '|' + x.price;
    const score = o => [o.costs.estimatedTax, o.costs.shipping, o.costs.reportedTotal].filter(v => v !== null).length;
    if (!seen.has(k) || score(x) > score(seen.get(k))) seen.set(k, x);
  }
  const offers = [...seen.values()];
  // One lowest matching listing per seller, rather than treating repeated listings as independent support.
  const sellers = new Map();
  for (const offer of offers.filter(x => x.eligible)) { const k = normalize(offer.seller); if (!sellers.has(k) || offer.price < sellers.get(k).price) sellers.set(k, offer); }
  const comparable = [...sellers.values()].sort((a, b) => a.price - b.price);
  const prices = comparable.map(x => x.price);
  const enough = prices.length >= 3;
  const middle = Math.floor(prices.length / 2);
  const median = enough ? (prices.length % 2 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2) : null;
  const spread = enough ? (prices.at(-1) - prices[0]) / median : null;
  const unstable = enough && spread > .6;
  const benchmark = enough && !unstable ? median : null;
  const gap = benchmark === null ? null : (item.quote - benchmark) / benchmark;
  const status = !enough ? 'insufficient' : unstable ? 'review' : gap > .1 ? 'negotiate' : 'aligned';
  const savings = benchmark === null ? null : Math.max(0, item.quote - benchmark) * item.quantity;
  const organic = (web.organic_results ?? []).slice(0, 6).map(x => ({ title: String(x.title ?? ''), url: safeUrl(x.link), snippet: String(x.snippet ?? '').slice(0, 600) })).filter(x => x.url);
  const excludedCheaper = offers.filter(x => !x.eligible && x.currency === 'INR' && x.price > 0 && x.price < (benchmark ?? item.quote));
  return { ...item, offers, comparable, sellerCount: prices.length, rejected: offers.filter(x => !x.eligible).length, excludedCheaper: excludedCheaper.length, misleadingLow: excludedCheaper.length ? Math.min(...excludedCheaper.map(x => x.price)) : null, median, benchmark, gap, savings, status, spread, low: prices[0] ?? null, high: prices.at(-1) ?? null, organic,
    explanation: !enough ? 'At least three distinct matching sellers are needed. No negotiation target is calculated.' : unstable ? 'Matching prices vary by more than 60% of the median. Review listings before using a target.' : gap > .1 ? 'Your quote is more than 10% above the median of matching seller listings.' : 'Your quote is within 10% of, or below, the matching-listing median.' };
}
export function createReport(items, results, mode) {
  const requests = results.flatMap(x => [x.shopping, ...(x.followups ?? []), x.web]);
  const analyzed = items.map((item, i) => ({ ...analyzeItem(item, results[i].shopping.data, results[i].web.data), evidence: [results[i].shopping.meta, ...(results[i].followups ?? []).map(x => x.meta), results[i].web.meta] }));
  return { version: VERSION, mode, createdAt: new Date().toISOString(), currency: 'INR', lines: analyzed, quotedTotal: analyzed.reduce((n, x) => n + x.quantity * x.quote, 0), potentialSavings: analyzed.reduce((n, x) => n + (x.savings ?? 0), 0), benchmarkedLines: analyzed.filter(x => x.benchmark !== null).length, newSearchRequests: requests.filter(y => !y.meta.cached && !y.meta.synthetic && !y.meta.error).length, attemptedRequests: requests.filter(y => !y.meta.cached && !y.meta.synthetic).length, limitations: ['Negotiation benchmark uses listing prices only. Checkout cost fields are separate estimates for one listing, not verified bulk totals.', 'Missing tax or shipping is unknown, never zero. Confirm GST basis, delivery, stock and volume availability with the seller.', 'Product matching uses explicit title identifiers, not manufacturer verification.', 'Search snippets are discovery evidence, not proof of warranty or seller legitimacy.', 'Potential savings are an indicative negotiation gap, not a guaranteed purchase saving.'] };
}
export const DEMO_ITEMS = [
  { name: 'HP LaserJet Pro M404dn printer', identity: 'HP M404dn', quantity: 5, quote: 36500 },
  { name: 'Logitech MX Keys Mini keyboard', identity: 'Logitech MX Keys Mini', quantity: 8, quote: 11995 },
  { name: 'Samsung 980 PRO 1TB SSD', identity: 'Samsung 980 PRO 1TB', quantity: 10, quote: 10500 }
];
export function demoResults(items) {
  const priceSets = [[28900, 30500, 31900, 19499], [9295, 9595, 9995, 3999], [8500, 8999, 9400, 4500]];
  return items.map((item, i) => {
    const prices = priceSets[i] ?? [item.quote * .8, item.quote * .85, item.quote * .9, item.quote * .4];
    const wrong = i === 0 ? 'HP LaserJet Pro M404dw printer' : i === 1 ? 'Logitech MX Keys Mini keyboard renewed' : 'Samsung 980 PRO 500GB SSD';
    const offers = prices.map((price, j) => ({ title: j === 3 ? wrong : item.name, source: ['Example Seller A', 'Example Seller B', 'Example Seller C', 'Example Seller D'][j], price: '₹' + price, extracted_price: price, ...(j < 2 ? {estimated_tax: '₹' + price * .18, extracted_estimated_tax: price * .18, shipping: j === 0 ? '₹2500' : 'Free', shipping_extracted: j === 0 ? 2500 : 0, total: '₹' + (price * 1.18 + (j === 0 ? 2500 : 0)), extracted_total: price * 1.18 + (j === 0 ? 2500 : 0)} : {}), link: 'https://example.com/fixture/' + i + '/' + j }));
    const meta = engine => ({ engine, query: item.name + ' ' + item.identity, retrievedAt: new Date().toISOString(), searchId: 'synthetic-fixture-' + i, cached: false, synthetic: true });
    return { shopping: { data: { shopping_results: offers }, meta: meta('google_shopping') }, web: { data: { organic_results: [{ title: 'Synthetic product specification result', link: 'https://example.com/fixture/spec/' + i, snippet: 'Demo evidence only. Replace this fixture with a live SerpApi search to inspect real product specifications and terms.' }] }, meta: meta('google') } };
  });
}
