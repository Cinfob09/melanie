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
  existingAppointments,
  onSave,
  onAddService,
  onDeleteService,
  onClose,
}) => {
  const { preferences } = usePreferences();

  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    service: '',
    notes: '',
    date: selectedDate,
    time: '',
    duration: 60,
    // CORRECTION TS #1 : Typage explicite du status
    status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled',
    price: '' as string | number,
  });

  const [calendarMonth, setCalendarMonth] = useState<Date>(
    selectedDate ? new Date(selectedDate) : new Date()
  );

  // --- LOGIQUE DE DISPONIBILITÉ (TETRIS TEMPOREL) ---
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getDayAvailability = (dateString: string) => {
    const startOfDay = timeToMinutes(preferences?.business_hours_start || '08:00');
    const endOfDay = timeToMinutes(preferences?.business_hours_end || '18:00');
    const buffer = preferences?.min_time_between_appointments || 0;
    const totalDayMinutes = endOfDay - startOfDay;

    const dayAppointments = existingAppointments
      .filter(a => a.date === dateString && a.status !== 'cancelled' && a.id !== appointment?.id)
      .sort((a, b) => a.time.localeCompare(b.time));

    let occupiedMinutes = 0;
    let maxFreeBlock = 0;
    let currentCursor = startOfDay;

    dayAppointments.forEach((apt) => {
      const aptStart = timeToMinutes(apt.time);
      const aptEnd = aptStart + apt.duration;
      const freeSpace = aptStart - currentCursor;
      
      if (freeSpace > 0) maxFreeBlock = Math.max(maxFreeBlock, freeSpace);

      occupiedMinutes += apt.duration + buffer; // On compte le buffer comme "occupé"
      currentCursor = aptEnd + buffer;
    });

    const finalSpace = endOfDay - currentCursor;
    if (finalSpace > 0) maxFreeBlock = Math.max(maxFreeBlock, finalSpace);

    // Est-ce que le RDV actuel rentre quelque part ?
    const canFitAppointment = maxFreeBlock >= formData.duration;
    // Taux d'occupation
    const occupancyRate = totalDayMinutes > 0 ? Math.min(1, occupiedMinutes / totalDayMinutes) : 1;

    return { canFit: canFitAppointment, occupancy: occupancyRate, count: dayAppointments.length };
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  // États UI
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [newService, setNewService] = useState('');
  const [showAddService, setShowAddService] = useState(false);
  const [customDuration, setCustomDuration] = useState('');
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [customDurations, setCustomDurations] = useState<number[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // États DB
  const [dbAppointments, setDbAppointments] = useState<Appointment[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [showTimeGrid, setShowTimeGrid] = useState(false);
  const [pendingTime, setPendingTime] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState('');

  const minTimeBetween = preferences?.min_time_between_appointments || 90;
  const businessStart = preferences?.business_hours_start?.slice(0, 5) || '08:00';
  const businessEnd = preferences?.business_hours_end?.slice(0, 5) || '18:00';

  useEffect(() => {
    setCalendarMonth(formData.date ? new Date(formData.date) : selectedDate ? new Date(selectedDate) : new Date());
  }, [formData.date, selectedDate]);

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

  // Load appointments for selected day
  useEffect(() => {
    const fetchDayAppointments = async () => {
      setIsLoadingSlots(true);
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('date', formData.date);

        if (error) throw error;
        if (data) setDbAppointments(data as Appointment[]);
      } catch (err) {
        console.error('Erreur disponibilités:', err);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    if (formData.date) {
      fetchDayAppointments();
    }
  }, [formData.date]);

  // Recalculate Time Slots
  useEffect(() => {
    if (formData.date && !isLoadingSlots && preferences) {
      generateTimeSlots(formData.date);
    }
  }, [formData.date, formData.duration, dbAppointments, isLoadingSlots, preferences]);

  const checkTimeSlotAvailability = (date: string, time: string, duration: number): TimeSlot => {
    const now = new Date();
    const slotStart = new Date(`${date}T${time}:00`);
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);
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

      if (slotStart < aptEnd && slotEnd > aptStart) {
        hasConflict = true;
        break;
      }

      const gapBefore = (slotStart.getTime() - aptEnd.getTime()) / 60000;
      const gapAfter = (aptStart.getTime() - slotEnd.getTime()) / 60000;
      if (gapBefore >= 0) minGap = Math.min(minGap, gapBefore);
      if (gapAfter >= 0) minGap = Math.min(minGap, gapAfter);
    }

    if (hasConflict) return { time, available: false };

    let warningMsg = '';
    if (isPast) {
      warningMsg = 'Créneau passé.';
    } else if (minGap < minTimeBetween && minGap !== Infinity) {
      warningMsg = `Attention : seulement ${Math.round(minGap)} min d'écart.`;
    }

    return { time, available: true, warning: warningMsg || undefined };
  };

  const generateTimeSlots = (date: string) => {
    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = businessStart.split(':').map(Number);
    const [endHour, endMinute] = businessEnd.split(':').map(Number);

    let hour = startHour;
    let minute = startMinute;

    while (hour < endHour || (hour === endHour && minute < endMinute)) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const slot = checkTimeSlotAvailability(date, timeString, formData.duration);
      slots.push(slot);
      minute += 30;
      if (minute >= 60) {
        minute = 0;
        hour++;
      }
    }
    setAvailableSlots(slots);
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.contactPersonName.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const handleClientSelect = (client: Client) => {
    setFormData((prev) => ({ ...prev, clientId: client.id, clientName: client.name }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  const handleAddService = () => {
    if (newService.trim() && !services.some((s) => s.name === newService.trim())) {
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

  // CORRECTION TS #2 : Cette fonction était déclarée mais inutilisée
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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDayOfWeek = new Date(year, month, 1).getDay();
    const days: Array<number | null> = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(day);
    return days;
  };

  const formatDate = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
      alert('Veuillez sélectionner un client');
      return;
    }
    const safePrice = formData.price === '' ? 0 : Number(formData.price);
    const cleanFormData = { ...formData, price: safePrice };
    onSave(cleanFormData as any);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            {appointment ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          
          {/* Client Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <User className="h-4 w-4 mr-2" /> Client
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
                className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500"
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
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{client.name}</div>
                      <div className="text-sm text-gray-600">Contact : {client.contactPersonName}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500 text-center text-sm">Aucun client trouvé</div>
                )}
              </div>
            )}
          </div>

          {/* Service */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Wrench className="h-4 w-4 mr-2" /> Service
            </label>
            <div className="space-y-2">
              <select
                value={formData.service}
                onChange={(e) => {
                  if (e.target.value === 'add-new') setShowAddService(true);
                  else setFormData((prev) => ({ ...prev, service: e.target.value }));
                }}
                className="w-full py-4 px-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionnez un service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.name}>{service.name}</option>
                ))}
                <option value="add-new">+ Ajouter un nouveau service</option>
              </select>

              {services.length > 1 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200">
                      <span className="mr-2 text-gray-700">{service.name}</span>
                      <button type="button" onClick={() => handleDeleteServiceLocal(service)} className="text-gray-400 hover:text-red-500 p-1">
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
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-3 text-base focus:ring-2 focus:ring-blue-500"
                    placeholder="Nom du service"
                  />
                  <button type="button" onClick={handleAddService} className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={() => setShowAddService(false)} className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-2" /> Date
              </label>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      const prev = new Date(calendarMonth);
                      prev.setMonth(prev.getMonth() - 1);
                      setCalendarMonth(prev);
                    }}
                    className="px-2 py-1 text-sm rounded-md hover:bg-gray-100"
                  >‹</button>
                  <div className="text-sm font-medium">{monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Date(calendarMonth);
                      next.setMonth(next.getMonth() + 1);
                      setCalendarMonth(next);
                    }}
                    className="px-2 py-1 text-sm rounded-md hover:bg-gray-100"
                  >›</button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 mb-1">
                  {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((d) => (
                    <div key={d} className="text-center py-1">{d}</div>
                  ))}
                </div>

                {/* CALENDRIER AVEC CASES COLORÉES */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(calendarMonth).map((day, idx) => {
                    if (!day) return <div key={idx} className="h-10"></div>;

                    const dateString = formatDate(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                    const isSelected = dateString === formData.date;
                    
                    const { canFit, occupancy } = getDayAvailability(dateString);

                    // 1. Par défaut : Libre = GRIS FONCÉ (Visible)
                    let bgColor = 'bg-gray-200 border-gray-300 text-gray-900 hover:bg-gray-300'; 

                    if (!canFit) {
                      // 4. Complet = ROUGE VIF (Texte blanc)
                      bgColor = 'bg-red-500 border-red-600 text-white hover:bg-red-600 shadow-sm'; 
                    } else if (occupancy > 0.5) {
                      // 3. Chargé = ORANGE VIF (Texte blanc)
                      bgColor = 'bg-orange-500 border-orange-600 text-white hover:bg-orange-600 shadow-sm'; 
                    } else if (occupancy > 0.3) {
                      // 2. Moyen = BLEU VIF (Texte blanc)
                      bgColor = 'bg-blue-500 border-blue-600 text-white hover:bg-blue-600 shadow-sm'; 
                    }

                    // Style de la case
                    let cellClass = `relative h-10 sm:h-12 border rounded-lg flex flex-col items-center justify-center transition-all duration-200 ${bgColor}`;
                    
                    // Style de sélection (Anneau extérieur pour être visible sur les couleurs foncées)
                    if (isSelected) {
                      cellClass += ' ring-2 ring-offset-2 ring-indigo-600 z-10 font-bold transform scale-105';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, date: dateString }));
                          setCalendarMonth(new Date(dateString));
                        }}
                        className={cellClass}
                      >
                        <span className="text-sm">{day}</span>
                      </button>
                    );
                  })}
                </div>
                
                {/* LÉGENDE MISE À JOUR (Couleurs solides) */}
                <div className="flex flex-wrap gap-2 sm:gap-4 justify-center mt-3 text-[10px] text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gray-200 border border-gray-300"></div>
                    Libre
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-blue-500 border border-blue-600"></div>
                    Moyen
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-orange-500 border border-orange-600"></div>
                    Chargé
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-500 border border-red-600"></div>
                    Complet
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Clock className="h-4 w-4 mr-2" /> Heure
              </label>
              <button
                type="button"
                onClick={() => setShowTimeGrid(!showTimeGrid)}
                className="w-full text-left py-4 px-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 bg-white flex justify-between items-center"
              >
                <span>{formData.time}</span>
                {isLoadingSlots && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
              </button>
            </div>
          </div>

          {/* Time Grid (Popup) */}
          {showTimeGrid && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Disponibilités {isLoadingSlots && <span className="text-xs text-blue-500">(Chargement...)</span>}
                </span>
                <button type="button" onClick={() => setShowTimeGrid(false)} className="text-xs text-blue-600 font-medium p-2">Fermer</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => handleTimeSelect(slot)}
                    disabled={!slot.available}
                    className={`
                      px-3 py-3 text-sm font-medium rounded-lg border transition-all relative
                      ${slot.time === formData.time ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : ''}
                      ${!slot.available ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed line-through' : 
                        slot.warning && slot.time !== formData.time ? 'bg-orange-50 text-orange-800 border-orange-200' : 
                        slot.time !== formData.time ? 'bg-white text-gray-900 border-gray-300 hover:border-blue-400' : ''}
                    `}
                  >
                    {slot.time}
                    {slot.warning && slot.available && slot.time !== formData.time && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Durée (minutes)</label>
            <select
              value={showCustomDuration ? 'custom' : formData.duration.toString()}
              onChange={(e) => handleDurationChange(e.target.value)}
              className="w-full py-4 px-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 heure</option>
              <option value={90}>1,5 heure</option>
              <option value={120}>2 heures</option>
              {customDurations.map((duration) => (
                <option key={duration} value={duration}>{duration} minutes</option>
              ))}
              <option value="custom">Durée personnalisée</option>
            </select>

            {showCustomDuration && (
              <div className="flex gap-2 mt-2">
                <input
                  type="number"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-3 text-base"
                  placeholder="Minutes"
                />
                <button type="button" onClick={handleCustomDurationSubmit} className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">OK</button>
              </div>
            )}

            {/* CORRECTION TS #2 : Utilisation de handleDeleteDuration */}
            {customDurations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {customDurations.map((d) => (
                  <div key={d} className="flex items-center bg-gray-50 px-3 py-2 text-sm border rounded-lg">
                    <span className="mr-2">{d} min</span>
                    <button type="button" onClick={() => handleDeleteDuration(d)} className="text-gray-400 hover:text-red-500 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full py-4 px-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Notes supplémentaires..."
            />
          </div>

          {/* Price & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prix ($)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  price: e.target.value
                }))}
                className="w-full py-4 px-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500"
                step="0.01"
                min="0"
              />
            </div>
            {appointment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
                  className="w-full py-4 px-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500"
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
              className="flex-1 py-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoadingSlots}
              className={`flex-1 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 font-medium ${
                isLoadingSlots ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoadingSlots ? 'Vérification...' : appointment ? 'Modifier' : 'Créer'}
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
              <br /><br />
              Voulez-vous quand même enregistrer le rendez-vous à <span className="font-bold text-gray-900">{pendingTime}</span> ?
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
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg"
              >
                Oui, confirmer l'heure
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWarningModal(false);
                  setPendingTime(null);
                }}
                className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium"
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