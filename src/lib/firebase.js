import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const firebaseReady = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.databaseURL
    && firebaseConfig.projectId && firebaseConfig.appId,
);

let db = null;
let firebasePromise = null;

function waitForAuth(auth) {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe();
      resolve(user);
    }, reject);
  });
}

export function getFirebaseDb() {
  return db;
}

export function loadFirebase() {
  if (!firebaseReady) return Promise.resolve(null);
  if (db) return Promise.resolve(db);

  if (!firebasePromise) {
    firebasePromise = (async () => {
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const user = await waitForAuth(auth);
      if (!user) await signInAnonymously(auth);
      db = getDatabase(app);
      return db;
    })().catch(error => {
      firebasePromise = null;
      throw error;
    });
  }

  return firebasePromise;
}
