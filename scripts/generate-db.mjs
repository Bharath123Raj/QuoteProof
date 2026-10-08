import {readFile,writeFile,mkdir} from 'node:fs/promises';
const schema=await readFile('db/schema.sql','utf8');
await mkdir('drizzle',{recursive:true});
const migration='drizzle/0000_search_usage.sql';
try{const prior=await readFile(migration,'utf8');if(prior!==schema)throw new Error('Initial migration is immutable. Add a new numbered migration for schema changes.');}
catch(e){if(e.code!=='ENOENT')throw e;await writeFile(migration,schema);}
console.log('Usage schema migration ready');
