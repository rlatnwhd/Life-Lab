import { deleteUser, type User } from 'firebase/auth';
import { collection, getDocsFromServer, limit, query, writeBatch, type Firestore } from 'firebase/firestore';

export type DeletionStage='reauthenticate'|'records'|'account';
type Options={user:User;db:Firestore;reauthenticate:()=>Promise<unknown>;isCurrent:()=>boolean;onStage?:(stage:DeletionStage)=>void};

// Confirm identity before deleting data. Never remove Auth access before its records.
export async function eraseAccount({user,db,reauthenticate,isCurrent,onStage}:Options){
 let recordsStarted=false;
 const check=()=>{if(!isCurrent())throw new Error('로그인 계정이 변경되어 탈퇴를 중단했습니다. 삭제 중이던 계정의 상태를 확인해 주세요.')};
 check();
 onStage?.('reauthenticate');
 await reauthenticate();
 check();
 onStage?.('records');
 const owned=collection(db,'users',user.uid,'experiments');
 for(let page=0;page<100;page++){
  check();
  let snapshot;
  try{snapshot=await getDocsFromServer(query(owned,limit(200)))}catch(error){
   if(recordsStarted)throw new Error('일부 실험이 삭제된 뒤 서버 연결이 중단되었습니다. 계정은 아직 삭제하지 않았습니다. 다시 시도해 남은 기록을 삭제해 주세요.');
   throw error;
  }
  if(snapshot.empty){
   check();onStage?.('account');
   try{await deleteUser(user)}catch{
    throw new Error('서버의 실험 기록은 삭제되었지만 계정 삭제를 완료하지 못했습니다. 아직 로그인 계정은 남아 있을 수 있으니, 이 창에서 다시 탈퇴를 시도해 주세요.');
   }
   return;
  }
  const batch=writeBatch(db);
  snapshot.docs.forEach(row=>batch.delete(row.ref));
  check();
  try{await batch.commit();recordsStarted=true}catch(error){
   if(recordsStarted)throw new Error('일부 실험이 삭제된 뒤 연결이 중단되었습니다. 계정은 아직 삭제하지 않았습니다. 인터넷과 저장 권한을 확인하고 다시 시도해 주세요.');
   throw error;
  }
 }
 throw new Error('삭제할 기록이 많아 이번 처리를 중단했습니다. 계정은 아직 삭제하지 않았습니다. 다시 시도해 남은 기록을 삭제해 주세요.');
}
