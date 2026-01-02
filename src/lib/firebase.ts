import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

function getMissingConfig(config: Record<string, string | undefined>) {
  return Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

function canInitializeFirebase() {
  const missing = getMissingConfig(firebaseConfig);
  if (missing.length) {
    console.warn(
      `[firebase] Missing environment variables: ${missing.join(
        ", ",
      )}. Add them to .env.local.`,
    );
    return false;
  }

  return typeof window !== "undefined";
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseApp() {
  if (!canInitializeFirebase()) return null;
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth() {
  if (!auth) {
    const appInstance = getFirebaseApp();
    if (!appInstance) return null;
    auth = getAuth(appInstance);
  }
  return auth;
}

export function getFirestoreDb() {
  if (!db) {
    const appInstance = getFirebaseApp();
    if (!appInstance) return null;
    db = getFirestore(appInstance);
  }
  return db;
}
