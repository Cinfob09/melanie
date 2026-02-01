import React, { useMemo, useState } from 'react';
import { Appointment } from '../../types';
import { Expense } from '../../hooks/useExpenses';
import { ChevronDown } from 'lucide-react';

interface MonthlyAnalysisProps {
  appointments: Appointment[];
  expenses: Expense[];
}

const MonthlyAnalysis: React.FC<MonthlyAnalysisProps> = ({
  appointments,
  expenses,
}) => {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const getMonthKey = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0'
    )}`;
  };

  const getMonthName = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });
  };

  const monthlyStats = useMemo(() => {
    const stats: Record<
      string,
      {
        revenue: number;
        expenses: number;
        appointmentCount: number;
        expenseCount: number;
        netIncome: number;
      }
    > = {};

    // Group appointments by month
    const completedAppointments = appointments.filter(
      (a) => a.status === 'completed' && a.price
    );
    completedAppointments.forEach((appt) => {
      const monthKey = getMonthKey(appt.date);
      if (!stats[monthKey]) {
        stats[monthKey] = {
          revenue: 0,
          expenses: 0,
          appointmentCount: 0,
          expenseCount: 0,
          netIncome: 0,
        };
      }
      stats[monthKey].revenue += appt.price || 0;
      stats[monthKey].appointmentCount += 1;
    });

    // Group expenses by month
    expenses.forEach((expense) => {
      const monthKey = getMonthKey(expense.date);
      if (!stats[monthKey]) {
        stats[monthKey] = {
          revenue: 0,
          expenses: 0,
          appointmentCount: 0,
          expenseCount: 0,
          netIncome: 0,
        };
      }
      stats[monthKey].expenses += expense.amount || 0;
      stats[monthKey].expenseCount += 1;
    });

    // Calculate net income
    Object.keys(stats).forEach((monthKey) => {
      stats[monthKey].netIncome =
        stats[monthKey].revenue - stats[monthKey].expenses;
    });

    return stats;
  }, [appointments, expenses]);

  const quarterlyStats = useMemo(() => {
    const stats: Record<
      string,
      {
        revenue: number;
        expenses: number;
        appointmentCount: number;
        expenseCount: number;
        netIncome: number;
      }
    > = {};

    Object.entries(monthlyStats).forEach(([monthKey, data]) => {
      const [year, month] = monthKey.split('-');
      const quarter = Math.ceil(parseInt(month) / 3);
      const quarterKey = `${year}-Q${quarter}`;

      if (!stats[quarterKey]) {
        stats[quarterKey] = {
          revenue: 0,
          expenses: 0,
          appointmentCount: 0,
          expenseCount: 0,
          netIncome: 0,
        };
      }

      stats[quarterKey].revenue += data.revenue;
      stats[quarterKey].expenses += data.expenses;
      stats[quarterKey].appointmentCount += data.appointmentCount;
      stats[quarterKey].expenseCount += data.expenseCount;
      stats[quarterKey].netIncome += data.netIncome;
    });

    return stats;
  }, [monthlyStats]);

  const sortedMonths = Object.keys(monthlyStats).sort().reverse();
  const sortedQuarters = Object.keys(quarterlyStats).sort().reverse();

  return (
    <div className="space-y-6">
      {/* Quarterly Summary */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Analyse trimestrielle
        </h2>
        <div className="space-y-2">
          {sortedQuarters.map((quarterKey) => {
            const data = quarterlyStats[quarterKey];
            const isPositive = data.netIncome >= 0;

            return (
              <div
                key={quarterKey}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div>
                    <p className="font-semibold text-gray-900">{quarterKey}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Revenus</p>
                    <p className="text-lg font-bold text-green-600">
                      ${data.revenue.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Dépenses</p>
                    <p className="text-lg font-bold text-red-600">
                      ${data.expenses.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Rendez-vous</p>
                    <p className="text-lg font-bold text-blue-600">
                      {data.appointmentCount}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Revenu net</p>
                    <p
                      className={`text-lg font-bold ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      ${data.netIncome.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Detailed View */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Analyse mensuelle détaillée
        </h2>
        <div className="space-y-2">
          {sortedMonths.map((monthKey) => {
            const data = monthlyStats[monthKey];
            const isPositive = data.netIncome >= 0;
            const isExpanded = expandedMonth === monthKey;

            return (
              <div
                key={monthKey}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedMonth(isExpanded ? null : monthKey)}
                  className="w-full p-4 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">
                      {getMonthName(monthKey)}
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-8 flex-1 mr-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Revenus</p>
                      <p className="text-sm font-bold text-green-600">
                        ${data.revenue.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Dépenses</p>
                      <p className="text-sm font-bold text-red-600">
                        ${data.expenses.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Rendez-vous</p>
                      <p className="text-sm font-bold text-blue-600">
                        {data.appointmentCount}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Net</p>
                      <p
                        className={`text-sm font-bold ${
                          isPositive ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        ${data.netIncome.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="bg-gray-50 p-4 border-t border-gray-200 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 font-medium">
                          Revenus bruts
                        </p>
                        <p className="text-lg font-bold text-green-600 mt-1">
                          ${data.revenue.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">
                          Total dépenses
                        </p>
                        <p className="text-lg font-bold text-red-600 mt-1">
                          ${data.expenses.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">
                          Revenu net
                        </p>
                        <p
                          className={`text-lg font-bold mt-1 ${
                            isPositive ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          ${data.netIncome.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">
                          Transactions
                        </p>
                        <p className="text-lg font-bold text-blue-600 mt-1">
                          {data.appointmentCount + data.expenseCount}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-300 text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600">Marge nette:</span>
                        <span className="font-semibold">
                          {data.revenue > 0
                            ? ((data.netIncome / data.revenue) * 100).toFixed(1)
                            : '0'}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ratio dépenses:</span>
                        <span className="font-semibold">
                          {data.revenue > 0
                            ? ((data.expenses / data.revenue) * 100).toFixed(1)
                            : '0'}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {sortedMonths.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Aucune donnée disponible
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyAnalysis;
