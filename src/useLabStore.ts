import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, reauthenticateWithPopup, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { type Experiment, type Entry, load } from './model';
import { firebaseMessage, fromCloud, toCloud, validateEntry, validateExperiment, validateNewMeasurement } from './cloud-model';
import { eraseAccount, type DeletionStage } from './accountDeletion';

type Dataset={uid:string;items:Experiment[];ready:boolean;error:string};
export function useLabStore(){
 // Read legacy browser data only for explicit import after login.
 const [guest]=useState<Experiment[]>(load);
 const [user,setUser]=useState<User|null>(null);
 const [authReady,setAuthReady]=useState(false);
 const [authBusy,setAuthBusy]=useState(false);
 const [busy,setBusy]=useState(false);
 const [dataset,setDataset]=useState<Dataset>({uid:'',items:[],ready:false,error:''});
 const [retry,setRetry]=useState(0);
 const [authError,setAuthError]=useState('');
 const [deletionStage,setDeletionStage]=useState<DeletionStage|null>(null);
 const writing=useRef(false);
 const authenticating=useRef(false);
 const currentUid=useRef<string|null>(null);
 useEffect(()=>onAuthStateChanged(auth,next=>{
  currentUid.current=next?.uid??null;
  setUser(next);setAuthReady(true);setAuthError('');
  setDataset(old=>old.uid===next?.uid?old:{uid:next?.uid??'',items:[],ready:false,error:''});
 },error=>{setAuthError(firebaseMessage(error));setAuthReady(true)}),[]);
 useEffect(()=>{
  if(!user)return;
  const uid=user.uid;let alive=true;
  setDataset({uid,items:[],ready:false,error:''});
  return (()=>{
   const unsubscribe=onSnapshot(collection(db,'users',uid,'experiments'),{includeMetadataChanges:true},snapshot=>{
    if(!alive||currentUid.current!==uid)return;
    try{
     const items=snapshot.docs.map(d=>fromCloud(d.id,d.data())).sort((a,b)=>b.start.localeCompare(a.start)||a.id.localeCompare(b.id));
     setDataset({uid,items,ready:!snapshot.metadata.fromCache,error:''});
    }catch(error){setDataset({uid,items:[],ready:false,error:firebaseMessage(error)})}
   },error=>{if(alive&&currentUid.current===uid)setDataset({uid,items:[],ready:false,error:firebaseMessage(error)})});
   return ()=>{alive=false;unsubscribe()};
  })();
 },[user?.uid,retry]);
 const ready=authReady&&!!user&&dataset.uid===user.uid&&dataset.ready&&!dataset.error;
 const experiments=user&&dataset.uid===user.uid?dataset.items:[];
 async function login(){
  if(authenticating.current||writing.current)return;
  authenticating.current=true;setAuthBusy(true);setAuthError('');
  try{await signInWithPopup(auth,googleProvider)}catch(error){setAuthError(firebaseMessage(error))}finally{authenticating.current=false;setAuthBusy(false)}
 }
 async function logout(){
  if(authenticating.current||writing.current)return;
  authenticating.current=true;setAuthBusy(true);setAuthError('');
  try{await signOut(auth)}catch(error){setAuthError(firebaseMessage(error))}finally{authenticating.current=false;setAuthBusy(false)}
 }
 async function withdraw(){
  if(authenticating.current||writing.current)throw new Error('진행 중인 작업이 끝난 뒤 다시 시도해 주세요.');
  const target=auth.currentUser;
  if(!target||target.uid!==user?.uid)throw new Error('탈퇴할 계정으로 다시 로그인해 주세요.');
  if(!navigator.onLine)throw new Error('인터넷에 연결한 뒤 탈퇴를 다시 시도해 주세요.');
  authenticating.current=true;writing.current=true;setAuthBusy(true);setBusy(true);setAuthError('');
  try{await eraseAccount({user:target,db,reauthenticate:()=>reauthenticateWithPopup(target,googleProvider),isCurrent:()=>auth.currentUser?.uid===target.uid&&currentUid.current===target.uid,onStage:setDeletionStage})}
  finally{authenticating.current=false;writing.current=false;setAuthBusy(false);setBusy(false);setDeletionStage(null)}
 }
 async function write(operation:(uid:string)=>Promise<void>){
  if(writing.current)throw new Error('저장 중입니다. 잠시만 기다려 주세요.');
  if(!user)throw new Error('로그인 후 실험을 만들고 기록할 수 있어요.');
  if(!ready)throw new Error('계정과 저장된 실험을 불러온 뒤 다시 시도해 주세요.');
  const uid=user.uid;
  if(currentUid.current!==uid)throw new Error('계정이 변경되었습니다. 다시 시도해 주세요.');
  if(uid&&!navigator.onLine)throw new Error('인터넷이 연결되어 있지 않아요. 연결 후 저장해 주세요. 입력한 내용은 그대로 유지됩니다.');
  writing.current=true;setBusy(true);
  try{await operation(uid);if(currentUid.current!==uid)throw new Error('계정이 변경되었습니다. 현재 계정의 기록을 확인해 주세요.')}
  finally{writing.current=false;setBusy(false)}
 }
 async function createExperiment(e:Experiment){
  validateNewMeasurement(e);
  validateExperiment(e);
  await write(async uid=>{
   await setDoc(doc(db,'users',uid,'experiments',e.id),{...toCloud(e),createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  });
 }
 async function saveEntry(id:string,entry:Entry){
  const e=experiments.find(e=>e.id===id);if(!e)throw new Error('실험을 찾을 수 없습니다.');validateEntry(e,entry);
  await write(async uid=>{
   // Update just this date, preserving concurrent records from another device.
   await updateDoc(doc(db,'users',uid,'experiments',id),{['entries.'+entry.date]:entry,updatedAt:serverTimestamp()});
  });
 }
 async function removeExperiment(id:string){await write(async uid=>{await deleteDoc(doc(db,'users',uid,'experiments',id))})}
 const importable=user?guest.filter(e=>!e.demo&&!experiments.some(cloud=>cloud.id===e.id)):[];
 async function importGuest(){
  await write(async uid=>{
   if(!uid)throw new Error('로그인 후 가져올 수 있어요.');
   for(const e of importable){
    if(currentUid.current!==uid)throw new Error('계정이 변경되어 가져오기를 중단했습니다.');
    const ref=doc(db,'users',uid,'experiments',e.id);
    const data=toCloud(e);
    await runTransaction(db,async transaction=>{const existing=await transaction.get(ref);if(!existing.exists())transaction.set(ref,{...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()})});
   }
  });
 }
 const retryLoad=useCallback(()=>setRetry(n=>n+1),[]);
 return {experiments,user,authReady,authBusy,busy,ready,authError,cloudError:user&&dataset.uid===user.uid?dataset.error:'',login,logout,withdraw,deletionStage,createExperiment,saveEntry,removeExperiment,importGuest,importable,retryLoad};
}
