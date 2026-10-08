import {createServer} from 'node:http';
import app from '../worker/index.js';
import {loadEnvFile} from 'node:process';
import {existsSync} from 'node:fs';
import {localDatabase} from './local-db.mjs';
if(existsSync('.env'))loadEnvFile('.env');
const DB=localDatabase();
const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be a whole number from 1 to 65535.');
const server=createServer(async(req,res)=>{
  try{
    const chunks=[]; let bytes=0;
    for await(const chunk of req){bytes+=chunk.length;if(bytes>12000){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
    const body=Buffer.concat(chunks);
    delete req.headers['oai-authenticated-user-id'];delete req.headers['oai-authenticated-user-email'];
    const request=new Request('http://'+(req.headers.host||'localhost:'+port)+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body}: {})});
    const response=await app.fetch(request,{DB,LOCAL_OWNER:true,SERPAPI_API_KEY:process.env.SERPAPI_API_KEY,SHARED_MONTHLY_LIMIT:process.env.SHARED_MONTHLY_LIMIT,SHARED_USER_DAILY_LIMIT:process.env.SHARED_USER_DAILY_LIMIT,SHARED_USER_MINUTE_LIMIT:process.env.SHARED_USER_MINUTE_LIMIT});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Request failed');}
});
server.on('error',error=>{
  console.error(error.code==='EADDRINUSE'?'Port '+port+' is already in use. Stop the old server with Ctrl+C, or set PORT=3001 in .env and restart.':'Could not start QuoteProof: '+error.message);
  DB.close();process.exitCode=1;
});
server.listen(port,'127.0.0.1',()=>console.log('QuoteProof running at http://localhost:'+port));
server.requestTimeout=360000;
