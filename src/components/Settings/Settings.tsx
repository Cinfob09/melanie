import React, { useState, useEffect } from 'react';
import { 
  Menu, Key, Plus, Trash2, Shield, User, Calendar, 
  Building, MapPin, Phone, Globe, Settings as SettingsIcon,
  Save, Loader2, Hash, CreditCard, ChevronRight, Mail, X,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Passkey } from '../../types';
import PasskeyModal from './PasskeyModal';

interface SettingsProps {
  onMenuToggle: () => void;
  onNavigate?: (view: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ onMenuToggle, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false);
  const [deletingPasskey, setDeletingPasskey] = useState<Passkey | null>(null);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    address: '',
    phone: '',
    website: '',
    neq: '',
    tps: '',
    tvq: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCurrentUser(user);
        const meta = user.user_metadata || {};
        setCompanyForm({
          companyName: meta.company_name || '',
          address: meta.company_address || '',
          phone: meta.company_phone || '',
          website: meta.company_website || '',
          neq: meta.company_neq || '',
          tps: meta.company_tps || '',
          tvq: meta.company_tvq || ''
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          company_name: companyForm.companyName,
          company_address: companyForm.address,
          company_phone: companyForm.phone,
          company_website: companyForm.website,
          company_neq: companyForm.neq,
          company_tps: companyForm.tps,
          company_tvq: companyForm.tvq
        }
      });
      if (error) throw error;
      alert('Informations mises à jour avec succès ! ✨');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleCreatePasskey = async (name: string) => {
    setIsPasskeyModalOpen(false);
    alert('Passkey créée (Simulation)');
  };

  const handleDeletePasskeyClick = (passkey: Passkey) => {
    setDeletingPasskey(passkey);
  };

  const confirmDeletePasskey = () => {
    if (deletingPasskey) {
      console.log('Deleted:', deletingPasskey.id);
      setDeletingPasskey(null);
    }
  };

  const cancelDeletePasskey = () => {
    setDeletingPasskey(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 h-full">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

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
        <h1 className="text-xl font-semibold text-gray-900">Paramètres</h1>
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
              Paramètres
            </h1>
            <p className="text-gray-600 mt-1">
              Gérez votre compte et les informations de votre entreprise
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Colonne gauche - Formulaire entreprise */}
          <div className="lg:col-span-2 space-y-6">
            {/* Carte Entreprise */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-gray-600" />
                  Informations de l'entreprise
                </h2>
              </div>
              
              <form onSubmit={handleSaveCompany} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de l'entreprise
                    </label>
                    <input 
                      type="text" 
                      value={companyForm.companyName}
                      onChange={e => setCompanyForm({...companyForm, companyName: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder="Votre entreprise"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse
                    </label>
                    <input 
                      type="text" 
                      value={companyForm.address}
                      onChange={e => setCompanyForm({...companyForm, address: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder="123 Rue Example, Ville, Province"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone
                    </label>
                    <input 
                      type="text" 
                      value={companyForm.phone}
                      onChange={e => setCompanyForm({...companyForm, phone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder="(000) 000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site Web
                    </label>
                    <input 
                      type="text" 
                      value={companyForm.website}
                      onChange={e => setCompanyForm({...companyForm, website: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder="www.exemple.com"
                    />
                  </div>

                  <div className="md:col-span-2 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">
                      Information Fiscale
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          NEQ
                        </label>
                        <input 
                          type="text" 
                          value={companyForm.neq}
                          onChange={e => setCompanyForm({...companyForm, neq: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                          placeholder="11XX..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          TPS
                        </label>
                        <input 
                          type="text" 
                          value={companyForm.tps}
                          onChange={e => setCompanyForm({...companyForm, tps: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                          placeholder="RT0001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          TVQ
                        </label>
                        <input 
                          type="text" 
                          value={companyForm.tvq}
                          onChange={e => setCompanyForm({...companyForm, tvq: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                          placeholder="TQ0001"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    type="submit"
                    disabled={isSavingCompany}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium disabled:opacity-70"
                  >
                    {isSavingCompany ? (
                      <Loader2 className="w-5 h-5 animate-spin"/>
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>

            {/* Banner Préférences */}
            {onNavigate && (
              <div 
                onClick={() => onNavigate('preferences')}
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <SettingsIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        Préférences Système
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Horaires, catégories, notifications
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-purple-600 transition-colors" />
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite - Profil & Sécurité */}
          <div className="space-y-6">
            {/* Carte Profil */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-6 text-center border-b border-gray-200">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white shadow-lg">
                  {currentUser?.email?.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-bold text-gray-900 text-lg truncate px-4">
                  {currentUser?.email}
                </h3>
                <span className="inline-block mt-3 px-4 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200">
                  {currentUser?.user_metadata?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                </span>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="truncate">{currentUser?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span>
                    Inscrit le {new Date(currentUser?.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Carte Sécurité */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-600" />
                  Passkeys
                </h3>
                <button
                  onClick={() => setIsPasskeyModalOpen(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>

              <div className="p-4">
                {passkeys.length > 0 ? (
                  <div className="space-y-2">
                    {passkeys.map((pk) => (
                      <div 
                        key={pk.id} 
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <Key className="w-5 h-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">
                            {pk.name}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDeletePasskeyClick(pk)} 
                          className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Key className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">
                      Aucune passkey configurée
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {isPasskeyModalOpen && (
          <PasskeyModal
            onSave={handleCreatePasskey}
            onClose={() => setIsPasskeyModalOpen(false)}
          />
        )}

        {/* Delete Passkey Confirmation Modal */}
        {deletingPasskey && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="relative w-full max-w-md" style={{ animation: 'scaleIn 0.3s ease-out' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-rose-600 to-pink-700 opacity-95 rounded-3xl" />
              <div className="absolute inset-0 backdrop-blur-xl bg-white/10 rounded-3xl" />
              
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-red-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-pink-400/30 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
              
              <div className="relative p-8">
                <button onClick={cancelDeletePasskey} className="absolute top-4 right-4 p-2 rounded-xl bg-white/15 backdrop-blur-md hover:bg-white/25 transition-all duration-300 border border-white/30 hover:scale-110 group">
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
                  Supprimer la passkey ?
                </h3>

                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 mb-6 border border-white/30 shadow-xl">
                  <p className="text-white/95 text-center leading-relaxed drop-shadow-md">
                    Voulez-vous vraiment supprimer la passkey{' '}
                    <span className="font-bold text-white">"{deletingPasskey.name}"</span> ?
                  </p>
                  <p className="text-white/80 text-sm text-center mt-2 drop-shadow">
                    Cette action est irréversible.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={cancelDeletePasskey} className="flex-1 px-6 py-4 bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white font-semibold rounded-xl transition-all duration-300 border border-white/40 hover:scale-105 shadow-lg">
                    Annuler
                  </button>
                  <button onClick={confirmDeletePasskey} className="flex-1 px-6 py-4 bg-white/90 hover:bg-white text-red-600 font-bold rounded-xl transition-all duration-300 border border-white shadow-2xl hover:scale-105 hover:shadow-red-500/50">
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
    </div>
  );
};

export default Settings;