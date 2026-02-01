import { useState } from 'react';
import { Plus, Menu, Search, AlertTriangle, X } from 'lucide-react';
import { useExpenses, Expense, ExpenseCategory } from '../../hooks/useExpenses';
import { usePreferences } from '../../hooks/usePreferences';
import { ShowToastFunction } from '../../types/toast';
import { ExpenseList } from './ExpenseList';
import { ExpenseModal } from './ExpenseModal';

interface ExpensesProps {
  onMenuToggle: () => void;
  showToast: ShowToastFunction; // 🆕 AJOUTE CECI
}

export const Expenses = ({ onMenuToggle, showToast }: ExpensesProps) => {
  const {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    getTotalExpenses,
    getExpensesByCategory,
  } = useExpenses();

  const { preferences } = usePreferences();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null); // 🆕
  const [selectedCategory, setSelectedCategory] =
    useState<ExpenseCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const getCategoryLabel = (categoryValue: string) => {
    const category = preferences?.expense_categories.find(
      (c) => c.value === categoryValue
    );
    return category ? category.label : categoryValue || 'Autre';
  };

  const filteredExpenses = expenses.filter((exp) => {
    const matchesCategory =
      !selectedCategory || exp.category === selectedCategory;
    const matchesSearch = exp.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const expensesByCategory = getExpensesByCategory();

  const handleOpenModal = (expense?: Expense) => {
    setSelectedExpense(expense);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedExpense(undefined);
  };

  const handleSave = async (
    expenseData: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    setIsSaving(true);
    try {
      if (selectedExpense) {
        const success = await updateExpense(selectedExpense.id, expenseData);
        if (success) {
          showToast(
            'success',
            `Dépense "${expenseData.description}" modifiée ! 🎉`
          );
          handleCloseModal();
        } else {
          showToast('error', 'Erreur lors de la modification de la dépense');
        }
      } else {
        const success = await addExpense(expenseData);
        if (success) {
          showToast(
            'success',
            `Dépense "${expenseData.description}" ajoutée ! ✨`
          );
          handleCloseModal();
        } else {
          showToast('error', "Erreur lors de l'ajout de la dépense");
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (expense: Expense) => {
    setDeletingExpense(expense);
  };

  const confirmDelete = async () => {
    if (deletingExpense) {
      const success = await deleteExpense(deletingExpense.id);
      if (success) {
        showToast(
          'warning',
          `Dépense "${deletingExpense.description}" supprimée 🗑️`,
          3500
        );
        setDeletingExpense(null);
      } else {
        showToast('error', 'Erreur lors de la suppression de la dépense');
      }
    }
  };

  const cancelDelete = () => {
    setDeletingExpense(null);
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-30">
        <button
          onClick={onMenuToggle}
          className="p-3 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Dépenses</h1>
        <div className="w-12"></div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuToggle}
              className="hidden lg:flex p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 hidden lg:block">
                Dépenses
              </h1>
              <p className="text-gray-600 lg:hidden">
                Gérez vos dépenses professionnelles
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors w-full sm:w-auto justify-center touch-manipulation font-medium"
          >
            <Plus className="w-4 h-4" />
            Ajouter une dépense
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher des dépenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <p className="text-sm text-gray-600 font-medium">
              Dépenses totales
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              ${getTotalExpenses().toFixed(2)}
            </p>
          </div>

          {Object.entries(expensesByCategory).map(
            ([category, amount]) =>
              amount > 0 && (
                <button
                  key={category}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === (category as ExpenseCategory)
                        ? null
                        : (category as ExpenseCategory)
                    )
                  }
                  className={`bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow text-left ${
                    selectedCategory === category ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <p className="text-sm text-gray-600 font-medium">
                    {getCategoryLabel(category)}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                    ${Number(amount).toFixed(2)}
                  </p>
                </button>
              )
          )}
        </div>

        {/* Expense List Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedCategory
                ? `${getCategoryLabel(selectedCategory)} (${
                    filteredExpenses.length
                  })`
                : `Toutes les dépenses (${filteredExpenses.length})`}
            </h2>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Toutes
              </button>
            )}
          </div>

          <ExpenseList
            expenses={filteredExpenses}
            loading={loading}
            onEdit={handleOpenModal}
            onDelete={handleDeleteClick} // 🆕 Passe handleDeleteClick au lieu de handleDelete
          />
        </div>

        {filteredExpenses.length === 0 && !loading && (
          <div className="text-center py-8 sm:py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune dépense trouvée
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? "Essayez d'ajuster vos termes de recherche"
                : 'Commencez par ajouter votre première dépense'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation font-medium"
              >
                <Plus className="w-4 h-4" />
                Ajouter une dépense
              </button>
            )}
          </div>
        )}
      </div>

      <ExpenseModal
        isOpen={isModalOpen}
        expense={selectedExpense}
        onClose={handleCloseModal}
        onSave={handleSave}
        loading={isSaving}
      />

      {/* Delete Confirmation Modal avec Liquid Glass */}
      {deletingExpense && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div
            className="relative w-full max-w-md"
            style={{ animation: 'scaleIn 0.3s ease-out forwards' }}
          >
            {/* Background gradient rouge */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-rose-600 to-pink-700 opacity-95 rounded-3xl" />

            {/* Glassmorphism layer */}
            <div className="absolute inset-0 backdrop-blur-xl bg-white/10 rounded-3xl" />

            {/* Bulles décoratives */}
            <div
              className="absolute -top-10 -left-10 w-40 h-40 bg-red-400/30 rounded-full blur-3xl animate-pulse"
              style={{ animationDuration: '3s' }}
            />
            <div
              className="absolute -bottom-10 -right-10 w-32 h-32 bg-pink-400/30 rounded-full blur-2xl animate-pulse"
              style={{ animationDuration: '4s', animationDelay: '1s' }}
            />

            {/* Content */}
            <div className="relative p-8">
              {/* Close button */}
              <button
                onClick={cancelDelete}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/15 backdrop-blur-md hover:bg-white/25 transition-all duration-300 border border-white/30 hover:scale-110 group"
              >
                <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/30 rounded-full blur-xl" />
                  <div className="relative w-20 h-20 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border-2 border-white/40 shadow-2xl">
                    <AlertTriangle className="w-10 h-10 text-white drop-shadow-2xl animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-white text-center mb-3 drop-shadow-lg">
                Supprimer la dépense ?
              </h3>

              {/* Message */}
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 mb-6 border border-white/30 shadow-xl">
                <p className="text-white/95 text-center leading-relaxed drop-shadow-md">
                  Voulez-vous vraiment supprimer la dépense{' '}
                  <span className="font-bold text-white">
                    "{deletingExpense.description}"
                  </span>{' '}
                  d'un montant de{' '}
                  <span className="font-semibold">
                    ${deletingExpense.amount.toFixed(2)}
                  </span>
                  ?
                </p>
                <p className="text-white/80 text-sm text-center mt-2 drop-shadow">
                  Cette action est irréversible.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-6 py-4 bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white font-semibold rounded-xl transition-all duration-300 border border-white/40 hover:scale-105 shadow-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-4 bg-white/90 hover:bg-white text-red-600 font-bold rounded-xl transition-all duration-300 border border-white shadow-2xl hover:scale-105 hover:shadow-red-500/50"
                >
                  Supprimer
                </button>
              </div>
            </div>

            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              
              @keyframes scaleIn {
                from {
                  transform: scale(0.9);
                  opacity: 0;
                }
                to {
                  transform: scale(1);
                  opacity: 1;
                }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
};
