import React, { useMemo, useState } from 'react';
import { Appointment } from '../../types';
import { Expense } from '../../hooks/useExpenses';
import { Calendar, TrendingDown, TrendingUp } from 'lucide-react';

interface TaxCalculatorProps {
  appointments: Appointment[];
  expenses: Expense[];
}

type ViewMode = 'combined' | 'revenues' | 'expenses';
type PeriodMode = 'monthly' | 'quarterly';

const TaxCalculator: React.FC<TaxCalculatorProps> = ({
  appointments,
  expenses,
}) => {
  const TAX_TPS = 0.05; // 5%
  const TAX_TVQ = 0.09975; // 9.975%
  // Facteur de division pour extraire les taxes d'un montant TTC (1 + 0.05 + 0.09975)
  const TOTAL_RATE = 1 + TAX_TPS + TAX_TVQ; 

  const [viewMode, setViewMode] = useState<ViewMode>('combined');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');

  const getCurrentPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const quarter = Math.ceil(month / 3);

    return { year, month, quarter };
  };

  const filterByPeriod = (dateStr: string) => {
    const date = new Date(dateStr);
    const { year, month, quarter } = getCurrentPeriod();

    if (periodMode === 'monthly') {
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    } else {
      const itemQuarter = Math.ceil((date.getMonth() + 1) / 3);
      return date.getFullYear() === year && itemQuarter === quarter;
    }
  };

  const calculations = useMemo(() => {
    // Vérification de sécurité
    if (!appointments || !expenses) {
      return {
        revenue: { beforeTax: 0, tps: 0, tvq: 0, total: 0 },
        expenses: { beforeTax: 0, tps: 0, tvq: 0, total: 0 },
        net: { tps: 0, tvq: 0, total: 0 },
      };
    }

    // 1. Filtrer les données pour la période
    const periodAppointments = appointments.filter(
      (apt) =>
        apt.status === 'completed' && apt.price && filterByPeriod(apt.date)
    );

    const periodExpenses = expenses.filter((exp) => filterByPeriod(exp.date));

    // 2. REVENUS (Logique : Prix de base + Taxes ajoutées)
    // On assume que le prix du RDV est le prix de base (avant taxes)
    const revenueBeforeTax = periodAppointments.reduce(
      (sum, apt) => sum + (apt.price || 0),
      0
    );
    const revenueTPS = revenueBeforeTax * TAX_TPS;
    const revenueTVQ = revenueBeforeTax * TAX_TVQ;
    const revenueTaxesTotal = revenueTPS + revenueTVQ;

    // 3. DÉPENSES (Logique : Prix Total -> Extraction des taxes)
    // On assume que le montant de la dépense saisie est le montant final payé (TTC)
    const expensesTotalTTC = periodExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );

    // Extraction des montants (règle de trois inverse)
    const expensesBeforeTax = expensesTotalTTC / TOTAL_RATE;
    const expensesTPS = expensesBeforeTax * TAX_TPS;
    const expensesTVQ = expensesBeforeTax * TAX_TVQ;
    const expensesTaxesTotal = expensesTPS + expensesTVQ;

    // 4. CALCUL NET (Ce qu'on doit payer ou recevoir)
    // Taxes collectées (Revenus) - Taxes payées (Dépenses/Crédits)
    const netTPS = revenueTPS - expensesTPS;
    const netTVQ = revenueTVQ - expensesTVQ;
    const netTotal = netTPS + netTVQ;

    return {
      revenue: {
        beforeTax: revenueBeforeTax,
        tps: revenueTPS,
        tvq: revenueTVQ,
        total: revenueTaxesTotal,
      },
      expenses: {
        beforeTax: expensesBeforeTax,
        tps: expensesTPS,
        tvq: expensesTVQ,
        total: expensesTaxesTotal, // C'est le total des taxes récupérables
      },
      net: {
        tps: netTPS,
        tvq: netTVQ,
        total: netTotal,
      },
    };
  }, [appointments, expenses, periodMode]);

  const { year, month, quarter } = getCurrentPeriod();
  const periodLabel =
    periodMode === 'monthly'
      ? `${new Date(year, month - 1).toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric',
        })}`
      : `T${quarter} ${year}`;

  const isOwing = calculations.net.total > 0;

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900">
          Calcul des taxes (Québec)
        </h2>

        <div className="flex gap-2">
          {/* Period Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setPeriodMode('monthly')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                periodMode === 'monthly'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mois
            </button>
            <button
              onClick={() => setPeriodMode('quarterly')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                periodMode === 'quarterly'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Trimestre
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('combined')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'combined'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Net
            </button>
            <button
              onClick={() => setViewMode('revenues')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'revenues'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Revenus
            </button>
            <button
              onClick={() => setViewMode('expenses')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'expenses'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dépenses
            </button>
          </div>
        </div>
      </div>

      {/* Period Label */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Calendar className="w-4 h-4" />
        <span>Période: {periodLabel}</span>
      </div>

      {/* Combined View - Net Amount */}
      {viewMode === 'combined' && (
        <div className="space-y-4">
          <div
            className={`p-6 rounded-lg border-2 ${
              isOwing
                ? 'bg-red-50 border-red-200'
                : 'bg-green-50 border-green-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  {isOwing
                    ? 'À remettre au gouvernement'
                    : 'Crédit à récupérer'}
                </p>
                <p
                  className={`text-4xl font-bold mt-2 ${
                    isOwing ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  ${Math.abs(calculations.net.total).toFixed(2)}
                </p>
              </div>
              {isOwing ? (
                <TrendingUp className="w-12 h-12 text-red-600 opacity-20" />
              ) : (
                <TrendingDown className="w-12 h-12 text-green-600 opacity-20" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 font-medium">TPS nette</p>
              <p
                className={`text-2xl font-bold mt-2 ${
                  calculations.net.tps > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {calculations.net.tps > 0 ? '-' : '+'}$
                {Math.abs(calculations.net.tps).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Collecté: ${calculations.revenue.tps.toFixed(2)} | Payé: $
                {calculations.expenses.tps.toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600 font-medium">TVQ nette</p>
              <p
                className={`text-2xl font-bold mt-2 ${
                  calculations.net.tvq > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {calculations.net.tvq > 0 ? '-' : '+'}$
                {Math.abs(calculations.net.tvq).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Collecté: ${calculations.revenue.tvq.toFixed(2)} | Payé: $
                {calculations.expenses.tvq.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Résumé</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Taxes collectées (revenus):</span>
                <span className="font-medium text-red-600">
                  +${calculations.revenue.total.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Taxes payées (dépenses):</span>
                <span className="font-medium text-green-600">
                  -${calculations.expenses.total.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex justify-between font-bold">
                <span>{isOwing ? 'À remettre:' : 'À récupérer:'}</span>
                <span className={isOwing ? 'text-red-600' : 'text-green-600'}>
                  ${Math.abs(calculations.net.total).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue View */}
      {viewMode === 'revenues' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg border border-red-200">
            <p className="text-sm text-gray-600 mb-2">Revenus (avant taxes)</p>
            <p className="text-3xl font-bold text-gray-900">
              ${calculations.revenue.beforeTax.toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 font-medium">
                TPS collectée (5%)
              </p>
              <p className="text-xl font-bold text-blue-600 mt-2">
                ${calculations.revenue.tps.toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600 font-medium">
                TVQ collectée (9.975%)
              </p>
              <p className="text-xl font-bold text-purple-600 mt-2">
                ${calculations.revenue.tvq.toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-gray-600 font-medium">
                Total à remettre
              </p>
              <p className="text-xl font-bold text-red-600 mt-2">
                ${calculations.revenue.total.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Ces taxes ont été collectées sur vos
              rendez-vous et doivent être remises au gouvernement.
            </p>
          </div>
        </div>
      )}

      {/* Expenses View */}
      {viewMode === 'expenses' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
            <p className="text-sm text-gray-600 mb-2">Dépenses (avant taxes)</p>
            <p className="text-3xl font-bold text-gray-900">
              ${calculations.expenses.beforeTax.toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 font-medium">
                TPS payée (5%)
              </p>
              <p className="text-xl font-bold text-blue-600 mt-2">
                ${calculations.expenses.tps.toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600 font-medium">
                TVQ payée (9.975%)
              </p>
              <p className="text-xl font-bold text-purple-600 mt-2">
                ${calculations.expenses.tvq.toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 font-medium">
                Total récupérable
              </p>
              <p className="text-xl font-bold text-green-600 mt-2">
                ${calculations.expenses.total.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Les taxes ont été extraites du montant total de vos dépenses (TTC) pour calculer les crédits récupérables.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxCalculator;