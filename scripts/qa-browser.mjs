import assert from 'node:assert/strict';
import fs from 'node:fs';
const tabs=await(await fetch('http://127.0.0.1:9229/json/list')).json();
const tab=tabs.find(t=>t.type==='page');
const ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let next=0;const pending=new Map();
ws.addEventListener('message',event=>{const r=JSON.parse(event.data);if(r.id&&pending.has(r.id)){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(r.error):p.resolve(r.result)}});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value}
try{
 await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:'http://localhost:5173/'});
 await evaluate(`new Promise(resolve=>{const id=setInterval(()=>{if(document.querySelector('.weekly-board')&&document.querySelector('.google-login:not(:disabled)')){clearInterval(id);resolve(true)}},100)})`);
 await evaluate('document.fonts.ready.then(()=>true)');
 await evaluate('Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))).then(()=>true)');
 const widths=await evaluate(`({width:innerWidth,body:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,15).map(e=>({tag:e.tagName,class:e.className,right:e.getBoundingClientRect().right}))})`);
 console.log('Mobile layout:',JSON.stringify(widths));
 const baseSize=await evaluate(`parseFloat(getComputedStyle(document.querySelector('.result-story > p')).fontSize)`);
 assert.ok(baseSize>=16,'Default body copy must be readable without changing settings');
 assert.equal(await evaluate(`Array.from(document.querySelectorAll('.google-icon img')).every(img=>img.complete&&img.naturalWidth>0)`),true,'Supplied Google images must load');
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
 fs.writeFileSync('.design-review/mobile-verified.png',Buffer.from(shot.data,'base64'));
 assert.equal(await evaluate("!!document.querySelector('.display-trigger')"),false,'Screen settings must be removed');
 assert.equal(await evaluate("document.documentElement.dataset.highContrast==='true'"),false,'Old contrast preferences must not remain active');
 assert.equal(await evaluate("localStorage.getItem('life-lab-display-v1')"),null,'Old display preferences must be cleared');
 assert.equal(await evaluate("!!document.querySelector('.landing')"),true);
 assert.equal(await evaluate("document.querySelectorAll('.planner-slot:not(:disabled)').length"),0);
 assert.equal(await evaluate("document.querySelectorAll('.record-form, .experiment-card').length"),0);
 const before=await evaluate("localStorage.getItem('life-lab-v1')");
 await evaluate("document.querySelectorAll('.header-nav button')[2].click()");
 assert.equal(await evaluate("!!document.getElementById('result-preview')"),true);
 assert.equal(await evaluate("localStorage.getItem('life-lab-v1')"),before);
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await evaluate('new Promise(resolve=>setTimeout(resolve,100))');
 assert.equal(await evaluate('document.getAnimations().filter(a=>a.playState===\'running\').length'),0);
 console.log('Reduced-motion preference: respected.');
 console.log('Passed: introduction, read-only example calendar, result preview, hidden personal records, unchanged local data, mobile and desktop layout.');
 await send('Browser.close');
}finally{ws.close()}
