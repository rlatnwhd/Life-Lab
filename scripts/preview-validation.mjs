import fs from 'node:fs';
import assert from 'node:assert/strict';
const tabs=await(await fetch('http://127.0.0.1:9229/json/list')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let next=0;const pending=new Map();
ws.addEventListener('message',event=>{const r=JSON.parse(event.data);if(r.id&&pending.has(r.id)){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(r.error):p.resolve(r.result)}});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value}
const wait=()=>new Promise(r=>setTimeout(r,150));
async function input(selector,value){await evaluate(`(()=>{const f=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(f,${JSON.stringify(value)});f.dispatchEvent(new Event('input',{bubbles:true}));})()`);await wait();}
try{
 await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1100,height:1100,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://localhost:5173/.design-review/validation-preview.html'});
 await evaluate(`new Promise((resolve,reject)=>{let tries=0;const id=setInterval(()=>{if(document.querySelectorAll('form').length===2){clearInterval(id);resolve(true)}else if(++tries>100){clearInterval(id);reject(new Error(document.body.innerText))}},100)})`);
 const maxField='form:not(.record-form) input[type=number]';
 const scoreField='.record-form input[type=number]';
 await input(maxField,'111');
 assert.equal(await evaluate(`document.querySelector('${maxField}').value`),'100');
 await input(maxField,'1111111111111111');
 assert.equal(await evaluate(`document.querySelector('${maxField}').value`),'100');
 await input(maxField,'10.56');
 assert.equal(await evaluate(`document.querySelector('${maxField}').value`),'10.5');
 await input(scoreField,'5.12345');
 assert.equal(await evaluate(`document.querySelector('${scoreField}').value`),'5.1');
 await input(scoreField,'11');
 assert.equal(await evaluate(`document.querySelector('${scoreField}').value`),'10');
 assert.equal(await evaluate(`document.querySelectorAll('.field-error').length`),0);
 await input(maxField,'');
 await evaluate(`document.querySelector('${maxField}').focus();document.querySelector('${maxField}').blur()`);await wait();
 assert.equal(await evaluate(`document.querySelectorAll('.field-error').length`),0);
 await evaluate(`document.querySelector('form:not(.record-form)').requestSubmit()`);await wait();
 assert.equal(await evaluate('window.saved'),0);
 assert.equal(await evaluate(`document.querySelectorAll('.field-error').length`),1);
 await input(maxField,'10.5');
 await evaluate(`document.querySelector('form:not(.record-form)').requestSubmit()`);await wait();
 assert.equal(await evaluate('window.saved'),1);
 await input(scoreField,'5.1');
 await evaluate(`document.querySelector('.record-form').requestSubmit()`);await wait();
 assert.equal(await evaluate('window.saved'),2);
 console.log('Verified: 111 and oversized paste clamp to 100; both fields trim to one decimal; score clamps to experiment max; empty warning only on submit; decimal values save.');
 await send('Browser.close');
}finally{ws.close()}
