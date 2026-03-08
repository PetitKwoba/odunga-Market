import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserRole } from './types';
import { mockUsers } from './mock-data';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: { name: string; email: string; password: string; role: UserRole; business_name?: string; country: string; ref?: string; documents?: { name: string; file_name: string }[] }) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getAllUsers(): User[] {
  const stored = localStorage.getItem('waholo_all_users');
  if (stored) {
    try { return JSON.parse(stored); } catch { /* ignore */ }
  }
  // Initialize from mock data
  localStorage.setItem('waholo_all_users', JSON.stringify(mockUsers));
  return [...mockUsers];
}

function saveAllUsers(users: User[]) {
  localStorage.setItem('waholo_all_users', JSON.stringify(users));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('waholo_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Re-read from all_users to get latest approval status
        const allUsers = getAllUsers();
        const latest = allUsers.find(u => u.id === parsed.id);
        setUser(latest || parsed);
        if (latest) localStorage.setItem('waholo_user', JSON.stringify(latest));
      } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    const allUsers = getAllUsers();
    const found = allUsers.find(u => u.email === email);
    if (!found) return false;
    setUser(found);
    localStorage.setItem('waholo_user', JSON.stringify(found));
    return true;
  }, []);

  const signup = useCallback(async (data: { name: string; email: string; password: string; role: UserRole; business_name?: string; country: string; ref?: string; documents?: { name: string; file_name: string }[] }) => {
    const allUsers = getAllUsers();

    // Find referrer from all users
    const referrer = data.ref ? allUsers.find(u => u.referral_code === data.ref) : null;

    const newUser: User = {
      id: 'u' + Date.now(),
      role: data.role,
      name: data.name,
      business_name: data.business_name || null,
      email: data.email,
      country: data.country,
      referral_code: data.name.replace(/\s/g, '').slice(0, 6).toUpperCase() + Math.floor(Math.random() * 100),
      referred_by_user_id: referrer?.id || null,
      referral_credits: 0,
      is_verified: true,
      is_approved: data.role === 'referrer' || data.role === 'admin',
      documents: (data.documents || []).map((d, i) => ({
        id: 'doc' + Date.now() + i,
        name: d.name,
        file_name: d.file_name,
        uploaded_at: new Date().toISOString(),
        status: 'pending' as const,
      })),
      document_requests: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add to shared users list
    allUsers.push(newUser);
    saveAllUsers(allUsers);

    // Only auto-login if approved (referrers), otherwise just save
    if (newUser.is_approved) {
      setUser(newUser);
      localStorage.setItem('waholo_user', JSON.stringify(newUser));
    }
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
