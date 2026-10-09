import test from 'node:test';
import assert from 'node:assert/strict';
import {handleAuth,withSupabase} from '../src/supabase.js';
import {sharedIdentity,sharedFetch,sharedStatus} from '../src/access.js';
import {localDatabase} from '../scripts/local-db.mjs';
const origin='https://quoteproof.quoteproof.workers.dev';
const env={AUTH_PROVIDER:'supabase',SUPABASE_URL:'https://testproject.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SERPAPI_API_KEY:'test-secret'};
const user={id:'12345678-1234-1234-1234-123456789012',email_confirmed_at:'2026-10-09',app_metadata:{providers:['google']}};
const json=x=>new Response(JSON.stringify(x));
test('PKCE login uses HTTPS and secure host-only cookies, with fixed callback',async()=>{
 const r=await handleAuth(new Request(origin+'/auth/login?return_to=https://evil.example'),env);
 assert.equal(r.status,303);const u=new URL(r.headers.get('location'));
 assert.equal(u.origin,env.SUPABASE_URL);assert.equal(u.searchParams.get('provider'),'google');assert.equal(u.searchParams.get('code_challenge_method'),'s256');assert.equal(u.searchParams.get('code_challenge').length,43);
 assert.equal(new URL(u.searchParams.get('redirect_to')).pathname,'/auth/callback');assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);assert.match(r.headers.get('set-cookie'),/__Host-qp-flow=/);
 assert.equal((await handleAuth(new Request('http://localhost/auth/login'),env)).status,400);
});
test('callback rejects missing/mismatched browser flow without contacting provider',async()=>{
 let calls=0;for(const cookie of ['', '__Host-qp-flow=verifier.wrong']){
 const r=await handleAuth(new Request(origin+'/auth/callback?code=abc&state=expected',{headers:{cookie}}),env,()=>{calls++;throw Error('must not fetch')});assert.equal(r.status,400);assert.match(r.headers.get('set-cookie'),/Max-Age=0/);
 }assert.equal(calls,0);
});
test('callback exchanges code and verifies Google user before creating session',async()=>{
 const login=await handleAuth(new Request(origin+'/auth/login'),env);
 const flow=login.headers.get('set-cookie').split(';')[0];const redirect=new URL(new URL(login.headers.get('location')).searchParams.get('redirect_to'));redirect.searchParams.set('code','auth-code');
 let calls=0;const fetcher=async(url,opts)=>{calls++;assert.equal(opts.redirect,'error');assert.equal(opts.headers.apikey,env.SUPABASE_PUBLISHABLE_KEY);if(url.includes('/token?')){const b=JSON.parse(opts.body);assert.equal(b.auth_code,'auth-code');assert.equal(b.code_verifier,flow.split('=')[1].split('.')[0]);return json({access_token:'valid.jwt.token',expires_in:3600})}assert.equal(opts.headers.Authorization,'Bearer valid.jwt.token');return json(user)};
 const r=await handleAuth(new Request(redirect,{headers:{cookie:flow}}),env,fetcher);assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/');assert.match(r.headers.get('set-cookie'),/__Host-qp-session=valid.jwt.token/);assert.equal(calls,2);
 const failed=await handleAuth(new Request(redirect,{headers:{cookie:flow}}),env,async url=>url.includes('/token?')?json({access_token:'valid.jwt.token'}):json({...user,email_confirmed_at:null}));assert.equal(failed.status,400);assert.doesNotMatch(failed.headers.get('set-cookie'),/__Host-qp-session=valid/);
});
test('forged cookies, identity headers and cross-origin requests cannot use shared credits',async()=>{
 const DB=localDatabase(':memory:');try{
 let calls=0;const request=(headers={},method='GET')=>new Request(origin+'/api/health',{method,headers});
 for(const r of [request({'oai-authenticated-user-id':'forged'}),request({cookie:'__Host-qp-session=forged.jwt'}),request({cookie:'__Host-qp-session=valid.jwt',origin:'https://evil.example'},'POST'),request({cookie:'__Host-qp-session=valid.jwt','sec-fetch-site':'cross-site'})]){
 const bound=await withSupabase(r,{...env,DB,LOCAL_OWNER:true},async()=>{calls++;return new Response('',{status:401})});assert.equal(sharedIdentity(r,bound),null);await assert.rejects(sharedFetch(r,bound,()=>{}),e=>e.code==='SIGN_IN_REQUIRED');
 }assert.equal(calls,1);
 const r=request({cookie:'__Host-qp-session=valid.jwt',origin},'POST'),bound=await withSupabase(r,{...env,DB},async()=>json(user));assert.equal(sharedIdentity(r,bound),'supabase:'+user.id);const f=await sharedFetch(r,bound,async()=>json({}));await f('x');const status=await sharedStatus(r,bound);assert.equal(status.authProvider,'supabase');assert.equal(status.remaining.daily,29);assert.equal(JSON.stringify(status).includes(user.id),false);
 }finally{DB.close()}
});
test('logout requires same-origin POST and expires session even when provider is down',async()=>{
 assert.equal((await handleAuth(new Request(origin+'/auth/logout'),env)).status,403);
 assert.equal((await handleAuth(new Request(origin+'/auth/logout',{method:'POST',headers:{origin:'https://evil.example'}}),env)).status,403);
 const r=await handleAuth(new Request(origin+'/auth/logout',{method:'POST',headers:{origin}}),env,async()=>{throw Error('offline')});assert.equal(r.status,303);assert.match(r.headers.get('set-cookie'),/__Host-qp-session=;.*Max-Age=0/);
});
