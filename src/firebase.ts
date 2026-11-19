import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Web app configuration is public. Access is controlled by Auth and Firestore rules.
const app = initializeApp({
  apiKey: 'AIzaSyC_IqvrEv79dUpiTUJ9xhOte74yjZoVo94',
  authDomain: 'life-lab-4fbcc.firebaseapp.com',
  projectId: 'life-lab-4fbcc',
  storageBucket: 'life-lab-4fbcc.firebasestorage.app',
  messagingSenderId: '281034235144',
  appId: '1:281034235144:web:b954817e1f598d157ca0bd',
});
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
