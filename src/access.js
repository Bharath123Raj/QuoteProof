import {supabaseUserIdentity} from './supabase.js';
// Shared requests are counted before each actual upstream fetch, including
// failed attempts. This is an app budget, not a SerpApi billing meter.
const cloudflareIdentity = Symbol('verified Cloudflare identity');
export async function withCloudflareAccess(env={},ctx) {
  if(env.AUTH_PROVIDER!=='cloudflare-access')return env;
  // Identity comes exclusively from Cloudflare's trusted runtime context.
  // Client-supplied Sites headers, JWT headers and cookies are never identities.
  const bound={...env,LOCAL_OWNER:false,[cloudflareIdentity]:null};
  try{
    if(typeof ctx?.access?.aud!=='string'||!ctx.access.aud.trim())return bound;
    const identity=await ctx.access.getIdentity();
    const email=identity?.email;
    if(typeof email==='string'&&email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      bound[cloudflareIdentity]='cloudflare-access:'+email.toLowerCase();
  }catch{/* Unavailable or unauthenticated identity fails closed for shared use. */}
  return bound;
}
export function accessError(message, code, status) {
  return Object.assign(new Error(message), {code, status, fatal:true});
}
export function sharedLimits(env) {
  const limit=(key,fallback,max)=>{const n=Number(env[key]??fallback);return Number.isInteger(n)&&n>=1&&n<=max?n:fallback};
  return {monthly:limit('SHARED_MONTHLY_LIMIT',200,100000),daily:limit('SHARED_USER_DAILY_LIMIT',30,10000),minute:limit('SHARED_USER_MINUTE_LIMIT',12,1000)};
}
export function sharedIdentity(request,env) {
  // Only the loopback Node adapter may set LOCAL_OWNER as a boolean.
  if(env.LOCAL_OWNER===true)return 'local-owner';
  if(env.AUTH_PROVIDER==='supabase')return supabaseUserIdentity(env);
  if(env.AUTH_PROVIDER==='cloudflare-access')return env[cloudflareIdentity]||null;
  // These headers must be supplied by Sites dispatch, not a public proxy.
  if(env.AUTH_PROVIDER!=='sites')return null;
  return request.headers.get('oai-authenticated-user-id')?.trim()||null;
}
async function usageIdentity(request,env) {
  const id=sharedIdentity(request,env);
  if(!id)throw accessError('Sign in to use QuoteProof credits, or choose your own SerpApi key.','SIGN_IN_REQUIRED',401);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id));
  return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
}
export async function sharedStatus(request,env) {
  const configured=Boolean(env.SERPAPI_API_KEY&&env.DB),signedIn=Boolean(sharedIdentity(request,env)),limits=sharedLimits(env);
  const status={configured,signedIn,authProvider:env.LOCAL_OWNER===true?'local-owner':['sites','cloudflare-access','supabase'].includes(env.AUTH_PROVIDER)?env.AUTH_PROVIDER:'unconfigured',limits,remaining:null};
  if(!configured||!signedIn)return status;
  try{
    const user=await usageIdentity(request,env),day=new Date().toISOString().slice(0,10),month=day.slice(0,7);
    const row=await env.DB.prepare('SELECT (SELECT COUNT(*) FROM search_usage WHERE month = ?1) AS monthly, (SELECT COUNT(*) FROM search_usage WHERE day = ?2 AND user_id = ?3) AS daily').bind(month,day,user).first();
    status.remaining={monthly:Math.max(0,limits.monthly-Number(row.monthly)),daily:Math.max(0,limits.daily-Number(row.daily))};
  }catch{status.configured=false;status.storageUnavailable=true;}
  return status;
}
export async function sharedFetch(request,env,fetcher) {
  if(!env.SERPAPI_API_KEY)throw accessError('QuoteProof shared search is not configured. Choose your own SerpApi key or the synthetic demo.','SHARED_UNAVAILABLE',503);
  if(!env.DB)throw accessError('Shared usage storage is unavailable. Choose your own SerpApi key or the synthetic demo.','SHARED_UNAVAILABLE',503);
  const user=await usageIdentity(request,env),limits=sharedLimits(env);
  return async(...args)=>{
    const now=Date.now(),day=new Date(now).toISOString().slice(0,10),month=day.slice(0,7);
    let row;
    try{
      // One atomic conditional INSERT enforces all limits across concurrent
      // requests and Worker instances. Never refund attempts after a failure.
      row=await env.DB.prepare(`INSERT INTO search_usage (id,month,day,user_id,created_at)
        SELECT ?1,?2,?3,?4,?5 WHERE
        (SELECT COUNT(*) FROM search_usage WHERE month=?2) < ?6 AND
        (SELECT COUNT(*) FROM search_usage WHERE day=?3 AND user_id=?4) < ?7 AND
        (SELECT COUNT(*) FROM search_usage WHERE user_id=?4 AND created_at>?8) < ?9
        RETURNING id`).bind(crypto.randomUUID(),month,day,user,now,limits.monthly,limits.daily,now-60000,limits.minute).first();
    }catch{throw accessError('Shared usage storage is unavailable. Choose your own key or the synthetic demo.','SHARED_UNAVAILABLE',503);}
    if(!row)throw accessError('QuoteProof shared search allowance or rate limit reached. Connect your own SerpApi key, wait for the limit to reset, or use the synthetic demo.','SHARED_LIMIT',429);
    return fetcher(...args);
  };
}
export async function searchAccess(request,env,fetcher) {
  const source=request.headers.get('x-search-source')||(request.headers.get('x-serpapi-key')?'personal':env.SERPAPI_API_KEY?'shared':'personal');
  if(!['personal','shared'].includes(source))throw accessError('Choose shared or personal search.','INVALID_SOURCE',400);
  const key=String(source==='personal'?request.headers.get('x-serpapi-key')||'':env.SERPAPI_API_KEY||'').trim();
  if(key.length>200||/[\r\n]/.test(key))throw accessError('Invalid key format.','INVALID_KEY',400);
  if(source==='personal'&&!key)throw accessError('Enter your SerpApi key in Search settings, or select Demo.','PERSONAL_KEY_REQUIRED',401);
  return {key,fetcher:source==='shared'?await sharedFetch(request,env,fetcher):fetcher,source};
}
