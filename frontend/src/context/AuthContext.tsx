import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getToken, setToken as persistToken } from '../api/client';

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface MeResponse {
  email: string;
  role: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  email: string | null;
  role: string | null;
  // True from the moment a token exists until /api/auth/me resolves. Role-aware
  // UI (nav filtering, route guards) should treat this as "don't decide yet" —
  // otherwise a demo user would flash the full nav for a frame on load.
  isRoleLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState<boolean>(() => !!getToken());

  useEffect(() => {
    const onUnauthorized = () => setTokenState(null);
    window.addEventListener('ccaas:unauthorized', onUnauthorized);
    return () => window.removeEventListener('ccaas:unauthorized', onUnauthorized);
  }, []);

  // Role is authoritative from the server, not decoded from the (unverified)
  // JWT client-side — a promotion/demotion by an admin should reflect after
  // this refetches, not stay stuck at whatever the token said at login time.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setEmail(null);
      setRole(null);
      setIsRoleLoading(false);
      return;
    }
    setIsRoleLoading(true);
    api
      .get<MeResponse>('/api/auth/me')
      .then((me) => {
        if (cancelled) return;
        setEmail(me.email);
        setRole(me.role);
      })
      .catch(() => {
        if (cancelled) return;
        setEmail(null);
        setRole(null);
      })
      .finally(() => {
        if (!cancelled) setIsRoleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const applyToken = useCallback((next: string) => {
    persistToken(next);
    setTokenState(next);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.postForm<TokenResponse>('/api/auth/login', { username: email, password });
      applyToken(res.access_token);
    },
    [applyToken],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<TokenResponse>('/api/auth/register', { email, password }, undefined);
      applyToken(res.access_token);
    },
    [applyToken],
  );

  const logout = useCallback(() => {
    persistToken(null);
    setTokenState(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: !!token, email, role, isRoleLoading, login, register, logout }),
    [token, email, role, isRoleLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
