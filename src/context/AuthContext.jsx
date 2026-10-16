import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile, GoogleAuthProvider, signInWithPopup,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { ensureUserDoc, subscribeUser, wishlistAdd, wishlistRemove } from '../lib/api';
import { ROLES } from '../lib/constants';
import { useGuestWishlist, toast } from '../store';

const AuthCtx = createContext(null);

const friendly = (e) => {
  const code = e?.code || '';
  const map = {
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/email-already-in-use': 'An account already exists with this email. Try signing in.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network problem. Check your data or Wi-Fi and try again.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  };
  return map[code] || e?.message || 'Something went wrong.';
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading
  const [profile, setProfile] = useState(null);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    if (!u) setProfile(null);
  }), []);

  useEffect(() => {
    if (!user) return undefined;
    let first = true;
    const unsub = subscribeUser(user.uid, async (p) => {
      if (!p && first) {
        first = false;
        // First sign-in (e.g. Google): create the customer profile, carrying over the guest wishlist.
        try {
          await ensureUserDoc(user, { wishlist: useGuestWishlist.getState().ids });
          useGuestWishlist.getState().clear();
        } catch {
          setProfile({ id: user.uid, role: 'customer', email: user.email, name: user.displayName || '', wishlist: [], addresses: [] });
        }
        return;
      }
      first = false;
      setProfile(p);
    });
    return unsub;
  }, [user]);

  const value = useMemo(() => {
    const role = profile?.role || 'customer';
    const disabled = profile?.disabled === true;
    const isStaff = !disabled && ['superadmin', 'admin', 'manager', 'staff'].includes(role);
    const perms = role === 'superadmin' ? ROLES.superadmin.perms : profile?.permissions || [];
    return {
      user,
      profile,
      loading: user === undefined || (user && !profile),
      role,
      isStaff,
      isOwner: role === 'superadmin',
      can: (p) => isStaff && perms.includes(p),
      perms,
      async login(email, password) {
        try { await signInWithEmailAndPassword(auth, email.trim(), password); } catch (e) { throw new Error(friendly(e)); }
      },
      async register({ name, email, phone, password }) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
          await updateProfile(cred.user, { displayName: name });
          await ensureUserDoc(cred.user, { name, phone, wishlist: useGuestWishlist.getState().ids });
          useGuestWishlist.getState().clear();
        } catch (e) { throw new Error(friendly(e)); }
      },
      async loginGoogle() {
        try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { throw new Error(friendly(e)); }
      },
      async resetPassword(email) {
        try { await sendPasswordResetEmail(auth, email.trim()); } catch (e) { throw new Error(friendly(e)); }
      },
      logout: () => signOut(auth),
      async toggleWishlist(id) {
        if (!user) {
          useGuestWishlist.getState().toggle(id);
          const on = useGuestWishlist.getState().ids.includes(id);
          toast(on ? 'Saved to wishlist' : 'Removed from wishlist', on ? 'success' : 'info');
          return;
        }
        const on = profile?.wishlist?.includes(id);
        await (on ? wishlistRemove(user.uid, id) : wishlistAdd(user.uid, id));
        toast(on ? 'Removed from wishlist' : 'Saved to wishlist', on ? 'info' : 'success');
      },
    };
  }, [user, profile]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

/** Wishlist ids for the current visitor (account or guest). */
export const useWishlistIds = () => {
  const { user, profile } = useAuth();
  const guest = useGuestWishlist((s) => s.ids);
  return user ? profile?.wishlist || [] : guest;
};
