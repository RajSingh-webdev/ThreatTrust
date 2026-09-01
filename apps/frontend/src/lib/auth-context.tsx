'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Organization, User } from './types';
import { ORGANIZATIONS, USERS } from './mock-data';
import { api } from './api';

const DEFAULT_PASSWORDS: Record<string, string> = {
  'user-banka-admin':    'banka_admin_pass',
  'user-banka-analyst':  'banka_analyst_pass',
  'user-bankb-analyst':  'bankb_analyst_pass',
  'user-bankb-reviewer': 'bankb_reviewer_pass',
  'user-certc-analyst':  'certc_analyst_pass',
  'user-certc-reviewer': 'certc_reviewer_pass',
};

interface AuthState {
  org: Organization | null;
  user: User | null;
  token?: string | null;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (orgId: string, userId: string, token?: string) => void;
  logout: () => void;
  switchOrg: (orgId: string, userId: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'threattrust_auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    org: null,
    user: null,
    token: null,
    isAuthenticated: false,
  });

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { orgId, userId, token } = JSON.parse(stored);
        const org = ORGANIZATIONS[orgId];
        const user = USERS[userId];
        if (org && user) {
          setState({ org, user, token, isAuthenticated: true });
        }
        if (token) {
          api.auth.me().then((res) => {
            if (res.user && res.organization) {
              setState((prev) => ({
                ...prev,
                org: { ...(prev.org || org), ...res.organization },
                user: { ...(prev.user || user), ...res.user },
              }));
            }
          }).catch(() => {});
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback((orgId: string, userId: string, token?: string) => {
    const org = ORGANIZATIONS[orgId];
    const user = USERS[userId];
    if (!org || !user) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ orgId, userId, token }));
    setState({ org, user, token: token || null, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ org: null, user: null, token: null, isAuthenticated: false });
  }, []);

  const switchOrg = useCallback(async (orgId: string, userId: string) => {
    const org = ORGANIZATIONS[orgId];
    const user = USERS[userId];
    const password = DEFAULT_PASSWORDS[userId];
    const username = user?.username;

    if (username && password) {
      try {
        const authRes = await api.auth.login(username, password);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ orgId, userId, token: authRes.token }));
        setState({
          org: { ...(org || {}), ...authRes.organization } as Organization,
          user: { ...(user || {}), ...authRes.user } as User,
          token: authRes.token,
          isAuthenticated: true,
        });
        return;
      } catch (err) {
        console.warn('Backend login on switchOrg failed, falling back to local state:', err);
      }
    }

    login(orgId, userId);
  }, [login]);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await api.auth.me();
      if (res.user && res.organization) {
        setState((prev) => ({
          ...prev,
          org: { ...(prev.org || {}), ...res.organization } as Organization,
          user: { ...(prev.user || {}), ...res.user } as User,
        }));
      }
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, switchOrg, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
