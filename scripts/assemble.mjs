import {readFile, writeFile} from 'node:fs/promises';
const core=await readFile('src/core.js','utf8');
const supabase=await readFile('src/supabase.js','utf8');
const access=(await readFile('src/access.js','utf8')).replace(/^import .*;\n/gm,'');
const api=(await readFile('src/api.js','utf8')).replace(/^import .*;\n/gm,'');
const page=await readFile('src/page.html','utf8');
const worker=supabase+'\n'+core+'\n'+access+'\n'+api+'\nconst page = '+JSON.stringify(page)+';\nexport default { async fetch(request, env, ctx) { const path=new URL(request.url).pathname; if(path.startsWith("/auth/"))return handleAuth(request,env); if(path.startsWith("/api/"))return handleApi(request,await withSupabase(request,await withCloudflareAccess(env,ctx))); if(path!=="/")return new Response("Not found",{status:404}); if(!["GET","HEAD"].includes(request.method))return new Response("Method not allowed",{status:405}); return new Response(request.method==="HEAD"?null:page,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"}}); } };\n';
await writeFile('worker/index.js',worker);
console.log('Assembled portable worker');
