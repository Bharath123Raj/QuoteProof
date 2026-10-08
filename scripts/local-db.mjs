import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
export function localDatabase(path='.local/usage.sqlite') {
  if(path!==':memory:')mkdirSync('.local',{recursive:true});
  const db=new DatabaseSync(path);db.exec('PRAGMA busy_timeout=5000');
  if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='search_usage'").get())db.exec(readFileSync(new URL('../drizzle/0000_search_usage.sql',import.meta.url),'utf8'));
  return {close:()=>db.close(),prepare(sql){return {bind(...params){return {async first(){return db.prepare(sql).get(...params)??null},async run(){return db.prepare(sql).run(...params)}}}}}};
}
