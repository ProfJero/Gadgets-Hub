// Creating a minor-admin account from the browser. createUserWithEmailAndPassword
// signs the new user in, so we do it on a throwaway secondary Firebase app to keep
// the current admin signed in.
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile, inMemoryPersistence, setPersistence, connectAuthEmulator } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, firebaseConfig, auth, usingEmulators } from './firebase';

export async function createStaffAccount({ name, email, password, role, permissions, phone = '' }) {
  const secondary = initializeApp(firebaseConfig, `staff-${Date.now()}`);
  try {
    const sAuth = getAuth(secondary);
    if (usingEmulators) connectAuthEmulator(sAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    await setPersistence(sAuth, inMemoryPersistence);
    const cred = await createUserWithEmailAndPassword(sAuth, email.trim(), password);
    await updateProfile(cred.user, { displayName: name });
    await signOut(sAuth);
    await setDoc(doc(db, 'users', cred.user.uid), {
      name, email: email.trim().toLowerCase(), phone, role, permissions,
      addresses: [], wishlist: [], disabled: false,
      createdBy: auth.currentUser?.email || '', createdAt: serverTimestamp(),
    });
    return cred.user.uid;
  } finally {
    await deleteApp(secondary).catch(() => {});
  }
}

export const sendStaffInvite = (email) => sendPasswordResetEmail(auth, email.trim());
