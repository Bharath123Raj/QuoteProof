import {readFile,writeFile} from 'node:fs/promises';
// Public configuration only. Preserve the existing D1 UUID and limits.
const path='wrangler.json',config=JSON.parse(await readFile(path,'utf8'));
config.vars={...config.vars,AUTH_PROVIDER:'supabase',SUPABASE_URL:'https://blvorawnwbcnujiapmgg.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_6laMcNqezfhsBFFUUANPIw_q_ZANFup'};
await writeFile(path,JSON.stringify(config,null,2)+'\n');
console.log('Enabled Supabase Google authentication. Existing D1 database ID and search limits preserved.');
