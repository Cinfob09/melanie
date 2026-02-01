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
  X,
  Clock,
  Phone,
  User,
  Loader2
} from 'lucide-react';
import { Appointment, Client, Service } from '../../types';
import { ShowToastFunction } from '../../types/toast';
import { supabase } from '../../lib/supabase';
import AppointmentModal from '../Calendar/AppointmentModal';

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
  // --- ÉTATS ---
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  
  // États pour les Modals
  const [services, setServices] = useState<Service[]>([]);
  const [deletingNotification, setDeletingNotification] = useState<Notification | null>(null);
  
  // État pour la réservation (Booking)
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [clientForBooking, setClientForBooking] = useState<Client | undefined>(undefined);
  const [bookingNotificationId, setBookingNotificationId] = useState<string | null>(null);
  
  // État pour l'appel (Calling)
  const [clientForCall, setClientForCall] = useState<Client | null>(null);

  // --- CHARGEMENT ---
  useEffect(() => {
    let mounted = true;

    const initData = async () => {
      setLoading(true);
      
      // 1. Services
      const { data: servicesData } = await supabase.from('services').select('*');
      if (mounted && servicesData) setServices(servicesData);

      // 2. Notifications
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Nettoyage silencieux des vieilles notifs (>3h)
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
        await supabase
          .from('notifications')
          .delete()
          .eq('user_id', user.id)
          .eq('completed', true)
          .lt('completed_at', threeHoursAgo);

        // Chargement des notifs
        const { data: notifsData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });
          
        if (mounted && notifsData) setNotifications(notifsData);
      }
      
      if (mounted) setLoading(false);
    };

    initData();

    return () => { mounted = false; };
  }, []);

  // --- ACTIONS ---

  const handleToggleComplete = async (notificationId: string, currentStatus: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newCompletedState = !currentStatus;

    // Mise à jour optimiste
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? {
              ...n,
              completed: newCompletedState,
              completed_at: newCompletedState ? new Date().toISOString() : undefined,
            }
          : n
      )
    );

    // Mise à jour DB
    await supabase
      .from('notifications')
      .update({
        completed: newCompletedState,
        completed_at: newCompletedState ? new Date().toISOString() : null,
      })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (newCompletedState) {
      showToast('success', 'Notification traitée (suppression dans 3h)', 2000);
    }
  };

  const confirmDelete = async () => {
    if (!deletingNotification) return;
    
    setNotifications((prev) => prev.filter((n) => n.id !== deletingNotification.id));
    setDeletingNotification(null);
    showToast('warning', 'Notification supprimée', 2000);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', deletingNotification.id);

    if (error) console.error("Erreur suppression", error);
  };

  // --- ACTIONS BOUTONS ---

  const handleOpenCall = (clientId?: string) => {
    if (!clientId) return;
    const client = clients.find(c => c.id === clientId);
    if (client) setClientForCall(client);
  };

  const handleOpenBooking = (clientId?: string, notificationId?: string) => {
    if (!clientId) return;
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setClientForBooking(client);
      setBookingNotificationId(notificationId || null);
      setShowBookingModal(true);
    }
  };

  const handleSaveAppointment = async (appointmentData: Omit<Appointment, 'id'>) => {
    const success = await onAddAppointment(appointmentData);
    if (success) {
      showToast('success', 'Rendez-vous créé ! 📅');
      setShowBookingModal(false);
      setClientForBooking(undefined);
      
      // Fermeture auto de la notif liée
      if (bookingNotificationId) {
        handleToggleComplete(bookingNotificationId, false);
        setBookingNotificationId(null);
      }
    } else {
      showToast('error', 'Erreur lors de la création');
    }
  };

  // --- UI HELPERS ---

  const getIcon = (type: string) => {
    switch (type) {
      case 'upcoming_appointment': return <Calendar className="w-5 h-5" />;
      case 'missing_appointment': return <AlertCircle className="w-5 h-5" />;
      case 'frequency_reminder': return <Clock className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-100 text-red-900';
      case 'medium': return 'bg-orange-50 border-orange-100 text-orange-900';
      case 'low': return 'bg-blue-50 border-blue-100 text-blue-900';
      default: return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const activeNotifications = notifications.filter((n) => !n.completed);
  const archivedNotifications = notifications.filter((n) => n.completed);

  return (
    <div className="flex-1 overflow-auto bg-gray-50/50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-30">
        <button onClick={onMenuToggle} className="p-3 rounded-lg text-gray-600 hover:bg-gray-100">
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        <div className="w-12"></div>
      </div>

      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 hidden lg:block">Notifications</h1>
          {!loading && activeNotifications.length > 0 && (
            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full font-bold">
              {activeNotifications.length}
            </span>
          )}
        </div>

        {/* LISTE ACTIVE */}
        <div className="space-y-4">
          {loading ? (
            // Skeleton Loader
            [1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm animate-pulse">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))
          ) : activeNotifications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Vous êtes à jour !</h3>
              <p className="text-gray-500 text-sm">Aucune notification en attente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`relative rounded-xl border shadow-sm transition-all hover:shadow-md overflow-hidden ${getPriorityStyles(notif.priority)}`}
                >
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4">
                    
                    {/* Icône & Texte */}
                    <div className="flex gap-4 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        <div className="p-2.5 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">
                          {getIcon(notif.type)}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 text-base leading-tight">
                            {notif.title}
                          </h3>
                          {notif.priority === 'high' && (
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Urgent" />
                          )}
                        </div>
                        <p className="text-sm text-gray-800 opacity-90 leading-relaxed">{notif.message}</p>
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(notif.date).toLocaleDateString('fr-FR', {
                            weekday: 'long', day: 'numeric', month: 'long'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Boutons d'action */}
                    <div className="flex items-center md:flex-col gap-2 shrink-0 md:border-l md:border-black/5 md:pl-4 pt-2 md:pt-0 border-t border-black/5 md:border-t-0">
                      {notif.client_id && (
                        <button
                          onClick={() => handleOpenCall(notif.client_id)}
                          className="flex-1 md:w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 rounded-lg transition-colors border border-gray-200/50 shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Appeler</span>
                        </button>
                      )}

                      {notif.client_id && (
                        <button
                          onClick={() => handleOpenBooking(notif.client_id, notif.id)}
                          className="flex-1 md:w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-lg transition-colors shadow-sm"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Réserver</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleComplete(notif.id, notif.completed)}
                        className="flex-1 md:w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-xs font-bold text-white rounded-lg transition-colors shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Fait</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LISTE ARCHIVÉE */}
        {archivedNotifications.length > 0 && (
          <div className="pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wide mb-4"
            >
              {showArchived ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Historique récent ({archivedNotifications.length})
            </button>

            {showArchived && (
              <div className="space-y-3 opacity-75">
                {archivedNotifications.map((notif) => (
                  <div key={notif.id} className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-1.5 bg-gray-100 rounded-full text-gray-400 shrink-0">
                        {getIcon(notif.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-600 line-through">
                            {notif.title}
                          </p>
                          {notif.client_name && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                              <User className="w-3 h-3" />
                              {notif.client_name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{notif.message}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleToggleComplete(notif.id, notif.completed)}
                        className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors"
                        title="Restaurer"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingNotification(notif)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-md transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* 1. CALL MODAL */}
      {clientForCall && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden scale-100 animate-in zoom-in-95">
            <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 truncate pr-2">
                {clientForCall.name}
              </h3>
              <button onClick={() => setClientForCall(null)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 border hover:border-gray-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              {clientForCall.phone ? (
                <a 
                  href={`tel:${clientForCall.phone}`} 
                  className="flex items-center justify-center gap-3 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95"
                >
                  <Phone className="w-5 h-5" />
                  Appeler Client
                </a>
              ) : (
                <div className="text-center text-xs text-gray-400 py-1">Pas de numéro client</div>
              )}

              {clientForCall.contactPersonPhone && (
                <a 
                  href={`tel:${clientForCall.contactPersonPhone}`} 
                  className="flex items-center justify-center gap-3 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95"
                >
                  <User className="w-5 h-5" />
                  Appeler Contact
                </a>
              )}

              {!clientForCall.phone && !clientForCall.contactPersonPhone && (
                <p className="text-center text-sm text-gray-500 py-2">Aucun numéro disponible</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. APPOINTMENT MODAL */}
      {showBookingModal && (
        <AppointmentModal
          existingAppointments={appointments}
          clients={clients}
          services={services}
          selectedDate={new Date().toISOString().split('T')[0]}
          preSelectedClient={clientForBooking}
          onSave={handleSaveAppointment}
          onAddService={async (name) => {
             const { data } = await supabase.from('services').insert([{ name }]).select().single();
             if (data) { setServices(p => [...p, data]); return true; }
             return false;
          }}
          onDeleteService={async (id) => {
             const { error } = await supabase.from('services').delete().eq('id', id);
             if (!error) { setServices(p => p.filter(s => s.id !== id)); return true; }
             return false;
          }}
          onClose={() => {
            setShowBookingModal(false);
            setClientForBooking(undefined);
            setBookingNotificationId(null);
          }}
        />
      )}

      {/* 3. DELETE CONFIRMATION */}
      {deletingNotification && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-center text-gray-900 mb-4">Supprimer ?</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingNotification(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Non
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                Oui
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;