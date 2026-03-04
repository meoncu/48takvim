import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app, db } from '@/lib/firebase';

export type FcmSetupResult = {
  status: 'granted' | 'denied' | 'unsupported' | 'missing-config' | 'error';
  token?: string;
  errorMessage?: string;
};

function getFirebaseConfigForSw() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  };
}

export async function setupFcmForUser(uid: string): Promise<FcmSetupResult> {
  if (typeof window === 'undefined') {
    return { status: 'unsupported' };
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return { status: 'unsupported' };
  }

  const supported = await isSupported();
  if (!supported) {
    return { status: 'unsupported' };
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    return {
      status: 'missing-config',
      errorMessage: 'NEXT_PUBLIC_FIREBASE_VAPID_KEY eksik.',
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { status: 'denied' };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return { status: 'error', errorMessage: 'FCM token üretilemedi.' };
    }

    await setDoc(
      doc(db, 'users', uid, 'fcmTokens', token),
      {
        token,
        platform: 'web',
        userAgent: navigator.userAgent,
        firebaseConfig: getFirebaseConfigForSw(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? '48Takvim Bildirimi';
      const body = payload.notification?.body;
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icons/icon-192.svg',
          badge: '/icons/icon-192.svg',
        });
      }
    });

    return {
      status: 'granted',
      token,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen FCM hatası.';
    return {
      status: 'error',
      errorMessage: message,
    };
  }
}
