"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  User,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

type AuthState = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const auth = getFirebaseAuth();
      if (!auth) {
        console.warn("[firebase] Auth não inicializado; pulando listener.");
        setLoading(false);
        return;
      }
      await setPersistence(auth, browserLocalPersistence);
      return onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      });
    }
    const unsubPromise = init();
    return () => {
      // init may return void if Firebase is unavailable.
      if (!unsubPromise) return;
      void Promise.resolve(unsubPromise).then((unsub) => {
        if (typeof unsub === "function") unsub();
      });
    };
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
