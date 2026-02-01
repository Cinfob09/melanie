import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Expense, ExpenseCategory } from '../../hooks/useExpenses';
// 1. Import du hook des préférences
import { usePreferences } from '../../hooks/usePreferences';

interface ExpenseModalProps {
  isOpen: boolean;
  expense?: Expense;
  onClose: () => void;
  onSave: (
    expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => Promise<void>;
  loading: boolean;
}

// 2. Suppression de la constante 'categories' en dur

export const ExpenseModal = ({
  isOpen,
  expense,
  onClose,
  onSave,
  loading,
}: ExpenseModalProps) => {
  // 3. Récupération des préférences
  const { preferences } = usePreferences();

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '' as ExpenseCategory, // Initialisation vide au départ
    date: new Date().toISOString().split('T')[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (expense) {
      // Mode Édition : on utilise les données existantes
      setFormData({
        description: expense.description,
        amount: expense.amount.toString(),
        category: expense.category,
        date: expense.date,
      });
    } else {
      // Mode Création : on réinitialise
      // On essaie de prendre la première catégorie des préférences comme défaut
      const defaultCategory = preferences?.expense_categories?.[0]?.value || '';

      setFormData({
        description: '',
        amount: '',
        category: defaultCategory as ExpenseCategory,
        date: new Date().toISOString().split('T')[0],
      });
    }
    setErrors({});
  }, [expense, isOpen, preferences]); // Ajout de preferences aux dépendances

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Le montant doit être supérieur à 0';
    }

    if (!formData.date) {
      newErrors.date = 'La date est requise';
    }

    if (!formData.category) {
      newErrors.category = 'La catégorie est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    await onSave({
      description: formData.description.trim(),
      amount: parseFloat(formData.amount),
      category: formData.category,
      date: formData.date,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-900">
            {expense ? 'Modifier la dépense' : 'Nouvelle dépense'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 active:scale-90 transition-transform"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Ex: Peinture, Essence..."
              className={`w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-base ${
                errors.description ? 'ring-2 ring-red-500' : ''
              }`}
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1 ml-1 font-medium">
                {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">
                Montant ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                placeholder="0.00"
                className={`w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-lg font-bold ${
                  errors.amount ? 'ring-2 ring-red-500' : ''
                }`}
              />
              {errors.amount && (
                <p className="text-red-500 text-xs mt-1 ml-1 font-medium">
                  {errors.amount}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className={`w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-base ${
                  errors.date ? 'ring-2 ring-red-500' : ''
                }`}
              />
              {errors.date && (
                <p className="text-red-500 text-xs mt-1 ml-1 font-medium">
                  {errors.date}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">
              Catégorie
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as ExpenseCategory,
                })
              }
              className={`w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-base appearance-none ${
                errors.category ? 'ring-2 ring-red-500' : ''
              }`}
            >
              <option value="" disabled>
                Sélectionner une catégorie
              </option>
              {/* 4. Mapping dynamique des catégories depuis les préférences */}
              {preferences?.expense_categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-red-500 text-xs mt-1 ml-1 font-medium">
                {errors.category}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 active:scale-95 transition-transform"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-100 active:scale-95 transition-transform disabled:opacity-50"
            >
              {loading ? 'En cours...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
