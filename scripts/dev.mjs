import http from 'node:http';
import {stat} from 'node:fs/promises';
const args=process.argv.slice(2);const p=args.indexOf('--port');const port=Number(p>=0?args[p+1]:process.env.PORT||3000);
http.createServer(async(req,res)=>{
 try{if(req.url==='/__mobile'){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>Haze SG mobile QA</title><body style="margin:0;background:#dfe5dd;display:grid;place-items:center;height:100vh"><iframe title="Haze SG mobile" src="/" style="width:390px;height:844px;border:0;border-radius:18px;box-shadow:0 10px 50px #173d3730"></iframe>');return;}const t=(await stat('worker/index.js')).mtimeMs;const {default:app}=await import('../worker/index.js?'+t);const r=await app.fetch(new Request('http://localhost:'+port+req.url,{method:req.method}));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}catch(e){res.writeHead(500);res.end(e.message);}
}).listen(port,'0.0.0.0',()=>console.log('Haze SG on '+port));
