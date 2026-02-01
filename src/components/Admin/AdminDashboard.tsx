import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  DollarSign,
  Search,
  Mail,
  Edit,
  Trash2,
  UserPlus,
  BarChart3,
  Loader2,
  AlertTriangle,
  X,
  CreditCard,
  FileText,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// --- INTERFACES ADAPTÉES À VOTRE SCHÉMA ---
interface Client {
  id: string;
  name: string; // user_profiles.full_name
  email: string; // user_profiles.email
  // phone retiré car absent de la DB
  plan: 'basic' | 'pro' | 'enterprise'; // user_profiles.subscription_status
  status: 'active' | 'inactive' | 'suspended'; // user_profiles.payment_status
  createdAt: string; // user_profiles.created_at
}

interface Payment {
  id: string;
  clientId: string;
  amount: number;
  date: string;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  notes?: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AdminDashboardProps {
  onLogout?: () => void;
  onMenuToggle?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'clients' | 'payments'
  >('overview');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    plan: 'basic' as 'basic' | 'pro' | 'enterprise',
  });

  // --- NOTIFICATIONS ---
  const addToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- CHARGEMENT ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Récupération Clients
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // 2. Récupération Historique Paiements
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payment_history')
        .select('*')
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // 3. Mapping Clients (Sans Phone, avec subscription_status)
      const formattedClients: Client[] = (profilesData || []).map((p) => ({
        id: p.id,
        name: p.full_name || 'Sans nom',
        email: p.email || '',
        plan: p.subscription_status || 'basic', // <--- CORRECTION ICI
        status: (p.payment_status as any) || 'inactive',
        createdAt: p.created_at,
      }));

      // 4. Mapping Paiements
      const formattedPayments: Payment[] = (paymentsData || []).map((p) => ({
        id: p.id,
        clientId: p.user_id,
        amount: p.amount,
        date: p.payment_date,
        method: p.payment_method || 'Inconnu',
        status: p.status,
        notes: p.notes,
      }));

      setClients(formattedClients);
      setPayments(formattedPayments);
    } catch (error: any) {
      console.error('Erreur data:', error);
      addToast('Erreur chargement: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS CRUD ---

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.email) {
      addToast('Nom et email requis', 'error');
      return;
    }

    try {
      // CORRECTION : Pas de colonne 'phone', mapping correct des champs
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([
          {
            full_name: newClient.name,
            email: newClient.email,
            subscription_status: newClient.plan, // <--- CORRECTION ICI
            payment_status: 'inactive',
            // Pas de phone ici
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const createdClient: Client = {
        id: data.id,
        name: data.full_name,
        email: data.email,
        plan: data.subscription_status,
        status: data.payment_status,
        createdAt: data.created_at,
      };

      setClients([createdClient, ...clients]);
      setNewClient({ name: '', email: '', plan: 'basic' });
      setShowAddModal(false);
      addToast('Client ajouté (DB)', 'success');
    } catch (error: any) {
      console.error('Erreur ajout:', error);
      addToast('Erreur ajout: ' + error.message, 'error');
    }
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;

    try {
      // CORRECTION : Pas de phone, utilisation de subscription_status
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: editingClient.name,
          email: editingClient.email,
          subscription_status: editingClient.plan, // <--- CORRECTION ICI
        })
        .eq('id', editingClient.id);

      if (error) throw error;

      setClients(
        clients.map((c) => (c.id === editingClient.id ? editingClient : c))
      );
      setEditingClient(null);
      addToast('Client mis à jour', 'success');
    } catch (error: any) {
      addToast('Erreur modif: ' + error.message, 'error');
    }
  };

  const toggleClientStatus = async (client: Client) => {
    const newStatus = client.status === 'active' ? 'inactive' : 'active';

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ payment_status: newStatus })
        .eq('id', client.id);

      if (error) throw error;

      setClients(
        clients.map((c) =>
          c.id === client.id ? { ...c, status: newStatus } : c
        )
      );
      addToast(`Statut changé: ${newStatus}`, 'info');
    } catch (error: any) {
      addToast('Erreur statut: ' + error.message, 'error');
    }
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      await supabase
        .from('payment_history')
        .delete()
        .eq('user_id', clientToDelete.id);

      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', clientToDelete.id);

      if (error) throw error;

      setClients(clients.filter((c) => c.id !== clientToDelete.id));
      setPayments(payments.filter((p) => p.clientId !== clientToDelete.id));

      addToast('Client supprimé', 'success');
      setClientToDelete(null);
    } catch (error: any) {
      addToast('Erreur suppression: ' + error.message, 'error');
    }
  };

  // --- FILTRES SÉCURISÉS ---
  const filteredClients = clients.filter((client) => {
    const name = client.name || '';
    const email = client.email || '';
    const term = searchTerm || '';

    const matchesSearch =
      name.toLowerCase().includes(term.toLowerCase()) ||
      email.toLowerCase().includes(term.toLowerCase());
    const matchesFilter =
      filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalClients: clients.length,
    activeClients: clients.filter((c) => c.status === 'active').length,
    totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
    monthlyRevenue: payments
      .filter((p) => {
        const d = new Date(p.date);
        const now = new Date();
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, p) => sum + p.amount, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* TOASTS */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center p-4 rounded-lg shadow-lg text-white min-w-[300px] animate-slide-up ${
              t.type === 'success'
                ? 'bg-green-600'
                : t.type === 'error'
                ? 'bg-red-600'
                : 'bg-blue-600'
            }`}
          >
            {t.type === 'success' && <CheckCircle className="w-5 h-5 mr-3" />}
            {t.type === 'error' && <XCircle className="w-5 h-5 mr-3" />}
            {t.type === 'info' && <AlertTriangle className="w-5 h-5 mr-3" />}
            <span className="flex-1 text-sm font-medium">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-3 hover:opacity-80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-500">Supabase Connected</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TABS */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: "Vue d'ensemble", icon: BarChart3 },
              { id: 'clients', label: 'Clients', icon: Users },
              { id: 'payments', label: 'Paiements', icon: DollarSign },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition ${
                  selectedTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* OVERVIEW */}
        {selectedTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Clients
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.totalClients}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Revenus ce mois
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.monthlyRevenue.toFixed(2)}€
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold mb-4">Activité récente</h3>
              <div className="space-y-4">
                {payments.slice(0, 5).map((payment) => {
                  const client = clients.find((c) => c.id === payment.clientId);
                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {client?.name || 'Inconnu'}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <CreditCard className="w-3 h-3" />
                            {payment.method}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {payment.amount}€
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(payment.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* CLIENTS */}
        {selectedTab === 'clients' && (
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex-1 w-full sm:max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Rechercher (nom ou email)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Tous</option>
                    <option value="active">Actifs</option>
                    <option value="inactive">Inactifs</option>
                  </select>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>Ajouter</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Créé le
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredClients.map((client) => (
                      <tr
                        key={client.id}
                        className="hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-indigo-600 font-semibold">
                                {(client.name || '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {client.name || 'Inconnu'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="w-4 h-4 mr-2" />
                            {client.email || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {client.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`flex items-center ${
                              client.status === 'active'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {client.status === 'active' ? (
                              <CheckCircle className="w-5 h-5 mr-1" />
                            ) : (
                              <XCircle className="w-5 h-5 mr-1" />
                            )}
                            {client.status === 'active' ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.createdAt
                            ? new Date(client.createdAt).toLocaleDateString(
                                'fr-FR'
                              )
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => toggleClientStatus(client)}
                              className={`px-3 py-1 rounded-lg text-white transition ${
                                client.status === 'active'
                                  ? 'bg-yellow-500 hover:bg-yellow-600'
                                  : 'bg-green-500 hover:bg-green-600'
                              }`}
                            >
                              {client.status === 'active'
                                ? 'Désactiver'
                                : 'Activer'}
                            </button>
                            <button
                              onClick={() => setEditingClient(client)}
                              className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setClientToDelete(client)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PAYMENTS */}
        {selectedTab === 'payments' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Méthode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((payment) => {
                    const client = clients.find(
                      (c) => c.id === payment.clientId
                    );
                    return (
                      <tr
                        key={payment.id}
                        className="hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {client?.name || 'Inconnu'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600">
                            <CreditCard className="w-4 h-4 mr-2" />
                            {payment.method}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {payment.amount.toFixed(2)}€
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              payment.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.notes && (
                            <div className="group relative">
                              <FileText className="w-4 h-4 cursor-pointer text-gray-400 hover:text-indigo-600" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs p-2 rounded hidden group-hover:block z-20">
                                {payment.notes}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-up">
            <h2 className="text-2xl font-bold mb-6">Ajouter un client</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) =>
                    setNewClient({ ...newClient, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) =>
                    setNewClient({ ...newClient, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {/* Pas de champ téléphone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan
                </label>
                <select
                  value={newClient.plan}
                  onChange={(e) =>
                    setNewClient({ ...newClient, plan: e.target.value as any })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleAddClient}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Ajouter DB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-up">
            <h2 className="text-2xl font-bold mb-6">Modifier le client</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={editingClient.name}
                  onChange={(e) =>
                    setEditingClient({ ...editingClient, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editingClient.email}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      email: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {/* Pas de champ téléphone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan
                </label>
                <select
                  value={editingClient.plan}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      plan: e.target.value as any,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setEditingClient(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateClient}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60] animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-scale-up border-t-4 border-red-500">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Confirmer la suppression
              </h2>
              <p className="text-gray-500 mb-6">
                Êtes-vous sûr de vouloir supprimer{' '}
                <strong>{clientToDelete.name}</strong> ?
                <br />
                <br />
                <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
                  Cette action est irréversible.
                </span>
              </p>
              <div className="flex space-x-3 w-full">
                <button
                  onClick={() => setClientToDelete(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDeleteClient}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium shadow-sm"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
