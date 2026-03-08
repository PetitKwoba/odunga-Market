import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserRole } from './types';
import { mockUsers } from './mock-data';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: { name: string; email: string; password: string; role: UserRole; business_name?: string; country: string; ref?: string }) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('waholo_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    const found = mockUsers.find(u => u.email === email);
    if (!found) {
      // For demo: create a simple user
      return false;
    }
    setUser(found);
    localStorage.setItem('waholo_user', JSON.stringify(found));
    return true;
  }, []);

  const signup = useCallback(async (data: { name: string; email: string; password: string; role: UserRole; business_name?: string; country: string; ref?: string }) => {
    const newUser: User = {
      id: 'u' + Date.now(),
      role: data.role,
      name: data.name,
      business_name: data.business_name || null,
      email: data.email,
      country: data.country,
      referral_code: data.name.replace(/\s/g, '').slice(0, 6).toUpperCase() + Math.floor(Math.random() * 100),
      referred_by_user_id: data.ref ? (mockUsers.find(u => u.referral_code === data.ref)?.id || null) : null,
      referral_credits: 0,
      is_verified: true,
      is_approved: data.role === 'referrer' || data.role === 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setUser(newUser);
    localStorage.setItem('waholo_user', JSON.stringify(newUser));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('waholo_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
