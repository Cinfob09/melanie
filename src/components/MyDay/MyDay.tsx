import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  X,
  RotateCcw,
  Menu,
  DollarSign,
  User,
  AlertCircle,
} from 'lucide-react';
import { Appointment, Client } from '../../types';

interface MyDayProps {
  appointments: Appointment[];
  clients: Client[];
  onMenuToggle: () => void;
  onUpdateAppointment: (
    id: string,
    data: Partial<Appointment>
  ) => Promise<boolean>;
}

const MyDay: React.FC<MyDayProps> = ({
  appointments,
  clients,
  onMenuToggle,
  onUpdateAppointment,
}) => {
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const todayStr = new Date().toLocaleDateString('en-CA');

  const todayAppointments = useMemo(() => {
    return appointments
      .filter((apt) => apt.date === todayStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, todayStr]);

  const stats = useMemo(() => {
    const total = todayAppointments.length;
    const completed = todayAppointments.filter(
      (a) => a.status === 'completed'
    ).length;
    const revenue = todayAppointments
      .filter((a) => a.status === 'completed')
      .reduce((sum, a) => sum + (a.price || 0), 0);
    const remaining = todayAppointments.filter(
      (a) => a.status === 'scheduled'
    ).length;

    return { total, completed, revenue, remaining };
  }, [todayAppointments]);

  const getClientAddress = (clientId: string) =>
    clients.find((c) => c.id === clientId)?.address || '';

  const openMaps = (clientId: string) => {
    const address = getClientAddress(clientId);
    if (!address) return alert("Pas d'adresse enregistrée.");

    const encodedAddress = encodeURIComponent(address);
    const isApple = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);

    if (isApple) {
      window.location.href = `maps://maps.apple.com/?q=${encodedAddress}`;
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
        '_blank'
      );
    }
  };

  const updateStatus = async (
    id: string,
    status: 'completed' | 'cancelled' | 'scheduled'
  ) => {
    setUpdatingIds((prev) => new Set(prev).add(id));
    try {
      await onUpdateAppointment(id, { status });
    } catch (err) {
      alert('Erreur lors de la mise à jour');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const formatTime = (time: string) => time.slice(0, 5);

  const formatDate = () => {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

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
        <h1 className="text-xl font-semibold text-gray-900">Ma journée</h1>
        <div className="w-12"></div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuToggle}
              className="hidden lg:flex p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 hidden lg:flex">
                <Calendar className="w-8 h-8 text-blue-600" />
                Ma journée
              </h1>
              <p className="text-gray-600 capitalize lg:hidden">
                {formatDate()}
              </p>
              <p className="text-gray-600 capitalize hidden lg:block">
                {formatDate()}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Revenus */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 font-medium">Revenus</p>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              ${stats.revenue.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Aujourd'hui</p>
          </div>

          {/* À faire */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 font-medium">À faire</p>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">
              {stats.remaining}
            </p>
            <p className="text-xs text-gray-500 mt-1">Restants</p>
          </div>

          {/* Complétés */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 font-medium">Complétés</p>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">
              {stats.completed}
            </p>
            <p className="text-xs text-gray-500 mt-1">Terminés</p>
          </div>

          {/* Total */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 font-medium">Total</p>
              <div className="p-2 bg-gray-100 rounded-lg">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {stats.total}
            </p>
            <p className="text-xs text-gray-500 mt-1">Rendez-vous</p>
          </div>
        </div>

        {/* Appointments List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Agenda du jour
          </h2>

          {todayAppointments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 sm:p-12 text-center">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Tout est calme
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Aucun rendez-vous prévu pour aujourd'hui.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className={`bg-white rounded-lg shadow-md overflow-hidden transition-shadow hover:shadow-lg ${
                    apt.status === 'completed' ? 'opacity-75' : ''
                  }`}
                >
                  {/* Header */}
                  <div className="p-4 sm:p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-lg font-bold text-gray-900">
                            {formatTime(apt.time)}
                          </span>
                          {apt.duration && (
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              {apt.duration} min
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {apt.clientName}
                        </h3>
                        {apt.service && (
                          <p className="text-sm text-gray-600 mt-1">
                            {apt.service}
                          </p>
                        )}
                      </div>
                      <div
                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                          apt.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : apt.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {apt.status === 'completed'
                          ? 'Fait'
                          : apt.status === 'cancelled'
                          ? 'Annulé'
                          : 'Prévu'}
                      </div>
                    </div>

                    {apt.notes && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg flex gap-2 items-start">
                        <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 italic">
                          {apt.notes}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-4 sm:p-6 bg-gray-50">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => openMaps(apt.clientId)}
                        className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 active:bg-gray-200 py-3 rounded-lg font-medium transition-colors touch-manipulation"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>Ouvrir GPS</span>
                      </button>

                      {apt.status === 'scheduled' ? (
                        <>
                          <button
                            onClick={() => updateStatus(apt.id, 'completed')}
                            disabled={updatingIds.has(apt.id)}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 active:bg-green-800 py-3 rounded-lg font-medium transition-colors touch-manipulation disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Terminer</span>
                          </button>
                          <button
                            onClick={() => updateStatus(apt.id, 'cancelled')}
                            disabled={updatingIds.has(apt.id)}
                            className="px-4 py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation disabled:opacity-50"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => updateStatus(apt.id, 'scheduled')}
                          disabled={updatingIds.has(apt.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800 py-3 rounded-lg font-medium transition-colors touch-manipulation disabled:opacity-50"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Réactiver</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyDay;
