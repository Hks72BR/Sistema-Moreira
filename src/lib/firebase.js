import { initializeApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

const useEmulators = import.meta.env.DEV && import.meta.env.MODE !== 'offline';
const useLanHttpsEmulators = import.meta.env.MODE === 'lan';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCjUUnaaW2DitQWA3sHHUAubwQxCMBUCco',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'moreira-direcoes.firebaseapp.com',
  projectId: useEmulators ? 'demo-moreira' : import.meta.env.VITE_FIREBASE_PROJECT_ID || 'moreira-direcoes',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '239700417466',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:239700417466:web:7449c74f223e41b68a9b83'
};

const app = initializeApp(firebaseConfig);

const localCache = persistentLocalCache({
  tabManager: persistentMultipleTabManager(),
});

export const db = useLanHttpsEmulators
  ? initializeFirestore(app, {
      host: `${window.location.hostname}:9444`,
      ssl: true,
      localCache,
    })
  : initializeFirestore(app, {
      localCache,
    });
export const auth = getAuth(app);

if (useEmulators) {
  const emulatorHost = window.location.hostname || '127.0.0.1';
  if (useLanHttpsEmulators) {
    connectAuthEmulator(auth, `https://${emulatorHost}:9443`, { disableWarnings: true });
  } else {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8080);
  }
}

// Company ID — fixo por enquanto, multi-tenant futuro
export const COMPANY_ID = 'moreira';

export default app;
