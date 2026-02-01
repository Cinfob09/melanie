import React, { useState } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  User,
  Menu,
  Calendar,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Client, Appointment } from '../../types';
import ClientModal from './ClientModal';
import { ShowToastFunction } from '../../types/toast';

interface ClientListProps {
  clients: Client[];
  appointments: Appointment[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<boolean>;
  onUpdateClient: (id: string, client: Partial<Client>) => Promise<boolean>;
  onDeleteClient: (id: string) => Promise<boolean>;
  showToast: ShowToastFunction;
  onMenuToggle: () => void;
}

const ClientList: React.FC<ClientListProps> = ({
  clients,
  appointments,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  showToast,
  onMenuToggle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const getLastAppointmentCost = (clientId: string) => {
    const clientAppointments = appointments
      .filter((apt) => apt.clientId === clientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const lastAppointment = clientAppointments[0];
    return lastAppointment?.price || 0;
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contactPersonName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddClient = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleSaveClient = (clientData: Omit<Client, 'id'>) => {
    if (editingClient) {
      onUpdateClient(editingClient.id, clientData).then((success) => {
        if (success) {
          showToast(
            'success',
            `Client ${clientData.name} modifié avec succès ! 🎉`
          );
          setIsModalOpen(false);
          setEditingClient(null);
        } else {
          showToast('error', 'Erreur lors de la modification du client');
        }
      });
    } else {
      onAddClient(clientData).then((success) => {
        if (success) {
          showToast(
            'success',
            `Client ${clientData.name} créé avec succès ! ✨`
          );
          setIsModalOpen(false);
          setEditingClient(null);
        } else {
          showToast('error', 'Erreur lors de la création du client');
        }
      });
    }
  };

  const handleDeleteClick = (client: Client) => {
    setDeletingClient(client);
  };

  const confirmDelete = () => {
    if (deletingClient) {
      onDeleteClient(deletingClient.id).then((success) => {
        if (success) {
          showToast(
            'warning',
            `${deletingClient.name} a été supprimé 🗑️`,
            3500
          );
          setDeletingClient(null);
        } else {
          showToast('error', 'Erreur lors de la suppression du client');
        }
      });
    }
  };

  const cancelDelete = () => {
    setDeletingClient(null);
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
        <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 hidden lg:block">
                Clients
              </h1>
              <p className="text-gray-600 lg:hidden">
                Gérez votre base de données clients
              </p>
            </div>
          </div>
          <button
            onClick={handleAddClient}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors w-full sm:w-auto justify-center touch-manipulation font-medium"
          >
            <Plus className="w-4 h-4" />
            Ajouter un client
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher des clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
          />
        </div>

        {/* Client Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {client.name}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">
                    Contact : {client.contactPersonName}
                  </p>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => handleEditClient(client)}
                    className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors touch-manipulation"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(client)}
                    className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <div className="flex flex-col">
                    <a
                      href={`tel:${client.phone}`}
                      className="truncate hover:text-blue-600 transition-colors"
                    >
                      Client : {client.phone}
                    </a>
                    <a
                      href={`tel:${client.contactPersonPhone}`}
                      className="truncate hover:text-blue-600 transition-colors text-xs"
                    >
                      Contact : {client.contactPersonPhone}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{client.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {client.frequency === 'weekly'
                      ? 'Hebdomadaire'
                      : client.frequency === 'biweekly'
                      ? 'Bi-hebdomadaire'
                      : client.frequency === 'monthly'
                      ? 'Mensuel'
                      : client.frequency === 'quarterly'
                      ? 'Trimestriel'
                      : `Personnalisé (${client.customFrequencyDays} jours)`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">
                  <span>Dernier coût :</span>
                  <span className="font-semibold text-green-600">
                    ${getLastAppointmentCost(client.id).toFixed(2)}
                  </span>
                </div>
              </div>

              {client.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {client.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun client trouvé
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? "Essayez d'ajuster vos termes de recherche"
                : 'Commencez par ajouter votre premier client'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleAddClient}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation font-medium"
              >
                <Plus className="w-4 h-4" />
                Ajouter un client
              </button>
            )}
          </div>
        )}

        {/* Client Modal */}
        {isModalOpen && (
          <ClientModal
            client={editingClient}
            onSave={handleSaveClient}
            onClose={() => {
              setIsModalOpen(false);
              setEditingClient(null);
            }}
          />
        )}

        {/* Delete Confirmation Modal avec Liquid Glass */}
        {deletingClient && (
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
                  Êtes-vous sûr ?
                </h3>

                {/* Message */}
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 mb-6 border border-white/30 shadow-xl">
                  <p className="text-white/95 text-center leading-relaxed drop-shadow-md">
                    Voulez-vous vraiment supprimer le client{' '}
                    <span className="font-bold text-white">
                      {deletingClient.name}
                    </span>{' '}
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
                  from {
                    opacity: 0;
                  }
                  to {
                    opacity: 1;
                  }
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

export default ClientList;
