import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, TrendingUp, Menu, DollarSign } from 'lucide-react';
import { Appointment, Client } from '../../types';
import AppointmentCard from '../Calendar/AppointmentCard';
import { useActivityLogs } from '../../hooks/useActivityLogs';
import { useExpenses } from '../../hooks/useExpenses';
import { calculateDashboardStats, formatCurrency } from '../../utils/statistics';

interface DashboardProps {
  appointments: Appointment[];
  clients: Client[];
  onMenuToggle: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ appointments, clients, onMenuToggle }) => {
  const { activities } = useActivityLogs();
  const { getTotalExpenses } = useExpenses();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const todayAppointments = appointments.filter(apt => apt.date === todayStr);
  const upcomingAppointments = appointments.filter(apt => apt.date > todayStr).slice(0, 5);
  const thisWeekAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return aptDate >= weekStart && aptDate <= weekEnd;
  });

  const getClientById = (clientId: string) => {
    return clients.find(client => client.id === clientId);
  };

  const stats = calculateDashboardStats(
    clients.length,
    todayAppointments.length,
    thisWeekAppointments.length,
    appointments
  );

  const totalExpenses = getTotalExpenses();
  const netProfit = stats.totalRevenue - totalExpenses;

  const statCards = [
    {
      title: 'Total des clients',
      value: stats.totalClients,
      icon: Users,
      color: 'bg-blue-500',
      change: `${stats.clientsChange > 0 ? '+' : '-'}${Math.abs(stats.clientsChange)}%`,
    },
    {
      title: 'Rendez-vous d\'aujourd\'hui',
      value: stats.todayAppointments,
      icon: Calendar,
      color: 'bg-green-500',
      change: `${stats.appointmentsChange > 0 ? '+' : '-'}${Math.abs(stats.appointmentsChange)}%`,
    },
    {
      title: 'Cette semaine',
      value: stats.weekAppointments,
      icon: Clock,
      color: 'bg-cyan-500',
      change: `${stats.weekChange > 0 ? '+' : '-'}${Math.abs(stats.weekChange)}%`,
    },
    {
      title: 'Revenus',
      value: formatCurrency(stats.totalRevenue),
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: `${stats.revenueChange > 0 ? '+' : '-'}${Math.abs(stats.revenueChange)}%`,
    },
    {
      title: 'Profit net',
      value: formatCurrency(netProfit),
      icon: DollarSign,
      color: netProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500',
      change: netProfit >= 0 ? '+' : '-',
    },
  ];

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
        <h1 className="text-xl font-semibold text-gray-900">Tableau de bord</h1>
        <div className="w-12"></div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4">
              <button
                onClick={onMenuToggle}
                className="hidden lg:flex p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Tableau de bord</h1>
                <p className="text-gray-600 mt-1">Bon retour ! Voici ce qui se passe aujourd'hui.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>{stat.change}</span>
                <span className="text-sm text-gray-600 ml-1">par rapport au mois dernier</span>
              </div>
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Appointments */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Rendez-vous d'aujourd'hui</h2>
            {todayAppointments.length > 0 ? (
              <div className="space-y-3">
                {todayAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    client={getClientById(appointment.clientId)}
                    showNavigation={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Aucun rendez-vous prévu pour aujourd'hui</p>
              </div>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Prochains rendez-vous</h2>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    client={getClientById(appointment.clientId)}
                    showNavigation={false}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Aucun rendez-vous à venir</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Activité récente</h2>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => {
                const getActivityColor = (actionType: string) => {
                  if (actionType.includes('added')) return { bg: 'bg-blue-50', dot: 'bg-blue-500' };
                  if (actionType.includes('completed')) return { bg: 'bg-green-50', dot: 'bg-green-500' };
                  if (actionType.includes('deleted')) return { bg: 'bg-red-50', dot: 'bg-red-500' };
                  return { bg: 'bg-yellow-50', dot: 'bg-yellow-500' };
                };

                const colors = getActivityColor(activity.actionType);
                const timeAgo = getTimeAgo(new Date(activity.createdAt));

                return (
                  <div key={activity.id} className={`flex items-center gap-4 p-4 ${colors.bg} rounded-lg`}>
                    <div className={`w-3 h-3 ${colors.dot} rounded-full flex-shrink-0`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{activity.description}</p>
                      <span className="text-xs text-gray-500">{timeAgo}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Aucune activité récente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'À l\'instant';
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} minute${Math.floor(seconds / 60) > 1 ? 's' : ''}`;
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} heure${Math.floor(seconds / 3600) > 1 ? 's' : ''}`;
  if (seconds < 604800) return `Il y a ${Math.floor(seconds / 86400)} jour${Math.floor(seconds / 86400) > 1 ? 's' : ''}`;
  return `Il y a ${Math.floor(seconds / 604800)} semaine${Math.floor(seconds / 604800) > 1 ? 's' : ''}`;
};

export default Dashboard;