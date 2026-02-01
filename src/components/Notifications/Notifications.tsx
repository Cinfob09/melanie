import React, { useState, useEffect } from 'react';
import {
  Bell,
  Calendar,
  AlertCircle,
  Check,
  Menu,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle,
  X,
  Clock,
} from 'lucide-react';
import { Appointment, Client } from '../../types';
import { ShowToastFunction } from '../../types/toast';
import { supabase } from '../../lib/supabase';
import { usePreferences } from '../../hooks/usePreferences';

interface NotificationsProps {
  appointments: Appointment[];
  clients: Client[];
  onAddAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<boolean>;
  showToast: ShowToastFunction;
  onMenuToggle: () => void;
}

interface Notification {
  id: string;
  type: 'upcoming_appointment' | 'missing_appointment' | 'frequency_reminder';
  title: string;
  message: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  completed_at?: string;
  client_id?: string;
  client_name?: string;
}

const Notifications: React.FC<NotificationsProps> = ({
  appointments,
  clients,
  onAddAppointment,
  showToast,
  onMenuToggle,
}) => {
  const { preferences } = usePreferences();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [deletingNotification, setDeletingNotification] =
    useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger les notifications au démarrage
  useEffect(() => {
    loadNotifications();
    cleanupExpiredNotifications();
  }, []);

  // Générer les notifications basées sur les préférences
  useEffect(() => {
    if (preferences && clients.length > 0) {
      generateSmartNotifications();
    }
  }, [appointments, clients, preferences]);

  const loadNotifications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error loading notifications:', error);
      setLoading(false);
      return;
    }

    if (data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  // Supprimer les notifications cochées depuis plus de 2 jours
  const cleanupExpiredNotifications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('completed', true)
      .lt('completed_at', twoDaysAgo.toISOString());

    loadNotifications();
  };

  const generateSmartNotifications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 1. Notifications pour rendez-vous à venir (selon préférences)
    if (preferences?.show_upcoming_appointments) {
      const daysAhead = preferences.upcoming_appointments_days || 1;
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const upcomingAppointments = appointments.filter(
        (apt) =>
          apt.date >= todayStr &&
          apt.date <= futureDateStr &&
          apt.status === 'scheduled'
      );

      if (upcomingAppointments.length > 0) {
        const title =
          daysAhead === 1
            ? "Rendez-vous aujourd'hui"
            : `Rendez-vous dans ${daysAhead} jours`;

        // Vérifier si la notification existe déjà
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'upcoming_appointment')
          .gte('date', todayStr)
          .maybeSingle();

        if (!existing) {
          await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'upcoming_appointment',
            title,
            message: `Vous avez ${upcomingAppointments.length} rendez-vous prévu(s)`,
            date: new Date().toISOString(),
            priority: daysAhead === 1 ? 'high' : 'medium',
            completed: false,
          });
        }
      }
    }

    // 2. Notifications pour clients sans rendez-vous selon leur fréquence
    if (preferences?.show_frequency_reminders) {
      for (const client of clients) {
        const lastAppointment = appointments
          .filter((apt) => apt.clientId === client.id)
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0];

        if (!lastAppointment) {
          // Client n'a jamais eu de rendez-vous
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'missing_appointment')
            .eq('client_id', client.id)
            .gte('date', todayStr)
            .maybeSingle();

          if (!existing) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'missing_appointment',
              title: 'Aucun rendez-vous planifié',
              message: `${client.name} n'a jamais eu de rendez-vous`,
              date: new Date().toISOString(),
              priority: 'medium',
              completed: false,
              client_id: client.id,
              client_name: client.name,
            });
          }
        } else {
          // Vérifier si le délai de fréquence est dépassé
          const lastDate = new Date(lastAppointment.date);
          const daysSinceLastAppointment = Math.floor(
            (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          let frequencyDays = 0;

          // Calculer les jours de fréquence selon le type
          if (client.frequency === 'custom') {
            frequencyDays = client.customFrequencyDays || 30;
          } else {
            const freqOption = preferences.frequency_options.find(
              (opt) => opt.value === client.frequency
            );
            frequencyDays = freqOption?.days || 30;
          }

          // Si le délai est dépassé
          if (daysSinceLastAppointment > frequencyDays) {
            const { data: existing } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', user.id)
              .eq('type', 'frequency_reminder')
              .eq('client_id', client.id)
              .gte('date', todayStr)
              .maybeSingle();

            if (!existing) {
              await supabase.from('notifications').insert({
                user_id: user.id,
                type: 'frequency_reminder',
                title: 'Rappel de fréquence',
                message: `${client.name} : dernier rendez-vous il y a ${daysSinceLastAppointment} jours (fréquence : ${frequencyDays} jours)`,
                date: new Date().toISOString(),
                priority: 'low',
                completed: false,
                client_id: client.id,
                client_name: client.name,
              });
            }
          }
        }
      }
    }

    loadNotifications();
  };

  const handleToggleComplete = async (notification: Notification) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const newCompletedState = !notification.completed;

    const { error } = await supabase
      .from('notifications')
      .update({
        completed: newCompletedState,
        completed_at: newCompletedState ? new Date().toISOString() : null,
      })
      .eq('id', notification.id)
      .eq('user_id', user.id);

    if (error) {
      showToast('error', 'Erreur lors de la mise à jour');
      return;
    }

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id
          ? {
              ...n,
              completed: newCompletedState,
              completed_at: newCompletedState
                ? new Date().toISOString()
                : undefined,
            }
          : n
      )
    );

    showToast(
      'success',
      newCompletedState ? 'Notification archivée ✓' : 'Notification restaurée',
      2000
    );
  };

  const handleDeleteClick = (notification: Notification) => {
    setDeletingNotification(notification);
  };

  const confirmDelete = async () => {
    if (!deletingNotification) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', deletingNotification.id)
      .eq('user_id', user.id);

    if (error) {
      showToast('error', 'Erreur lors de la suppression');
      return;
    }

    setNotifications((prev) =>
      prev.filter((n) => n.id !== deletingNotification.id)
    );
    showToast('warning', 'Notification supprimée 🗑️', 3000);
    setDeletingNotification(null);
  };

  const cancelDelete = () => {
    setDeletingNotification(null);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'upcoming_appointment':
        return <Calendar className="w-5 h-5" />;
      case 'missing_appointment':
        return <AlertCircle className="w-5 h-5" />;
      case 'frequency_reminder':
        return <Clock className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const activeNotifications = notifications.filter((n) => !n.completed);
  const archivedNotifications = notifications.filter((n) => n.completed);

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
        <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 hidden lg:block">
              Notifications
            </h1>
            <p className="text-gray-600 mt-1">
              {activeNotifications.length} notification(s) active(s)
            </p>
          </div>
        </div>

        {/* Active Notifications */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Notifications actives
          </h2>

          {loading ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Chargement...</p>
            </div>
          ) : activeNotifications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <div className="text-gray-400 mb-4">
                <Bell className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune notification
              </h3>
              <p className="text-gray-600">Vous êtes à jour ! 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white rounded-lg shadow-md border p-4 ${getPriorityColor(
                    notification.priority
                  )}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-white/50 rounded-lg">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-700 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(notification.date).toLocaleDateString(
                            'fr-FR',
                            {
                              day: 'numeric',
                              month: 'long',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleComplete(notification)}
                        className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                        title="Archiver"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(notification)}
                        className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Archived Notifications */}
        {archivedNotifications.length > 0 && (
          <div className="space-y-4">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center justify-between w-full p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-700">
                  Notifications archivées ({archivedNotifications.length})
                </h2>
                <span className="text-xs text-gray-500">
                  (suppression auto après 2 jours)
                </span>
              </div>
              {showArchived ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {showArchived && (
              <div className="space-y-3">
                {archivedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-4 opacity-60"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-white rounded-lg">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-700 mb-1 line-through">
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400">
                            Archivée le{' '}
                            {notification.completed_at &&
                              new Date(
                                notification.completed_at
                              ).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleComplete(notification)}
                          className="p-2 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                          title="Restaurer"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(notification)}
                          className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingNotification && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className="relative w-full max-w-md"
            style={{ animation: 'scaleIn 0.3s ease-out' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-rose-600 to-pink-700 opacity-95 rounded-3xl" />
            <div className="absolute inset-0 backdrop-blur-xl bg-white/10 rounded-3xl" />

            <div
              className="absolute -top-10 -left-10 w-40 h-40 bg-red-400/30 rounded-full blur-3xl animate-pulse"
              style={{ animationDuration: '3s' }}
            />
            <div
              className="absolute -bottom-10 -right-10 w-32 h-32 bg-pink-400/30 rounded-full blur-2xl animate-pulse"
              style={{ animationDuration: '4s', animationDelay: '1s' }}
            />

            <div className="relative p-8">
              <button
                onClick={cancelDelete}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/15 backdrop-blur-md hover:bg-white/25 transition-all duration-300 border border-white/30 hover:scale-110 group"
              >
                <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
              </button>

              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/30 rounded-full blur-xl" />
                  <div className="relative w-20 h-20 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border-2 border-white/40 shadow-2xl">
                    <AlertTriangle className="w-10 h-10 text-white drop-shadow-2xl animate-pulse" />
                  </div>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-white text-center mb-3 drop-shadow-lg">
                Supprimer la notification ?
              </h3>

              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 mb-6 border border-white/30 shadow-xl">
                <p className="text-white/95 text-center leading-relaxed drop-shadow-md">
                  Voulez-vous vraiment supprimer{' '}
                  <span className="font-bold text-white">
                    "{deletingNotification.title}"
                  </span>{' '}
                  ?
                </p>
                <p className="text-white/80 text-sm text-center mt-2 drop-shadow">
                  Cette action est irréversible.
                </p>
              </div>

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
              @keyframes scaleIn {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
