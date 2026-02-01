import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type ExpenseCategory =
  | 'supplies'
  | 'equipment'
  | 'transportation'
  | 'utilities'
  | 'services'
  | 'other';

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  created_at: string;
  updated_at: string;
}

interface UseExpensesReturn {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  addExpense: (
    expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => Promise<boolean>;
  updateExpense: (
    id: string,
    updates: Partial<
      Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    >
  ) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<boolean>;
  getTotalExpenses: (category?: ExpenseCategory) => number;
  getExpensesByCategory: () => Record<ExpenseCategory, number>;
}

export const useExpenses = (): UseExpensesReturn => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setExpenses([]);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (queryError) {
        setError(queryError.message);
      } else {
        setExpenses(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        loadExpenses();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const addExpense = async (
    expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<boolean> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { error: insertError } = await supabase
        .from('expenses')
        .insert([{ ...expense, user_id: user.id }]);

      if (insertError) {
        setError(insertError.message);
        return false;
      }

      await loadExpenses();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding expense');
      return false;
    }
  };

  const updateExpense = async (
    id: string,
    updates: Partial<
      Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    >
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return false;
      }

      await loadExpenses();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating expense');
      return false;
    }
  };

  const deleteExpense = async (id: string): Promise<boolean> => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('Non authentifié');
        return false;
      }

      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // 🆕 MISE À JOUR OPTIMISTE
      setExpenses((prev) => prev.filter((exp) => exp.id !== id));

      setError(null);
      return true;
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError('Erreur lors de la suppression de la dépense');
      return false;
    }
  };

  const getTotalExpenses = (category?: ExpenseCategory): number => {
    return expenses
      .filter((exp) => !category || exp.category === category)
      .reduce((sum, exp) => sum + Number(exp.amount), 0);
  };

  const getExpensesByCategory = (): Record<ExpenseCategory, number> => {
    const categories: Record<ExpenseCategory, number> = {
      supplies: 0,
      equipment: 0,
      transportation: 0,
      utilities: 0,
      services: 0,
      other: 0,
    };

    expenses.forEach((exp) => {
      categories[exp.category] += Number(exp.amount);
    });

    return categories;
  };

  return {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    getTotalExpenses,
    getExpensesByCategory,
  };
};
