import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, type User } from './api';

const STORAGE_KEY = 'event-booking.session';

interface Session {
  user: User;
  token: string;
}

interface AuthValue {
  user: User | null;
  token: string | null;
  signIn: (session: Session) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode); the session then lasts for this tab only.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession);

  const signIn = useCallback((s: Session) => {
    saveSession(s);
    setSession(s);
  }, []);

  const signOut = useCallback(() => {
    saveSession(null);
    setSession(null);
  }, []);

  // Tokens expire (1h on the demo); drop a stale session instead of failing later.
  useEffect(() => {
    if (!session) return;
    api.me(session.token).catch((err) => {
      if (err instanceof ApiError && err.status === 401) signOut();
    });
    // Checked once, on first load.
  }, []);

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, token: session?.token ?? null, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
