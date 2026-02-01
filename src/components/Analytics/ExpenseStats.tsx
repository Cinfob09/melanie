import React from 'react';
import { Expense } from '../../hooks/useExpenses';

interface ExpenseStatsProps {
  expenses: Expense[];
  getTotalExpenses: () => number;
}

const categoryLabels: Record<string, string> = {
  supplies: 'Fournitures',
  equipment: 'Équipement',
  transportation: 'Transport',
  utilities: 'Services',
  services: 'Prestataires',
  other: 'Autre',
};

const categoryColors: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  supplies: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
  },
  equipment: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-600',
  },
  transportation: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-600',
  },
  utilities: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-600',
  },
  services: {
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-600',
  },
  other: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' },
};

const ExpenseStats: React.FC<ExpenseStatsProps> = ({
  expenses,
  getTotalExpenses,
}) => {
  const getExpensesByCategory = () => {
    const byCategory: Record<string, number> = {};
    expenses.forEach((exp) => {
      byCategory[exp.category] =
        (byCategory[exp.category] || 0) + (exp.amount || 0);
    });
    return byCategory;
  };

  const expensesByCategory = getExpensesByCategory();

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Dépenses par catégorie
      </h2>

      <div className="space-y-2">
        <div className="p-4 bg-red-50 rounded-lg border border-red-200 mb-4">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            ${getTotalExpenses().toFixed(2)}
          </p>
        </div>

        {Object.entries(expensesByCategory)
          .filter(([, amount]) => amount > 0)
          .sort(([, a], [, b]) => b - a)
          .map(([category, amount]) => {
            const colors = categoryColors[category] || categoryColors.other;
            const percentage = (amount / getTotalExpenses()) * 100;

            return (
              <div
                key={category}
                className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <p className={`text-sm font-medium ${colors.text}`}>
                    {categoryLabels[category] || category}
                  </p>
                  <p className={`text-sm font-bold ${colors.text}`}>
                    ${amount.toFixed(2)}
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${colors.text.replace(
                      'text-',
                      'bg-'
                    )}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default ExpenseStats;
