import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';

// Ruoli disponibili:
// 'viewer'  → ospiti / nuovi utenti (solo lettura)
// 'player'  → utenti registrati normali (possono essere taggati)
// 'editor'  → gestori del canale / video (massimo 2, impostati manualmente)

// Livelli gerarchici: modder > editor > player > viewer
const ROLE_LEVELS = { viewer: 0, player: 1, editor: 2, modder: 3 };

export function hasPermission(userRole, requiredRole) {
  return (ROLE_LEVELS[userRole] ?? 0) >= (ROLE_LEVELS[requiredRole] ?? 0);
}

export default function useUserRole() {
  const [role, setRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setRole('viewer');
        setLoadingRole(false);
        return;
      }

      if (user.isAnonymous) {
        setRole('viewer');
        setLoadingRole(false);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      
      // Monitora il documento in tempo reale
      const unsubscribeDoc = onSnapshot(userRef, async (snap) => {
        if (snap.exists()) {
          setRole(snap.data().role || 'player');
          setLoadingRole(false);
        } else {
          // Se il documento non esiste:
          // 1. Se è un login Google, lo creiamo noi (nessun altro lo farà)
          // 2. Se è un login email, aspettiamo che registerWithEmail lo crei
          const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
          
          if (isGoogle) {
            try {
              await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                role: 'player',
                createdAt: new Date(),
              });
            } catch (err) {
              console.error('❌ Errore creazione utente Google:', err);
              setRole('player');
              setLoadingRole(false);
            }
          } else {
            // Per email/password, aspettiamo il setDoc di registerWithEmail
            // Se dopo 5 secondi non esiste ancora, lo creiamo come fallback
            setTimeout(async () => {
              const freshSnap = await getDoc(userRef);
              if (!freshSnap.exists()) {
                setRole('player');
                setLoadingRole(false);
              }
            }, 5000);
          }
        }
      }, (err) => {
        console.error('❌ Firestore errore ruolo:', err);
        setRole('player');
        setLoadingRole(false);
      });

      return () => unsubscribeDoc();
    });

    return unsubscribeAuth;
  }, []);

  return { role, loadingRole };
}
