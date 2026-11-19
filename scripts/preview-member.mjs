import fs from 'node:fs';
import assert from 'node:assert/strict';
const tabs=await(await fetch('http://127.0.0.1:9229/json/list')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let next=0;const pending=new Map();
ws.addEventListener('message',event=>{const r=JSON.parse(event.data);if(r.id&&pending.has(r.id)){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(r.error):p.resolve(r.result)}});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value}
const pause=()=>evaluate('new Promise(resolve=>setTimeout(resolve,100))');
async function capture(file){const clip=await evaluate(`(()=>{const r=document.querySelector('.member-home').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);const shot=await send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});fs.writeFileSync('.design-review/'+file,Buffer.from(shot.data,'base64'))}
try{
 await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://localhost:5173/.design-review/member-preview.html'});
 await evaluate(`new Promise((resolve,reject)=>{let n=0;const id=setInterval(()=>{if(document.querySelector('.member-home')){clearInterval(id);resolve(true)}else if(++n>100){clearInterval(id);reject(new Error('Dashboard preview did not render'))}},100)})`);
 await evaluate('document.fonts.ready.then(()=>true)');
 assert.match(await evaluate(`document.querySelector('.member-welcome h1').textContent`),/수종/);
 await evaluate(`document.querySelector('.member-actions .primary').click()`);
 assert.equal(await evaluate('window.lastAction'),'demo-focus');
 await capture('member-desktop.png');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:true});
 await pause();
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
 await capture('member-mobile.png');
 await evaluate(`(()=>{document.documentElement.style.setProperty('--text-scale','1.5');document.documentElement.dataset.textSize='largest'})()`);
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
 await evaluate('window.renderMember([])');
 await pause();
 await evaluate(`document.querySelector('.member-actions .primary').click()`);
 assert.equal(await evaluate('window.lastAction'),'create');
 await evaluate(`window.renderMember(window.demoSamples.map(e=>({...e,entries:[...e.entries,{date:new Date().toLocaleDateString('en-CA'),score:8,note:''}]})))`);
 await pause();
 await evaluate(`document.querySelector('.member-actions .primary').click()`);
 assert.equal(await evaluate('window.lastAction'),'results');
 console.log('Passed: personalized name, next pending record, empty account, all records complete, mobile and 150% layout.');
 await send('Browser.close');
}finally{ws.close()}
