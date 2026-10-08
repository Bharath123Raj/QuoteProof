import { validateItems, createReport, demoResults, DEMO_ITEMS, normalize, containsIdentifier, collectShoppingOffers, analyzeItem, classifyOffer, validateRequirements, alternativeCandidate, specificationIdentity, specificationSources, applySpecificationSources } from './core.js';
import {searchAccess,sharedStatus,accessError} from './access.js';
const searchCache = new Map();
const LOCALIZATION = { gl: 'in', hl: 'en', google_domain: 'google.co.in', location: 'New Delhi,Delhi,India' };
export function buildQuery(item) {
  const missing = item.identity.split(/[\s,;]+/).filter(t => t && !containsIdentifier(item.name, t));
  return [item.name, ...missing].join(' ');
}
export function targetedQuery(item) {
  const base = buildQuery(item);
  const models = item.identity.split(/[\s,;]+/).filter(x => /[a-z]/i.test(x) && /\d/.test(x));
  return models.length ? base.split(/\s+/).map(x => models.some(m => normalize(m) === normalize(x)) ? '"' + x.replaceAll('"', '') + '"' : x).join(' ') : '"' + item.identity.replaceAll('"', '') + '" India';
}
export function productToken(raw) {
  if (typeof raw.immersive_product_page_token === 'string') return raw.immersive_product_page_token;
  try { const u = new URL(raw.serpapi_immersive_product_api); return u.hostname === 'serpapi.com' && u.searchParams.get('engine') === 'google_immersive_product' ? u.searchParams.get('page_token') : null; } catch { return null; }
}
async function search(engine, query, apiKey, force, fetcher, options = {}) {
  // Cache policy is not part of the result identity: a fresh watch refreshes
  // the same cache that a later regular recheck can safely reuse.
  const {noCache, ...resultOptions} = options;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey + '\n' + engine + '\n' + query + '\n' + JSON.stringify(LOCALIZATION) + '\n' + JSON.stringify(resultOptions)));
  const fingerprint = Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
  const prior = searchCache.get(fingerprint);
  if (!force && !options.noCache && prior && Date.now() - prior.time < 30 * 60 * 1000) return { data: prior.data, meta: { ...prior.meta, cached: true, ...(options.watch ? {upstreamFreshRequested:false} : {}) } };
  const params = new URLSearchParams(engine === 'google_immersive_product' ? { engine, page_token: options.pageToken, more_stores: 'true', api_key: apiKey } : { engine, q: query, ...LOCALIZATION, api_key: apiKey });
  if (options.noCache) params.set('no_cache', 'true');
  const meta = { engine, query, localization: LOCALIZATION, retrievedAt: new Date().toISOString(), cached: false, synthetic: false, searchId: null };
  try {
    const response = await fetcher('https://serpapi.com/search.json?' + params, { signal: AbortSignal.timeout(engine === 'google' ? 60000 : 25000) });
    if (!response.ok) { if(response.status===429)throw accessError('SerpApi account or rate limit reached. In shared mode, choose your own key or the synthetic demo.','SERPAPI_LIMIT',429); const e = new Error(response.status === 401 ? 'SerpApi rejected the key. Check your account key.' : 'SerpApi returned HTTP ' + response.status + '.'); e.fatal = response.status === 401; throw e; }
    const data = await response.json();
    if (data.error) {if(/(?:run out|exhaust|limit|no searches|insufficient credits)/i.test(String(data.error)))throw accessError('SerpApi account allowance reached. Choose your own key or the synthetic demo.','SERPAPI_LIMIT',429);throw new Error('SerpApi returned no usable data for this search. Check the query in the SerpApi playground.');}
    meta.searchId = data.search_metadata?.id ?? null;
    if (options.watch) {
      meta.upstreamFreshRequested = options.noCache === true;
      meta.sourceCreatedAt = data.search_metadata?.created_at ?? null;
    }
    // Cache only selected fields; API metadata can contain credential-bearing URLs.
    meta.queryDisplayed = data.search_information?.query_displayed ?? null;
    const product = data.product_results ?? {};
    const stores = Array.isArray(product.stores) ? product.stores.map(s => ({ ...s, source: s.name, title: s.title ?? '', variant_context: product.title ?? '', snippet: (s.details_and_offers ?? []).join(' '), delivery: s.shipping ?? 'Not provided' })) : [];
    const about = product.about_the_product ?? {};
    const features = Array.isArray(about.features) ? about.features : about.features ? [about.features] : [];
    const clean = { shopping_results: [...collectShoppingOffers(data), ...stores].map(x => ({ ...x, evidenceSearchId: meta.searchId, evidenceQuery: query })), organic_results: data.organic_results ?? [], productDetails: {title:String(product.title ?? ''), specTitle:String(about.title ?? ''), text:[String(about.description ?? ''), ...features.map(f => String(f.title ?? '') + ': ' + String(f.value ?? ''))].join('\n').slice(0, 6000), url:about.link, searchId:meta.searchId} };
    if (searchCache.size >= 60) searchCache.delete(searchCache.keys().next().value);
    searchCache.set(fingerprint, { data: clean, meta, time: Date.now() });
    return { data: clean, meta };
  } catch (e) {
    if (e.fatal) throw e;
    return { data: {}, meta: { ...meta, error: e.name === 'TimeoutError' ? 'Search timed out. Run the audit again to retry this query.' : 'Search unavailable. Review account status or query in the playground.' } };
  }
}
export async function handleApi(request, env = {}, fetcher = fetch) {
  const url = new URL(request.url);
  if (url.pathname === '/api/health' && request.method === 'GET') {const shared=await sharedStatus(request,env);return json({ ok: true, version: '1.0.0', liveConfigured:shared.configured&&shared.signedIn, shared, engines: ['google_shopping', 'google_immersive_product', 'google'] });}
  if (!['/api/audit', '/api/demo', '/api/alternatives', '/api/alternatives-demo', '/api/watch', '/api/watch-demo'].includes(url.pathname)) return json({ error: 'Not found' }, 404);
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return json({ error: 'Cross-origin requests are not allowed.' }, 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Use application/json.' }, 415);
  try {
    const bodyText = await request.text();
    if (bodyText.length > 12000) return json({ error: 'Request too large.' }, 413);
    const body = JSON.parse(bodyText);
    const live=['/api/audit','/api/alternatives','/api/watch'].includes(url.pathname);
    const access=live?await searchAccess(request,env,fetcher):{key:'',fetcher};
    fetcher=access.fetcher;
    if (url.pathname === '/api/watch' || url.pathname === '/api/watch-demo') {
      const items = validateItems(body.items);
      const synthetic = url.pathname === '/api/watch-demo';
      const apiKey = access.key;
      if (!synthetic && !apiKey) return json({error:'Enter a SerpApi key in Search settings to recheck live watches.'}, 401);
      const results = [];
      for (const item of items) {
        if (synthetic) {
          // Explicitly synthetic scenarios: no invented historic dates or live prices.
          const factor = body.demoScenario === 'drop' ? .85 : body.demoScenario === 'rise' ? 1.15 : 1;
          const shopping_results = ['A','B','C'].map((seller,i) => ({title:item.name + ' ' + item.identity, source:'Example Watch Seller ' + seller, price:'₹' + Math.round(item.quote * factor * [0.97,1,1.03][i]), link:'https://example.com/fixture/watch/' + seller}));
          results.push({data:{shopping_results},meta:{engine:'google_shopping',query:buildQuery(item),retrievedAt:new Date().toISOString(),searchId:null,synthetic:true,cached:false}});
        } else results.push(await search('google_shopping', buildQuery(item), apiKey, body.force === true || body.fresh === true, fetcher, {watch:true,noCache:body.fresh === true}));
      }
      return json({version:'1.0.0',mode:synthetic?'synthetic-demo':'live-serpapi',createdAt:new Date().toISOString(),
        observations:items.map((item,i) => {
          const result=results[i], line=analyzeItem(item,result.data,{});
          return {name:item.name,identity:item.identity,quantity:item.quantity,checkedAt:new Date().toISOString(),benchmark:line.benchmark,low:line.low,high:line.high,sellerCount:line.sellerCount,rejected:line.rejected,spread:line.spread,
            sellers:line.comparable.map(o=>({seller:o.seller,price:o.price,title:o.title,url:o.url})),evidence:result.meta,error:result.meta.error??null};
        }),attemptedRequests:results.filter(r=>!r.meta.cached&&!r.meta.synthetic).length,
        newSearchRequests:results.filter(r=>!r.meta.cached&&!r.meta.synthetic&&!r.meta.error).length,
        limitations:['One Shopping search per watched model, at most three per batch. Sparse coverage does not trigger follow-ups.', 'History starts with saved observations; changing seller coverage can change the median without any seller changing its price.', 'Target alerts use a matching-listing median with at least three seller names and spread at most 60%. Taxes, delivery and bulk stock need confirmation.']});
    }
    if (url.pathname.startsWith('/api/alternatives')) {
      const spec = validateRequirements(body);
      const synthetic = url.pathname.endsWith('-demo');
      const apiKey = access.key;
      if (!synthetic && !apiKey) return json({error:'Enter a SerpApi key in Search settings, or select Demo.'}, 401);
      return json(await discoverAlternatives(spec, apiKey, synthetic, body.force === true, fetcher));
    }
    const demo = url.pathname === '/api/demo';
    const items = validateItems(body.items ?? (demo ? DEMO_ITEMS : undefined));
    if (demo) return json(createReport(items, demoResults(items), 'synthetic-demo'));
    const apiKey = access.key;
    if (!apiKey) return json({ error: 'Enter your SerpApi key to run a live audit. Demo mode needs no key.' }, 401);
    const searches = [];
    for (const item of items) {
      const q = buildQuery(item);
      const shopping = await search('google_shopping', q, apiKey, body.force === true, fetcher);
      const followups = [];
      const primaryMatchingSellers = analyzeItem(item, shopping.data, {}).sellerCount;
      const tokenCards = collectShoppingOffers(shopping.data).filter(raw => { const token = productToken(raw); return token && token.length < 12000; });
      const strategy = { primaryMatchingSellers, productCardsWithToken: tokenCards.length, matchingProductCardsWithToken: 0, selected: 'none', reason: shopping.meta.error ? 'Primary Shopping search unavailable.' : 'Primary results have at least three matching sellers.' };
      if (!shopping.meta.error && primaryMatchingSellers < 3) {
        const incompleteReasons = new Set(['INR currency not explicit', 'Missing valid unit price', 'Missing safe evidence link', 'Seller not identified', 'Starting or range price is not a fixed unit price']);
        const matchingCards = tokenCards.filter(raw => classifyOffer(item, raw).reasons.every(reason => incompleteReasons.has(reason)));
        const card = matchingCards[0];
        strategy.matchingProductCardsWithToken = matchingCards.length;
        strategy.selected = card ? 'product-details' : 'targeted-shopping';
        strategy.reason = card ? 'Matching card supplies a supported product-details token.' : tokenCards.length ? 'Cards with product-details tokens failed model or variant checks.' : 'Shopping supplied no supported product-details token.';
        const targeted = card
          ? await search('google_immersive_product', 'Seller details for ' + card.title, apiKey, body.force === true, fetcher, { pageToken: productToken(card) })
          : await search('google_shopping', targetedQuery(item), apiKey, body.force === true, fetcher);
        followups.push(targeted);
        // Do not mutate the cache entry when combining the two result sets.
        shopping.data = { ...shopping.data, shopping_results: [...collectShoppingOffers(shopping.data), ...collectShoppingOffers(targeted.data)] };
      }
      shopping.meta = { ...shopping.meta, followupStrategy: strategy };
      if (body.enrichCosts === true && !shopping.meta.error && !followups.some(f => f.meta.engine === 'google_immersive_product')) {
        const allowed = new Set(['INR currency not explicit', 'Missing valid unit price', 'Missing safe evidence link', 'Seller not identified', 'Starting or range price is not a fixed unit price']);
        const card = tokenCards.find(raw => classifyOffer(item, raw).reasons.every(r => allowed.has(r)));
        if (card) {
          const costDetails = await search('google_immersive_product', 'Seller details for ' + card.title, apiKey, body.force === true, fetcher, {pageToken:productToken(card)});
          followups.push(costDetails);
          shopping.data = {...shopping.data, shopping_results:[...collectShoppingOffers(shopping.data), ...collectShoppingOffers(costDetails.data)]};
          shopping.meta.costEnrichment = costDetails.meta.error ? 'Lookup failed; costs remain unknown.' : 'Product-details checkout fields requested.';
        } else shopping.meta.costEnrichment = 'No matching product-details token; costs remain unknown.';
      }
      searches.push({ q, shopping, followups });
    }
    // Shopping runs first so invalid keys stop at the first call. Independent web
    // searches then run together. A single bounded Shopping follow-up per item
    // allows up to nine requests; optional cost enrichment raises this to twelve
    // and up to ~285 seconds for three lines.
    const results = await Promise.all(searches.map(async ({ q, shopping, followups }) => ({
      shopping, followups, web: await search('google', q + ' specifications warranty India', apiKey, body.force === true, fetcher)
    })));
    return json(createReport(items, results, 'live-serpapi'));
  } catch (e) {
    return json({ error: e instanceof SyntaxError ? 'Invalid JSON request.' : e.message, ...(e.code?{code:e.code}:{}) }, e.status ?? (e.fatal ? 502 : 400));
  }
}
export function specificationQuery(candidate) {
  const identity = specificationIdentity(candidate.title);
  return [identity.brand, ...[...identity.models, ...identity.capacities].map(x => '"' + x.replaceAll('"', '') + '"'),
    'specifications', ...candidate.checks.filter(c => c.status === 'unknown').map(c => c.requirement),
    '(' + identity.domains.map(d => 'site:' + d).join(' OR ') + ')'].join(' ');
}
export async function discoverAlternatives(spec, apiKey, synthetic, force, fetcher) {
  const query = [spec.category, ...spec.requirements, 'India'].join(' ');
  let primary;
  if (synthetic) {
    const meta = {engine:'google_shopping', query, retrievedAt:new Date().toISOString(), searchId:'synthetic-alternatives', synthetic:true, cached:false};
    primary = {meta, data:{shopping_results:[
      {title:'Example Laser A100 printer automatic duplex Ethernet',source:'Example Seller A',price:'₹28500',extracted_price:28500,link:'https://example.com/fixture/alternative-a'},
      {title:'Example Laser B200 printer manual duplex Ethernet',source:'Example Seller B',price:'₹23000',extracted_price:23000,link:'https://example.com/fixture/alternative-b'},
      {title:'Example Laser C300 printer',source:'Example Seller C',price:'₹29900',extracted_price:29900,link:'https://example.com/fixture/alternative-c'}
    ].map(x => ({...x,evidenceSearchId:meta.searchId}))}};
  } else primary = await search('google_shopping', query, apiKey, force, fetcher);
  const seen = new Set();
  const rows = collectShoppingOffers(primary.data).filter(r => {const k=normalize(r.title);if (!k || seen.has(k)) return false;seen.add(k);return true;}).slice(0, 6);
  const evidence = [primary.meta];
  let enriched = 0;
  const candidates = [];
  for (const raw of rows) {
    let detail = null;
    const initial = alternativeCandidate(spec, raw);
    const token = productToken(raw);
    if (!synthetic && !initial.blocked && token && token.length < 12000 && enriched < 3) {
      enriched++;
      const lookup = await search('google_immersive_product', 'Alternative details for ' + raw.title, apiKey, force, fetcher, {pageToken:token});
      evidence.push(lookup.meta);
      // A token alone does not establish that the returned variant is the candidate.
      if (normalize(lookup.data.productDetails?.title) === normalize(raw.title)) {
        const returned = lookup.data.productDetails;
        if (!returned.specTitle || normalize(returned.specTitle) === normalize(raw.title)) detail = returned;
        else lookup.meta.variantCheck = 'Specification block title differs; its feature text was not applied.';
        const stores = collectShoppingOffers(lookup.data).filter(s => normalize(s.title) === normalize(raw.title));
        const matching = stores.filter(s => alternativeCandidate(spec, s).offer.eligible).sort((a,b) => Number(a.extracted_price) - Number(b.extracted_price));
        if (matching.length) candidates.push(alternativeCandidate(spec, matching[0], detail));
        else candidates.push(alternativeCandidate(spec, raw, detail));
      } else {
        lookup.meta.variantCheck = 'Returned product title differs; specifications and stores were not applied.';
        candidates.push(initial);
      }
    } else candidates.push(initial);
  }
  for (const c of candidates) {
    const identity = specificationIdentity(c.title);
    c.specSources = [];
    const status = synthetic ? 'synthetic-no-search' : c.blocked || c.readiness === 'conflict' ? 'excluded' : !c.checks.some(x => x.status === 'unknown') ? 'not-needed' : !identity.brand || !identity.models.length ? 'unsupported-identity' : 'budget-limit';
    const reasons = {'synthetic-no-search':'Demo does not spend search requests.', excluded:'Candidate has conflicting feature text or an excluded listing.', 'not-needed':'Every requirement already has a source mention.', 'unsupported-identity':'Recognized manufacturer and explicit model needed for a manufacturer search.', 'budget-limit':'At most three unresolved candidates receive a Google specification lookup.'};
    c.specSearch = {status, reason:reasons[status]};
  }
  if (!synthetic) {
    const pending = candidates.filter(c => c.specSearch.status === 'budget-limit')
      .sort((a,b) => Number(b.budgetStatus === 'within-base-budget') - Number(a.budgetStatus === 'within-base-budget') || Number(b.offer.eligible) - Number(a.offer.eligible)).slice(0, 3);
    const lookups = await Promise.all(pending.map(c => search('google', specificationQuery(c), apiKey, force, fetcher)));
    for (let i = 0; i < pending.length; i++) {
      const c = pending[i], result = lookups[i];
      const meta = {...result.meta, purpose:'missing-specifications', candidateTitle:c.title};
      evidence.push(meta);
      const sources = specificationSources(c.title, result.data.organic_results, meta);
      applySpecificationSources(c, spec, sources);
      c.specSearch = {status:meta.error ? 'error' : sources.some(s => s.usedForChecks) ? 'completed' : 'no-matching-source',
        reason:meta.error ?? 'Only exact-model manufacturer-domain snippets can add feature evidence.', searchId:meta.searchId, query:meta.query};
    }
  }
  return {version:'1.0.0', mode:synthetic?'synthetic-demo':'live-serpapi', createdAt:new Date().toISOString(), spec, candidates, evidence,
    attemptedRequests:evidence.filter(e => !e.cached && !e.synthetic).length,
    newSearchRequests:evidence.filter(e => !e.cached && !e.synthetic && !e.error).length,
    limitations:['Candidate listings are discovery leads, not approved substitutions.', 'Mentioned means source text contains the requirement; absence is unknown. Google snippets are not fetched page content or independent specification verification.', 'Specification fallback uses up to three model-specific Google searches. Known manufacturer domains: HP, Brother, Samsung and Logitech. Other sources remain discovery links.', 'Budget checks multiply base listing price by quantity; taxes, delivery, stock and bulk discounts are unverified.', 'Alternatives never enter the exact-model benchmark. Choose one, review its identifiers, then run a separate audit.']};
}
export function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } }); }
