import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Bell,
  Tag,
  ArrowRight,
  ArrowLeft,
  Check,
  HelpCircle,
  Plus,
  Trash2,
  Building, // Nouvel icône pour l'entreprise
} from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Nécessaire pour charger/sauvegarder les infos entreprise
import {
  usePreferences,
  FrequencyOption,
  ExpenseCategory,
} from '../../hooks/usePreferences';

const Preferences: React.FC = () => {
  const { preferences, loading: prefLoading, createDefaultPreferences, updatePreferences } =
    usePreferences();

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // État du formulaire combiné (Entreprise + Préférences)
  const [formData, setFormData] = useState({
    // --- Infos Entreprise (auth.users metadata) ---
    companyName: '',
    address: '',
    phone: '',
    website: '',
    neq: '',
    tps: '',
    tvq: '',

    // --- Préférences (user_settings table) ---
    min_time_between_appointments: 90,
    business_hours_start: '08:00',
    business_hours_end: '18:00',
    notification_days_before: 7,
    frequency_options: [] as FrequencyOption[],
    expense_categories: [] as ExpenseCategory[],
  });

  // États pour les nouveaux items (Fréquences/Catégories)
  const [newFrequency, setNewFrequency] = useState({ label: '', days: '' });
  const [newCategory, setNewCategory] = useState('');

  // Préremplir les fréquences par défaut
  const defaultFrequencies: FrequencyOption[] = [
    { value: 'weekly', label: 'Hebdomadaire', days: 7 },
    { value: 'biweekly', label: 'Aux 2 semaines', days: 14 },
    { value: 'monthly', label: 'Mensuel', days: 30 },
    { value: 'quarterly', label: 'Trimestriel', days: 90 },
  ];

  // Préremplir les catégories par défaut
  const defaultCategories: ExpenseCategory[] = [
    { value: 'supplies', label: 'Fournitures' },
    { value: 'equipment', label: 'Équipement' },
    { value: 'transportation', label: 'Transport' },
    { value: 'utilities', label: 'Services publics' },
    { value: 'services', label: 'Prestataires' },
    { value: 'other', label: 'Autre' },
  ];

  // --- CHARGEMENT DES DONNÉES (LIVE LOADING) ---
  useEffect(() => {
    // Remplacer la partie chargement user_metadata par ceci :
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', user.id)
  .single();

let companyData = {
  companyName: profile?.company_name || '',
  address: profile?.company_address || '',
  phone: profile?.company_phone || '',
  website: profile?.company_website || '',
  neq: profile?.company_neq || '',
  tps: profile?.company_tps || '',
  tvq: profile?.company_tvq || ''
};
        if (user && user.user_metadata) {
          const meta = user.user_metadata;
          companyData = {
            companyName: meta.company_name || '',
            address: meta.company_address || '',
            phone: meta.company_phone || '',
            website: meta.company_website || '',
            neq: meta.company_neq || '',
            tps: meta.company_tps || '',
            tvq: meta.company_tvq || ''
          };
        }

        // 2. Charger les préférences (si elles existent via le hook)
        // Note: preferences vient du hook usePreferences
        if (preferences) {
          setFormData(prev => ({
            ...prev,
            ...companyData, // Fusionner infos entreprise
            min_time_between_appointments: preferences.min_time_between_appointments,
            business_hours_start: preferences.business_hours_start.slice(0, 5),
            business_hours_end: preferences.business_hours_end.slice(0, 5),
            notification_days_before: preferences.notification_days_before,
            frequency_options: preferences.frequency_options,
            expense_categories: preferences.expense_categories,
          }));
        } else {
          // Si pas de préférences, on met les infos entreprise + défauts
          setFormData(prev => ({
            ...prev,
            ...companyData,
            frequency_options: defaultFrequencies,
            expense_categories: defaultCategories,
          }));
        }
        
        setDataLoaded(true);
      } catch (e) {
        console.error("Erreur chargement données", e);
      }
    };

    loadAllData();
    // On ne veut PAS changer d'étape automatiquement ici (setCurrentStep retiré)
  }, [preferences]);

  // --- DÉFINITION DES ÉTAPES ---
  const steps = [
    {
      title: 'Informations de l\'entreprise',
      subtitle: 'Identité et coordonnées fiscales',
      icon: Building,
      help: 'Ces informations apparaîtront sur vos factures et documents officiels. Remplissez les champs nécessaires (NEQ, TPS, TVQ) pour votre comptabilité.',
    },
    {
      title: 'Horaires de travail',
      subtitle: 'Définissez vos heures d\'ouverture',
      icon: Clock,
      help: 'Ces heures détermineront les créneaux disponibles pour vos rendez-vous. Vous pourrez toujours les modifier plus tard.',
    },
    {
      title: 'Espacement des rendez-vous',
      subtitle: 'Temps de pause entre chaque client',
      icon: Calendar,
      help: 'Ce délai vous permet de préparer votre espace, nettoyer et vous reposer entre les rendez-vous. Un avertissement s\'affichera si vous programmez trop proche.',
    },
    {
      title: 'Fréquences de rendez-vous',
      subtitle: 'Options pour vos clients réguliers',
      icon: Calendar,
      help: 'Choisissez les fréquences que vous proposerez à vos clients. Vous pouvez utiliser celles proposées ou créer les vôtres.',
    },
    {
      title: 'Catégories de dépenses',
      subtitle: 'Organisez vos dépenses professionnelles',
      icon: Tag,
      help: 'Sélectionnez les types de dépenses que vous aurez. Cela facilitera votre comptabilité et vos déclarations fiscales.',
    },
    {
      title: 'Notifications',
      subtitle: 'Rappels pour vos rendez-vous',
      icon: Bell,
      help: 'Définissez combien de jours avant un rendez-vous vous souhaitez voir les rappels s\'afficher.',
    },
  ];

  // --- LOGIQUE UI (Toggle, Add, Remove) ---

  const toggleFrequency = (freq: FrequencyOption) => {
    const exists = formData.frequency_options.some(f => f.value === freq.value);
    if (exists) {
      setFormData(prev => ({
        ...prev,
        frequency_options: prev.frequency_options.filter(f => f.value !== freq.value),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        frequency_options: [...prev.frequency_options, freq],
      }));
    }
  };

  const addCustomFrequency = () => {
    if (newFrequency.label && newFrequency.days) {
      const days = parseInt(newFrequency.days);
      const value = `custom_${Date.now()}`;
      const freq: FrequencyOption = { value, label: newFrequency.label, days };
      setFormData(prev => ({
        ...prev,
        frequency_options: [...prev.frequency_options, freq],
      }));
      setNewFrequency({ label: '', days: '' });
    }
  };

  const removeFrequency = (value: string) => {
    setFormData(prev => ({
      ...prev,
      frequency_options: prev.frequency_options.filter(f => f.value !== value),
    }));
  };

  const toggleCategory = (cat: ExpenseCategory) => {
    const exists = formData.expense_categories.some(c => c.value === cat.value);
    if (exists) {
      setFormData(prev => ({
        ...prev,
        expense_categories: prev.expense_categories.filter(c => c.value !== cat.value),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        expense_categories: [...prev.expense_categories, cat],
      }));
    }
  };

  const addCustomCategory = () => {
    if (newCategory.trim()) {
      const value = `custom_${Date.now()}`;
      const cat: ExpenseCategory = { value, label: newCategory.trim() };
      setFormData(prev => ({
        ...prev,
        expense_categories: [...prev.expense_categories, cat],
      }));
      setNewCategory('');
    }
  };

  const removeCategory = (value: string) => {
    setFormData(prev => ({
      ...prev,
      expense_categories: prev.expense_categories.filter(c => c.value !== value),
    }));
  };

  // --- NAVIGATION ---

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setShowHelp(false);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setShowHelp(false);
    }
  };

  // --- SAUVEGARDE GLOBALE ---
  const handleFinish = async () => {
    setSaving(true);
    try {
      // Remplacer supabase.auth.updateUser par ceci :
const { error: profileError } = await supabase
  .from('user_profiles')
  .update({
    company_name: formData.companyName,
    company_address: formData.address,
    company_phone: formData.phone,
    company_website: formData.website,
    company_neq: formData.neq,
    company_tps: formData.tps,
    company_tvq: formData.tvq
  })
  .eq('id', (await supabase.auth.getUser()).data.user?.id);

if (profileError) throw profileError;

      // 2. Sauvegarder les Préférences (User Settings Table)
      const prefData = {
        min_time_between_appointments: formData.min_time_between_appointments,
        business_hours_start: formData.business_hours_start + ':00',
        business_hours_end: formData.business_hours_end + ':00',
        notification_days_before: formData.notification_days_before,
        frequency_options: formData.frequency_options,
        expense_categories: formData.expense_categories,
      };

      let success = false;
      if (preferences) {
        success = await updatePreferences(prefData);
      } else {
        // Si c'est la première fois, on crée d'abord l'entrée par défaut puis on update
        success = await createDefaultPreferences();
        if (success) {
          success = await updatePreferences(prefData);
        }
      }

      if (success) {
        // Tout est bon, on reload pour appliquer partout
        window.location.reload();
      }
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      alert('Une erreur est survenue lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  if (prefLoading && !dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 mt-4 text-center">Chargement des préférences...</p>
        </div>
      </div>
    );
  }

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex flex-col">
      {/* Progress Bar */}
      <div className="w-full px-4 pt-4 pb-2">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/20 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white text-center mt-1.5 text-xs font-medium">
            Étape {currentStep + 1} sur {steps.length}
          </p>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto pb-4">
          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                  <StepIcon className="w-8 h-8" />
                </div>
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors touch-manipulation"
                >
                  <HelpCircle className="w-6 h-6" />
                </button>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                {currentStepData.title}
              </h2>
              <p className="text-blue-100 text-sm sm:text-base">
                {currentStepData.subtitle}
              </p>
            </div>

            {/* Help Message */}
            {showHelp && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mx-6 mt-6 rounded-r-lg">
                <p className="text-blue-900 text-sm leading-relaxed">
                  💡 {currentStepData.help}
                </p>
              </div>
            )}

            {/* Content */}
            <div className="p-6 sm:p-8">
              
              {/* Step 0 (NEW): Informations Entreprise */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Nom de l'entreprise</label>
                      <input 
                        type="text" 
                        value={formData.companyName}
                        onChange={e => setFormData({...formData, companyName: e.target.value})}
                        className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="Votre Entreprise Inc."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Adresse</label>
                      <input 
                        type="text" 
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="123 Rue Principale..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Téléphone</label>
                        <input 
                          type="tel" 
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Site Web</label>
                        <input 
                          type="text" 
                          value={formData.website}
                          onChange={e => setFormData({...formData, website: e.target.value})}
                          className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="www.exemple.com"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 mt-2">
                       <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                         <Tag className="w-4 h-4 text-blue-600"/> Infos Fiscales (Optionnel)
                       </h3>
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">NEQ</label>
                            <input type="text" value={formData.neq} onChange={e => setFormData({...formData, neq: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg"/>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">TPS</label>
                            <input type="text" value={formData.tps} onChange={e => setFormData({...formData, tps: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg"/>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">TVQ</label>
                            <input type="text" value={formData.tvq} onChange={e => setFormData({...formData, tvq: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg"/>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Horaires */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                        Ouverture
                      </label>
                      <input
                        type="time"
                        value={formData.business_hours_start}
                        onChange={(e) =>
                          setFormData({ ...formData, business_hours_start: e.target.value })
                        }
                        className="w-full px-3 py-3 text-base sm:text-lg font-semibold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all touch-manipulation"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                        Fermeture
                      </label>
                      <input
                        type="time"
                        value={formData.business_hours_end}
                        onChange={(e) =>
                          setFormData({ ...formData, business_hours_end: e.target.value })
                        }
                        className="w-full px-3 py-3 text-base sm:text-lg font-semibold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all touch-manipulation"
                      />
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">
                      ⏰ Vos rendez-vous seront proposés entre{' '}
                      <span className="font-bold text-gray-900">{formData.business_hours_start}</span>
                      {' '}et{' '}
                      <span className="font-bold text-gray-900">{formData.business_hours_end}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Espacement */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                      Temps minimum entre rendez-vous
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="180"
                        step="15"
                        value={formData.min_time_between_appointments}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            min_time_between_appointments: parseInt(e.target.value),
                          })
                        }
                        className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer touch-manipulation"
                      />
                      <div className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-xl text-center sm:min-w-[100px]">
                        {formData.min_time_between_appointments} min
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[30, 60, 90, 120].map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, min_time_between_appointments: minutes })
                        }
                        className={`py-3 px-4 rounded-xl font-semibold transition-all touch-manipulation ${
                          formData.min_time_between_appointments === minutes
                            ? 'bg-blue-600 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                        }`}
                      >
                        {minutes} min
                      </button>
                    ))}
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Un avertissement s'affichera si vous planifiez deux rendez-vous à moins de{' '}
                      <span className="font-bold">{formData.min_time_between_appointments} minutes</span>{' '}
                      d'intervalle.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Fréquences */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm mb-4">
                    Cliquez pour sélectionner ou désélectionner :
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Options par défaut (toggle) */}
                    {defaultFrequencies.map((freq) => {
                      const isSelected = formData.frequency_options.some(f => f.value === freq.value);
                      return (
                        <button
                          key={freq.value}
                          type="button"
                          onClick={() => toggleFrequency(freq)}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-gray-900">{freq.label}</p>
                              <p className="text-sm text-gray-600">Tous les {freq.days} jours</p>
                            </div>
                            {isSelected && (
                              <div className="bg-blue-500 rounded-full p-1 flex-shrink-0">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    
                    {/* Options personnalisées (toggle + supprimer) */}
                    {formData.frequency_options
                      .filter(freq => !defaultFrequencies.some(d => d.value === freq.value))
                      .map((freq) => (
                        <div
                          key={freq.value}
                          className="p-4 rounded-xl border-2 border-blue-500 bg-blue-50 shadow-md relative"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-gray-900">{freq.label}</p>
                              <p className="text-sm text-gray-600">Tous les {freq.days} jours</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="bg-blue-500 rounded-full p-1 flex-shrink-0">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFrequency(freq.value)}
                                className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors touch-manipulation"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>

                  {/* Ajouter une fréquence personnalisée */}
                  <div className="border-t-2 border-gray-200 pt-4 mt-6">
                    <p className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                      + Créer une fréquence personnalisée
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="Ex: Bimensuel"
                        value={newFrequency.label}
                        onChange={(e) => setNewFrequency({ ...newFrequency, label: e.target.value })}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 touch-manipulation"
                      />
                      <input
                        type="number"
                        placeholder="Jours"
                        value={newFrequency.days}
                        onChange={(e) => setNewFrequency({ ...newFrequency, days: e.target.value })}
                        className="w-full sm:w-28 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 touch-manipulation"
                      />
                      <button
                        type="button"
                        onClick={addCustomFrequency}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2 touch-manipulation"
                      >
                        <Plus className="w-5 h-5" />
                        Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Catégories */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm mb-4">
                    Cliquez pour sélectionner ou désélectionner :
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Options par défaut (toggle) */}
                    {defaultCategories.map((cat) => {
                      const isSelected = formData.expense_categories.some(c => c.value === cat.value);
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-gray-900 flex-1">{cat.label}</p>
                            {isSelected && (
                              <div className="bg-blue-500 rounded-full p-1 flex-shrink-0">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    
                    {/* Options personnalisées (toggle + supprimer) */}
                    {formData.expense_categories
                      .filter(cat => !defaultCategories.some(d => d.value === cat.value))
                      .map((cat) => (
                        <div
                          key={cat.value}
                          className="p-4 rounded-xl border-2 border-blue-500 bg-blue-50 shadow-md"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-gray-900 flex-1">{cat.label}</p>
                            <div className="flex items-center gap-2">
                              <div className="bg-blue-500 rounded-full p-1 flex-shrink-0">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeCategory(cat.value)}
                                className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors touch-manipulation"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>

                  {/* Ajouter une catégorie personnalisée */}
                  <div className="border-t-2 border-gray-200 pt-4 mt-6">
                    <p className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                      + Créer une catégorie personnalisée
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Ex: Marketing"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 touch-manipulation"
                      />
                      <button
                        type="button"
                        onClick={addCustomCategory}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center gap-2 touch-manipulation"
                      >
                        <Plus className="w-5 h-5" />
                        Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Notifications */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                      Rappels des rendez-vous
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="14"
                        value={formData.notification_days_before}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            notification_days_before: parseInt(e.target.value),
                          })
                        }
                        className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer touch-manipulation"
                      />
                      <div className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold text-xl text-center sm:min-w-[120px]">
                        {formData.notification_days_before} jour{formData.notification_days_before > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 3, 7, 14].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, notification_days_before: days })
                        }
                        className={`py-3 px-4 rounded-xl font-semibold transition-all touch-manipulation ${
                          formData.notification_days_before === days
                            ? 'bg-purple-600 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                        }`}
                      >
                        {days}j
                      </button>
                    ))}
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-sm text-purple-800">
                      🔔 Les rendez-vous apparaîtront dans vos notifications{' '}
                      <span className="font-bold">{formData.notification_days_before} jour{formData.notification_days_before > 1 ? 's' : ''}</span>{' '}
                      avant la date prévue.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="bg-gray-50 px-6 py-4 sm:px-8 flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 sm:px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 active:bg-gray-200 transition-all touch-manipulation"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Retour</span>
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all disabled:opacity-50 shadow-lg touch-manipulation"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sauvegarde...
                  </>
                ) : currentStep === steps.length - 1 ? (
                  <>
                    <Check className="w-5 h-5" />
                    Terminer et Sauvegarder
                  </>
                ) : (
                  <>
                    Continuer
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preferences;