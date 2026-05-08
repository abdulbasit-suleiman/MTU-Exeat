// app/api/consent-reply/route.js  — to handle parent consent replies from email links
import { NextResponse } from 'next/server';
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (e) {
  console.error("FIREBASE_SERVICE_ACCOUNT env var is missing or invalid JSON");
  return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?consent=error`);
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ref    = searchParams.get('ref');    // EX-2025-XXXX
  const action = searchParams.get('action'); // 'approve' | 'decline'

  if (!ref || !action) {
    return NextResponse.redirect(`${APP_URL}?consent=error`);
  }

  try {
    // Firebase Admin SDK — activate once FIREBASE_SERVICE_ACCOUNT is set in Vercel
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const { getFirestore }                  = await import('firebase-admin/firestore');

    if (!getApps().length) {
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
      });
    }

    const adminDb = getFirestore();

    // Find the exeat by refNo field (not doc ID)
    const snap = await adminDb
      .collection('exeats')
      .where('refNo', '==', ref)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.redirect(`${APP_URL}?consent=not-found`);
    }

    const docRef = snap.docs[0].ref;
    const data   = snap.docs[0].data();

    if (data.parentStatus !== 'pending') {
      return NextResponse.redirect(`${APP_URL}?consent=already-actioned`);
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      await docRef.update({
        parentStatus:    'approved',
        status:          'awaiting-affairs',
        parentActionAt:  now,
      });
    } else {
      await docRef.update({
        parentStatus:   'declined',
        status:         'declined',
        parentActionAt: now,
      });
    }

    return NextResponse.redirect(
      `${APP_URL}?consent=${action === 'approve' ? 'approved' : 'declined'}&ref=${ref}`
    );
  } catch (err) {
    console.error('consent-reply error:', err);
    return NextResponse.redirect(`${APP_URL}?consent=error`);
  }
}