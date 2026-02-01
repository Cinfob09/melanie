import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Menu,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Appointment, Client, Service } from '../../types';
import { supabase } from '../../lib/supabase';
import AppointmentModal from './AppointmentModal';
import AppointmentCard from './AppointmentCard';
import { ShowToastFunction } from '../../types/toast';

type CalendarView = 'month' | 'week' | 'day';

interface CalendarProps {
  appointments: Appointment[];
  clients: Client[];
  onAddAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<boolean>;
  onUpdateAppointment: (
    id: string,
    appointment: Partial<Appointment>
  ) => Promise<boolean>;
  onDeleteAppointment?: (id: string) => Promise<boolean>; // 🆕 AJOUTE CECI
  showToast: ShowToastFunction;
  onMenuToggle: () => void;
}

const Calendar: React.FC<CalendarProps> = ({
  appointments,
  clients,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment, // 🆕 DESTRUCTURE ICI
  showToast,
  onMenuToggle,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [deletingAppointment, setDeletingAppointment] =
    useState<Appointment | null>(null);
  const [view, setView] = useState<CalendarView>('day');

  // Charger les services au démarrage
  React.useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase.from('services').select('*');
      if (data) setServices(data);
    };
    fetchServices();
  }, []);

  // Fonction pour ajouter un service
  const addService = async (name: string): Promise<boolean> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('services')
        .insert([{ name, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setServices((prev) => [...prev, data]);
        showToast('success', `Service "${name}" ajouté avec succès ! ✨`);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erreur ajout service:', err);
      showToast('error', "Erreur lors de l'ajout du service");
      return false;
    }
  };

  // Fonction pour supprimer un service
  const deleteService = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      setServices((prev) => prev.filter((s) => s.id !== id));
      showToast('warning', 'Service supprimé 🗑️');
      return true;
    } catch (err) {
      console.error('Erreur suppression service:', err);
      showToast('error', 'Erreur lors de la suppression du service');
      return false;
    }
  };

  const monthNames = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];

  const dayNames = [
    'Dimanche',
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(date.getDate() - day);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      days.push(currentDay);
    }
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === 'month') {
        newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      } else if (view === 'week') {
        newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      } else {
        newDate.setDate(prev.getDate() + (direction === 'next' ? 1 : -1));
      }
      return newDate;
    });
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;
  };

  const formatDateFromDate = (date: Date) => {
    return formatDate(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const getAppointmentsForDate = (dateString: string) => {
    return appointments.filter((apt) => apt.date === dateString);
  };

  const handleDateClick = (day: number) => {
    const dateString = formatDate(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    setSelectedDate(dateString);
    setEditingAppointment(null);
    setShowModal(true);
  };

  const handleDateClickFromDate = (date: Date) => {
    const dateString = formatDateFromDate(date);
    setSelectedDate(dateString);
    setEditingAppointment(null);
    setShowModal(true);
  };

  const handleAppointmentClick = (
    appointment: Appointment,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setEditingAppointment(appointment);
    setSelectedDate(appointment.date);
    setShowModal(true);
  };

  const getClientById = (clientId: string) => {
    return clients.find((client) => client.id === clientId);
  };

  const getViewTitle = () => {
    if (view === 'month') {
      return `${
        monthNames[currentDate.getMonth()]
      } ${currentDate.getFullYear()}`;
    } else if (view === 'week') {
      const weekDays = getWeekDays(currentDate);
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth()) {
        return `${
          monthNames[start.getMonth()]
        } ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
      } else {
        return `${monthNames[start.getMonth()]} ${start.getDate()} - ${
          monthNames[end.getMonth()]
        } ${end.getDate()}, ${start.getFullYear()}`;
      }
    } else {
      return `${dayNames[currentDate.getDay()]}, ${currentDate.getDate()} ${
        monthNames[currentDate.getMonth()]
      } ${currentDate.getFullYear()}`;
    }
  };

  const handleSaveAppointment = (appointmentData: Omit<Appointment, 'id'>) => {
    if (editingAppointment) {
      onUpdateAppointment(editingAppointment.id, appointmentData).then(
        (success) => {
          if (success) {
            showToast(
              'success',
              `Rendez-vous avec ${appointmentData.clientName} modifié ! 🎉`
            );
            setShowModal(false);
            setEditingAppointment(null);
          } else {
            showToast('error', 'Erreur lors de la modification du rendez-vous');
          }
        }
      );
    } else {
      onAddAppointment(appointmentData).then((success) => {
        if (success) {
          showToast(
            'success',
            `Rendez-vous avec ${appointmentData.clientName} créé ! 📅`
          );
          setShowModal(false);
          setEditingAppointment(null);
        } else {
          showToast('error', 'Erreur lors de la création du rendez-vous');
        }
      });
    }
  };

  const handleDeleteClick = (appointment: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingAppointment(appointment);
  };

  const confirmDelete = async () => {
    if (deletingAppointment && onDeleteAppointment) {
      const success = await onDeleteAppointment(deletingAppointment.id);

      if (success) {
        showToast(
          'warning',
          `Rendez-vous avec ${deletingAppointment.clientName} supprimé 🗑️`,
          3500
        );
        setDeletingAppointment(null);
        // ✅ Les appointments se mettent à jour automatiquement via les props
      } else {
        showToast('error', 'Erreur lors de la suppression du rendez-vous');
      }
    }
  };

  const cancelDelete = () => {
    setDeletingAppointment(null);
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const today = new Date();
    const isCurrentMonth =
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();

    return (
      <>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-gray-500"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-32 md:h-36"></div>;
            }

            const dateString = formatDate(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              day
            );
            const dayAppointments = getAppointmentsForDate(dateString);
            const isToday = isCurrentMonth && day === today.getDate();

            return (
              <div
                key={day}
                onClick={() => handleDateClick(day)}
                className={`h-32 md:h-36 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation overflow-hidden ${
                  isToday ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div
                  className={`text-sm font-semibold mb-2 flex items-center justify-between ${
                    isToday ? 'text-blue-600' : 'text-gray-900'
                  }`}
                >
                  <span>{day}</span>
                  {dayAppointments.length > 0 && (
                    <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {dayAppointments.length}
                    </span>
                  )}
                </div>
                <div className="space-y-1 overflow-hidden">
                  {dayAppointments.slice(0, 3).map((apt) => (
                    <div
                      key={apt.id}
                      onClick={(e) => handleAppointmentClick(apt, e)}
                      className={`text-xs p-1.5 rounded cursor-pointer transition-colors ${
                        apt.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          : apt.status === 'completed'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      <div className="font-medium truncate">{apt.time}</div>
                      <div className="truncate opacity-90">
                        {apt.clientName}
                      </div>
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      +{dayAppointments.length - 3} de plus
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const today = new Date();

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {weekDays.map((date, index) => {
            const isToday = date.toDateString() === today.toDateString();
            const dateString = formatDateFromDate(date);
            const dayAppointments = getAppointmentsForDate(dateString);
            return (
              <div
                key={index}
                className={`text-center p-2 rounded ${
                  isToday ? 'bg-blue-100' : ''
                }`}
              >
                <div className="text-xs text-gray-500">
                  {dayNames[date.getDay()].slice(0, 3)}
                </div>
                <div
                  className={`text-lg font-semibold flex items-center justify-center gap-2 ${
                    isToday ? 'text-blue-600' : 'text-gray-900'
                  }`}
                >
                  {date.getDate()}
                  {dayAppointments.length > 0 && (
                    <span className="bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {dayAppointments.length}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {weekDays.map((date, index) => {
            const dateString = formatDateFromDate(date);
            const dayAppointments = getAppointmentsForDate(dateString);
            const isToday = date.toDateString() === today.toDateString();

            return (
              <div
                key={index}
                onClick={() => handleDateClickFromDate(date)}
                className={`min-h-48 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation ${
                  isToday ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="md:hidden mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {dayNames[date.getDay()]}, {date.getDate()}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {dayAppointments.map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      client={getClientById(apt.clientId)}
                      onClick={(e) => handleAppointmentClick(apt, e)}
                      onDelete={(e) => handleDeleteClick(apt, e)}
                      showNavigation={true}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dateString = formatDateFromDate(currentDate);
    const dayAppointments = getAppointmentsForDate(dateString).sort((a, b) =>
      a.time.localeCompare(b.time)
    );
    const today = new Date();
    const isToday = currentDate.toDateString() === today.toDateString();

    return (
      <div className="space-y-4">
        <div className="text-center bg-white rounded-lg shadow-sm p-4 border">
          <div
            className={`text-3xl font-bold ${
              isToday ? 'text-blue-600' : 'text-gray-900'
            }`}
          >
            {currentDate.getDate()}
          </div>
          <div className="text-lg text-gray-600">
            {dayNames[currentDate.getDay()]}
          </div>
          <div className="text-sm text-gray-500">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          {dayAppointments.length > 0 && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="bg-blue-500 text-white text-sm rounded-full px-3 py-1">
                {dayAppointments.length} rendez-vous
              </span>
            </div>
          )}
        </div>

        {dayAppointments.length > 0 ? (
          <div className="space-y-3">
            {dayAppointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white rounded-lg shadow-sm border"
              >
                <AppointmentCard
                  appointment={apt}
                  client={getClientById(apt.clientId)}
                  onClick={(e) => handleAppointmentClick(apt, e)}
                  onDelete={(e) => handleDeleteClick(apt, e)}
                  showNavigation={true}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
            <div className="text-gray-400 mb-4">
              <CalendarIcon className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun rendez-vous prévu
            </h3>
          </div>
        )}
      </div>
    );
  };

  const today = new Date();

  return (
    <div className="flex-1 overflow-auto">
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-30">
        <button
          onClick={onMenuToggle}
          className="p-3 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Calendrier</h1>
        <div className="w-12"></div>
      </div>

      <div className="p-4 md:p-6">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onMenuToggle}
                className="hidden lg:flex p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 hidden lg:block">
                  Calendrier
                </h1>
                <p className="text-gray-600 mt-2">
                  Planifiez et gérez les rendez-vous clients
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setView('day')}
                  className={`px-4 py-2 text-sm rounded-md transition-colors touch-manipulation ${
                    view === 'day'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  Jour
                </button>
                <button
                  onClick={() => setView('week')}
                  className={`px-4 py-2 text-sm rounded-md transition-colors touch-manipulation ${
                    view === 'week'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  Semaine
                </button>
                <button
                  onClick={() => setView('month')}
                  className={`px-4 py-2 text-sm rounded-md transition-colors touch-manipulation ${
                    view === 'month'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  Mois
                </button>
              </div>
              <button
                onClick={() => handleDateClickFromDate(today)}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 rounded-lg flex items-center justify-center transition-colors touch-manipulation"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nouveau rendez-vous</span>
                <span className="sm:hidden">Nouveau</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-3 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 text-center">
              {getViewTitle()}
            </h2>
            <button
              onClick={() => navigateMonth('next')}
              className="p-3 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 md:p-6">
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
          </div>
        </div>

        {showModal && (
          <AppointmentModal
            appointment={editingAppointment}
            existingAppointments={appointments}
            clients={clients}
            services={services}
            selectedDate={selectedDate}
            onSave={handleSaveAppointment}
            onAddService={addService}
            onDeleteService={deleteService}
            onClose={() => {
              setShowModal(false);
              setEditingAppointment(null);
            }}
          />
        )}

        {/* Delete Confirmation Modal avec Liquid Glass */}
        {deletingAppointment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div
              className="relative w-full max-w-md"
              style={{
                animation: 'scaleIn 0.3s ease-out forwards',
              }}
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
                  Supprimer le rendez-vous ?
                </h3>

                {/* Message */}
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 mb-6 border border-white/30 shadow-xl">
                  <p className="text-white/95 text-center leading-relaxed drop-shadow-md">
                    Voulez-vous vraiment supprimer le rendez-vous avec{' '}
                    <span className="font-bold text-white">
                      {deletingAppointment.clientName}
                    </span>{' '}
                    prévu le{' '}
                    <span className="font-semibold">
                      {new Date(deletingAppointment.date).toLocaleDateString(
                        'fr-FR'
                      )}
                    </span>{' '}
                    à{' '}
                    <span className="font-semibold">
                      {deletingAppointment.time}
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
    </div>
  );
};

export default Calendar;
