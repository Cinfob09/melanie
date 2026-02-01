import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Search,
  Plus,
  Wrench,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Appointment, Client, Service } from '../../types';
import { supabase } from '../../lib/supabase';
import { usePreferences } from '../../hooks/usePreferences';

interface TimeSlot {
  time: string;
  available: boolean;
  warning?: string;
}

interface AppointmentModalProps {
  appointment?: Appointment | null;
  clients: Client[];
  services: Service[];
  selectedDate: string;
  preSelectedClient?: Client;
  existingAppointments: Appointment[];
  onSave: (appointment: Omit<Appointment, 'id'>) => void;
  onAddService: (serviceName: string) => Promise<boolean>;
  onDeleteService: (serviceId: string) => Promise<boolean>;
  onClose: () => void;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  appointment,
  clients,
  services,
  selectedDate,
  preSelectedClient,
  onSave,
  onAddService,
  onDeleteService,
  onClose,
}) => {
  // Charger les préférences
  const { preferences } = usePreferences();

  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    service: '',
    notes: '',
    date: selectedDate,
    time: '',
    duration: 60,
    status: 'scheduled' as const,
    price: '',
  });

  // États UI
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [newService, setNewService] = useState('');
  const [showAddService, setShowAddService] = useState(false);
  const [customDuration, setCustomDuration] = useState('');
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [customDurations, setCustomDurations] = useState<number[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // États pour la gestion des conflits DB
  const [dbAppointments, setDbAppointments] = useState<Appointment[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [showTimeGrid, setShowTimeGrid] = useState(false);
  const [pendingTime, setPendingTime] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState('');

  // Paramètres par défaut ou depuis les préférences
  const minTimeBetween = preferences?.min_time_between_appointments || 90;
  const businessStart =
    preferences?.business_hours_start?.slice(0, 5) || '08:00';
  const businessEnd = preferences?.business_hours_end?.slice(0, 5) || '18:00';

  // Initialisation du formulaire
  useEffect(() => {
    if (appointment) {
      setFormData({
        clientId: appointment.clientId,
        clientName: appointment.clientName,
        service: appointment.service,
        notes: appointment.notes || '',
        date: appointment.date,
        time: appointment.time,
        duration: appointment.duration,
        status: appointment.status,
        price: appointment.price || '',
      });
      setClientSearch(appointment.clientName);
    } else if (preSelectedClient) {
      setFormData((prev) => ({
        ...prev,
        clientId: preSelectedClient.id,
        clientName: preSelectedClient.name,
      }));
      setClientSearch(preSelectedClient.name);
    }
  }, [appointment, preSelectedClient]);

  // Récupération des rendez-vous du jour depuis la DB
  useEffect(() => {
    const fetchDayAppointments = async () => {
      setIsLoadingSlots(true);
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('date', formData.date);

        if (error) throw error;
        if (data) {
          setDbAppointments(data as Appointment[]);
        }
      } catch (err) {
        console.error(
          'Erreur lors de la vérification des disponibilités:',
          err
        );
      } finally {
        setIsLoadingSlots(false);
      }
    };

    if (formData.date) {
      fetchDayAppointments();
    }
  }, [formData.date]);

  // Recalculer les créneaux quand les données changent
  useEffect(() => {
    if (formData.date && !isLoadingSlots && preferences) {
      generateTimeSlots(formData.date);
    }
  }, [
    formData.date,
    formData.duration,
    dbAppointments,
    isLoadingSlots,
    preferences,
  ]);

  const checkTimeSlotAvailability = (
    date: string,
    time: string,
    duration: number
  ): TimeSlot => {
    const now = new Date();
    const slotStart = new Date(`${date}T${time}:00`);
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

    // Vérifier si c'est dans le passé
    const isPast = slotStart < now;

    const otherApts = dbAppointments.filter(
      (a) => a.id !== appointment?.id && a.status !== 'cancelled'
    );

    let hasConflict = false;
    let minGap = Infinity;

    for (const apt of otherApts) {
      const aptTimeClean = apt.time.slice(0, 5);
      const aptStart = new Date(`${date}T${aptTimeClean}:00`);
      const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);

      // Vérifier le chevauchement
      if (slotStart < aptEnd && slotEnd > aptStart) {
        hasConflict = true;
        break;
      }

      // Calculer l'écart minimum
      const gapBefore = (slotStart.getTime() - aptEnd.getTime()) / 60000;
      const gapAfter = (aptStart.getTime() - slotEnd.getTime()) / 60000;
      if (gapBefore >= 0) minGap = Math.min(minGap, gapBefore);
      if (gapAfter >= 0) minGap = Math.min(minGap, gapAfter);
    }

    if (hasConflict) return { time, available: false };

    // Messages d'avertissement selon les préférences
    let warningMsg = '';
    if (isPast) {
      warningMsg = 'Ce créneau horaire est déjà passé.';
    } else if (minGap < minTimeBetween && minGap !== Infinity) {
      warningMsg = `Attention : seulement ${Math.round(
        minGap
      )} min d'écart (${minTimeBetween} min recommandés).`;
    }

    return {
      time,
      available: true,
      warning: warningMsg || undefined,
    };
  };

  const generateTimeSlots = (date: string) => {
    const slots: TimeSlot[] = [];

    // Utiliser les heures d'ouverture des préférences
    const [startHour, startMinute] = businessStart.split(':').map(Number);
    const [endHour, endMinute] = businessEnd.split(':').map(Number);

    let hour = startHour;
    let minute = startMinute;

    while (hour < endHour || (hour === endHour && minute < endMinute)) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`;
      const slot = checkTimeSlotAvailability(
        date,
        timeString,
        formData.duration
      );
      slots.push(slot);

      // Incrémenter par 30 minutes
      minute += 30;
      if (minute >= 60) {
        minute = 0;
        hour++;
      }
    }

    setAvailableSlots(slots);
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.contactPersonName
        .toLowerCase()
        .includes(clientSearch.toLowerCase())
  );

  const handleClientSelect = (client: Client) => {
    setFormData((prev) => ({
      ...prev,
      clientId: client.id,
      clientName: client.name,
    }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  const handleAddService = () => {
    if (
      newService.trim() &&
      !services.some((s) => s.name === newService.trim())
    ) {
      onAddService(newService.trim()).then((success) => {
        if (success) {
          setFormData((prev) => ({ ...prev, service: newService.trim() }));
          setNewService('');
          setShowAddService(false);
        }
      });
    }
  };

  const handleDeleteServiceLocal = (serviceToDelete: Service) => {
    if (services.length > 1) {
      onDeleteService(serviceToDelete.id).then((success) => {
        if (success) {
          if (formData.service === serviceToDelete.name) {
            setFormData((prev) => ({ ...prev, service: '' }));
          }
        }
      });
    }
  };

  const handleDurationChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomDuration(true);
    } else {
      setFormData((prev) => ({ ...prev, duration: parseInt(value) }));
      setShowCustomDuration(false);
    }
  };

  const handleCustomDurationSubmit = () => {
    const duration = parseInt(customDuration);
    if (duration > 0) {
      setCustomDurations((prev) => [...prev, duration]);
      setFormData((prev) => ({ ...prev, duration }));
      setShowCustomDuration(false);
      setCustomDuration('');
    }
  };

  const handleDeleteDuration = (durationToDelete: number) => {
    setCustomDurations((prev) => prev.filter((d) => d !== durationToDelete));
    if (formData.duration === durationToDelete) {
      setFormData((prev) => ({ ...prev, duration: 60 }));
    }
  };

  const handleTimeSelect = (slot: TimeSlot) => {
    if (!slot.available) return;
    if (slot.warning) {
      setWarningMessage(slot.warning);
      setPendingTime(slot.time);
      setShowWarningModal(true);
    } else {
      setFormData((prev) => ({ ...prev, time: slot.time }));
      setShowTimeGrid(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId) {
      alert('Veuillez sélectionner un client');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            {appointment ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Client Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Client
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setShowClientDropdown(true);
                }}
                onFocus={() => setShowClientDropdown(true)}
                className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
                placeholder="Rechercher un client..."
                required
              />
            </div>

            {showClientDropdown && clientSearch && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleClientSelect(client)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 active:bg-gray-200 border-b border-gray-100 last:border-b-0 touch-manipulation"
                    >
                      <div className="font-medium text-gray-900">
                        {client.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        Contact : {client.contactPersonName}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500 text-center text-sm">
                    Aucun client trouvé
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Wrench className="h-4 w-4 mr-2" />
              Service
            </label>
            <div className="space-y-2">
              <select
                value={formData.service}
                onChange={(e) => {
                  if (e.target.value === 'add-new') setShowAddService(true);
                  else
                    setFormData((prev) => ({
                      ...prev,
                      service: e.target.value,
                    }));
                }}
                className="w-full py-4 px-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
                required
              >
                <option value="">Sélectionnez un service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.name}>
                    {service.name}
                  </option>
                ))}
                <option value="add-new">+ Ajouter un nouveau service</option>
              </select>

              {services.length > 1 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200"
                    >
                      <span className="mr-2 text-gray-700">{service.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteServiceLocal(service)}
                        className="text-gray-400 hover:text-red-500 transition-colors touch-manipulation p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showAddService && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-3 text-base focus:ring-2 focus:ring-blue-500 touch-manipulation"
                    placeholder="Nom du service"
                  />
                  <button
                    type="button"
                    onClick={handleAddService}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddService(false)}
                    className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full py-4 px-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Heure
              </label>
              <button
                type="button"
                onClick={() => setShowTimeGrid(!showTimeGrid)}
                className="w-full text-left py-4 px-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 bg-white flex justify-between items-center touch-manipulation"
              >
                <span>{formData.time}</span>
                {isLoadingSlots && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                )}
              </button>
            </div>
          </div>

          {/* Time Grid */}
          {showTimeGrid && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Disponibilités
                  {isLoadingSlots && (
                    <span className="text-xs text-blue-500">
                      (Chargement...)
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setShowTimeGrid(false)}
                  className="text-xs text-blue-600 font-medium touch-manipulation p-2"
                >
                  Fermer
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => handleTimeSelect(slot)}
                    disabled={!slot.available}
                    className={`
                      px-3 py-3 text-sm font-medium rounded-lg border transition-all relative touch-manipulation
                      ${
                        slot.time === formData.time
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : ''
                      }
                      ${
                        !slot.available
                          ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed line-through'
                          : slot.warning && slot.time !== formData.time
                          ? 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100 active:bg-orange-200'
                          : slot.time !== formData.time
                          ? 'bg-white text-gray-900 border-gray-300 hover:border-blue-400 active:bg-blue-50'
                          : ''
                      }
                    `}
                    title={
                      slot.warning || (slot.available ? 'Disponible' : 'Occupé')
                    }
                  >
                    {slot.time}
                    {slot.warning &&
                      slot.available &&
                      slot.time !== formData.time && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
                      )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durée (minutes)
            </label>
            <select
              value={
                showCustomDuration ? 'custom' : formData.duration.toString()
              }
              onChange={(e) => handleDurationChange(e.target.value)}
              className="w-full py-4 px-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 touch-manipulation"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 heure</option>
              <option value={90}>1,5 heure</option>
              <option value={120}>2 heures</option>
              {customDurations.map((duration) => (
                <option key={duration} value={duration}>
                  {duration} minutes
                </option>
              ))}
              <option value="custom">Durée personnalisée</option>
            </select>

            {showCustomDuration && (
              <div className="flex gap-2 mt-2">
                <input
                  type="number"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-3 text-base touch-manipulation"
                  placeholder="Minutes"
                />
                <button
                  type="button"
                  onClick={handleCustomDurationSubmit}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 touch-manipulation"
                >
                  OK
                </button>
              </div>
            )}

            {customDurations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {customDurations.map((d) => (
                  <div
                    key={d}
                    className="flex items-center bg-gray-50 px-3 py-2 text-sm border rounded-lg"
                  >
                    <span className="mr-2">{d} min</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDuration(d)}
                      className="text-gray-400 hover:text-red-500 touch-manipulation p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="w-full py-4 px-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 resize-none touch-manipulation"
              rows={3}
              placeholder="Notes supplémentaires..."
            />
          </div>

          {/* Price & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix ($)
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    price: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full py-4 px-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 touch-manipulation"
                step="0.01"
                min="0"
              />
            </div>
            {appointment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value as any,
                    }))
                  }
                  className="w-full py-4 px-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 touch-manipulation"
                >
                  <option value="scheduled">Planifié</option>
                  <option value="completed">Terminé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 font-medium transition-colors touch-manipulation"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoadingSlots}
              className={`flex-1 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 font-medium transition-colors touch-manipulation ${
                isLoadingSlots ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoadingSlots
                ? 'Vérification...'
                : appointment
                ? 'Modifier'
                : 'Créer'}
            </button>
          </div>
        </form>
      </div>

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border-t-4 border-orange-500 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-orange-600 mb-4">
              <AlertTriangle className="h-8 w-8" />
              <h3 className="text-lg font-bold">Avertissement</h3>
            </div>

            <p className="text-gray-600 mb-6 text-base leading-relaxed">
              {warningMessage}
              <br />
              <br />
              Voulez-vous quand même enregistrer le rendez-vous à{' '}
              <span className="font-bold text-gray-900">{pendingTime}</span> ?
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  if (pendingTime) {
                    setFormData((prev) => ({ ...prev, time: pendingTime }));
                    setShowWarningModal(false);
                    setShowTimeGrid(false);
                  }
                }}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl font-bold transition-colors shadow-lg touch-manipulation"
              >
                Oui, confirmer l'heure
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWarningModal(false);
                  setPendingTime(null);
                }}
                className="w-full py-4 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors touch-manipulation"
              >
                Non, choisir une autre heure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentModal;
