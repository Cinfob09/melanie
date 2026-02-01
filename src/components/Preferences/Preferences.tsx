import React, { useState, useEffect } from 'react';
import { Save, Clock, Bell, Loader2, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { usePreferences } from '../../hooks/usePreferences';

interface PreferencesProps {
  onBack?: () => void;
}

const Preferences: React.FC<PreferencesProps> = ({ onBack }) => {
  const { preferences, updatePreferences, loading } = usePreferences();
  
  const [formData, setFormData] = useState({
    business_hours_start: '09:00',
    business_hours_end: '17:00',
    min_time_between_appointments: 60,
    notification_days_before: 1,
    show_upcoming_appointments: true,
    show_frequency_reminders: true
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (preferences) {
      setFormData({
        business_hours_start: preferences.business_hours_start?.slice(0, 5) || '09:00',
        business_hours_end: preferences.business_hours_end?.slice(0, 5) || '17:00',
        min_time_between_appointments: preferences.min_time_between_appointments || 60,
        notification_days_before: preferences.notification_days_before || 1,
        show_upcoming_appointments: preferences.show_upcoming_appointments ?? true,
        show_frequency_reminders: preferences.show_frequency_reminders ?? true
      });
    }
  }, [preferences]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const success = await updatePreferences(formData);
      if (success) {
        setMessage({ type: 'success', text: 'Préférences enregistrées avec succès !' });
        // Effacer le message après 3 secondes
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Erreur lors de la sauvegarde');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Impossible de sauvegarder les préférences.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Retour"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Préférences Système</h1>
          <p className="text-gray-500 text-sm">Configurez le comportement de l'application</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        } animate-in fade-in slide-in-from-top-2`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section Horaires */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Horaires & Rendez-vous
            </h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Début de journée
              </label>
              <input
                type="time"
                name="business_hours_start"
                value={formData.business_hours_start}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fin de journée
              </label>
              <input
                type="time"
                name="business_hours_end"
                value={formData.business_hours_end}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temps minimum entre les rendez-vous (minutes)
              </label>
              <select
                name="min_time_between_appointments"
                value={formData.min_time_between_appointments}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Utilisé pour calculer les avertissements de conflits d'horaire.
              </p>
            </div>
          </div>
        </div>

        {/* Section Notifications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Générateur de Notifications
            </h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Avertir des rendez-vous à venir (jours avant)
              </label>
              <input
                type="number"
                name="notification_days_before"
                value={formData.notification_days_before}
                onChange={handleChange}
                min="1"
                max="7"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-6 items-center">
                  <input
                    id="show_upcoming_appointments"
                    name="show_upcoming_appointments"
                    type="checkbox"
                    checked={formData.show_upcoming_appointments}
                    onChange={handleChange}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                </div>
                <div className="text-sm">
                  <label htmlFor="show_upcoming_appointments" className="font-medium text-gray-900">
                    Activer les rappels de rendez-vous
                  </label>
                  <p className="text-gray-500">Génère une notification le matin pour les rendez-vous de la journée.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 items-center">
                  <input
                    id="show_frequency_reminders"
                    name="show_frequency_reminders"
                    type="checkbox"
                    checked={formData.show_frequency_reminders}
                    onChange={handleChange}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                </div>
                <div className="text-sm">
                  <label htmlFor="show_frequency_reminders" className="font-medium text-gray-900">
                    Activer les rappels de fréquence client
                  </label>
                  <p className="text-gray-500">Génère une notification si un client dépasse sa fréquence habituelle sans rendez-vous.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-semibold shadow-md disabled:opacity-70"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Enregistrer les modifications
          </button>
        </div>
      </form>
    </div>
  );
};

export default Preferences;