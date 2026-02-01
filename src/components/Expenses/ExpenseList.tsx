import { Trash2, Edit2, Calendar as CalendarIcon } from 'lucide-react';
import { Expense } from '../../hooks/useExpenses';
// 1. Import du hook
import { usePreferences } from '../../hooks/usePreferences';

interface ExpenseListProps {
  expenses: Expense[];
  loading: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void; // 🆕 Passe l'expense complet au lieu de l'id
}

// 2. Palette de couleurs pour l'attribution dynamique
const COLOR_PALETTE = [
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-orange-100 text-orange-800',
  'bg-green-100 text-green-800',
  'bg-pink-100 text-pink-800',
  'bg-indigo-100 text-indigo-800',
  'bg-yellow-100 text-yellow-800',
  'bg-teal-100 text-teal-800',
  'bg-red-100 text-red-800',
  'bg-cyan-100 text-cyan-800',
];

export const ExpenseList = ({
  expenses,
  loading,
  onEdit,
  onDelete,
}: ExpenseListProps) => {
  // 3. Récupération des préférences pour avoir les labels
  const { preferences } = usePreferences();

  // Fonction helper pour obtenir les détails d'affichage d'une catégorie
  const getCategoryDisplay = (categoryValue: string) => {
    if (!preferences?.expense_categories) {
      return { label: categoryValue, color: 'bg-gray-100 text-gray-800' };
    }

    // On cherche l'index pour attribuer une couleur et l'objet pour le label
    const index = preferences.expense_categories.findIndex(
      (c) => c.value === categoryValue
    );

    if (index === -1) {
      // Si la catégorie n'existe plus dans les préférences (ex: ancienne donnée)
      return { label: categoryValue, color: 'bg-gray-100 text-gray-800' };
    }

    const category = preferences.expense_categories[index];
    // On boucle sur la palette si on a plus de catégories que de couleurs
    const color = COLOR_PALETTE[index % COLOR_PALETTE.length];

    return { label: category.label, color };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 text-sm">Chargement des dépenses...</p>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <p className="text-gray-500 font-medium">Aucune dépense enregistrée</p>
        <p className="text-xs text-gray-400 mt-1">
          Vos dépenses apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => {
        // Calcul des détails d'affichage pour cet item
        const categoryDisplay = getCategoryDisplay(expense.category);

        return (
          <div
            key={expense.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${categoryDisplay.color}`}
                >
                  {categoryDisplay.label}
                </span>
                <div className="flex items-center text-gray-400 text-xs gap-1">
                  <CalendarIcon size={12} />
                  {new Date(expense.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>

              <h3 className="font-bold text-gray-900 truncate text-base">
                {expense.description}
              </h3>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-50">
              <div className="text-left sm:text-right">
                <p className="text-lg font-black text-gray-900">
                  {Number(expense.amount).toFixed(2)} $
                </p>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(expense)}
                  className="p-2.5 text-blue-600 bg-blue-50 sm:bg-transparent hover:bg-blue-100 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => onDelete(expense)}
                  className="p-2.5 text-red-500 bg-red-50 sm:bg-transparent hover:bg-red-100 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
