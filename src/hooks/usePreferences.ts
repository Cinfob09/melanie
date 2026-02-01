import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface FrequencyOption {
  value: string;
  label: string;
  days: number;
}

export interface ExpenseCategory {
  value: string;
  label: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  min_time_between_appointments: number;
  business_hours_start: string;
  business_hours_end: string;
  frequency_options: FrequencyOption[];
  expense_categories: ExpenseCategory[];
  notification_days_before: number;
  created_at: string;
  updated_at: string;
}

export const usePreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les paramètres
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error: fetchError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setPreferences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  // Créer les paramètres par défaut
  const createDefaultPreferences = async (): Promise<boolean> => {
    try {
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const defaultSettings = {
        user_id: user.id,
        min_time_between_appointments: 90,
        business_hours_start: '08:00:00',
        business_hours_end: '18:00:00',
        frequency_options: [
          { value: 'weekly', label: 'Hebdomadaire', days: 7 },
          { value: 'biweekly', label: 'Bi-hebdomadaire', days: 14 },
          { value: 'monthly', label: 'Mensuel', days: 30 },
          { value: 'quarterly', label: 'Trimestriel', days: 90 },
          { value: 'custom', label: 'Personnalisé', days: 0 },
        ],
        expense_categories: [
          { value: 'supplies', label: 'Fournitures' },
          { value: 'equipment', label: 'Équipement' },
          { value: 'transportation', label: 'Transport' },
          { value: 'utilities', label: 'Services' },
          { value: 'services', label: 'Prestataires' },
          { value: 'other', label: 'Autre' },
        ],
        notification_days_before: 7,
      };

      const { data, error: insertError } = await supabase
        .from('user_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (insertError) throw insertError;

      setPreferences(data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de création');
      return false;
    }
  };

  // Mettre à jour les paramètres
  const updatePreferences = async (
    updates: Partial<
      Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    >
  ): Promise<boolean> => {
    try {
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error: updateError } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setPreferences(data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
      return false;
    }
  };

  // Vérifier si les paramètres existent
  const preferencesExist = async (): Promise<boolean> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error: fetchError } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      return !!data;
    } catch (err) {
      console.error('Erreur de vérification:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    preferences,
    loading,
    error,
    fetchPreferences: fetchSettings,
    createDefaultPreferences,
    updatePreferences,
    preferencesExist,
  };
};
