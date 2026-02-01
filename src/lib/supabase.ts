import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
console.log("URL détectée par Vite:", supabaseUrl); // Doit afficher ton URL supabase.co

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// ✅ Configuration CORRIGÉE avec persistance de session
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // ✅ Active la persistance
    autoRefreshToken: true,       // ✅ Rafraîchit automatiquement le token
    detectSessionInUrl: true,     // ✅ Détecte les sessions dans l'URL
    storage: localStorage,        // ✅ Utilise localStorage
    storageKey: 'supabase.auth.token', // Clé de stockage personnalisée (optionnel)
  },
});

// Authentication functions
export const signInWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: email === 'admin@company.com' ? 'Admin User' : 'User',
      },
    },
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  
  // Nettoyer UNIQUEMENT le cache applicatif, pas tout le localStorage
  sessionStorage.clear();
  
  return { error };
};

export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
};

export const getSession = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  return { session, error };
};

// Helper function to create admin user
export const createUserWithEmailAndPassword = async (
  email: string,
  password: string
) => {
  return await signUp(email, password);
};

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'admin' | 'user';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'admin' | 'user';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'admin' | 'user';
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          address: string;
          contact_person_name: string;
          contact_person_phone: string;
          frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';
          custom_frequency_days: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone: string;
          address: string;
          contact_person_name: string;
          contact_person_phone: string;
          frequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';
          custom_frequency_days?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string;
          address?: string;
          contact_person_name?: string;
          contact_person_phone?: string;
          frequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';
          custom_frequency_days?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          service_id: string | null;
          date: string;
          time: string;
          duration: number;
          status: 'scheduled' | 'completed' | 'cancelled';
          notes: string | null;
          price: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          service_id?: string | null;
          date: string;
          time: string;
          duration?: number;
          status?: 'scheduled' | 'completed' | 'cancelled';
          notes?: string | null;
          price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string;
          service_id?: string | null;
          date?: string;
          time?: string;
          duration?: number;
          status?: 'scheduled' | 'completed' | 'cancelled';
          notes?: string | null;
          price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};