import React, { useState } from 'react';
import { X, Key, Shield } from 'lucide-react';

interface PasskeyModalProps {
  onSave: (name: string) => void;
  onClose: () => void;
}

const PasskeyModal: React.FC<PasskeyModalProps> = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Le nom de la passkey est requis');
      return;
    }

    onSave(name.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-md sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Créer une nouvelle passkey
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Info Section */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-900 mb-2">Qu'est-ce qu'une passkey ?</h3>
                <p className="text-sm text-blue-800">
                  Une passkey est une méthode d'authentification sécurisée qui utilise 
                  la biométrie (empreinte digitale, reconnaissance faciale) ou un code PIN 
                  de votre appareil au lieu d'un mot de passe traditionnel.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Key className="h-4 w-4 inline mr-2" />
                Nom de la passkey
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                className={`w-full border rounded-lg px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: Mon iPhone, Mon ordinateur portable..."
                required
              />
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Donnez un nom descriptif pour identifier cette passkey
              </p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Key className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-yellow-900 mb-1">Avant de continuer</h4>
                  <p className="text-sm text-yellow-800">
                    Assurez-vous que votre appareil supporte l'authentification biométrique 
                    ou qu'un code PIN est configuré.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation font-medium"
              >
                Créer la passkey
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasskeyModal;