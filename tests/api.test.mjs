import test from 'node:test';
import assert from 'node:assert/strict';
import {handleApi,buildQuery} from '../src/api.js';
import app from '../worker/index.js';
const items=[{name:'Test product M100',identity:'M100',quantity:2,quote:200}];
const request=(path='/api/audit',body={items},key='test-key',headers={})=>new Request('http://localhost'+path,{method:'POST',headers:{'content-type':'application/json','x-serpapi-key':key,...headers},body:JSON.stringify(body)});
test('watch API excludes the Desertcart multi-model combination shown in the live screenshot',async()=>{
 const keyboard={name:'Logitech MX Keys Mini keyboard',identity:'Logitech MX Keys Mini',quantity:8,quote:11995};
 const fake=async()=>new Response(JSON.stringify({search_metadata:{id:'mx-multiple-models'},shopping_results:[
  {title:'Logitech MX Keys Mini Wireless Keyboard',source:'Amazon.in',price:'₹9495',link:'https://www.google.co.in/search?ibp=oshop'},
  {title:'Logitech MX Keys Mini Wireless QWERTY + Logitech MX Anywhere 3S Compact keyboard',source:'Desertcart.ae',price:'₹27474',link:'https://www.google.co.in/search?ibp=oshop'}
 ]}));
 const data=await (await handleApi(request('/api/watch',{items:[keyboard],fresh:true},'multi-model-regression-key'),{},fake)).json();
 assert.equal(data.observations[0].sellerCount,1);assert.equal(data.observations[0].rejected,1);assert.equal(data.observations[0].low,9495);assert.equal(data.observations[0].benchmark,null);assert.equal(data.observations[0].sellers[0].seller,'Amazon.in');
});
test('watch API excludes Business edition from a standard MX Keys Mini observation',async()=>{
 const keyboard={name:'Logitech MX Keys Mini keyboard',identity:'Logitech MX Keys Mini',quantity:8,quote:11995};
 const fake=async()=>new Response(JSON.stringify({search_metadata:{id:'mx-business-regression'},shopping_results:[
  {title:'Logitech MX Keys Mini Wireless Keyboard',source:'gpuheaven.com',price:'₹5999',link:'https://example.com/retail'},
  {title:'Logitech MX Keys Mini for Business',source:'cart2india',price:'₹23700',link:'https://example.com/business'}
 ]}));
 const data=await (await handleApi(request('/api/watch',{items:[keyboard],fresh:true},'business-regression-key'),{},fake)).json();
 assert.equal(data.observations[0].sellerCount,1);assert.equal(data.observations[0].rejected,1);assert.equal(data.observations[0].low,5999);assert.equal(data.observations[0].benchmark,null);assert.equal(data.observations[0].sellers[0].seller,'gpuheaven.com');
});
test('watch API filters scanner parts and community prices before creating an observation',async()=>{
  const printer={name:'Brother DCP-L2520D Multi-Function Monochrome Laser Printer',identity:'Brother DCP-L2520D',quantity:5,quote:15599};
  const fake=async()=>new Response(JSON.stringify({search_metadata:{id:'scanner-regression'},shopping_results:[
    {title:'Brother DCP-L2520D CCD Scanner with Scanning Unit',source:'Aajjo.com',price:'₹500',link:'https://example.com/part'},
    {title:printer.name,source:'Desidime',price:'₹16054',link:'https://example.com/deal'},
    ...[14200,15599,15890,16399].map((price,i)=>({title:printer.name,source:'Seller '+i,price:'₹'+price,link:'https://example.com/'+i}))
  ]}));
  const data=await (await handleApi(request('/api/watch',{items:[printer],fresh:true},'scanner-regression-key'),{},fake)).json();
  const observation=data.observations[0];assert.equal(data.attemptedRequests,1);assert.equal(observation.rejected,2);assert.equal(observation.sellerCount,4);assert.equal(observation.low,14200);assert.equal(observation.benchmark,15744.5);assert.equal(observation.sellers.some(x=>x.price===500||x.seller==='Desidime'),false);
});
test('watch rechecks use one exact-model Shopping request per item, with fresh upstream parameters and sanitized evidence',async()=>{
  const calls=[];const fake=async url=>{const p=new URL(url).searchParams;calls.push(p);const title=p.get('q');return new Response(JSON.stringify({search_metadata:{id:'watch-'+calls.length,created_at:'2026-10-08 12:00:00 UTC',json_endpoint:url},shopping_results:[...['A','B','C'].map((source,i)=>({title,source,price:'₹'+[100,110,120][i],link:'https://example.com/'+source,immersive_product_page_token:'private-token'})),{title:'Wrong M1000',source:'D',price:'₹10',link:'https://example.com/D'}]}));};
  const r=await handleApi(request('/api/watch',{items,fresh:true},'watch-fresh-secret'),{},fake);const data=await r.json();
  assert.equal(r.status,200);assert.equal(calls.length,1);assert.equal(calls[0].get('engine'),'google_shopping');assert.equal(calls[0].get('no_cache'),'true');assert.equal(calls[0].get('google_domain'),'google.co.in');
  const o=data.observations[0];assert.equal(o.benchmark,110);assert.equal(o.low,100);assert.equal(o.sellerCount,3);assert.equal(o.rejected,1);assert.equal(o.evidence.upstreamFreshRequested,true);assert.equal(o.evidence.sourceCreatedAt,'2026-10-08 12:00:00 UTC');assert.equal(data.attemptedRequests,1);
  assert.equal(JSON.stringify(data).includes('watch-fresh-secret'),false);assert.equal(JSON.stringify(data).includes('private-token'),false);
  const multi=await handleApi(request('/api/watch',{items:[...items,...items,...items],fresh:true},'watch-three-secret'),{},fake);assert.equal((await multi.json()).attemptedRequests,3);assert.equal(calls.length,4);
});
test('watch cache is isolated per key, regular rechecks can reuse it, and fresh rechecks bypass it',async()=>{
  let calls=0;const fake=async()=>{calls++;return new Response(JSON.stringify({search_metadata:{id:'watch-cache-'+calls},shopping_results:['A','B','C'].map(source=>({title:'Test product M100',source,price:'₹100',link:'https://example.com/'+source}))}));};
  await handleApi(request('/api/watch',{items},'watch-cache-key'),{},fake);
  const reused=await (await handleApi(request('/api/watch',{items},'watch-cache-key'),{},fake)).json();assert.equal(calls,1);assert.equal(reused.observations[0].evidence.cached,true);assert.equal(reused.attemptedRequests,0);
  await handleApi(request('/api/watch',{items},'watch-other-key'),{},fake);assert.equal(calls,2);
  await handleApi(request('/api/watch',{items,fresh:true},'watch-cache-key'),{},fake);await handleApi(request('/api/watch',{items,fresh:true},'watch-cache-key'),{},fake);assert.equal(calls,4);
  const afterFresh=await (await handleApi(request('/api/watch',{items},'watch-cache-key'),{},fake)).json();assert.equal(calls,4);assert.equal(afterFresh.observations[0].evidence.searchId,'watch-cache-4');assert.equal(afterFresh.observations[0].evidence.upstreamFreshRequested,false);
});
test('watch sparse, unstable and failed results retain unknown benchmarks without followups',async()=>{
  let calls=0;const sparse=async()=>{calls++;return new Response(JSON.stringify({search_metadata:{id:'sparse'},shopping_results:[{title:'Test product M100',source:'A',price:'₹100',link:'https://example.com/A'}]}));};
  const s=await (await handleApi(request('/api/watch',{items,fresh:true},'watch-sparse-key'),{},sparse)).json();assert.equal(calls,1);assert.equal(s.observations[0].benchmark,null);assert.equal(s.observations[0].sellerCount,1);
  const wide=async()=>new Response(JSON.stringify({search_metadata:{id:'wide'},shopping_results:['A','B','C'].map((source,i)=>({title:'Test product M100',source,price:'₹'+[50,100,500][i],link:'https://example.com/'+source}))}));
  const w=await (await handleApi(request('/api/watch',{items,fresh:true},'watch-wide-key'),{},wide)).json();assert.equal(w.observations[0].benchmark,null);assert.ok(w.observations[0].spread>.6);
  const f=await (await handleApi(request('/api/watch',{items,fresh:true},'watch-failure-key'),{},async()=>{throw new Error('failed')})).json();assert.equal(f.observations[0].benchmark,null);assert.match(f.observations[0].error,/unavailable/);assert.equal(f.newSearchRequests,0);
});
test('watch input bounds and authentication stop requests before spending searches',async()=>{
  let calls=0;const fake=async()=>{calls++;return new Response('{}')};
  for(const list of [[],[...items,...items,...items,...items],[{...items[0],identity:''}],[{...items[0],quantity:1.5}],[{...items[0],quote:0}]])assert.equal((await handleApi(request('/api/watch',{items:list},'watch-invalid-key'),{},fake)).status,400);
  assert.equal((await handleApi(request('/api/watch',{items},''),{},fake)).status,401);assert.equal(calls,0);
  const auth=await handleApi(request('/api/watch',{items:[...items,...items,...items]},'watch-bad-key'),{},async()=>{calls++;return new Response('{}',{status:401})});assert.equal(auth.status,502);assert.equal(calls,1);
});
test('watch demo scenarios are explicitly synthetic, deterministic and make zero upstream requests',async()=>{
  for(const [scenario,expected] of [['steady',200],['drop',170],['rise',230]]){
    const data=await (await handleApi(request('/api/watch-demo',{items,demoScenario:scenario},''),{},()=>{throw new Error('must not search')})).json();
    assert.equal(data.mode,'synthetic-demo');assert.equal(data.observations[0].benchmark,expected);assert.equal(data.observations[0].evidence.synthetic,true);assert.equal(data.observations[0].evidence.searchId,null);assert.equal(data.attemptedRequests,0);
  }
});
test('queries retain missing variants without repeating existing model terms',()=>{
  assert.equal(buildQuery({name:'HP LaserJet Pro M404dn printer',identity:'HP M404dn'}),'HP LaserJet Pro M404dn printer');
  assert.equal(buildQuery({name:'Samsung 980 PRO SSD',identity:'Samsung 980 PRO 1TB'}),'Samsung 980 PRO SSD 1TB');
  assert.equal(buildQuery({name:'Logitech MX Keys S aluminium',identity:'Logitech MX Keys Mini'}),'Logitech MX Keys S aluminium Mini');
});
test('missing key returns actionable error',async()=>{const r=await handleApi(request('/api/audit',{items},''));assert.equal(r.status,401);assert.match((await r.json()).error,/key/)});
test('demo works without a key and does not call upstream',async()=>{let calls=0;const r=await handleApi(request('/api/demo',{},''),{},()=>{calls++;throw new Error('should not run')});assert.equal(r.status,200);assert.equal((await r.json()).mode,'synthetic-demo');assert.equal(calls,0)});
test('malformed JSON and unsupported origin are rejected',async()=>{const bad=new Request('http://localhost/api/audit',{method:'POST',headers:{'content-type':'application/json'},body:'{'});assert.equal((await handleApi(bad)).status,400);assert.equal((await handleApi(request('/api/audit',{items},'x',{origin:'https://evil.example'}))).status,403)});
test('live uses two engines, preserves provenance, omits credential metadata and caches',async()=>{let calls=0;const fake=async url=>{calls++;const p=new URL(url).searchParams;assert.equal(p.get('gl'),'in');assert.equal(p.get('google_domain'),'google.co.in');assert.equal(p.get('location'),'New Delhi,Delhi,India');assert.equal(p.get('api_key'),'cache-secret');return new Response(JSON.stringify({search_metadata:{id:'search-123',json_endpoint:url},shopping_results:['A','B','C'].map(source=>({title:'Test M100 product',source,price:'₹100',extracted_price:100,link:'https://example.com'})),organic_results:[{title:'Specs',link:'https://example.com/specs',snippet:'details'}]}),{headers:{'content-type':'application/json'}})};
const first=await handleApi(request('/api/audit',{items},'cache-secret'),{},fake);assert.equal(first.status,200);const r=await first.json();assert.equal(r.newSearchRequests,2);assert.equal(r.lines[0].benchmark,100);assert.equal(r.lines[0].evidence[0].searchId,'search-123');assert.equal(JSON.stringify(r).includes('cache-secret'),false);const second=await handleApi(request('/api/audit',{items},'cache-secret'),{},fake);assert.equal((await second.json()).newSearchRequests,0);assert.equal(calls,2);await handleApi(request('/api/audit',{items,force:true},'cache-secret'),{},fake);assert.equal(calls,4)});
test('cache is isolated by API key',async()=>{let calls=0;const fake=async()=>{calls++;return new Response('{}')};await handleApi(request('/api/audit',{items},'isolated-1'),{},fake);await handleApi(request('/api/audit',{items},'isolated-2'),{},fake);assert.equal(calls,6)});
test('upstream authentication failure stops further searches',async()=>{let calls=0;const r=await handleApi(request('/api/audit',{items,force:true},'invalid-secret'),{},async()=>{calls++;return new Response('{}',{status:401})});assert.equal(r.status,502);assert.equal(calls,1);assert.equal(JSON.stringify(await r.json()).includes('invalid-secret'),false)});
test('upstream failure yields uncertainty, never invented prices',async()=>{const r=await handleApi(request('/api/audit',{items,force:true},'unavailable-secret'),{},async()=>{throw new Error('network unavailable')});const data=await r.json();assert.equal(data.lines[0].benchmark,null);assert.equal(data.lines[0].status,'insufficient');assert.equal(data.attemptedRequests,2);assert.equal(data.newSearchRequests,0);assert.ok(data.lines[0].evidence.every(x=>x.error))});
test('server page and health respond, static page has no credential',async()=>{const response=await app.fetch(new Request('http://localhost/'),{});assert.equal(response.status,200);const html=await response.text();assert.match(html,/QuoteProof/);assert.equal((await app.fetch(new Request('http://localhost/api/health'),{})).status,200);const script=html.match(/<script>([\s\S]*)<\/script>/)[1];new Function(script)});
test('sparse Shopping coverage triggers exactly one targeted follow-up with traceable offers',async()=>{
  let calls=0;const queries=[];
  const fake=async url=>{calls++;const p=new URL(url).searchParams;queries.push(p.get('q'));const targeted=p.get('q').includes('"M100"');const rows=p.get('engine')==='google_shopping'?(targeted?['B','C']:['A']):[];
    return new Response(JSON.stringify({search_metadata:{id:'bounded-'+calls},categorized_shopping_results:[{title:'Products',shopping_results:rows.map(source=>({title:'Test M100 product',source,price:'₹100',extracted_price:100,product_link:'https://example.com/'+source}))}],organic_results:[]}));};
  const result=await handleApi(request('/api/audit',{items,force:true},'bounded-followup-key'),{},fake);const r=await result.json();
  assert.equal(calls,3);assert.equal(r.attemptedRequests,3);assert.equal(r.lines[0].sellerCount,3);assert.equal(r.lines[0].benchmark,100);assert.equal(r.lines[0].evidence.length,3);assert.ok(queries[1].includes('"M100"'));assert.ok(r.lines[0].offers.every(x=>x.provenance.searchId));
  assert.equal(r.lines[0].evidence[0].followupStrategy.selected,'targeted-shopping');assert.equal(r.lines[0].evidence[0].followupStrategy.productCardsWithToken,0);
});
test('a matching aggregate card expands merchant offers within the three-request limit',async()=>{
  let calls=0;const fake=async url=>{calls++;const p=new URL(url).searchParams;const engine=p.get('engine');
    if(engine==='google_shopping')return new Response(JSON.stringify({search_metadata:{id:'card-search'},shopping_results:[{title:'Test M100 product',price:'₹90+',extracted_price:90,immersive_product_page_token:'fixture-product-token'}]}));
    if(engine==='google_immersive_product'){
      assert.equal(p.get('page_token'),'fixture-product-token');assert.equal(p.get('more_stores'),'true');assert.equal(p.has('q'),false);
      return new Response(JSON.stringify({search_metadata:{id:'store-search'},product_results:{title:'Test M100 product',stores:['A','B','C'].map(name=>({title:'Test M100 product',name,price:'₹100',extracted_price:100,link:'https://example.com/'+name}))}}));
    }
    return new Response(JSON.stringify({search_metadata:{id:'web-search'},organic_results:[]}));
  };
  const response=await handleApi(request('/api/audit',{items,force:true},'immersive-fixture-key'),{},fake);const r=await response.json();
  assert.equal(calls,3);assert.equal(r.lines[0].sellerCount,3);assert.equal(r.lines[0].benchmark,100);assert.equal(r.lines[0].evidence[1].engine,'google_immersive_product');assert.equal(r.attemptedRequests,3);assert.ok(r.lines[0].comparable.every(x=>x.provenance.searchId==='store-search'));assert.equal(JSON.stringify(r).includes('fixture-product-token'),false);
  assert.equal(r.lines[0].evidence[0].followupStrategy.selected,'product-details');assert.equal(r.lines[0].evidence[0].followupStrategy.matchingProductCardsWithToken,1);
});
test('wrong-model product tokens are never expanded and diagnostics reveal why',async()=>{
  const engines=[];const fake=async url=>{const p=new URL(url).searchParams;engines.push(p.get('engine'));return new Response(JSON.stringify({shopping_results:[{title:'Test product M1000',price:'₹90+',immersive_product_page_token:'wrong-model-token'}]}));};
  const response=await handleApi(request('/api/audit',{items,force:true},'wrong-card-test-key'),{},fake);const r=await response.json();
  assert.deepEqual(engines,['google_shopping','google_shopping','google']);assert.equal(r.lines[0].benchmark,null);
  const strategy=r.lines[0].evidence[0].followupStrategy;
  assert.equal(strategy.productCardsWithToken,1);assert.equal(strategy.matchingProductCardsWithToken,0);assert.equal(strategy.selected,'targeted-shopping');assert.match(strategy.reason,/failed model or variant/);
  assert.equal(JSON.stringify(r).includes('wrong-model-token'),false);assert.equal(JSON.stringify(r).includes('wrong-card-test-key'),false);
});

test('optional cost enrichment adds at most one lookup and preserves exact-model benchmark',async()=>{
  const engines=[];const fake=async url=>{const p=new URL(url).searchParams;engines.push(p.get('engine'));
    if(p.get('engine')==='google_shopping')return new Response(JSON.stringify({shopping_results:['A','B','C'].map(source=>({title:'Test product M100',source,price:'₹100',extracted_price:100,link:'https://example.com/'+source,immersive_product_page_token:'cost-token'}))}));
    if(p.get('engine')==='google_immersive_product')return new Response(JSON.stringify({product_results:{title:'Test product M100',stores:[{title:'Test product M100',name:'A',price:'₹100',extracted_price:100,estimated_tax:'₹18',shipping:'Free',total:'₹118',link:'https://example.com/A'}]}}));
    return new Response('{}');
  };
  const response=await handleApi(request('/api/audit',{items,force:true,enrichCosts:true},'cost-fixture-secret'),{},fake);const r=await response.json();
  assert.deepEqual(engines,['google_shopping','google_immersive_product','google']);assert.equal(r.lines[0].benchmark,100);assert.equal(r.lines[0].comparable[0].costs.comparisonTotal,118);assert.equal(JSON.stringify(r).includes('cost-token'),false);
});
const requirements={category:'laser printer',quantity:5,budget:160000,requirements:'automatic duplex\nEthernet'};
test('alternative demo is synthetic, separates conflicts and makes zero upstream requests',async()=>{
  const response=await handleApi(request('/api/alternatives-demo',requirements,''),{},()=>{throw new Error('must not search')});const r=await response.json();
  assert.equal(response.status,200);assert.equal(r.mode,'synthetic-demo');assert.equal(r.attemptedRequests,0);assert.equal(r.candidates[0].readiness,'review-candidate');assert.equal(r.candidates[1].readiness,'conflict');assert.equal(r.candidates[2].checks[0].status,'unknown');assert.equal(r.lines,undefined);
});
test('discovery caps lookups at three and never leaks metadata, product tokens or keys',async()=>{
  let calls=0;const fake=async url=>{calls++;const p=new URL(url).searchParams;
    if(p.get('engine')==='google_shopping')return new Response(JSON.stringify({search_metadata:{id:'discovery-id',json_endpoint:'https://serpapi.com/search?api_key=alt-secret'},shopping_results:Array.from({length:8},(_,i)=>({title:'Example P'+i+' laser printer automatic duplex Ethernet',price:'₹30000+',immersive_product_page_token:'candidate-token-'+i}))}));
    const i=p.get('page_token').at(-1);return new Response(JSON.stringify({search_metadata:{id:'detail-'+i},product_results:{title:'Example P'+i+' laser printer automatic duplex Ethernet',about_the_product:{link:'https://example.com/spec/'+i,description:'Automatic duplex and Ethernet.'},stores:[{title:'Example P'+i+' laser printer automatic duplex Ethernet',name:'A',price:'₹30000',extracted_price:30000,link:'https://example.com/'+i}]}}));
  };
  const response=await handleApi(request('/api/alternatives',{...requirements,force:true},'alt-secret'),{},fake);const r=await response.json();
  assert.equal(calls,4);assert.equal(r.candidates.length,6);assert.equal(r.attemptedRequests,4);assert.equal(r.candidates[0].offer.price,30000);assert.equal(r.candidates[0].checks[0].evidence[0].searchId,'detail-0');
  assert.equal(JSON.stringify(r).includes('alt-secret'),false);assert.equal(JSON.stringify(r).includes('candidate-token'),false);
});
test('wrong-variant details do not fill missing candidate specs or prices',async()=>{
  const fake=async url=>{const p=new URL(url).searchParams;return new Response(JSON.stringify(p.get('engine')==='google_shopping'?{shopping_results:[{title:'Example P100 laser printer',immersive_product_page_token:'variant-token'}]}:{product_results:{title:'Example P100w laser printer',about_the_product:{description:'automatic duplex Ethernet',link:'https://example.com/wrong'},stores:[{title:'Example P100w laser printer',name:'A',price:'₹100',link:'https://example.com/wrong'}]}}));};
  const response=await handleApi(request('/api/alternatives',{...requirements,force:true},'variant-secret'),{},fake);const r=await response.json();
  assert.ok(r.candidates[0].checks.every(c=>c.status==='unknown'));assert.equal(r.candidates[0].offer.price,null);assert.match(r.evidence[1].variantCheck,/differs/);
});
test('invalid discovery inputs and missing key are rejected before spending searches',async()=>{
  let calls=0;const fake=()=>{calls++;throw new Error('must not search')};
  assert.equal((await handleApi(request('/api/alternatives',requirements,''),{},fake)).status,401);
  assert.equal((await handleApi(request('/api/alternatives',{...requirements,quantity:0},'valid'),{},fake)).status,400);assert.equal(calls,0);
});

test('alternatives cache is key-isolated and failures yield an empty uncertain shortlist',async()=>{
  let calls=0;const fake=async()=>{calls++;return new Response(JSON.stringify({shopping_results:[{title:'Example P100 printer Ethernet',source:'A',price:'₹100',link:'https://example.com/p100'}]}))};
  const one=await handleApi(request('/api/alternatives',requirements,'alt-cache-A'),{},fake);assert.equal((await one.json()).attemptedRequests,1);
  const two=await handleApi(request('/api/alternatives',requirements,'alt-cache-A'),{},fake);assert.equal((await two.json()).attemptedRequests,0);assert.equal(calls,1);
  await handleApi(request('/api/alternatives',requirements,'alt-cache-B'),{},fake);assert.equal(calls,2);
  const failed=await handleApi(request('/api/alternatives',{...requirements,force:true},'failed-alt'),{},async()=>{throw new Error('network')});const r=await failed.json();assert.equal(r.candidates.length,0);assert.ok(r.evidence[0].error);assert.equal(r.attemptedRequests,1);assert.equal(r.newSearchRequests,0);
});
test('a mismatched specification block cannot establish requirements for a matching product title',async()=>{
  const title='Example P100 laser printer';const fake=async url=>{const p=new URL(url).searchParams;return new Response(JSON.stringify(p.get('engine')==='google_shopping'?{shopping_results:[{title,immersive_product_page_token:'different-about-token'}]}:{product_results:{title,about_the_product:{title:'Example P200 laser printer',description:'automatic duplex Ethernet',link:'https://example.com/p200'},stores:[{title,name:'A',price:'₹30000',link:'https://example.com/p100'}]}}));};
  const response=await handleApi(request('/api/alternatives',{...requirements,force:true},'about-title-secret'),{},fake);const r=await response.json();assert.equal(r.candidates[0].offer.price,30000);assert.ok(r.candidates[0].checks.every(c=>c.status==='unknown'));assert.match(r.evidence[1].variantCheck,/Specification block title differs/);
});

test('missing Ethernet triggers a model-specific manufacturer Google search and adds a clickable snippet',async()=>{
  const queries=[];const title='HP Laser MFP 323sdnw Printer';
  const fake=async url=>{const p=new URL(url).searchParams;queries.push({engine:p.get('engine'),query:p.get('q')});
    if(p.get('engine')==='google_shopping')return new Response(JSON.stringify({search_metadata:{id:'hp-shop'},shopping_results:[{title,source:'A',price:'₹26999',extracted_price:26999,link:'https://example.com/printer',snippet:'automatic duplex'}]}));
    return new Response(JSON.stringify({search_metadata:{id:'hp-spec',json_endpoint:'https://serpapi.com/?api_key=hp-spec-key'},organic_results:[{title:'HP Laser MFP 323sdnw Printer Specifications',link:'https://support.hp.com/in-en/product/specs',snippet:'Ethernet 10/100 Base-TX; automatic duplex printing.'}]}));
  };
  const response=await handleApi(request('/api/alternatives',{...requirements,force:true},'hp-spec-key'),{},fake);const r=await response.json();
  assert.deepEqual(queries.map(q=>q.engine),['google_shopping','google']);assert.match(queries[1].query,/"323sdnw"/);assert.match(queries[1].query,/site:hp\.com/);assert.match(queries[1].query,/Ethernet/);
  assert.equal(r.candidates[0].checks[1].status,'mentioned');assert.equal(r.candidates[0].readiness,'review-candidate');assert.equal(r.candidates[0].checks[1].evidence[0].searchId,'hp-spec');assert.match(r.candidates[0].checks[1].evidence[0].url,/support\.hp\.com/);assert.equal(r.attemptedRequests,2);assert.equal(JSON.stringify(r).includes('hp-spec-key'),false);
});
test('discovery makes at most seven requests and searches only three unresolved candidates',async()=>{
  const engines=[];const titles=Array.from({length:6},(_,i)=>'HP Laser MFP '+(300+i)+'sdnw Printer');
  const fake=async url=>{const p=new URL(url).searchParams;engines.push(p.get('engine'));
    if(p.get('engine')==='google_shopping')return new Response(JSON.stringify({shopping_results:titles.map((title,i)=>({title,source:'A',price:'₹20000',extracted_price:20000,link:'https://example.com/'+i,immersive_product_page_token:'bounded-spec-token-'+i}))}));
    if(p.get('engine')==='google_immersive_product')return new Response(JSON.stringify({product_results:{title:titles[Number(p.get('page_token').at(-1))],about_the_product:{description:'automatic duplex'},stores:[]}}));
    return new Response(JSON.stringify({organic_results:[]}));
  };
  const response=await handleApi(request('/api/alternatives',{...requirements,force:true},'seven-request-key'),{},fake);const r=await response.json();assert.equal(engines.length,7);assert.equal(engines.filter(e=>e==='google').length,3);assert.equal(r.attemptedRequests,7);assert.equal(r.candidates.filter(c=>c.specSearch.status==='budget-limit').length,3);assert.ok(r.candidates.every(c=>c.checks[1].status==='unknown'));assert.equal(JSON.stringify(r).includes('bounded-spec-token'),false);
});
test('manufacturer fallback is cached per key and failures preserve unknown feature checks',async()=>{
  let calls=0;const fake=async url=>{calls++;const p=new URL(url).searchParams;return new Response(JSON.stringify(p.get('engine')==='google_shopping'?{shopping_results:[{title:'HP 323sdnw printer',source:'A',price:'₹20000',link:'https://example.com/printer',snippet:'automatic duplex'}]}:{organic_results:[]}));};
  await handleApi(request('/api/alternatives',requirements,'spec-cache-1'),{},fake);assert.equal(calls,2);
  const again=await handleApi(request('/api/alternatives',requirements,'spec-cache-1'),{},fake);assert.equal((await again.json()).attemptedRequests,0);assert.equal(calls,2);
  await handleApi(request('/api/alternatives',requirements,'spec-cache-2'),{},fake);assert.equal(calls,4);
  const failure=async url=>{const p=new URL(url).searchParams;if(p.get('engine')==='google')throw new Error('failed');return fake(url)};
  const response=await handleApi(request('/api/alternatives',{...requirements,force:true},'spec-fail'),{},failure);const r=await response.json();assert.equal(r.candidates[0].checks[1].status,'unknown');assert.equal(r.candidates[0].specSearch.status,'error');assert.equal(r.attemptedRequests,2);assert.equal(r.newSearchRequests,1);
});
test('fully mentioned and conflicting candidates do not spend specification fallback searches',async()=>{
  let calls=0;const fake=async()=>{calls++;return new Response(JSON.stringify({shopping_results:[{title:'HP 323sdnw printer automatic duplex Ethernet',source:'A',price:'₹20000',link:'https://example.com/a'},{title:'HP 1188nw manual duplex Ethernet printer',source:'B',price:'₹20000',link:'https://example.com/b'}]}))};
  const response=await handleApi(request('/api/alternatives',{...requirements,force:true},'no-extra-spec-search'),{},fake);const r=await response.json();assert.equal(calls,1);assert.equal(r.candidates[0].specSearch.status,'not-needed');assert.equal(r.candidates[1].specSearch.status,'excluded');assert.equal(r.candidates[1].readiness,'conflict');
});
