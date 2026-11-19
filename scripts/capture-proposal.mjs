import fs from 'node:fs';
fs.mkdirSync('deliverables/screens',{recursive:true});
const tabs=await(await fetch('http://127.0.0.1:9229/json/list')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let next=0;const pending=new Map();
ws.addEventListener('message',event=>{const r=JSON.parse(event.data);if(r.id&&pending.has(r.id)){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(r.error):p.resolve(r.result)}});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value}
async function settle(){await evaluate('new Promise(resolve=>setTimeout(resolve,180))')}
async function screenshot(name,selector){
 await settle();
 const clip=selector?await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`):{x:0,y:0,width:1280,height:1490,scale:1};
 const shot=await send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});
 fs.writeFileSync('deliverables/screens/'+name+'.png',Buffer.from(shot.data,'base64'));
 console.log(name,Math.round(clip.width),Math.round(clip.height));
}
try{
 await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1490,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://127.0.0.1:5173/'});
 await evaluate(`new Promise(resolve=>{const id=setInterval(()=>{if(document.querySelector('.weekly-board')){clearInterval(id);resolve(true)}},100)})`);
 await evaluate('document.fonts.ready.then(()=>true)');
 await screenshot('01-home');
 await evaluate(`document.querySelector('.idea-row').click()`);
 await screenshot('02-create-step1','[role="dialog"]');
 await evaluate(`document.querySelector('[role="dialog"] form').requestSubmit()`);
 await screenshot('03-create-step2','[role="dialog"]');
 await evaluate(`document.querySelector('[aria-label="닫기"]').click();document.querySelector('.today-panel .primary').click()`);
 await screenshot('04-daily-record','[role="dialog"]');
 await evaluate(`document.querySelector('[aria-label="닫기"]').click();document.querySelectorAll('.header-nav button')[2].click()`);
 await settle();
 const resultBounds=await evaluate(`(()=>{const r=document.querySelector('.result-panel').getBoundingClientRect();return {x:0,y:0,width:1280,height:Math.ceil(r.bottom+35),scale:1}})()`);
 const shot=await send('Page.captureScreenshot',{format:'png',clip:resultBounds,captureBeyondViewport:true});
 fs.writeFileSync('deliverables/screens/05-results.png',Buffer.from(shot.data,'base64'));
 console.log('05-results',resultBounds.width,resultBounds.height);
 await send('Browser.close');
}finally{ws.close()}
