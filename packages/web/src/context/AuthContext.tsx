/**
 * OutreachOS — LinkedIn Management & Automation Platform
 * Copyright (c) 2026 Aryan Suthar. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, modification, or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of the copyright owner.
 *
 * For licensing inquiries: aryanrajendrasuthar@gmail.com
 */

'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('oa_token');
    const storedUser = sessionStorage.getItem('oa_user');
    if (stored && storedUser) {
      setToken(stored);
      setUser(JSON.parse(storedUser) as AuthUser);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    if (!res.success || !res.data) {
      return { error: typeof res.error === 'string' ? res.error : 'Login failed.' };
    }
    const { accessToken, user: authUser } = res.data;
    setToken(accessToken);
    setUser(authUser);
    sessionStorage.setItem('oa_token', accessToken);
    sessionStorage.setItem('oa_user', JSON.stringify(authUser));
    router.push('/dashboard');
    return {};
  }, [router]);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    const res = await api.auth.signup({ email, password, name });
    if (!res.success) {
      return { error: 'Signup failed. Please try again.' };
    }
    return login(email, password);
  }, [login]);

  const logout = useCallback(async () => {
    if (token) await api.auth.logout(token);
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('oa_token');
    sessionStorage.removeItem('oa_user');
    router.push('/login');
  }, [token, router]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
