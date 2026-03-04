import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

type ServiceAccountJson = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function getServiceAccountFromEnv(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON eksik.');
  }

  let parsed: Partial<ServiceAccountJson>;
  try {
    parsed = JSON.parse(raw) as Partial<ServiceAccountJson>;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON geçerli bir JSON değil.');
  }

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON içinde project_id, client_email ve private_key zorunlu.');
  }

  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key.replace(/\\n/g, '\n'),
  };
}

function getAdminApp() {
  return getApps()[0]
    ? getApps()[0]
    : initializeApp({
        credential: cert(getServiceAccountFromEnv()),
        projectId: process.env.FIREBASE_PROJECT_ID || undefined,
      });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminMessaging() {
  return getMessaging(getAdminApp());
}
