/**
 * Firebase Configuration - Centralized config for all pages
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where, 
  limit, 
  orderBy,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  updateCurrentUser
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { 
  getAnalytics, 
  logEvent, 
  setCurrentScreen,
  setUserId
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBV7H5veAT45YNyWx_S_nlkAmgMwhYv4tc",
  authDomain: "gadgets-hub-c4fac.firebaseapp.com",
  projectId: "gadgets-hub-c4fac",
  storageBucket: "gadgets-hub-c4fac.firebasestorage.app",
  messagingSenderId: "616270215500",
  appId: "1:616270215500:web:7da166d4179c94b624f7e9",
  measurementId: "G-5CF85N0S0B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// Export all Firebase services
export {
  app,
  db,
  collection,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  updateCurrentUser,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  analytics,
  logEvent,
  setCurrentScreen,
  setUserId
};