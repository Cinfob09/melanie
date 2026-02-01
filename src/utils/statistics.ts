import { Appointment } from '../types';

export interface DashboardStats {
  totalClients: number;
  todayAppointments: number;
  weekAppointments: number;
  totalRevenue: number;
  clientsChange: number;
  appointmentsChange: number;
  weekChange: number;
  revenueChange: number;
}

export const calculateDashboardStats = (
  clientsCount: number,
  todayAppointments: number,
  thisWeekAppointments: number,
  appointments: Appointment[]
): DashboardStats => {
  const completedAppointments = appointments.filter(apt => apt.status === 'completed');
  const totalRevenue = completedAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);

  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

  const lastMonthAppointments = completedAppointments.filter(apt => {
    const aptDate = new Date(apt.date);
    return aptDate >= lastMonth && aptDate <= today;
  });

  const lastMonthRevenue = lastMonthAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const previousMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, lastMonth.getDate());
  const previousMonthAppointments = completedAppointments.filter(apt => {
    const aptDate = new Date(apt.date);
    return aptDate >= previousMonthStart && aptDate < lastMonth;
  });

  const appointmentsChange = calculateChange(
    lastMonthAppointments.length,
    previousMonthAppointments.length
  );

  const previousMonthRevenue = previousMonthAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
  const revenueChange = calculateChange(lastMonthRevenue, previousMonthRevenue);

  const lastMonthClients = appointments.filter(apt => {
    const aptDate = new Date(apt.date);
    return aptDate >= lastMonth && aptDate <= today;
  }).length;

  const previousMonthClients = appointments.filter(apt => {
    const aptDate = new Date(apt.date);
    return aptDate >= previousMonthStart && aptDate < lastMonth;
  }).length;

  const clientsChange = calculateChange(lastMonthClients, previousMonthClients);
  const weekChange = calculateChange(thisWeekAppointments, Math.ceil(thisWeekAppointments * 0.8));

  return {
    totalClients: clientsCount,
    todayAppointments,
    weekAppointments: thisWeekAppointments,
    totalRevenue,
    clientsChange: clientsChange > 0 ? clientsChange : Math.abs(clientsChange),
    appointmentsChange: appointmentsChange > 0 ? appointmentsChange : Math.abs(appointmentsChange),
    weekChange: weekChange > 0 ? weekChange : Math.abs(weekChange),
    revenueChange: revenueChange > 0 ? revenueChange : Math.abs(revenueChange),
  };
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};
