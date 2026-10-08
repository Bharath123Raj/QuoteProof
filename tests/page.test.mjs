import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../src/page.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];
const quote={name:'HP LaserJet Pro 4004dn printer',identity:'HP 4004dn',quantity:5,quote:36500};
function mount(storage=new Map()){
  const elements=new Map();let rows=[];
  const element=id=>{
    if(!elements.has(id))elements.set(id,{hidden:false,disabled:false,value:'',textContent:'',innerHTML:'',classList:{toggle(){}},setAttribute(){},scrollIntoView(){},querySelector(){return null}});
    return elements.get(id);
  };
  const context=vm.createContext({structuredClone,URL,Intl,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{getElementById:element,querySelectorAll:selector=>selector==='.line-input'?rows:[],addEventListener(){}},navigator:{},window:{},setTimeout});
  vm.runInContext(script,context);
  return {context,storage,element,evaluate:source=>vm.runInContext(source,context),setRows:items=>{rows=items.map(item=>({querySelectorAll:()=>Object.entries(item).map(([field,value])=>({dataset:{field},value:String(value)}))}));}};
}
test('sidebar switches all workspace pages and last saved audit restores the report without a new search',async()=>{
  const app=mount();
  for(const [button,view] of [['alternativesNav','alternatives'],['watchNav','watch'],['methodNav','method'],['auditNav','audit']]){
    app.element(button).onclick();
    for(const id of ['audit','alternatives','watch','method'])assert.equal(app.element(id+'View').hidden,id!==view);
  }
  const {createReport,demoResults,DEMO_ITEMS}=await import('../src/core.js');
  const fixture=createReport(DEMO_ITEMS,demoResults(DEMO_ITEMS),'synthetic-demo');
  app.storage.set('quoteproof-last-report',JSON.stringify(fixture));
  app.element('methodNav').onclick();app.element('savedNav').onclick();
  assert.equal(app.element('auditView').hidden,false);assert.equal(app.element('results').hidden,false);
  assert.equal(app.evaluate('report.createdAt'),fixture.createdAt);assert.equal(app.evaluate('items.length'),3);
});
test('reload restores the edited live quote and never restores or saves the key',()=>{
  const first=mount();first.evaluate('apiKey="memory-only-secret"');first.setRows([quote]);first.element('quoteLines').oninput();first.evaluate('setMode("live")');
  assert.equal(JSON.stringify([...first.storage.values()]).includes('memory-only-secret'),false);
  const next=mount(first.storage);
  assert.deepEqual(JSON.parse(next.evaluate('JSON.stringify(items)')),[quote]);assert.equal(next.evaluate('mode'),'live');assert.equal(next.evaluate('apiKey'),'');
});
test('existing users restore quote fields from their last audit without restoring old results',()=>{
  const app=mount(new Map([['quoteproof-last-report',JSON.stringify({version:'1.0.0',mode:'live-serpapi',lines:[quote]})]]));
  assert.deepEqual(JSON.parse(app.evaluate('JSON.stringify(items)')),[quote]);assert.equal(app.evaluate('mode'),'live');assert.equal(app.evaluate('report'),null);assert.equal(app.element('results').hidden,true);
});
test('edits and imports invalidate old results and persist the new quote',()=>{
  const app=mount();app.evaluate('report={old:true}');app.element('results').hidden=false;app.setRows([quote]);app.element('quoteLines').oninput();
  assert.equal(app.evaluate('report'),null);assert.equal(app.element('results').hidden,true);
  app.evaluate('report={old:true}');app.element('results').hidden=false;app.element('importText').value='HP LaserJet Pro 4004dn printer | HP 4004dn | 5 | 36000';app.element('applyImport').onclick();
  assert.equal(app.evaluate('report'),null);assert.equal(JSON.parse(app.storage.get('quoteproof-draft')).items[0].quote,36000);
});
test('corrupt drafts fall back safely and clearing saved data removes both records',()=>{
  const app=mount(new Map([['quoteproof-draft','{'],['quoteproof-last-report',JSON.stringify({mode:'live-serpapi',lines:[quote]})]]));
  assert.equal(app.evaluate('items[0].identity'),'HP 4004dn');app.element('clearSaved').onclick();assert.equal(app.storage.size,0);
  const next=mount(app.storage);assert.equal(next.evaluate('items[0].identity'),'HP M404dn');
});

test('requirements draft restores independently without keys and edits invalidate the shortlist',()=>{
  const app=mount();app.evaluate('apiKey="temporary-feature-key";alternativeReport={old:true}');app.element('alternativeResults').hidden=false;
  app.element('altCategory').value='laser printer';app.element('altQuantity').value='5';app.element('altBudget').value='160000';app.element('altRequirements').value='automatic duplex\nEthernet';app.element('altCategory').oninput();
  assert.equal(app.evaluate('alternativeReport'),null);assert.equal(app.element('alternativeResults').hidden,true);assert.equal(JSON.stringify([...app.storage.values()]).includes('temporary-feature-key'),false);
  const next=mount(app.storage);assert.equal(next.element('altCategory').value,'laser printer');assert.equal(next.element('altBudget').value,160000);
  next.element('clearSaved').onclick();assert.equal(app.storage.size,0);
});
test('candidate choice creates a separate quote draft and never merges benchmarks',async()=>{
  const {discoverAlternatives}=await import('../src/api.js');
  const r=await discoverAlternatives({category:'printer',quantity:5,budget:160000,requirements:['automatic duplex','Ethernet']},'',true,false,()=>{throw new Error('no searches')});
  const app=mount();app.context.candidateData=r;app.evaluate('report={old:true};renderAlternatives(candidateData)');
  assert.match(app.element('alternativeCards').innerHTML,/Conflicting text/);assert.match(app.element('alternativeCards').innerHTML,/Needs verification/);
  app.element('alternativeCards').onclick({target:{dataset:{candidate:'1'}}});assert.equal(app.evaluate('report.old'),true);
  app.element('alternativeCards').onclick({target:{dataset:{candidate:'0'}}});assert.equal(app.evaluate('report'),null);assert.equal(app.evaluate('items.length'),1);assert.equal(app.evaluate('items[0].identity'),'Example A100');assert.equal(app.evaluate('items[0].quantity'),5);assert.equal(app.element('results').hidden,true);assert.equal(app.element('alternativesView').hidden,true);
});
test('checkout tab shows supplied amounts and preserves unknown costs in old saved reports',async()=>{
  const {createReport,demoResults,DEMO_ITEMS}=await import('../src/core.js');
  const app=mount();app.context.fixture=createReport(DEMO_ITEMS,demoResults(DEMO_ITEMS),'synthetic-demo');app.evaluate('renderReport(fixture);tab("cost")');
  assert.equal(app.element('costPanel').hidden,false);assert.equal(app.element('overviewPanel').hidden,true);assert.match(app.element('costPanel').innerHTML,/Tax not supplied/);assert.match(app.element('costPanel').innerHTML,/No total-cost negotiation gap/);
  for(const line of app.context.fixture.lines)for(const offer of line.offers)delete offer.costs;
  app.evaluate('renderReport(fixture);tab("cost")');assert.match(app.element('costPanel').innerHTML,/Costs not present in this saved report/);
});
test('Google Shopping links are distinguished from listing sources in audit, costs, discovery and watches',async()=>{
  const {createReport,demoResults,DEMO_ITEMS}=await import('../src/core.js');
  const app=mount();app.context.fixture=createReport(DEMO_ITEMS,demoResults(DEMO_ITEMS),'synthetic-demo');
  const url='https://www.google.co.in/search?ibp=oshop&q=HP';
  app.context.fixture.lines[0].offers[0].url=url;app.context.fixture.lines[0].comparable[0].url=url;
  app.evaluate('renderReport(fixture);addWatchFromReport(0)');
  for(const id of ['evidencePanel','costPanel','watchCards'])assert.match(app.element(id).innerHTML,/Google Shopping product page/);
  const {discoverAlternatives}=await import('../src/api.js');
  app.context.alt=await discoverAlternatives({category:'printer',quantity:5,budget:160000,requirements:['automatic duplex','Ethernet']},'',true,false,()=>{});
  app.context.alt.candidates[0].offer.url=url;app.evaluate('renderAlternatives(alt)');
  assert.match(app.element('alternativeCards').innerHTML,/Google Shopping product page/);
  assert.equal(app.evaluate('listingLinkNote("https://merchant.example/product")'),'Listing source · confirm price and availability on the page.');
  assert.equal(app.evaluate('listingLinkNote("https://google.co.in.attacker.example/product")'),'Listing source · confirm price and availability on the page.');
});
test('editing requirements during discovery prevents displaying stale candidates',async()=>{
  const {discoverAlternatives}=await import('../src/api.js');
  const app=mount();let release;const pending=new Promise(resolve=>{release=resolve});
  const r=await discoverAlternatives({category:'printer',quantity:5,budget:160000,requirements:['automatic duplex','Ethernet']},'',true,false,()=>{});
  app.context.fetch=async()=>{await pending;return {ok:true,json:async()=>r}};
  const run=app.element('findAlternatives').onclick();app.element('altBudget').value='100000';app.element('altBudget').oninput();release();await run;
  assert.equal(app.evaluate('alternativeReport'),null);assert.equal(app.element('alternativeResults').hidden,true);assert.match(app.element('alternativeError').textContent,/changed/);
});

test('cost settings changed during a quote audit invalidate the arriving response',async()=>{
  const {createReport,demoResults}=await import('../src/core.js');const app=mount();app.setRows([quote]);app.element('enrichCosts').checked=true;
  let release;const pending=new Promise(resolve=>{release=resolve});app.context.fetch=async()=>{await pending;return {ok:true,json:async()=>createReport([quote],demoResults([quote]),'synthetic-demo')}};
  const run=app.element('runAudit').onclick();app.element('enrichCosts').checked=false;app.element('enrichCosts').onchange();release();await run;
  assert.equal(app.evaluate('report'),null);assert.equal(app.element('results').hidden,true);assert.match(app.element('error').textContent,/cost settings changed/);
});

test('specification sources show clickable manufacturer links and skipped or failed checks',()=>{
  const app=mount();app.context.specCandidate={specSources:[{title:'HP 323sdnw specs',url:'https://support.hp.com/spec',official:true,reason:'Manufacturer snippet; verify page',snippet:'Ethernet 10/100',searchId:'web-spec'}],specSearch:{status:'completed',query:'hp "323sdnw" Ethernet site:hp.com',searchId:'web-spec',reason:'Exact model'}};
  const rendered=app.evaluate('renderSpecificationSources(specCandidate)');assert.match(rendered,/href="https:\/\/support.hp.com\/spec"/);assert.match(rendered,/Manufacturer domain/);assert.match(rendered,/search snippets/);
  app.context.specCandidate={specSources:[],specSearch:{status:'error',reason:'Search timed out'}};assert.match(app.evaluate('renderSpecificationSources(specCandidate)'),/Specification search unavailable/);
});
test('community links are labelled as discovery rather than manufacturer specification evidence',()=>{
  const app=mount();app.context.specCandidate={specSources:[{title:'HP Support Community',url:'https://h30434.www3.hp.com/t5/example',official:true,sourceType:'community',reason:'Community / forum source: discovery only.',snippet:'Ethernet: Yes'}]};
  const rendered=app.evaluate('renderSpecificationSources(specCandidate)');assert.match(rendered,/Community \/ forum · discovery only/);assert.doesNotMatch(rendered,/<b>Manufacturer domain<\/b>/);
});
test('printing from every tab includes all report sections while retaining the selected screen tab',async()=>{
  const {createReport,demoResults,DEMO_ITEMS}=await import('../src/core.js');
  const start=html.indexOf('@media print{');let end=start+'@media print{'.length,depth=1;
  for(;depth&&end<html.length;end++){if(html[end]==='{')depth++;if(html[end]==='}')depth--;}
  const printCss=html.slice(start+'@media print{'.length,end-1);
  const rules=[...printCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([,selectors,body])=>({selectors:selectors.split(',').map(x=>x.trim()),body}));
  const app=mount();app.context.fixture=createReport(DEMO_ITEMS,demoResults(DEMO_ITEMS),'synthetic-demo');app.evaluate('renderReport(fixture)');let calls=0;app.context.window.print=()=>{calls++};
  for(const selected of ['overview','evidence','cost','brief']){
    app.evaluate('tab('+JSON.stringify(selected)+')');app.element('printBtn').onclick();
    for(const panel of ['overview','evidence','cost','brief']){
      const id=panel+'Panel';assert.equal(app.element(id).hidden,panel!==selected);
      assert.ok(app.element(id).innerHTML.length>0);
      assert.ok(rules.some(r=>r.selectors.includes('#'+id)&&/display\s*:\s*block\s*!important/.test(r.body)),id+' must print despite the screen hidden attribute');
    }
  }
  assert.equal(calls,4);assert.match(html,/<section class="card" id="reportCard">/);
  assert.ok(rules.some(r=>r.selectors.includes('#reportCard')&&/break-inside\s*:\s*auto/.test(r.body)&&/overflow\s*:\s*visible/.test(r.body)),'the long report must flow across pages');
  assert.equal(rules.some(r=>r.selectors.includes('[hidden]')||r.selectors.includes('#results')),false,'printing must not resurrect a hidden stale report');
});
async function seedWatch(mode='live-serpapi',app=mount()){
  const {createReport,demoResults}=await import('../src/core.js');const results=demoResults([quote]);
  for(const r of results)for(const [kind,value] of Object.entries(r)){value.meta={...value.meta,synthetic:mode==='synthetic-demo',cached:true,searchId:'seed-'+kind};}
  app.context.fixture=createReport([quote],results,mode);app.evaluate('renderReport(fixture)');
  assert.match(app.element('overviewPanel').innerHTML,/Watch model/);app.element('overviewPanel').onclick({target:{dataset:{watchLine:'0'}}});return app;
}
function watchObservation(id='new-search',benchmark=16000,overrides={}){
  return {name:quote.name,identity:quote.identity,quantity:quote.quantity,checkedAt:'2026-10-08T12:40:00Z',benchmark,low:benchmark===null?null:benchmark-100,high:benchmark===null?null:benchmark+100,sellerCount:3,rejected:1,spread:.01,sellers:['A','B','C'].map(seller=>({seller,price:benchmark??16000,title:quote.name,url:'https://example.com/'+seller})),evidence:{engine:'google_shopping',query:quote.name,searchId:id,cached:false,synthetic:false},...overrides};
}
test('watch model saves an audit baseline, restores without the key, and keeps synthetic/live watches separate',async()=>{
  const app=await seedWatch();app.evaluate('apiKey="private-watch-key"');assert.equal(app.element('watchView').hidden,false);assert.equal(app.evaluate('watchlist.length'),1);assert.equal(app.evaluate('watchlist[0].history[0].sampleState'),'baseline');
  const before=app.evaluate('watchlist[0].id');app.element('overviewPanel').onclick({target:{dataset:{watchLine:'0'}}});assert.equal(app.evaluate('watchlist.length'),1);assert.equal(app.evaluate('watchlist[0].id'),before);
  await seedWatch('synthetic-demo',app);assert.equal(app.evaluate('watchlist.length'),2);assert.match(app.element('watchCards').innerHTML,/SYNTHETIC DEMO/);assert.match(app.element('watchCards').innerHTML,/LIVE WATCH/);
  assert.equal(JSON.stringify([...app.storage.values()]).includes('private-watch-key'),false);
  const next=mount(app.storage);assert.equal(next.evaluate('watchlist.length'),2);assert.equal(next.evaluate('apiKey'),'');assert.equal(next.evaluate('watchlist[0].history.length'),1);
  assert.equal(app.evaluate('JSON.stringify(watchExport())').includes('private-watch-key'),false);
});
test('watch target alerts require a usable traceable observation, and repeated IDs never add fresh chart points',async()=>{
  const app=await seedWatch();app.context.observation=watchObservation('fresh-1',16000);app.evaluate('updateWatch(watchlist[0].id,"target",16000);recordWatchCheck(watchlist[0],observation);renderWatchlist()');
  assert.equal(app.evaluate('watchAssessment(watchlist[0]).alert'),true);assert.equal(app.evaluate('watchSamples(watchlist[0]).length'),2);
  app.evaluate('recordWatchCheck(watchlist[0],observation);renderWatchlist()');assert.equal(app.evaluate('watchlist[0].history.at(-1).sampleState'),'reused');assert.equal(app.evaluate('watchAssessment(watchlist[0]).alert'),false);assert.equal(app.evaluate('watchSamples(watchlist[0]).length'),2);assert.equal(app.evaluate('watchChange(watchlist[0])'),null);assert.match(app.element('watchCards').innerHTML,/Reused evidence · no fresh alert/);
  app.context.observation=watchObservation(null,15000);app.evaluate('recordWatchCheck(watchlist[0],observation)');assert.equal(app.evaluate('watchAssessment(watchlist[0]).alert'),false);
  app.context.observation=watchObservation('new-cached',15000,{evidence:{searchId:'new-cached',cached:true}});app.evaluate('recordWatchCheck(watchlist[0],observation)');assert.equal(app.evaluate('watchlist[0].history.at(-1).sampleState'),'reused');
});
test('watch history preserves the prior valid observation through sparse, unstable and failed checks',async()=>{
  const app=await seedWatch();const count=app.evaluate('watchSamples(watchlist[0]).length');
  for(const o of [watchObservation('sparse',null,{sellerCount:1}),watchObservation('unstable',null,{spread:2}),watchObservation(null,null,{error:'Search unavailable'})]){
    app.context.observation=o;app.evaluate('recordWatchCheck(watchlist[0],observation);renderWatchlist()');assert.equal(app.evaluate('watchAssessment(watchlist[0]).alert'),false);assert.equal(app.evaluate('watchSamples(watchlist[0]).length'),count);
  }
  assert.match(app.element('watchCards').innerHTML,/Search unavailable/);
  app.context.observation=watchObservation('new-after-failure',16000);app.evaluate('recordWatchCheck(watchlist[0],observation);renderWatchlist()');assert.match(app.element('watchCards').innerHTML,/Seller coverage changed/);assert.match(app.element('watchCards').innerHTML,/rechecks use Shopping only/);
});
test('watch edits validate targets and quantities, and retained history is bounded',async()=>{
  const app=await seedWatch();app.evaluate('updateWatch(watchlist[0].id,"target",0);updateWatch(watchlist[0].id,"quantity",1.5)');assert.equal(app.evaluate('watchlist[0].target'),36500);assert.equal(app.evaluate('watchlist[0].quantity'),5);
  app.evaluate('updateWatch(watchlist[0].id,"target",15000);updateWatch(watchlist[0].id,"quantity",10)');assert.equal(app.evaluate('watchlist[0].target'),15000);assert.equal(app.evaluate('watchlist[0].quantity'),10);
  for(let i=0;i<40;i++){app.context.observation=watchObservation('bounded-'+i);app.evaluate('recordWatchCheck(watchlist[0],observation)');}assert.equal(app.evaluate('watchlist[0].history.length'),30);
});
test('watch rechecks send a bounded fresh request and discard responses after target edits or removal',async()=>{
  for(const action of ['edit','remove','clear']){
    const app=await seedWatch();app.evaluate('apiKey="watch-memory-key"');app.element('freshWatch').checked=true;let release,requestOptions;const pending=new Promise(resolve=>{release=resolve});
    app.context.fetch=async(path,options)=>{assert.equal(path,'/api/watch');requestOptions=options;await pending;return {ok:true,json:async()=>({mode:'live-serpapi',observations:[watchObservation()],attemptedRequests:1,newSearchRequests:1})}};
    const run=app.element('recheckWatch').onclick();assert.equal(JSON.parse(requestOptions.body).fresh,true);assert.equal(JSON.parse(requestOptions.body).items.length,1);assert.equal(requestOptions.headers['x-serpapi-key'],'watch-memory-key');
    if(action==='edit')app.evaluate('updateWatch(watchlist[0].id,"target",15000)');
    else if(action==='remove')app.element('watchCards').onclick({target:{dataset:{watchRemove:app.evaluate('watchlist[0].id')}}});
    else app.element('clearSaved').onclick();
    release();await run;assert.match(app.element('watchProgress').textContent,/1 changed or removed watches skipped/);if(action==='edit')assert.equal(app.evaluate('watchlist[0].history.length'),1);else assert.equal(app.evaluate('watchlist.length'),0);
  }
});
test('mixed watch batches keep synthetic and live responses separate and require a key only for live searches',async()=>{
  const app=await seedWatch();await seedWatch('synthetic-demo',app);app.evaluate('apiKey="live-key"');const paths=[];
  app.context.fetch=async(path,options)=>{paths.push(path);const demo=path==='/api/watch-demo';assert.equal(options.headers['x-serpapi-key'],demo?undefined:'live-key');const items=JSON.parse(options.body).items;return {ok:true,json:async()=>({mode:demo?'synthetic-demo':'live-serpapi',observations:items.map(x=>watchObservation(demo?null:'mixed-live',16000,{...x,evidence:{synthetic:demo,searchId:demo?null:'mixed-live'}})),attemptedRequests:demo?0:1,newSearchRequests:demo?0:1})}};
  await app.element('recheckWatch').onclick();assert.deepEqual(paths,['/api/watch-demo','/api/watch']);assert.equal(app.evaluate('watchlist[0].history.at(-1).sampleState'),'recorded');assert.equal(app.evaluate('watchlist[1].history.at(-1).sampleState'),'synthetic');
});
test('watch API failures preserve saved history and mismatched models are rejected',async()=>{
  const app=await seedWatch();app.evaluate('apiKey="valid-test-key"');app.context.fetch=async()=>({ok:false,json:async()=>({error:'SerpApi rejected the key'})});await app.element('recheckWatch').onclick();assert.equal(app.evaluate('watchlist[0].history.length'),1);assert.match(app.element('watchError').textContent,/rejected/);
  app.context.fetch=async()=>({ok:true,json:async()=>({mode:'live-serpapi',observations:[watchObservation('wrong',100,{identity:'HP 4004dw'})],attemptedRequests:1,newSearchRequests:1})});await app.element('recheckWatch').onclick();assert.equal(app.evaluate('watchlist[0].history.length'),1);assert.match(app.element('watchError').textContent,/model differs/);
});
test('corrupt watch storage is ignored and clearing saved data removes watch history',async()=>{
  const corrupt=mount(new Map([['quoteproof-watchlist','{']]));assert.equal(corrupt.evaluate('watchlist.length'),0);
  const app=await seedWatch();app.element('clearSaved').onclick();assert.equal(app.evaluate('watchlist.length'),0);assert.equal(app.storage.has('quoteproof-watchlist'),false);assert.equal(mount(app.storage).evaluate('watchlist.length'),0);
});

test('search account choice restores without storing a personal key and shared headers omit it',async()=>{
 const app=mount();app.context.fetch=async()=>({json:async()=>({liveConfigured:true,shared:{configured:true,signedIn:true,authProvider:'sites',remaining:{monthly:180,daily:20}}})});
 app.evaluate('apiKey="personal-key-never-persisted"');app.element('searchSource').value='shared';app.element('searchSource').onchange();
 assert.equal(app.evaluate('liveHeaders()["x-search-source"]'),'shared');assert.equal(app.evaluate('liveHeaders()["x-serpapi-key"]'),undefined);assert.equal(app.element('personalKeyFields').hidden,true);
 const restored=mount(app.storage);assert.equal(restored.evaluate('searchSource'),'shared');assert.equal(restored.evaluate('apiKey'),'');assert.equal(JSON.stringify([...app.storage.values()]).includes('personal-key-never-persisted'),false);
 await app.evaluate('refreshSearchStatus()');assert.match(app.element('sharedStatus').textContent,/180/);assert.equal(app.element('searchSignOut').hidden,false);
});
test('shared sign-in and exhaustion show explicit personal-key fallback',async()=>{
 const app=mount();app.evaluate('searchSource="shared"');app.context.fetch=async()=>({json:async()=>({liveConfigured:false,shared:{configured:true,signedIn:false,authProvider:'sites'}})});
 await assert.rejects(app.evaluate('ensureLiveAccess()'),/Sign in/);assert.equal(app.element('searchSignIn').hidden,false);
 app.context.problem={code:'SHARED_LIMIT',error:'Shared allowance exhausted; connect your own key.'};app.evaluate('searchFailure(problem,"Failed")');assert.equal(app.element('settingsModal').hidden,false);assert.match(app.element('sharedStatus').textContent,/exhausted/);
 app.evaluate('searchSource="personal";apiKey="my-own-key"');assert.equal(app.evaluate('liveHeaders()["x-serpapi-key"]'),'my-own-key');
});
test('Cloudflare account UI uses email identity and Access logout, resetting Sites links when providers change',async()=>{
 const app=mount();
 let shared={configured:true,signedIn:true,authProvider:'cloudflare-access',remaining:{monthly:190,daily:25}};
 app.context.fetch=async()=>({json:async()=>({liveConfigured:shared.signedIn,shared})});
 await app.evaluate('refreshSearchStatus()');
 assert.equal(app.element('searchSignIn').hidden,true);assert.equal(app.element('searchSignOut').hidden,false);assert.equal(app.element('searchSignOut').href,'/cdn-cgi/access/logout');assert.match(app.element('sharedStatus').textContent,/Cloudflare Access/);
 shared={...shared,signedIn:false};await app.evaluate('refreshSearchStatus()');assert.equal(app.element('searchSignIn').hidden,true);assert.equal(app.element('searchSignOut').hidden,true);assert.match(app.element('sharedStatus').textContent,/enable Access/);
 shared={...shared,authProvider:'sites'};await app.evaluate('refreshSearchStatus()');assert.equal(app.element('searchSignIn').hidden,false);assert.equal(app.element('searchSignIn').href,'/signin-with-chatgpt?return_to=%2F');assert.equal(app.element('searchSignOut').href,'/signout-with-chatgpt?return_to=%2F');
 app.context.fetch=async()=>{throw new Error('offline')};await app.evaluate('refreshSearchStatus()');assert.equal(app.element('searchSignIn').hidden,true);assert.equal(app.element('searchSignOut').hidden,true);
});
test('shared watch rechecks use hosted access and discard arrivals after account selection changes',async()=>{
 const app=await seedWatch();app.evaluate('searchSource="shared";apiKey="must-not-send"');let release;const pending=new Promise(r=>release=r),calls=[];
 app.context.fetch=async(path,options)=>{calls.push(path);if(path==='/api/health')return {json:async()=>({liveConfigured:true,shared:{configured:true,signedIn:true,authProvider:'sites'}})};assert.equal(options.headers['x-search-source'],'shared');assert.equal(options.headers['x-serpapi-key'],undefined);await pending;return {ok:true,json:async()=>({mode:'live-serpapi',observations:[watchObservation()],attemptedRequests:1,newSearchRequests:1})}};
 const run=app.element('recheckWatch').onclick();for(let i=0;i<8;i++)await Promise.resolve();assert.ok(calls.includes('/api/watch'));
 app.evaluate('searchRevision++;searchSource="personal"');release();await run;assert.equal(app.evaluate('watchlist[0].history.length'),1);assert.match(app.element('watchProgress').textContent,/1 changed or removed watches skipped/);
});
