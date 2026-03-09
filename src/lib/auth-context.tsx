import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'producer' | 'wholesaler' | 'referrer' | 'admin';

export interface AppUser {
  id: string;
  role: UserRole;
  name: string;
  business_name: string | null;
  email: string;
  country: string;
  referral_code: string;
  referred_by_user_id: string | null;
  referral_credits: number;
  is_verified: boolean;
  is_approved: boolean;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  bio: string | null;
  website: string | null;
  tax_id: string | null;
  registration_number: string | null;
  industry: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_routing_number: string | null;
  payout_method: string | null;
  preferred_currency: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    business_name?: string;
    country: string;
    ref?: string;
  }) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchProfile(userId: string): Promise<AppUser | null> {
  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile) return null;

  // Fetch role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  return {
    id: profile.user_id,
    role: (roleData?.role as UserRole) || 'wholesaler',
    name: profile.name,
    business_name: profile.business_name,
    email: profile.email,
    country: profile.country,
    referral_code: profile.referral_code,
    referred_by_user_id: profile.referred_by_user_id,
    referral_credits: profile.referral_credits,
    is_verified: profile.is_verified,
    is_approved: profile.is_approved,
    avatar_url: profile.avatar_url,
    phone: profile.phone,
    address: profile.address,
    city: profile.city,
    bio: profile.bio,
    website: profile.website,
    tax_id: profile.tax_id,
    registration_number: profile.registration_number,
    industry: profile.industry,
    bank_name: profile.bank_name,
    bank_account_number: profile.bank_account_number,
    bank_routing_number: profile.bank_routing_number,
    payout_method: profile.payout_method,
    preferred_currency: profile.preferred_currency || 'USD',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set up auth listener BEFORE getSession
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // Use setTimeout to avoid Supabase deadlock
        setTimeout(async () => {
          const profile = await fetchProfile(newSession.user.id);
          setUser(profile);
          setIsLoading(false);
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession?.user) {
        fetchProfile(existingSession.user.id).then(profile => {
          setUser(profile);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signup = useCallback(async (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    business_name?: string;
    country: string;
    ref?: string;
  }) => {
    // Look up referrer by code
    let referredByUserId: string | undefined;
    if (data.ref) {
      const { data: refProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('referral_code', data.ref)
        .single();
      referredByUserId = refProfile?.user_id;
    }

    const { error, data: signupData } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          name: data.name,
          role: data.role,
          business_name: data.business_name || null,
          country: data.country,
          referred_by_user_id: referredByUserId || null,
        },
      },
    });

    if (error) return { error: error.message };

    // Check if email confirmation is required
    const needsConfirmation = signupData.user && !signupData.session;
    return { needsConfirmation: !!needsConfirmation };
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple') => {
    try {
      const { lovable } = await import('@/integrations/lovable/index');
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) return { error: result.error.message || 'OAuth sign-in failed' };
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'OAuth sign-in failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  // Track user activity: update last_seen_at and log access
  useEffect(() => {
    if (!session?.user) return;
    const uid = session.user.id;

    // Update last_seen_at
    supabase.from('profiles').update({ last_seen_at: new Date().toISOString() } as any).eq('user_id', uid).then(() => {});

    // Insert access log
    supabase.from('access_logs' as any).insert({
      user_id: uid,
      event_type: 'session_start',
      user_agent: navigator.userAgent,
      path: window.location.pathname,
    }).then(() => {});
  }, [session?.user?.id]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      setUser(profile);
    }
  }, [session]);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, login, signup, signInWithOAuth, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
