import {readFile,writeFile} from 'node:fs/promises';
const configPath=new URL('../wrangler.json',import.meta.url);
const config=JSON.parse(await readFile(configPath,'utf8'));
const id=process.argv[2];
const valid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)&&value!=='00000000-0000-0000-0000-000000000000';
if(id!==undefined){
  if(!valid(id)||process.argv.length!==3){console.error('Pass the D1 database UUID: npm run cloudflare:configure -- DATABASE_UUID');process.exit(1)}
  config.d1_databases[0].database_id=id;
  await writeFile(configPath,JSON.stringify(config,null,2)+'\n');
  console.log('D1 binding configured. Database IDs are public configuration, not API secrets.');
}else if(!valid(config.d1_databases?.find(db=>db.binding==='DB')?.database_id)){
  console.error('Create your D1 database, then run npm run cloudflare:configure -- DATABASE_UUID before deploying.');process.exit(1);
}else console.log('Cloudflare D1 configuration is ready.');
