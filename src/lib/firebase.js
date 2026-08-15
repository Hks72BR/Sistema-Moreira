import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Fallback com valores padrão (substituídos durante build do Vite)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCjUUnaaW2DitQWA3sHHUAubwQxCMBUCco',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'sistema-moreira.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sistema-moreira',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'sistema-moreira.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '239700417466',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:239700417466:web:7449c74f223e41b68a9b83'
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Company ID — fixo por enquanto, multi-tenant futuro
export const COMPANY_ID = 'moreira';

// Ativar persistência offline (Firestore cache local automático)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Offline persistence falhou: múltiplas abas abertas');
  } else if (err.code === 'unimplemented') {
    console.warn('Offline persistence não suportada neste navegador');
  }
});

export default app;
