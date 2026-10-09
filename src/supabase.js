// Google OAuth via Supabase PKCE. No service-role or Supabase secret key needed.
const supabaseIdentity=Symbol('verified Supabase user');
function authConfig(env){
  const u=new URL(env.SUPABASE_URL||'https://invalid.example');
  if(u.protocol!=='https:'||! /^[a-z0-9]+\.supabase\.co$/.test(u.hostname)||u.username||u.password||u.pathname!=='/'||u.search||u.hash||!env.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_'))throw new Error('Google login is not configured.');
  return {url:u.origin,key:env.SUPABASE_PUBLISHABLE_KEY};
}
function cookies(request){return Object.fromEntries((request.headers.get('cookie')||'').split(';').map(s=>{const p=s.trim().indexOf('=');return p<0?[]:[s.trim().slice(0,p),s.trim().slice(p+1)]}).filter(x=>x.length===2));}
function cookie(name,value,age){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;}
const sessionCookie='__Host-qp-session',flowCookie='__Host-qp-flow';
function base64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
async function authFetch(config,path,options={},fetcher=fetch){return fetcher(config.url+'/auth/v1/'+path,{...options,redirect:'error',signal:AbortSignal.timeout(10000),headers:{apikey:config.key,...options.headers}});}
async function verifiedUser(config,token,fetcher){
 if(!token||token.length>3500||!/^[A-Za-z0-9_.-]+$/.test(token))return null;
 const r=await authFetch(config,'user',{headers:{Authorization:'Bearer '+token}},fetcher);if(!r.ok)return null;
 const u=await r.json();return typeof u.id==='string'&&/^[a-f0-9-]{36}$/i.test(u.id)&&u.email_confirmed_at&&u.app_metadata?.providers?.includes('google')?u:null;
}
export async function withSupabase(request,env,fetcher=fetch){
 if(env.AUTH_PROVIDER!=='supabase')return env;
 const bound={...env,LOCAL_OWNER:false,[supabaseIdentity]:null};
 // Cookie-authenticated mutations must be same-origin browser requests.
 if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==new URL(request.url).origin)return bound;
 if(request.headers.get('sec-fetch-site')==='cross-site')return bound;
 try{const user=await verifiedUser(authConfig(env),cookies(request)[sessionCookie],fetcher);if(user)bound[supabaseIdentity]='supabase:'+user.id;}catch{/* Fail closed; never expose provider errors or credentials. */}
 return bound;
}
export function supabaseUserIdentity(env){return env[supabaseIdentity]||null;}
export async function handleAuth(request,env,fetcher=fetch){
 const url=new URL(request.url);if(!url.pathname.startsWith('/auth/'))return null;
 const headers=new Headers({'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'});
 const redirect=location=>{headers.set('location',location);return new Response(null,{status:303,headers});};
 if(env.AUTH_PROVIDER!=='supabase')return new Response('Google login is not enabled.',{status:404,headers});
 if(url.pathname==='/auth/logout'){
  if(request.method!=='POST'||request.headers.get('origin')!==url.origin)return new Response('Use the sign-out button in QuoteProof.',{status:403,headers});
  try{await authFetch(authConfig(env),'logout?scope=local',{method:'POST',headers:{Authorization:'Bearer '+(cookies(request)[sessionCookie]||'')}},fetcher);}catch{}
  headers.append('set-cookie',cookie(sessionCookie,'',0));headers.append('set-cookie',cookie(flowCookie,'',0));return redirect('/');
 }
 if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers});
 try{
  const config=authConfig(env);
  if(url.pathname==='/auth/login'){
   if(url.protocol!=='https:')throw new Error('Use the deployed HTTPS address for Google login.');
   const verifier=base64url(crypto.getRandomValues(new Uint8Array(48))),state=base64url(crypto.getRandomValues(new Uint8Array(24)));
   const challenge=base64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
   headers.append('set-cookie',cookie(flowCookie,verifier+'.'+state,600));
   const authorize=new URL(config.url+'/auth/v1/authorize');authorize.searchParams.set('provider','google');authorize.searchParams.set('code_challenge',challenge);authorize.searchParams.set('code_challenge_method','s256');authorize.searchParams.set('redirect_to',url.origin+'/auth/callback?state='+state);
   return redirect(authorize.href);
  }
  if(url.pathname==='/auth/callback'){
   const [verifier,state]=String(cookies(request)[flowCookie]||'').split('.');
   headers.append('set-cookie',cookie(flowCookie,'',0));
   const code=url.searchParams.get('code');if(!verifier||!state||state!==url.searchParams.get('state')||!code||code.length>2048||url.searchParams.has('error'))throw new Error('Login expired or was cancelled. Open QuoteProof and try signing in again.');
   const r=await authFetch(config,'token?grant_type=pkce',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({auth_code:code,code_verifier:verifier})},fetcher);
   if(!r.ok)throw new Error('Login could not be completed. Please try again.');
   const session=await r.json();if(!await verifiedUser(config,session.access_token,fetcher))throw new Error('A verified Google account is required.');
   const age=Math.max(1,Math.min(3600,Number(session.expires_in)||3600));
   headers.append('set-cookie',cookie(sessionCookie,session.access_token,age));return redirect('/');
  }
  return new Response('Not found',{status:404,headers});
 }catch{
  headers.set('content-type','text/html; charset=utf-8');return new Response('<!doctype html><title>QuoteProof sign-in</title><h1>Sign-in could not be completed</h1><p>Check the Google provider and callback configuration, or start sign-in again if it expired.</p><a href="/">Return to QuoteProof</a>',{status:400,headers});
 }
}
