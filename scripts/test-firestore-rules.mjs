import fs from 'node:fs';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
const [host,port]=(process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8085').split(':');
const env=await initializeTestEnvironment({projectId:'demo-life-lab',firestore:{host,port:Number(port),rules:fs.readFileSync('public/firestore.rules','utf8')}});
try{
 const a=env.authenticatedContext('user-a').firestore();
 const b=env.authenticatedContext('user-b').firestore();
 const guest=env.unauthenticatedContext().firestore();
 const path='users/user-a/experiments/test';
 const data={title:'Focus',hypothesis:'',a:'Music',b:'Quiet',days:14,start:'2026-11-12',metric:'Focus',unit:'points',max:10,category:'Study',entries:{},createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
 await assertFails(setDoc(doc(guest,path),data));
 await assertFails(getDoc(doc(guest,path)));
 await assertFails(setDoc(doc(b,path),data));
 await assertSucceeds(setDoc(doc(a,path),data));
 await assertSucceeds(getDoc(doc(a,path)));
 await assertFails(getDoc(doc(b,path)));
 await assertFails(deleteDoc(doc(b,path)));
 await assertFails(setDoc(doc(a,'users/user-a/experiments/invalid'),{...data,title:''}));
 await assertFails(setDoc(doc(a,'users/user-a/experiments/unexpected'),{...data,owner:'other'}));
 await assertFails(updateDoc(doc(a,path),{createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 const secondDevice=env.authenticatedContext('user-a').firestore();
 await Promise.all([
  assertSucceeds(updateDoc(doc(a,path),{'entries.2026-11-12':{date:'2026-11-12',score:8,note:'A'},updatedAt:serverTimestamp()})),
  assertSucceeds(updateDoc(doc(secondDevice,path),{'entries.2026-11-13':{date:'2026-11-13',score:6,note:'B'},updatedAt:serverTimestamp()}))
 ]);
 const saved=(await getDoc(doc(a,path))).data();
 assert.equal(Object.keys(saved.entries).length,2);
 await assertSucceeds(deleteDoc(doc(a,path)));
 console.log('Passed: owner CRUD, guest denial, cross-account isolation, field validation, immutable creation date, concurrent date updates.');
}finally{await env.cleanup()}
