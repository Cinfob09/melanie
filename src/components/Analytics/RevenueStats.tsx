import React, { useMemo } from 'react';
import { Appointment } from '../../types';

interface RevenueStatsProps {
  appointments: Appointment[];
}

const RevenueStats: React.FC<RevenueStatsProps> = ({ appointments }) => {
  const stats = useMemo(() => {
    const completed = appointments.filter(
      (a) => a.status === 'completed' && a.price
    );
    const total = completed.reduce((sum, a) => sum + (a.price || 0), 0);
    const average = completed.length > 0 ? total / completed.length : 0;

    return {
      totalCompleted: total,
      averagePrice: average,
      completedCount: completed.length,
    };
  }, [appointments]);

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Revenus</h2>

      <div className="space-y-4">
        <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-200">
          <div>
            <p className="text-sm text-gray-600">Revenus complétés</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              ${stats.totalCompleted.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.completedCount} rendez-vous
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <p className="text-sm text-gray-600">Prix moyen par rendez-vous</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              ${stats.averagePrice.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueStats;
