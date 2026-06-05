import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { LocalUser, getUser, setUser } from '../lib/storage';
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase';

type AuthContextValue = {
  user: LocalUser | null;
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
  signInGuest: () => Promise<void>;
  signInDeveloper: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function cleanDisplayName(name?: string | null) {
  return name?.trim().replace(/\s+/g, ' ') || '';
}

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
      const displayName = cleanDisplayName(data.user!.user_metadata?.name);
      await persist({
        id: data.user!.id,
        name: displayName || '',
        email,
        isGuest: false,
        isDeveloper: false,
      });
    } else {
      // Offline mode
      await persist({
        id: `local-${Date.now()}`,
        name: '',
        email,
        isGuest: false,
        isDeveloper: false,
      });
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    const displayName = cleanDisplayName(name);
    if (SUPABASE_CONFIGURED && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name: displayName } },
      });
      if (error) throw error;
      await persist({
        id: data.user!.id,
        name: displayName,
        email,
        isGuest: false,
        isDeveloper: false,
      });
    } else {
      await persist({
        id: `local-${Date.now()}`,
        name: displayName,
        email,
        isGuest: false,
        isDeveloper: false,
      });
    }
  };

  const updateProfileName = async (name: string) => {
    if (!user) return;
    const displayName = cleanDisplayName(name);

    if (SUPABASE_CONFIGURED && supabase && !user.isGuest && !user.isDeveloper) {
      const { error } = await supabase.auth.updateUser({
        data: { name: displayName },
      });
      if (error) throw error;
    }

    await persist({ ...user, name: displayName });
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
    <AuthContext.Provider value={{ user, loading, signInEmail, signUp, updateProfileName, signInGuest, signInDeveloper, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
