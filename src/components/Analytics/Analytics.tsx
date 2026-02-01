import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Menu,
} from 'lucide-react';
import { useAppointments } from '../../hooks/useAppointments';
import { useExpenses } from '../../hooks/useExpenses';
import RevenueStats from './RevenueStats';
import ExpenseStats from './ExpenseStats';
import TaxCalculator from './TaxCalculator';
import MonthlyAnalysis from './MonthlyAnalysis';

interface AnalyticsProps {
  onMenuToggle: () => void;
}

const Analytics: React.FC<AnalyticsProps> = ({ onMenuToggle }) => {
  const { appointments, loading: appointmentsLoading } = useAppointments();
  const {
    expenses,
    loading: expensesLoading,
    getTotalExpenses,
  } = useExpenses();
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [netIncome, setNetIncome] = useState(0);

  useEffect(() => {
    const completedAppointments = appointments.filter(
      (a) => a.status === 'completed' && a.price
    );
    const revenue = completedAppointments.reduce(
      (sum, a) => sum + (a.price || 0),
      0
    );
    const totalExpenses = getTotalExpenses();

    setTotalRevenue(revenue);
    setNetIncome(revenue - totalExpenses);
  }, [appointments, expenses]);

  const loading = appointmentsLoading || expensesLoading;

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

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
        <h1 className="text-xl font-semibold text-gray-900">Analytiques</h1>
        <div className="w-12"></div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="hidden lg:flex p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3 hidden lg:flex">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Analyse financière
            </h1>
            <p className="text-gray-600 lg:hidden">
              Aperçu de vos revenus et dépenses
            </p>
            <p className="text-gray-600 mt-1 hidden lg:block">
              Aperçu complet de vos revenus, dépenses et analyses fiscales
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Revenus totaux
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                  ${totalRevenue.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Dépenses totales
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                  ${getTotalExpenses().toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Revenu net</p>
                <p
                  className={`text-2xl sm:text-3xl font-bold mt-2 ${
                    netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  ${netIncome.toFixed(2)}
                </p>
              </div>
              <BarChart3
                className="w-8 h-8 opacity-20"
                style={{ color: netIncome >= 0 ? '#16a34a' : '#dc2626' }}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Rendez-vous complétés
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                {appointments.filter((a) => a.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        {/* Main Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <RevenueStats appointments={appointments} />
          </div>
          <div>
            <ExpenseStats
              expenses={expenses}
              getTotalExpenses={getTotalExpenses}
            />
          </div>
        </div>

        {/* Monthly & Quarterly Analysis */}
        <MonthlyAnalysis appointments={appointments} expenses={expenses} />

        {/* Tax Calculator */}
        <TaxCalculator appointments={appointments} expenses={expenses} />

        {/* Tax Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Note sur les taxes du Québec</p>
            <p className="mt-1">
              Les calculs incluent la TPS (5%) et la TVQ (9.975%). Ces montants
              sont à titre informatif seulement. Consultez un comptable pour vos
              obligations fiscales réelles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
