// ============================================================
//  lib/firebase.js
//  🔥 YOUR FIREBASE CONFIGURATION LIVES HERE
//
//  STEP 1: Go to https://console.firebase.google.com
//  STEP 2: Create a project called "mtu-exeat"
//  STEP 3: Click "Add App" → choose Web (</>)
//  STEP 4: Copy your config values into .env.local (see that file)
//  STEP 5: Enable these in Firebase Console:
//          - Authentication → Email/Password (enable it)
//          - Firestore Database → Create database (start in test mode)
// ============================================================

import { initializeApp, getApps } from 'firebase/app';
import { getAuth }                 from 'firebase/auth';
import { getFirestore }            from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Prevents re-initializing on hot reload in dev
const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

export { app, auth, db };
