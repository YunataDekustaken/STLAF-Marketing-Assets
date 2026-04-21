import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// The user requested to use these environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let isFirebaseConfigured = false;
let app;
let db: any = null;
let auth: any = null;
let googleProvider: any = null;

try {
  // Firebase setup was declined by the user. 
  // We will stay in localStorage mode to prevent permission errors.
  isFirebaseConfigured = false;
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

export { isFirebaseConfigured, db, auth, googleProvider };
