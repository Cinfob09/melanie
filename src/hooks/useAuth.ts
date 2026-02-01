import { useState, useEffect } from 'react';
import { supabase, signInWithPassword, signOut, signUp } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  payment_status: 'active' | 'inactive' | 'suspended' | 'unpaid' | 'overdue';
}

interface UseAuthReturn {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<boolean>;
  loading: boolean;
}

// ✅ Mapping ultra-rapide - fallback immédiat si pas de profil
// ✅ Version sans AbortController (plus compatible)
const mapSupabaseUser = async (user: User): Promise<AuthUser> => {
  const fallback: AuthUser = {
    id: user.id,
    email: user.email || '',
    full_name:
      user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    role:
      user.email === 'admin@cinfob.com' || user.email === 'Admin@cinfob.com'
        ? 'admin'
        : 'user',
    payment_status: 'inactive',
  };

  try {
    // Promesse avec timeout manuel
    const profilePromise = supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 2000)
    );

    const { data: profile } = (await Promise.race([
      profilePromise,
      timeoutPromise,
    ])) as any;

    if (profile) {
      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name || fallback.full_name,
        role: profile.role,
        payment_status: profile.payment_status || 'inactive',
      };
    }

    return fallback;
  } catch (err) {
    console.warn(err);
    return fallback;
  }
};

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Init ultra-rapide - pas de timeout, juste fallback
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          if (session?.user) {
            const mappedUser = await mapSupabaseUser(session.user);
            setUser(mappedUser);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    // ✅ Auth listener - mapping rapide
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        const mappedUser = await mapSupabaseUser(session.user);
        setUser(mappedUser);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        setLoading(false);
      } else if (session?.user) {
        const mappedUser = await mapSupabaseUser(session.user);
        setUser(mappedUser);
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ✅ Login rapide - ne pas attendre le profil complet
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await signInWithPassword(email, password);

      if (error || !data.user) {
        return false;
      }

      // ✅ Connexion immédiate avec fallback
      const mappedUser = await mapSupabaseUser(data.user);
      setUser(mappedUser);
      setLoading(false);

      return true;
    } catch (err) {
      console.error('Login failed:', err);
      setLoading(false);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await signOut();
      setUser(null);
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<boolean> => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) {
        setLoading(false);
        return false;
      }

      return true;
    } catch (error) {
      setLoading(false);
      return false;
    }
  };

  return {
    user,
    login,
    logout,
    register,
    loading,
  };
};
