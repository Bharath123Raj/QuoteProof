import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {localDatabase} from '../scripts/local-db.mjs';
import {sharedFetch,sharedStatus,searchAccess,withCloudflareAccess} from '../src/access.js';
import {handleApi} from '../src/api.js';
const identity=id=>({'oai-authenticated-user-id':id,'oai-authenticated-user-email':id+'@example.com'});
const req=(id='A',extra={})=>new Request('https://example.chatgpt.site/api/watch',{method:'POST',headers:{'content-type':'application/json',...identity(id),...extra},body:JSON.stringify({items:[{name:'Test M100',identity:'M100',quantity:1,quote:100}],fresh:true})});
const env=DB=>({DB,SERPAPI_API_KEY:'hosted-test-secret',AUTH_PROVIDER:'sites'});
const fixture=()=>new Response(JSON.stringify({search_metadata:{id:'access-test'},shopping_results:['A','B','C'].map(source=>({title:'Test M100',source,price:'₹100',link:'https://example.com/'+source}))}));
test('Cloudflare shared access rejects spoofed headers and unavailable runtime identity',async()=>{
 const DB=localDatabase(':memory:');try{
  const e={...env(DB),AUTH_PROVIDER:'cloudflare-access',LOCAL_OWNER:true};
  const forged=req('forged',{'cf-access-authenticated-user-email':'fake@example.com','cf-access-jwt-assertion':'forged-token','cookie':'CF_Authorization=forged-token'});
  for(const ctx of [undefined,{}, {access:{aud:'test-audience',getIdentity:async()=>{throw new Error('identity unavailable')}}}, {access:{getIdentity:async()=>({email:'valid@example.com'})}}, {access:{aud:'test-audience',getIdentity:async()=>({email:'invalid'})}}, {access:{aud:'test-audience',getIdentity:async()=>({email:' spaced@example.com'})}}]){
   const bound=await withCloudflareAccess(e,ctx);
   assert.equal((await sharedStatus(forged,bound)).signedIn,false);
   await assert.rejects(sharedFetch(forged,bound,()=>{throw new Error('must not fetch')}),x=>x.code==='SIGN_IN_REQUIRED');
   assert.equal((await searchAccess(req('forged',{'x-search-source':'personal','x-serpapi-key':'personal-cloudflare-test'}),bound,fixture)).source,'personal');
  }
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM search_usage').bind().first()).n,0);
 }finally{DB.close()}
});
test('Cloudflare verified emails share durable quotas across requests without exposing identity',async()=>{
 const DB=localDatabase(':memory:');try{
  const e={...env(DB),AUTH_PROVIDER:'cloudflare-access',SHARED_MONTHLY_LIMIT:2,SHARED_USER_DAILY_LIMIT:1};
  const bind=email=>withCloudflareAccess(e,{access:{aud:'test-audience',getIdentity:async()=>({email})}});
  const a=await bind('Owner@Example.com'),same=await bind('owner@example.com'),b=await bind('other@example.com');
  const fetchA=await sharedFetch(req('spoofed-one'),a,fixture),fetchSame=await sharedFetch(req('spoofed-two'),same,fixture),fetchB=await sharedFetch(req('spoofed-one'),b,fixture);
  const results=await Promise.allSettled([fetchA('x'),fetchSame('x'),fetchB('x')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,2);
  const status=await sharedStatus(req('spoofed-three'),same);
  assert.equal(status.authProvider,'cloudflare-access');assert.equal(status.signedIn,true);assert.deepEqual(status.remaining,{monthly:0,daily:0});
  const rows=await DB.prepare('SELECT GROUP_CONCAT(user_id) AS identifiers FROM search_usage').bind().first();
  assert.equal(JSON.stringify(rows).includes('@'),false);assert.equal(JSON.stringify(status).includes('@'),false);assert.equal(JSON.stringify(status).includes('hosted-test-secret'),false);
 }finally{DB.close()}
});
test('assembled Worker forwards trusted Cloudflare context and never treats headers as sign-in',async()=>{
 const {default:worker}=await import('../worker/index.js');const DB=localDatabase(':memory:');try{
  const e={...env(DB),AUTH_PROVIDER:'cloudflare-access'},request=new Request('https://quoteproof.example.workers.dev/api/health',{headers:identity('forged')});
  const unsigned=await (await worker.fetch(request,e)).json();assert.equal(unsigned.shared.signedIn,false);assert.equal(unsigned.liveConfigured,false);
  const signed=await (await worker.fetch(request,e,{access:{aud:'test-audience',getIdentity:async()=>({email:'owner@example.com'})}})).json();
  assert.equal(signed.shared.signedIn,true);assert.equal(signed.liveConfigured,true);assert.deepEqual(signed.shared.remaining,{monthly:200,daily:30});assert.equal(JSON.stringify(signed).includes('owner@example.com'),false);
 }finally{DB.close()}
});
test('shared searches require trusted sign-in and persistent storage; personal keys never fall back',async()=>{
 const DB=localDatabase(':memory:');try{
  const e=env(DB),anonymous=new Request('https://example.chatgpt.site/api/watch');
  await assert.rejects(sharedFetch(anonymous,e,fixture),x=>x.code==='SIGN_IN_REQUIRED');
  await assert.rejects(sharedFetch(req(),{...e,AUTH_PROVIDER:''},fixture),x=>x.code==='SIGN_IN_REQUIRED');
  await assert.rejects(sharedFetch(req(),{...e,DB:null},fixture),x=>x.code==='SHARED_UNAVAILABLE');
  await assert.rejects(searchAccess(req('A',{'x-search-source':'personal'}),e,fixture),x=>x.code==='PERSONAL_KEY_REQUIRED');
  await assert.rejects(searchAccess(req('A',{'x-search-source':'other'}),e,fixture),x=>x.code==='INVALID_SOURCE');
  assert.equal((await searchAccess(req('A',{'x-search-source':'shared','x-serpapi-key':'ignored'}),e,fixture)).key,'hosted-test-secret');
 }finally{DB.close()}
});
test('one atomic SQL reservation caps concurrent shared requests globally and per user',async()=>{
 const DB=localDatabase(':memory:');try{
  let calls=0;const fetcher=async()=>{calls++;return fixture()};const e={...env(DB),SHARED_MONTHLY_LIMIT:2,SHARED_USER_DAILY_LIMIT:1};
  const a=await sharedFetch(req('A'),e,fetcher),b=await sharedFetch(req('B'),e,fetcher);
  const results=await Promise.allSettled([a('x'),a('x'),b('x'),b('x')]);assert.equal(results.filter(x=>x.status==='fulfilled').length,2);assert.equal(calls,2);
  const status=await sharedStatus(req('A'),e);assert.deepEqual(status.remaining,{monthly:0,daily:0});
 }finally{DB.close()}
});
test('minute throttling and failed upstream attempts consume persistent allowance',async()=>{
 const DB=localDatabase(':memory:');try{
  const e={...env(DB),SHARED_USER_MINUTE_LIMIT:1};let calls=0;
  const f=await sharedFetch(req(),e,async()=>{calls++;throw new Error('network failed')});await assert.rejects(f('x'),/network failed/);await assert.rejects(f('x'),x=>x.code==='SHARED_LIMIT');assert.equal(calls,1);
  assert.equal((await sharedStatus(req(),e)).remaining.monthly,199);
 }finally{DB.close()}
});
test('usage survives reopening the local database and stores no emails, keys or quotes',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'quoteproof-usage-')),file=join(dir,'usage.sqlite');let DB=localDatabase(file);
 try{const f=await sharedFetch(req(),env(DB),fixture);await f('x');DB.close();DB=localDatabase(file);assert.equal((await sharedStatus(req(),env(DB))).remaining.daily,29);const row=await DB.prepare('SELECT * FROM search_usage').bind().first();assert.equal(row.user_id.length,64);assert.equal(JSON.stringify(row).includes('@example.com'),false);assert.equal(JSON.stringify(row).includes('hosted-test-secret'),false)}finally{DB.close();rmSync(dir,{recursive:true,force:true})}
});
test('shared watch uses hosted key, cached checks consume no attempt, and exhaustion offers personal fallback',async()=>{
 const DB=localDatabase(':memory:');try{
  const e={...env(DB),SHARED_MONTHLY_LIMIT:1};let calls=0;const f=async url=>{calls++;assert.equal(new URL(url).searchParams.get('api_key'),'hosted-test-secret');return fixture()};
  const first=await handleApi(req('A',{'x-search-source':'shared'}),e,f);assert.equal(first.status,200);
  const repeated=req('A',{'x-search-source':'shared'});const body=JSON.parse(await repeated.text());body.fresh=false;
  const cached=new Request(repeated.url,{method:'POST',headers:repeated.headers,body:JSON.stringify(body)});
  assert.equal((await (await handleApi(cached,e,f)).json()).attemptedRequests,0);assert.equal(calls,1);
  const exhausted=await handleApi(req('A',{'x-search-source':'shared'}),e,f);assert.equal(exhausted.status,429);assert.equal((await exhausted.json()).code,'SHARED_LIMIT');assert.equal(calls,1);
  const personal=await handleApi(req('A',{'x-search-source':'personal','x-serpapi-key':'personal-secret'}),e,fixture);assert.equal(personal.status,200);
  const status=JSON.stringify(await (await handleApi(new Request('https://example.chatgpt.site/api/health',{headers:identity('A')}),e)).json());assert.equal(status.includes('hosted-test-secret'),false);assert.equal(status.includes('@example.com'),false);
 }finally{DB.close()}
});
test('provider quota exhaustion is actionable and does not retry with another account',async()=>{
 const DB=localDatabase(':memory:');try{
  let calls=0;const response=await handleApi(req('quota',{'x-search-source':'shared'}),env(DB),async()=>{calls++;return new Response(JSON.stringify({error:'Your account has run out of searches.'}))});
  assert.equal(response.status,429);assert.equal((await response.json()).code,'SERPAPI_LIMIT');assert.equal(calls,1);
 }finally{DB.close()}
});
test('database failure stops shared searches before upstream while personal mode remains usable',async()=>{
 let calls=0;const e=env({prepare(){throw new Error('DB down')}});
 const response=await handleApi(req('A',{'x-search-source':'shared'}),e,async()=>{calls++;return fixture()});assert.equal(response.status,503);assert.equal(calls,0);
 const health=await sharedStatus(req(),e);assert.equal(health.configured,false);assert.equal(health.storageUnavailable,true);
 const personal=await handleApi(req('A',{'x-search-source':'personal','x-serpapi-key':'db-down-personal'}),e,fixture);assert.equal(personal.status,200);
});
