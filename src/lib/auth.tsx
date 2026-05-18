import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { LocalUser, getUser, setUser } from '../lib/storage';
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase';

type AuthContextValue = {
  user: LocalUser | null;
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInGuest: () => Promise<void>;
  signInDeveloper: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setLocalUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await getUser();
      if (stored) setLocalUser(stored);
      setLoading(false);
    })();
  }, []);

  const persist = async (u: LocalUser | null) => {
    setLocalUser(u);
    await setUser(u);
  };

  const signInEmail = async (email: string, password: string) => {
    if (SUPABASE_CONFIGURED && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await persist({
        id: data.user!.id,
        name: data.user!.user_metadata?.name || email.split('@')[0],
        email,
        isGuest: false,
        isDeveloper: false,
      });
    } else {
      // Offline mode
      await persist({
        id: `local-${Date.now()}`,
        name: email.split('@')[0],
        email,
        isGuest: false,
        isDeveloper: false,
      });
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    if (SUPABASE_CONFIGURED && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name } },
      });
      if (error) throw error;
      await persist({
        id: data.user!.id,
        name,
        email,
        isGuest: false,
        isDeveloper: false,
      });
    } else {
      await persist({
        id: `local-${Date.now()}`,
        name: name || email.split('@')[0],
        email,
        isGuest: false,
        isDeveloper: false,
      });
    }
  };

  const signInGuest = async () => {
    await persist({ id: 'guest', name: 'Guest', isGuest: true, isDeveloper: false });
  };

  const signInDeveloper = async () => {
    await persist({ id: 'dev', name: 'Developer', isGuest: false, isDeveloper: true });
  };

  const signOut = async () => {
    if (SUPABASE_CONFIGURED && supabase && user && !user.isGuest && !user.isDeveloper) {
      await supabase.auth.signOut();
    }
    await persist(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInEmail, signUp, signInGuest, signInDeveloper, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
