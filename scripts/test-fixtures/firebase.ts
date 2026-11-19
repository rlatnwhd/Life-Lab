// Used only by the browser integration test's Vite alias, never by the shipped app.
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, connectFirestoreEmulator, getDocs, getFirestore } from 'firebase/firestore';
const app=initializeApp({apiKey:'fake-emulator-key',authDomain:'localhost',projectId:'demo-life-lab'});
export const auth=getAuth(app);
export const db=getFirestore(app);
export const googleProvider=new GoogleAuthProvider();
connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
connectFirestoreEmulator(db,'127.0.0.1',8085);
export const qaSignIn=async(email:string,password:string)=>{await signInWithEmailAndPassword(auth,email,password);return true};
export const qaSignOut=()=>signOut(auth);
export const qaExperiments=async()=>{if(!auth.currentUser)throw new Error('No test account');const rows=await getDocs(collection(db,'users',auth.currentUser.uid,'experiments'));return rows.docs.map(d=>({id:d.id,...d.data()}))};
