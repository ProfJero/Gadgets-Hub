import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  connectFirestoreEmulator,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyBV7H5veAT45YNyWx_S_nlkAmgMwhYv4tc',
  authDomain: 'gadgets-hub-c4fac.firebaseapp.com',
  projectId: 'gadgets-hub-c4fac',
  storageBucket: 'gadgets-hub-c4fac.firebasestorage.app',
  messagingSenderId: '616270215500',
  appId: '1:616270215500:web:7da166d4179c94b624f7e9',
  measurementId: 'G-5CF85N0S0B',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Offline-first cache: pages load instantly on repeat visits and keep working on
// patchy mobile data. Falls back to memory cache where IndexedDB is unavailable.
let cache;
try {
  cache = persistentLocalCache({ tabManager: persistentMultipleTabManager() });
} catch {
  cache = memoryLocalCache();
}
export const db = initializeFirestore(app, { localCache: cache });

// Local development against the Firebase Emulator Suite: VITE_USE_EMULATORS=1 npm run dev
export const usingEmulators = import.meta.env.VITE_USE_EMULATORS === '1';
if (usingEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

// Analytics is optional and loaded lazily so it never blocks first paint.
if (typeof window !== 'undefined' && !usingEmulators) {
  import('firebase/analytics')
    .then(async ({ getAnalytics, isSupported }) => {
      if (await isSupported()) getAnalytics(app);
    })
    .catch(() => {});
}
