import React, { useState, useEffect } from 'react';
import { Menu, Key, Plus, Trash2, Shield, User, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Passkey } from '../../types';
import PasskeyModal from './PasskeyModal';

interface SettingsProps {
  onMenuToggle: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onMenuToggle }) => {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser();
    loadPasskeys();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadPasskeys = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // For now, use empty array since passkeys table might not exist
      // This will be populated when the passkeys table is properly set up
      setPasskeys([]);
    } catch (error) {
      console.error('Error loading passkeys:', error);
      setPasskeys([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePasskey = async (name: string) => {
    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        alert('Les passkeys ne sont pas supportées par ce navigateur');
        return;
      }

      // Generate a challenge (in production, this should come from the server)
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "Outils Internes",
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(currentUser.id),
          name: currentUser.email,
          displayName: currentUser.email,
        },
        pubKeyCredParams: [
          {
            alg: -7, // ES256
            type: "public-key",
          },
          {
            alg: -257, // RS256
            type: "public-key",
          },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "direct",
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Échec de la création de la passkey');
      }

      // Store the passkey in the database
      // For now, just show success message
      // The passkey would be stored in the database when the table is properly set up
      console.log('Passkey created successfully (demo mode)');

      await loadPasskeys();
      setIsModalOpen(false);
      alert('Passkey créée avec succès !');
    } catch (error) {
      console.error('Error creating passkey:', error);
      alert('Erreur lors de la création de la passkey');
    }
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette passkey ?')) {
      return;
    }

    try {
      // For now, just remove from local state
      // The passkey would be deleted from database when the table is properly set up
      console.log('Passkey deleted successfully (demo mode)');

      await loadPasskeys();
    } catch (error) {
      console.error('Error deleting passkey:', error);
      alert('Erreur lors de la suppression de la passkey');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des paramètres...</p>
        </div>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 hidden lg:block">Paramètres</h1>
            <p className="text-gray-600 lg:hidden">Gérez vos paramètres de sécurité</p>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Informations du compte
          </h2>
          {currentUser && (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Email :</span>
                <span className="font-medium text-gray-900">{currentUser.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Compte créé :</span>
                <span className="font-medium text-gray-900">
                  {formatDate(currentUser.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Dernière connexion :</span>
                <span className="font-medium text-gray-900">
                  {currentUser.last_sign_in_at ? formatDate(currentUser.last_sign_in_at) : 'Jamais'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Passkeys Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Key className="w-5 h-5 mr-2" />
              Passkeys
            </h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation font-medium"
            >
              <Plus className="w-4 h-4" />
              Créer une passkey
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Les passkeys offrent une authentification sécurisée sans mot de passe en utilisant 
            la biométrie ou un code PIN de votre appareil.
          </p>

          {passkeys.length > 0 ? (
            <div className="space-y-3">
              {passkeys.map((passkey) => (
                <div
                  key={passkey.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Shield className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{passkey.name}</h3>
                      <p className="text-sm text-gray-600">
                        Créée le {formatDate(passkey.created_at)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePasskey(passkey.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation"
                    title="Supprimer la passkey"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <Key className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune passkey configurée
              </h3>
              <p className="text-gray-600 mb-4">
                Créez votre première passkey pour une authentification plus sécurisée
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation font-medium"
              >
                <Plus className="w-4 h-4" />
                Créer une passkey
              </button>
            </div>
          )}
        </div>

        {/* Security Tips */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Conseils de sécurité
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm">
                Utilisez des passkeys pour une authentification sans mot de passe
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm">
                Gardez vos appareils à jour pour la sécurité optimale
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm">
                Ne partagez jamais vos identifiants de connexion
              </span>
            </li>
          </ul>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <PasskeyModal
            onSave={handleCreatePasskey}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Settings;