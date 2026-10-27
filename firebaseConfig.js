// Firebase Authentication config
import { initializeApp } from "firebase/app";
import { getAuth, signOut, initializeAuth, getReactNativePersistence, GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, setPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyB2lbL47WUXnUtpB5dgtRJzK4Vm-YT_By8",
  authDomain: "discanalytix.firebaseapp.com",
  projectId: "discanalytix",
  storageBucket: "discanalytix.firebasestorage.app",
  messagingSenderId: "487110888787",
  appId: "1:487110888787:web:48d95f612ebbd7cfd6a5a6",
  measurementId: "G-N7R367KVEL"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

export { auth };

// Login and Logout
export const logout = () => signOut(auth);

// Imposta la persistenza in base alla scelta dell'utente ("ricordami")
export const configurePersistence = async (rememberMe) => {
  if (Platform.OS === 'web') {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  } else {
    // Su mobile: la persistenza è impostata all'avvio con AsyncStorage.
    // Se NON vuole ricordare la sessione, usiamo inMemoryPersistence dopo l'init.
    await setPersistence(auth, rememberMe ? getReactNativePersistence(AsyncStorage) : inMemoryPersistence);
  }
};

export const loginWithCredential = async (idToken, accessToken = null) => {
  // GoogleAuthProvider.credential accetta (idToken, accessToken) - uno dei due può essere null
  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  return await signInWithCredential(auth, credential);
};

export const loginWithEmail = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = async (email, password, name) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await updateProfile(userCredential.user, { displayName: name });
    // Aggiorniamo manualmente Firestore per evitare race condition con onAuthStateChanged
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: name,
      photoURL: userCredential.user.photoURL || '',
      // Ruolo iniziale: player. Editor e modder vengono assegnati da un modder (Admin).
      role: 'player',
      createdAt: new Date(),
    }, { merge: true });
  }
  return userCredential;
};

export const loginAsGuest = async () => {
  return await signInAnonymously(auth);
};