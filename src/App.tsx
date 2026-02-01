import React, { useState, useEffect } from 'react';

// --- IMPORTS DES HOOKS ---
import { useAuth } from './hooks/useAuth';
import { useClients } from './hooks/useClients';
import { useAppointments } from './hooks/useAppointments';
import { usePreferences } from './hooks/usePreferences';

// --- IMPORTS DES COMPOSANTS ---
import LoginForm from './components/LoginForm';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import MyDay from './components/MyDay/MyDay';
import Calendar from './components/Calendar/Calendar';
import ClientList from './components/Clients/ClientList';
import Notifications from './components/Notifications/Notifications';
import UserManagement from './components/Users/UserManagement';
import Settings from './components/Settings/Settings';
import Preferences from './components/Preferences/Preferences';
import { Expenses } from './components/Expenses/Expenses';
import Analytics from './components/Analytics/Analytics';
import AdminDashboard from './components/Admin/AdminDashboard';
import PaymentWarningModal from './components/Payment/PaymentWarningModal';
import { useToast } from './hooks/useToast';
import ToastContainer from './components/Toast/ToastContainer';
import { ShowToastFunction } from './types/toast';
import { useNotificationGenerator } from './hooks/useNotificationGenerator';

// --- TYPES ---
type ViewType =
  | 'dashboard'
  | 'myday'
  | 'notifications'
  | 'calendar'
  | 'clients'
  | 'expenses'
  | 'analytics'
  | 'users'
  | 'settings'
  | 'preferences'
  | 'admin-payments';

function App() {
  // 1. Authentification & Préférences
  const { user, login, logout, register, loading: authLoading } = useAuth();
  const { preferencesExist, createDefaultPreferences } = usePreferences();
  const [appReady, setAppReady] = useState(false);

  // 2. Données métier
  const { clients, addClient, updateClient, deleteClient, refreshClients, loading: clientsLoading } =
    useClients();
  const { appointments, addAppointment, updateAppointment, deleteAppointment, loading: appointmentsLoading } =
    useAppointments();

  const isDataLoading = (clientsLoading || appointmentsLoading) || (clients.length > 0 && appointments.length === 0);

  // 4. On passe "isDataLoading" au générateur
  useNotificationGenerator(appointments, clients, isDataLoading);
  
  // 3. États de l'interface
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { toasts, showToast, removeToast } = useToast();
  console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
  console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_ANON_KEY);



 // --- LOGIQUE : AUTO-REFRESH (Visibility API) ---
  useEffect(() => {
    if (!user) return;

    const checkReload = () => {
      const needsReload = sessionStorage.getItem('needs_refresh');
      if (needsReload === 'true') {
        sessionStorage.removeItem('needs_refresh');
        window.location.reload();
      }
    };

    const markAsLeft = () => sessionStorage.setItem('needs_refresh', 'true');

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        markAsLeft();
      } else if (document.visibilityState === 'visible') {
        checkReload();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // --- LOGIQUE : VÉRIFICATION DES PRÉFÉRENCES ---
  useEffect(() => {
    const checkUserPreferences = async () => {
      // Si pas d'utilisateur ou si admin, pas besoin de préférences utilisateur
      if (!user) {
        setAppReady(true);
        return;
      }

      if (user.role === 'admin') {
        setAppReady(true);
        // Redirection admin si nécessaire
        if (window.location.pathname === '/') {
          window.history.pushState({}, '', '/dashboard');
        }
        return;
      }

      // Vérification et création des préférences par défaut
      try {
        const exists = await preferencesExist();
        if (!exists) {
          console.log('Creating default preferences...');
          await createDefaultPreferences();
        }
      } catch (error) {
        console.error('Error checking preferences:', error);
      } finally {
        setAppReady(true);
      }
    };

    if (!authLoading) {
      checkUserPreferences();
    }
  }, [user, authLoading]); // Retiré preferencesExist/createDefaultPreferences des deps pour éviter boucles

  const toggleMenu = () => setIsSidebarOpen(!isSidebarOpen);

  const handleTabChange = (view: string) => {
    if (view === 'clients') refreshClients();
    setCurrentView(view as ViewType);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  // --- RENDU : CHARGEMENT ---
  if (authLoading || !appReady) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement de l'application...</p>
        </div>
      </div>
    );
  }

  // --- RENDU : LOGIN ---
  if (!user) {
    return (
      <LoginForm onLogin={login} onRegister={register} loading={authLoading} />
    );
  }

  // --- RENDU : BLOCAGE PAIEMENT ---
  if (
    user.role !== 'admin' &&
    ['unpaid', 'overdue', 'suspended', 'inactive'].includes(
      user.payment_status || ''
    )
  ) {
    return (
      <PaymentWarningModal
        isOpen={true}
        onClose={() => {}}
        userStatus={user.payment_status as any}
        daysRemaining={0}
        onUpgrade={(plan) => console.log('Upgrade requested:', plan)}
        userName={user.full_name || user.email}
        onLogout={logout}
      />
    );
  }

  // --- ROUTAGE DU CONTENU ---
  const renderMainContent = () => {
    const commonProps = { onMenuToggle: toggleMenu, showToast };
    const dataProps = { clients, appointments };

    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            {...dataProps}
            onNavigate={setCurrentView}
            {...commonProps}
          />
        );
      case 'myday':
        return (
          <MyDay
            {...dataProps}
            {...commonProps}
            onUpdateAppointment={updateAppointment}
          />
        );
      case 'calendar':
        return (
          <Calendar
            {...dataProps}
            onAddAppointment={addAppointment}
            onUpdateAppointment={updateAppointment}
            onDeleteAppointment={deleteAppointment}
            {...commonProps}
          />
        );
      case 'clients':
        return (
          <ClientList
            {...dataProps}
            onAddClient={addClient}
            onUpdateClient={updateClient}
            onDeleteClient={deleteClient}
            {...commonProps}
          />
        );
      case 'notifications':
        return (
          <Notifications
            {...dataProps}
            onAddAppointment={addAppointment}
            {...commonProps}
          />
        );
      case 'expenses':
        return <Expenses {...commonProps} />;
      case 'analytics':
        return <Analytics {...commonProps} />;
      case 'preferences':
        // Ajout du bouton retour vers Settings
        return <Preferences onBack={() => setCurrentView('settings')} />;
      case 'admin-payments':
        return user.role === 'admin' ? (
          <AdminDashboard onLogout={logout} />
        ) : (
          <Dashboard {...dataProps} onNavigate={setCurrentView} {...commonProps} />
        );
      case 'users':
        return user.role === 'admin' ? (
          <UserManagement {...commonProps} />
        ) : (
          <Dashboard {...dataProps} onNavigate={setCurrentView} {...commonProps} />
        );
      case 'settings':
        return <Settings {...commonProps} onNavigate={(view) => setCurrentView(view as ViewType)} />;
      
      default:
        return <Dashboard {...dataProps} onNavigate={setCurrentView} {...commonProps} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 relative overflow-hidden">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {currentView !== 'preferences' && (
        <Sidebar
          activeTab={currentView}
          onTabChange={handleTabChange}
          onLogout={logout}
          userName={user.full_name || user.email}
          userRole={user.role || 'user'}
          isOpen={isSidebarOpen}
          onToggle={toggleMenu}
        />
      )}

      <main
        className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative ${
          currentView === 'preferences' ? 'w-full' : ''
        }`}
      >
        <div className="flex-1 overflow-auto bg-gray-50">
          {renderMainContent()}
        </div>
      </main>
    </div>
  );
}

export default App;