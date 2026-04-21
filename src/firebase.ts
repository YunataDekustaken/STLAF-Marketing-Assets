import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDEz66O3LR6_6uqkkkiBQRDdWB0j2WwEWs",
  authDomain: "marketing-43c62.firebaseapp.com",
  projectId: "marketing-43c62",
  storageBucket: "marketing-43c62.firebasestorage.app",
  messagingSenderId: "251910226857",
  appId: "1:251910226857:web:d52dd3aa41fa894a49fab8",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const isFirebaseConfigured = true;

