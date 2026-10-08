import test from 'node:test';
import assert from 'node:assert/strict';
import {validateItems,classifyOffer,analyzeItem,createReport,DEMO_ITEMS,demoResults,safeUrl} from '../src/core.js';
const item={name:'Samsung 980 PRO SSD',identity:'Samsung 980 PRO 1TB',quantity:10,quote:10500};
const offer=(price=8999,source='Merchant A',extra={})=>({title:'Samsung 980 PRO 1TB SSD',price:'₹'+price,extracted_price:price,source,link:'https://example.com/item',...extra});
test('validates bounds and refuses an empty request',()=>{assert.throws(()=>validateItems([]));assert.throws(()=>validateItems([{...item,quantity:1.5}]));assert.throws(()=>validateItems([{...item,quote:Infinity}]));assert.throws(()=>validateItems([{...item,identity:''}]));assert.equal(validateItems([item]).length,1)});
test('accepts title identifiers across punctuation and spacing',()=>{assert.equal(classifyOffer(item,offer(8999,'A',{title:'Samsung 980-PRO 1 TB SSD'})).eligible,true)});
test('rejects wrong capacity and model',()=>{assert.equal(classifyOffer(item,offer(3999,'A',{title:'Samsung 980 PRO 500GB SSD'})).eligible,false);assert.equal(classifyOffer({...item,identity:'Samsung T7'},offer(5000,'A',{title:'Samsung T70 drive'})).eligible,false)});
test('rejects refurbished, accessory and bundle traps',()=>{for(const title of ['Samsung 980 PRO 1TB refurbished','case for Samsung 980 PRO 1TB','Samsung 980 PRO 1TB pack of 2']) assert.equal(classifyOffer(item,offer(3000,'A',{title})).eligible,false)});
test('structured second-hand conditions and listing tags cannot enter a new-unit benchmark',()=>{
  for(const second_hand_condition of ['used','refurbished','open-box','grade A']){
    const o=classifyOffer(item,offer(3000,'A',{second_hand_condition}));
    assert.equal(o.eligible,false);assert.ok(o.reasons.includes('Used / refurbished condition'));
  }
  assert.equal(classifyOffer(item,offer(3000,'A',{extensions:['Renewed']})).eligible,false);
  const a=analyzeItem(item,{shopping_results:[offer(3000,'A',{second_hand_condition:'used'}),offer(8999,'B'),offer(9400,'C')]},{});
  assert.equal(a.sellerCount,2);assert.equal(a.benchmark,null);
});
test('SerpApi installment objects and monthly price text cannot enter a unit benchmark',()=>{
  for(const extra of [{installment:{price:'₹500/mo',extracted_price:500,period:24}},{price:'₹500/mo'},{price:'₹500/month'},{price:'₹500 per month'}]){
    const o=classifyOffer(item,offer(500,'A',extra));assert.equal(o.eligible,false);assert.ok(o.reasons.includes('Installment payment is not a unit purchase price'));
  }
  assert.equal(classifyOffer(item,offer()).eligible,true);
});
test('mixed currency labels do not establish an INR listing price',()=>{
  for(const price of ['₹8999 / USD 89','₹8999 ($89)','INR 8999 / €89'])assert.equal(classifyOffer(item,offer(8999,'A',{price})).eligible,false);
});
test('punctuation-only required identifiers are rejected before searching',()=>{
  for(const identity of ['++',';;;',', ,'])assert.throws(()=>validateItems([{...item,identity}]));
  assert.equal(validateItems([item]).length,1);
});
test('rejects foreign and ambiguous currencies',()=>{for(const price of ['$89.99','€89.99','8999']) assert.equal(classifyOffer(item,offer(89,'A',{price})).eligible,false)});
test('rejects credential URLs and unsafe schemes',()=>{assert.equal(safeUrl('javascript:alert(1)'),null);assert.equal(safeUrl('https://user:pass@example.com'),null);assert.equal(classifyOffer(item,offer(8999,'A',{link:'javascript:alert(1)'})).eligible,false)});
test('does not make a target from repeated listings by one merchant',()=>{const a=analyzeItem(item,{shopping_results:[offer(8000),offer(8500),offer(9000)]},{});assert.equal(a.sellerCount,1);assert.equal(a.benchmark,null);assert.equal(a.savings,null);assert.equal(a.status,'insufficient')});
test('distinct-merchant median resists a cheap wrong-variant result',()=>{const a=analyzeItem(item,{shopping_results:[offer(8500,'A'),offer(8999,'B'),offer(9400,'C'),offer(4500,'D',{title:'Samsung 980 PRO 500GB'})]},{});assert.equal(a.benchmark,8999);assert.equal(a.savings,15010);assert.equal(a.rejected,1);assert.equal(a.misleadingLow,4500);assert.equal(a.status,'negotiate')});
test('wide price spread pauses the recommendation',()=>{const a=analyzeItem(item,{shopping_results:[offer(1000,'A'),offer(9000,'B'),offer(20000,'C')]},{});assert.equal(a.status,'review');assert.equal(a.benchmark,null);assert.equal(a.savings,null)});
test('aligned and lower quotes never produce negative savings',()=>{const a=analyzeItem({...item,quote:8000},{shopping_results:[offer(8500,'A'),offer(9000,'B'),offer(9400,'C')]},{});assert.equal(a.status,'aligned');assert.equal(a.savings,0)});
test('empty results keep unknown values unknown',()=>{const a=analyzeItem(item,{},{});assert.equal(a.low,null);assert.equal(a.median,null);assert.equal(a.organic.length,0)});
test('live sparse-result regression flags cheap wrong models while abstaining',()=>{
  const printer={name:'HP LaserJet Pro M404dn printer',identity:'HP M404dn',quantity:5,quote:36500};
  const a=analyzeItem(printer,{shopping_results:[
    offer(35408.99,'Seller A',{title:'HP Laserjet Pro M404dn Laser Printer'}),
    offer(27082,'Seller B',{title:'HP LaserJet Pro 4004dn Printer 2z614a'}),
    offer(29465,'Seller C',{title:'HP4004dn Single Function Laser Printer'})
  ]},{});
  assert.equal(a.sellerCount,1); assert.equal(a.status,'insufficient');
  assert.equal(a.benchmark,null); assert.equal(a.savings,null);
  assert.equal(a.rejected,2); assert.equal(a.misleadingLow,27082);
});
test('demo is labelled synthetic, spends zero credits and catches three traps',()=>{const r=createReport(DEMO_ITEMS,demoResults(DEMO_ITEMS),'synthetic-demo');assert.equal(r.attemptedRequests,0);assert.equal(r.newSearchRequests,0);assert.equal(r.mode,'synthetic-demo');assert.equal(r.potentialSavings,64210);assert.equal(r.lines.reduce((n,x)=>n+x.rejected,0),3)});
test('categorized and inline offers contribute once to a matching-seller median',()=>{
  const shared=offer(8999,'B');
  const a=analyzeItem(item,{shopping_results:[offer(8500,'A'),shared],inline_shopping_results:[shared],categorized_shopping_results:[{title:'Matching drives',shopping_results:[offer(9400,'C')]}]},{});
  assert.equal(a.offers.length,3); assert.equal(a.sellerCount,3); assert.equal(a.benchmark,8999);
});
test('incomplete cards never infer INR or a zero price',()=>{
  const a=classifyOffer(item,{title:item.name,extracted_price:120});
  assert.equal(a.currency,null);assert.equal(a.eligible,false);assert.equal(a.price,120);assert.equal(a.priceText,'');
  assert.equal(classifyOffer(item,{title:item.name}).price,null);
  const foreign=classifyOffer(item,offer(120,'A',{price:'$120.00'}));
  assert.equal(foreign.priceText,'$120.00');assert.equal(foreign.currency,null);assert.equal(foreign.eligible,false);
});
test('conjoined webcam and mouse offers are bundles even without the word bundle',()=>{
  const keyboard={name:'Logitech MX Keys Mini keyboard',identity:'Logitech MX Keys Mini',quantity:8,quote:11995};
  for(const title of ['Logitech MX Keys Mini keyboard, USB-C & C920 HD Pro Webcam','Logitech MX Keys Mini keyboard, Bluetooth & M171 Wireless Mouse for PC, Mac']){
    const o=classifyOffer(keyboard,offer(19393,'A',{title}));assert.equal(o.eligible,false);assert.ok(o.reasons.includes('Bundle / pack is not a unit comparison'));
  }
  assert.equal(classifyOffer(keyboard,offer(9999,'A',{title:'Logitech MX Keys Mini keyboard Bluetooth & USB-C charging'})).eligible,true);
});
test('Mac edition requires an explicitly requested Mac version',()=>{
  const keyboard={name:'Logitech MX Keys Mini keyboard',identity:'Logitech MX Keys Mini',quantity:8,quote:11995};
  const raw=offer(9999,'A',{title:'Logitech MX Keys Mini for Mac Minimalist Wireless Keyboard'});
  assert.equal(classifyOffer(keyboard,raw).eligible,false);
  assert.equal(classifyOffer({...keyboard,name:'Logitech MX Keys Mini for Mac keyboard',identity:'Logitech MX Keys Mini Mac'},raw).eligible,true);
});
test('MX Keys Mini Business edition must be explicitly requested and identified',()=>{
  const keyboard={name:'Logitech MX Keys Mini keyboard',identity:'Logitech MX Keys Mini',quantity:8,quote:11995};
  for(const title of ['Logitech MX Keys Mini for Business','Logitech MX Keys Mini Business Keyboard','Logitech MX Keys Mini keyboard Business Edition']){
    const raw=offer(23700,'cart2india',{title});const classified=classifyOffer(keyboard,raw);
    assert.equal(classified.eligible,false);assert.ok(classified.reasons.includes('Business edition not requested'));
    assert.equal(classifyOffer({...keyboard,name:'Logitech MX Keys Mini for Business keyboard'},raw).eligible,true);
    assert.equal(classifyOffer({...keyboard,identity:keyboard.identity+' Business'},raw).eligible,true);
  }
  const retail=offer(5999,'gpuheaven.com',{title:'Logitech MX Keys Mini Wireless Keyboard'});
  assert.equal(classifyOffer(keyboard,retail).eligible,true);
  const requested=classifyOffer({...keyboard,name:'Logitech MX Keys Mini for Business keyboard'},retail);
  assert.equal(requested.eligible,false);assert.ok(requested.reasons.includes('Business edition required but not identified'));
  assert.equal(classifyOffer(keyboard,{...retail,variant_context:'Logitech MX Keys Mini for Business'}).eligible,false);
});
test('MX Keys Mini live-watch regression leaves only the standard-edition seller',()=>{
  const keyboard={name:'Logitech MX Keys Mini keyboard',identity:'Logitech MX Keys Mini',quantity:8,quote:11995};
  const result=analyzeItem(keyboard,{shopping_results:[
    offer(5999,'gpuheaven.com',{title:'Logitech MX Keys Mini Wireless Keyboard'}),
    offer(23700,'cart2india',{title:'Logitech MX Keys Mini for Business'})
  ]},{});
  assert.equal(result.sellerCount,1);assert.equal(result.rejected,1);assert.equal(result.low,5999);assert.equal(result.benchmark,null);assert.equal(result.savings,null);assert.equal(result.status,'insufficient');
});
test('starting prices, price ranges and installment amounts are not unit benchmarks',()=>{
  for(const price of ['₹8,900+','From ₹8,900','₹8,900–₹9,999']) assert.equal(classifyOffer(item,offer(8900,'A',{price})).eligible,false);
  assert.equal(classifyOffer(item,offer(500,'A',{monthly_payment_duration:24})).eligible,false);
});
test('Mini and MX cannot match inside aluminium or SliMX',()=>{
  const keyboard={name:'Logitech MX Keys Mini keyboard',identity:'Logitech MX Keys Mini',quantity:8,quote:11995};
  const wrong=classifyOffer(keyboard,offer(15978,'ubuy',{title:'Logitech MX Keys S for Mac keyboard Office RF Wireless + Bluetooth QWERTZ aluminium'}));
  assert.equal(wrong.eligible,false);assert.ok(wrong.reasons.includes('Missing identifiers: mini'));assert.equal(wrong.matchedIdentifiers.includes('mini'),false);
  const embedded=classifyOffer({...keyboard,identity:'MX'},offer(100,'A',{title:'Satechi SliMX keyboard'}));
  assert.equal(embedded.eligible,false);
  assert.equal(classifyOffer({...item,identity:'Samsung 980PRO 1TB'},offer(8999,'A',{title:'Samsung 980-PRO 1 TB SSD'})).eligible,true);
});
test('unrequested AZERTY and QWERTZ layouts cannot undercut an unspecified keyboard quote',()=>{
  const keyboard={name:'Logitech MX Keys Mini keyboard',identity:'Logitech MX Keys Mini',quantity:8,quote:11995};
  for(const layout of ['AZERTY','QWERTZ','DVORAK']){
    const raw=offer(4321,'ubuy',{title:'Logitech MX Keys Mini French '+layout+' Layout'});
    const result=classifyOffer(keyboard,raw);assert.equal(result.eligible,false);assert.ok(result.reasons.includes('Unrequested keyboard layout: '+layout));
    assert.equal(classifyOffer({...keyboard,identity:keyboard.identity+' '+layout},raw).eligible,true);
  }
  const qwerty=offer(100,'A',{title:'Logitech MX Keys Mini QWERTY keyboard'});
  assert.equal(classifyOffer(keyboard,qwerty).eligible,true);
  assert.equal(classifyOffer({...keyboard,name:keyboard.name+' AZERTY'},qwerty).eligible,false);
});
test('matching printer identifiers do not make a formatter board or spare part a printer',()=>{
  const printer={name:'HP LaserJet Pro 4004dn printer',identity:'HP 4004dn',quantity:5,quote:36500};
  for(const part of ['Logic Card Formatter Board','Control Board','Power Supply Board','Fuser Assembly','Printhead','Drum Unit','Pickup Roller','Transfer Belt']){
    const result=classifyOffer(printer,offer(100300,'Parts seller',{title:'HP LaserJet Pro 4004dn '+part}));
    assert.equal(result.eligible,false);assert.ok(result.reasons.includes('Component / spare part is not a complete unit'));
  }
  const contextual=classifyOffer(printer,offer(100300,'A',{title:printer.name,variant_context:'HP 4004dn Logic Card Formatter Board'}));
  assert.equal(contextual.eligible,false);
  assert.equal(classifyOffer(printer,offer(27082,'HP Store India',{title:'HP LaserJet Pro 4004dn Printer 2z614a'})).eligible,true);
});
test('4004dn live-data regression excludes a costly formatter board before benchmarking',()=>{
  const printer={name:'HP LaserJet Pro 4004dn printer',identity:'HP 4004dn',quantity:5,quote:36500};
  const result=analyzeItem(printer,{shopping_results:[
    offer(27082,'HP Store India',{title:'HP LaserJet Pro 4004dn Printer 2z614a'}),
    offer(29923,'Flipkart',{title:'HP LaserJet Pro 4004dn , Auto Duplex, Ethernet, USB Single Functi... more'}),
    offer(41999,'Microworld Infosol',{title:'HP LaserJet Pro 4004dn Printer'}),
    offer(100300,'Tradeindia.com',{title:'Hp Laserjet Pro Mfp 4004Dn Logic Card Formatter Board - Color: Green'}),
    offer(18860,'Aajjo.com',{title:'HP LaserJet 4004d Printer, Monochrome'})
  ]},{});
  assert.equal(result.sellerCount,3);assert.equal(result.rejected,2);assert.equal(result.benchmark,29923);assert.equal(result.savings,32885);assert.equal(result.status,'negotiate');assert.ok(result.spread<.6);
});

test('scanner replacement units cannot benchmark a complete printer',()=>{
  const printer={name:'Brother DCP-L2520D Multi-Function Monochrome Laser Printer',identity:'Brother DCP-L2520D',quantity:5,quote:15599};
  for(const part of ['CCD Scanner with Scanning Unit','Scanning Unit','Scanner Assembly','Scanner Module']){
    const result=classifyOffer(printer,offer(500,'Aajjo.com',{title:'Brother DCP-L2520D / DCP-L2540 / DCP-L2541DW / MFC-L2701DW '+part}));
    assert.equal(result.eligible,false);assert.ok(result.reasons.includes('Component / spare part is not a complete unit'));
  }
  assert.equal(classifyOffer(printer,offer(15599,'Amazon.in',{title:'Brother DCP-L2520D 3-in-1 device, full colour flatbed scanner, monochrome duplex laser printer'})).eligible,true);
  const scanner={name:'Example S100 CCD Scanner',identity:'Example S100',quantity:1,quote:5000};
  assert.equal(classifyOffer(scanner,offer(5000,'Scanner store',{title:scanner.name})).eligible,true);
  assert.equal(classifyOffer(printer,offer(500,'Parts store',{title:printer.name,variant_context:'Brother DCP-L2520D scanner unit'})).eligible,false);
});
test('Desidime posts are discovery only even when indexed as a Shopping seller',()=>{
  for(const source of ['Desidime','DesiDime.com','Desi Dime']){
    const result=classifyOffer(item,offer(8999,source));assert.equal(result.eligible,false);assert.ok(result.reasons.includes('Deal community: discovery only, not a seller offer'));
  }
  assert.equal(classifyOffer(item,offer(8999,'Amazon.in',{link:'https://www.desidime.com/deals/product'})).eligible,false);
  assert.equal(classifyOffer(item,offer(8999,'Amazon.in',{link:'https://amazon.in/item?q=desidime.com'})).eligible,true);
  assert.equal(classifyOffer(item,offer(8999,'Shop',{link:'https://desidime.com.example.org/item'})).eligible,true);
});
test('2520D watch-result replay excludes the scanner part and deal community',()=>{
  const printer={name:'Brother DCP-L2520D Multi-Function Monochrome Laser Printer',identity:'Brother DCP-L2520D',quantity:5,quote:15599};
  const result=analyzeItem(printer,{shopping_results:[
    offer(500,'Aajjo.com',{title:'Brother DCP-L2520D / DCP-L2540 / DCP-L2541DW / MFC-L2701DW CCD Scanner with Scanning Unit'}),
    offer(14200,'HelpingIndia.com',{title:'Brother DCP-L2520D Automatic Duplex Laser Printer'}),
    offer(15599,'Amazon.in',{title:printer.name}),
    offer(15890,'Tradeindia.com',{title:'Brother Dcp-L2520d Mono Laser Multi-Function Center - Mild Steel, 220V | Wireless, Duplex, High-Speed, Energy Efficient, Mobile Printing'}),
    offer(16054,'Desidime',{title:'Brother DCP-L2520D | 3-in-1 multi function device | full colour flatbed scanner | monochrome duplex laser printer with on-site service during warranty'}),
    offer(16399,'LowestRate Shopping',{title:'Brother Dcp L2520D Automatic Duplex Laser Printer'})
  ]},{});
  assert.equal(result.sellerCount,4);assert.equal(result.rejected,2);assert.equal(result.low,14200);assert.equal(result.benchmark,15744.5);assert.ok(result.spread<.6);assert.equal(result.savings,0);
});

test('checkout costs never replace missing tax or shipping with zero',async()=>{
  const {listingCosts}=await import('../src/core.js');
  const missing=listingCosts({},100,'INR');assert.equal(missing.estimatedTax,null);assert.equal(missing.shipping,null);assert.equal(missing.comparisonTotal,null);
  const reported=listingCosts({total:'₹118',extracted_total:118,shipping:'Free'},100,'INR');assert.equal(reported.reportedTotal,118);assert.equal(reported.shipping,0);assert.equal(reported.complete,false);assert.equal(reported.comparisonTotal,null);
  assert.equal(listingCosts({shipping:'- ₹20'},100,'INR').shipping,null);
  assert.equal(listingCosts({shipping:'$5',shipping_extracted:5},100,'INR').shipping,null);
});
test('checkout calculation avoids double counting and abstains on inconsistent totals',async()=>{
  const {listingCosts}=await import('../src/core.js');
  const raw={estimated_tax:'₹18',extracted_estimated_tax:18,shipping:'₹10',shipping_extracted:10,total:'₹128',extracted_total:128};
  const costs=listingCosts(raw,100,'INR');assert.equal(costs.calculatedTotal,128);assert.equal(costs.comparisonTotal,128);assert.equal(costs.complete,true);
  const inconsistent=listingCosts({...raw,extracted_total:120},100,'INR');assert.equal(inconsistent.inconsistent,true);assert.equal(inconsistent.comparisonTotal,null);
  assert.equal(listingCosts(raw,100,null).comparisonTotal,null);
});
test('enriched duplicate costs survive deduplication without changing the base benchmark',()=>{
  const raw=offer(8999,'A');const a=analyzeItem(item,{shopping_results:[raw,{...raw,estimated_tax:'₹100',shipping:'Free',total:'₹9099'},offer(9000,'B'),offer(9400,'C')]},{});
  assert.equal(a.offers.length,3);assert.equal(a.comparable[0].costs.comparisonTotal,9099);assert.equal(a.benchmark,9000);
});
test('requirements distinguish explicit text, negation and unknown specs',async()=>{
  const {requirementCheck}=await import('../src/core.js');
  const sources=text=>[{label:'test',text,url:'https://example.com/spec',searchId:'spec-id'}];
  assert.equal(requirementCheck('automatic duplex',sources('Duplex: automatic')).status,'mentioned');
  assert.equal(requirementCheck('automatic duplex',sources('manual duplex')).status,'conflict');
  assert.equal(requirementCheck('automatic duplex',sources('not automatic duplex')).status,'conflict');
  assert.equal(requirementCheck('Ethernet',sources('without Ethernet')).status,'conflict');
  assert.equal(requirementCheck('Ethernet',sources('Ethernet: No')).status,'conflict');
  assert.equal(requirementCheck('Ethernet',sources('Wireless printer')).status,'unknown');
  assert.equal(requirementCheck('at least 30 ppm',sources('Print speed 40 ppm')).status,'unknown');
});
test('alternative budget checks use quantity, retain conflicts and refuse incomplete cards',async()=>{
  const {alternativeCandidate,validateRequirements}=await import('../src/core.js');
  const spec=validateRequirements({category:'laser printer',quantity:5,budget:160000,requirements:'automatic duplex\nEthernet'});
  const raw={title:'Example P100 laser printer automatic duplex Ethernet',source:'A',price:'₹30000',extracted_price:30000,link:'https://example.com/p100'};
  const c=alternativeCandidate(spec,raw);assert.equal(c.baseQuantityEstimate,150000);assert.equal(c.readiness,'review-candidate');
  assert.equal(alternativeCandidate({...spec,budget:100000},raw).budgetStatus,'over-base-budget');
  assert.equal(alternativeCandidate(spec,{...raw,title:'Example P100 manual duplex Ethernet'}).readiness,'conflict');
  assert.equal(alternativeCandidate(spec,{...raw,source:undefined,link:undefined}).readiness,'needs-verification');
  assert.throws(()=>validateRequirements({...spec,requirements:'x\n'.repeat(7)}));
});

test('specification identity supports exact printer models and named electronics series',async()=>{
  const {specificationIdentity}=await import('../src/core.js');
  assert.deepEqual(specificationIdentity('Brother DCP-L2520D printer').models,['DCP-L2520D']);
  assert.equal(specificationIdentity('HP Laser MFP 323sdnw Printer').brand,'hp');
  const s=specificationIdentity('Samsung 980 PRO 1TB SSD');assert.deepEqual(s.models,['980 PRO']);assert.deepEqual(s.capacities,['1TB']);
  assert.deepEqual(specificationIdentity('Logitech MX Keys Mini keyboard').models,['MX Keys Mini']);
  assert.equal(specificationIdentity('Unknown printer').brand,null);
});
test('only exact-model manufacturer links can supply fallback feature evidence',async()=>{
  const {specificationSources}=await import('../src/core.js');
  const title='HP Laser MFP 323sdnw Printer';
  const rows=[
    {title:'HP 323sdnw Specifications',link:'https://support.hp.com/in-en/specs/323sdnw',snippet:'Ethernet 10/100'},
    {title:'HP 323sdnw Specifications',link:'https://hp.com.evil.example/specs',snippet:'Ethernet'},
    {title:'HP 323sdn Specifications',link:'https://www.hp.com/in-en/specs',snippet:'Ethernet'},
    {title:'HP 323sdnw and 1188nw comparison',link:'https://www.hp.com/in-en/family',snippet:'Ethernet'},
    {title:'HP 323sdnw',link:'javascript:alert(1)',snippet:'Ethernet'},
    {title:'HP 323sdnw',link:'https://www.hp.com/?api_key=secret',snippet:'Ethernet'}
  ];
  const sources=specificationSources(title,rows,{searchId:'web-id'});assert.equal(sources.length,4);assert.equal(sources.filter(x=>x.usedForChecks).length,1);assert.equal(sources[0].searchId,'web-id');assert.ok(sources.some(x=>x.reason.includes('additional models')));
  const capacity=specificationSources('Samsung 980 PRO 1TB SSD',[{title:'Samsung 980 PRO 2TB',link:'https://samsung.com/spec',snippet:'1TB also available'}],{});assert.equal(capacity[0].usedForChecks,false);
  const family=specificationSources('Brother DCP-L2520D printer',[{title:'DCP-L2520D specifications',link:'https://support.brother.com/spec',snippet:'DCP-L2520D USB. DCP-L2541DW Ethernet.'}],{});assert.equal(family[0].usedForChecks,false);
});
test('manufacturer snippets add evidence without overriding conflicts or changing price',async()=>{
  const {alternativeCandidate,applySpecificationSources}=await import('../src/core.js');
  const spec={quantity:5,budget:160000,requirements:['automatic duplex','Ethernet']};
  const candidate=alternativeCandidate(spec,{title:'HP 323sdnw automatic duplex printer',source:'A',price:'₹26999',extracted_price:26999,link:'https://example.com/product'});
  const sources=[{usedForChecks:true,snippet:'Ethernet 10/100 Base-TX',url:'https://hp.com/spec',searchId:'official-id'}];
  applySpecificationSources(candidate,spec,sources);assert.equal(candidate.checks[1].status,'mentioned');assert.equal(candidate.readiness,'review-candidate');assert.equal(candidate.offer.price,26999);assert.equal(candidate.checks[1].evidence[0].url,'https://hp.com/spec');
  applySpecificationSources(candidate,spec,[{...sources[0],snippet:'Ethernet: No'}]);assert.equal(candidate.checks[1].status,'conflict');assert.equal(candidate.readiness,'conflict');
});
test('negated structured duplex fields are conflicts and excerpts retain the actual matched phrase',async()=>{
  const {requirementCheck}=await import('../src/core.js');
  assert.equal(requirementCheck('automatic duplex',[{text:'Auto Duplex Printing: No'}]).status,'conflict');
  const c=requirementCheck('Ethernet',[{text:'intro '.repeat(300)+'Ethernet 10/100 Base-TX',url:'https://hp.com/spec'}]);assert.equal(c.status,'mentioned');assert.match(c.evidence[0].text,/Ethernet/);
});
test('manufacturer-hosted community posts never fill specification checks',async()=>{
  const {specificationSources,alternativeCandidate,applySpecificationSources}=await import('../src/core.js');
  const title='HP Laser MFP 323sdnw Printer';
  const forum={title:'HP laser MFP 323sdnw - HP Support Community - 9690053',link:'https://h30434.www3.hp.com/t5/Scanning-Faxing-Copying/HP-laser-MFP-323sdnw/td-p/9690053',snippet:'If Ethernet is an option, use it to connect your printer to your network.'};
  const spec={quantity:5,budget:160000,requirements:['Ethernet']};
  const candidate=()=>alternativeCandidate(spec,{title,source:'HP',price:'₹26999',link:'https://www.hp.com/product'});
  for(const snippet of [forum.snippet,'Ethernet: Yes']){
    const sources=specificationSources(title,[{...forum,snippet}],{searchId:'forum-id'});
    assert.equal(sources[0].official,true);assert.equal(sources[0].sourceType,'community');assert.equal(sources[0].usedForChecks,false);
    assert.equal(applySpecificationSources(candidate(),spec,sources).checks[0].status,'unknown');
  }
  const sources=specificationSources(title,[forum,{title:'HP Laser MFP 323sdnw Product Specifications',link:'https://support.hp.com/ar-es/product/product-specs/model/2102707253',snippet:'Ethernet 10/100 Base-TX'}],{searchId:'hp-id'});
  const result=applySpecificationSources(candidate(),spec,sources);assert.equal(result.checks[0].status,'mentioned');assert.equal(result.checks[0].evidence[0].url,'https://support.hp.com/ar-es/product/product-specs/model/2102707253');
  for(const link of ['https://us.community.samsung.com/t5/printers/323sdnw','https://support.hp.com/forums/323sdnw','https://support.logitech.com/hc/en-us/community/posts/323sdnw']){
    assert.equal(specificationSources(title,[{title,link,snippet:'Ethernet: Yes'}],{})[0].usedForChecks,false);
  }
});
test('conditional feature statements and questions abstain without hiding independent assertions',async()=>{
  const {requirementCheck}=await import('../src/core.js');
  const check=text=>requirementCheck('Ethernet',[{text}]);
  for(const text of ['If Ethernet is an option, use it.','Ethernet if supported','This printer may support Ethernet.','Does this printer have Ethernet?','Ethernet: No, if using the optional adapter.','Ethernet is optional.'])assert.equal(check(text).status,'unknown',text);
  assert.equal(check('If Ethernet is available, connect it. Ethernet: Yes.').status,'mentioned');
  assert.equal(check('This printer does not support Ethernet.').status,'conflict');
  assert.equal(check('Ethernet: No.').status,'conflict');
  const mixed=[{text:'Automatic duplex printing: Yes; Ethernet if supported.'}];
  assert.equal(requirementCheck('automatic duplex',mixed).status,'mentioned');assert.equal(requirementCheck('Ethernet',mixed).status,'unknown');
});
