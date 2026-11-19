import fs from 'node:fs';
import assert from 'node:assert/strict';
const tabs=await(await fetch('http://127.0.0.1:9229/json/list')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let next=0;const pending=new Map();
ws.addEventListener('message',event=>{const r=JSON.parse(event.data);if(r.id&&pending.has(r.id)){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(r.error):p.resolve(r.result)}});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value}
try{
 await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:850,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:'http://localhost:5173/.design-review/card-preview.html'});
 await evaluate(`new Promise((resolve,reject)=>{let tries=0;const id=setInterval(()=>{if(document.querySelector('.lab-card')){clearInterval(id);resolve(true)}else if(++tries>100){clearInterval(id);reject(new Error('Card preview did not load'))}},100)})`);
 await evaluate('document.fonts.ready.then(()=>true)');
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
 fs.writeFileSync('.design-review/experiment-card-mobile.png',Buffer.from(shot.data,'base64'));
 await evaluate(`document.documentElement.style.setProperty('--text-scale','1.5');document.documentElement.dataset.textSize='largest'`);
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
 console.log('Verified: redesigned card renders at 390px with normal and 150% text, without page overflow.');
 await send('Browser.close');
}finally{ws.close()}
