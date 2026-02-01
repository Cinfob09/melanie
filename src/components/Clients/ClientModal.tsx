import React, { useState, useEffect } from 'react';
import { X, User, Phone, UserCheck, Calendar } from 'lucide-react';
import { Client } from '../../types';
import AddressInput from './AddressInput';
import { usePreferences } from '../../hooks/usePreferences';

interface ClientModalProps {
  client?: Client | null;
  onSave: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

const ClientModal: React.FC<ClientModalProps> = ({
  client,
  onSave,
  onClose,
}) => {
  const { preferences } = usePreferences();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    contactPersonName: '',
    contactPersonPhone: '',
    frequency: '',
    customFrequencyDays: 30,
    notes: '',
  });
  const [showCustomFrequency, setShowCustomFrequency] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        phone: client.phone, // Assurez-vous que la BDD stocke le format ou brut, ici on l'affichera tel quel
        address: client.address,
        contactPersonName: client.contactPersonName || '',
        contactPersonPhone: client.contactPersonPhone || '',
        frequency: client.frequency,
        customFrequencyDays: client.customFrequencyDays || 30,
        notes: client.notes || '',
      });
      setShowCustomFrequency(client.frequency === 'custom');
    } else if (
      preferences &&
      preferences.frequency_options.length > 0 &&
      !formData.frequency
    ) {
      setFormData((prev) => ({
        ...prev,
        frequency: preferences.frequency_options[0].value,
      }));
    }
  }, [client, preferences]);

  // --- NOUVELLE FONCTION DE FORMATAGE ---
  const formatPhoneNumber = (value: string) => {
    // 1. On nettoie tout ce qui n'est pas un chiffre
    const numbers = value.replace(/\D/g, '');

    // 2. On formate selon la longueur (Max 10 chiffres)
    if (numbers.length === 0) return '';
    
    // Si moins de 4 chiffres : (123
    if (numbers.length < 4) return `(${numbers}`;
    
    // Si moins de 7 chiffres : (123) 456
    if (numbers.length < 7) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    }

    // Si 7 chiffres ou plus : (123) 456-7890
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    // --- MODIFICATION ICI POUR LE FORMATAGE TÉLÉPHONE ---
    if (name === 'phone' || name === 'contactPersonPhone') {
      // On applique le formatage avant de sauvegarder dans le state
      const formattedPhone = formatPhoneNumber(value);
      setFormData((prev) => ({ ...prev, [name]: formattedPhone }));
    } 
    // Logique existante pour la fréquence
    else if (name === 'frequency') {
      setShowCustomFrequency(value === 'custom');
      if (value !== 'custom') {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          customFrequencyDays: undefined,
        }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-md sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            {client ? 'Modifier le client' : 'Ajouter un nouveau client'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <User className="h-4 w-4 inline mr-2" />
              Nom du client
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
              placeholder="Entrez le nom du client"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Phone className="h-4 w-4 inline mr-2" />
              Numéro de téléphone du client
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              maxLength={14} // (123) 456-7890 fait 14 caractères
              className="w-full border border-gray-300 rounded-lg px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
              placeholder="(123) 456-7890" // Placeholder mis à jour
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse
            </label>
            <AddressInput
              value={formData.address}
              onChange={(address) =>
                setFormData((prev) => ({ ...prev, address }))
              }
              placeholder="Entrez l'adresse du client"
              required={true}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <UserCheck className="h-4 w-4 inline mr-2" />
              Nom de la personne de contact
            </label>
            <input
              type="text"
              name="contactPersonName"
              value={formData.contactPersonName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
              placeholder="Entrez le nom de la personne de contact"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Phone className="h-4 w-4 inline mr-2" />
              Téléphone portable de la personne de contact
            </label>
            <input
              type="tel"
              name="contactPersonPhone"
              value={formData.contactPersonPhone}
              onChange={handleChange}
              maxLength={14} // (123) 456-7890 fait 14 caractères
              className="w-full border border-gray-300 rounded-lg px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
              placeholder="(123) 456-7890" // Placeholder mis à jour
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Calendar className="h-4 w-4 inline mr-2" />
              Fréquence des rendez-vous
            </label>

            <select
              name="frequency"
              value={formData.frequency}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
              required
            >
              <option value="" disabled>
                Sélectionner une fréquence
              </option>

              {preferences?.frequency_options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.days} jours)
                </option>
              ))}

              <option value="custom">Personnalisé</option>
            </select>

            {showCustomFrequency && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de jours personnalisé
                </label>
                <input
                  type="number"
                  name="customFrequencyDays"
                  value={formData.customFrequencyDays}
                  onChange={handleChange}
                  min="1"
                  max="365"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                  placeholder="Entrez le nombre de jours"
                  required={showCustomFrequency}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation resize-none"
              rows={3}
              placeholder="Notes supplémentaires sur le client"
            />
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
              {client ? 'Modifier' : 'Ajouter'} le client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientModal;