import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
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
  sessionStorage.clear();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};

// --- TYPES DATABASE COMPLETS ---

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'admin' | 'user';
          payment_status?: string;
          subscription_status?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'admin' | 'user';
          payment_status?: string;
          subscription_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'admin' | 'user';
          payment_status?: string;
          subscription_status?: string;
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
          frequency: string;
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
          frequency?: string;
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
          frequency?: string;
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
          price: string | null; // Supabase returns decimal as string usually, handled in frontend
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
          price?: number | string | null;
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
          price?: number | string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // --- NOUVELLES TABLES AJOUTÉES POUR CORRIGER LE BUILD ---
      expenses: {
        Row: {
          id: string;
          user_id: string;
          description: string;
          amount: number;
          category: string;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          description: string;
          amount: number;
          category: string;
          date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          description?: string;
          amount?: number;
          category?: string;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          action_type: string;
          entity_type: string;
          entity_id: string;
          entity_name: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_type: string;
          entity_type: string;
          entity_id: string;
          entity_name: string;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_type?: string;
          entity_type?: string;
          entity_id?: string;
          entity_name?: string;
          description?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          client_id?: string | null;
          type: string;
          title: string;
          message: string;
          date: string;
          priority: 'high' | 'medium' | 'low';
          completed: boolean;
          completed_at?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id?: string | null;
          type: string;
          title: string;
          message: string;
          date: string;
          priority?: 'high' | 'medium' | 'low';
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string | null;
          type?: string;
          title?: string;
          message?: string;
          date?: string;
          priority?: 'high' | 'medium' | 'low';
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
      };
      passkeys: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          credential_id: string;
          public_key: string;
          counter: number;
          transports: Json;
          created_at: string;
          last_used_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          credential_id: string;
          public_key: string;
          counter: number;
          transports?: Json;
          created_at?: string;
          last_used_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          credential_id?: string;
          public_key?: string;
          counter?: number;
          transports?: Json;
          created_at?: string;
          last_used_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          min_time_between_appointments: number;
          business_hours_start: string;
          business_hours_end: string;
          frequency_options: Json;
          expense_categories: Json;
          notification_days_before: number;
          show_upcoming_appointments: boolean;
          show_frequency_reminders: boolean;
          upcoming_appointments_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          min_time_between_appointments?: number;
          business_hours_start?: string;
          business_hours_end?: string;
          frequency_options?: Json;
          expense_categories?: Json;
          notification_days_before?: number;
          show_upcoming_appointments?: boolean;
          show_frequency_reminders?: boolean;
          upcoming_appointments_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          min_time_between_appointments?: number;
          business_hours_start?: string;
          business_hours_end?: string;
          frequency_options?: Json;
          expense_categories?: Json;
          notification_days_before?: number;
          show_upcoming_appointments?: boolean;
          show_frequency_reminders?: boolean;
          upcoming_appointments_days?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};