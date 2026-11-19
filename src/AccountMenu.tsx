import { useEffect, useRef, useState } from 'react';
import { LogOut, ChevronDown, Cloud, LogIn, UserRoundX } from 'lucide-react';
import type { User } from 'firebase/auth';
import GoogleIcon from './GoogleIcon';
import DeleteAccountDialog from './DeleteAccountDialog';
import type { DeletionStage } from './accountDeletion';

export default function AccountMenu({user,ready,busy,login,logout,withdraw,deletionStage}:{user:User|null;ready:boolean;busy:boolean;login:()=>Promise<void>;logout:()=>Promise<void>;withdraw:()=>Promise<void>;deletionStage:DeletionStage|null}){
 const [open,setOpen]=useState(false);
 const [deleting,setDeleting]=useState(false);
 const ref=useRef<HTMLDivElement>(null);
 const trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!open)return;const close=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))setOpen(false)};const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('pointerdown',close);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',key)}},[open]);
 if(!ready)return <span className="auth-loading" role="status">계정 확인 중…</span>;
 if(!user)return <button className="google-login" disabled={busy} onClick={()=>void login()}><GoogleIcon/><span>{busy?'로그인 중…':'Google로 로그인'}</span><LogIn size={15}/></button>;
 return <div className="account-menu" ref={ref}><button ref={trigger} className="account-trigger" aria-expanded={open} aria-controls="account-popover" disabled={busy} onClick={()=>setOpen(!open)}><span className="account-avatar">{(user.displayName||user.email||'나').slice(0,1)}</span><span className="account-name">{user.displayName||'내 계정'}</span><ChevronDown size={13}/></button>{open&&<div className="account-popover" id="account-popover"><strong>{user.displayName||'내 계정'}</strong><span>{user.email}</span><p><Cloud size={14}/> 이 계정에 실험을 저장합니다.</p><button disabled={busy} onClick={()=>{setOpen(false);void logout()}}><LogOut size={15}/> 로그아웃</button><button className="account-withdraw" disabled={busy} onClick={()=>{setOpen(false);setDeleting(true)}}><UserRoundX size={15}/> 탈퇴하기</button></div>}{deleting&&<DeleteAccountDialog email={user.email} busy={busy} stage={deletionStage} onClose={()=>{setDeleting(false);trigger.current?.focus()}} onDelete={withdraw}/>}</div>
}
