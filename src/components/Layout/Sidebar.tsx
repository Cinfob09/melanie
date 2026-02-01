import React from 'react';
import {
  Home,
  Calendar,
  Users,
  LogOut,
  X,
  Building,
  Bell,
  Settings,
  UserPlus,
  PlayCircle,
  BarChart3,
  CreditCard,
  Shield,
  Menu,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  userName: string;
  userRole: string;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  userName,
  userRole,
  isOpen,
  onToggle,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: Home },
    { id: 'myday', label: 'Ma journée', icon: PlayCircle },
    { id: 'calendar', label: 'Calendrier', icon: Calendar },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'expenses', label: 'Dépenses', icon: CreditCard },
    { id: 'analytics', label: 'Analyse', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(userRole === 'admin'
      ? [
          { id: 'admin-payments', label: 'Paiements', icon: Shield },
          { id: 'users', label: 'Utilisateurs', icon: UserPlus },
          { id: 'settings', label: 'Paramètres', icon: Settings },
        ]
      : []),
  ];

  const handleViewChange = (view: string) => {
    onTabChange(view);
    if (window.innerWidth < 1024) onToggle();
  };

  return (
    <>
      {/* Overlay mobile avec blur */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={onToggle}
        />
      )}

      {/* Sidebar Container */}
      <div
        className={`fixed left-0 top-0 h-full w-80 transform transition-all duration-500 ease-out z-50 lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Background avec gradient bleu */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700" />

        {/* Layer glassmorphism */}
        <div className="absolute inset-0 backdrop-blur-xl bg-white/10" />

        {/* Effets liquid glass - bulles animées */}
        <div
          className="absolute top-20 -left-20 w-72 h-72 bg-blue-300/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '4s' }}
        />
        <div
          className="absolute bottom-40 -right-10 w-56 h-56 bg-indigo-300/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '5s', animationDelay: '1s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-40 h-40 bg-purple-300/15 rounded-full blur-2xl animate-pulse"
          style={{ animationDuration: '6s', animationDelay: '2s' }}
        />

        <div className="relative flex flex-col h-full">
          {/* Header avec logo */}
          <div className="flex items-center justify-between p-6 pb-8">
            <div className="flex items-center gap-3">
              {/* Logo avec effet glass */}
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-2xl blur-md" />
                <div className="relative w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-white/40">
                  <Building className="w-7 h-7 text-white drop-shadow-lg" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white drop-shadow-lg tracking-tight">
                  Outils Internes
                </h1>
                <p className="text-xs text-white/70 drop-shadow">
                  Gestion professionnelle
                </p>
              </div>
            </div>

            {/* Bouton fermer mobile */}
            <button
              onClick={onToggle}
              className="lg:hidden p-2.5 rounded-xl bg-white/15 backdrop-blur-md hover:bg-white/25 transition-all duration-300 border border-white/30 shadow-lg hover:scale-110"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            <ul className="space-y-1.5 pb-4">
              {menuItems.map((item, index) => {
                const isActive = activeTab === item.id;
                return (
                  <li
                    key={item.id}
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: 'slideIn 0.4s ease-out forwards',
                    }}
                  >
                    <button
                      onClick={() => handleViewChange(item.id)}
                      className={`group w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-300 ${
                        isActive
                          ? 'bg-white/30 backdrop-blur-lg text-white font-semibold shadow-2xl border border-white/50 scale-[1.02]'
                          : 'text-white/85 hover:bg-white/15 hover:backdrop-blur-md hover:scale-[1.02] border border-transparent hover:border-white/30 hover:shadow-lg'
                      }`}
                    >
                      {/* Icône avec effet glow */}
                      <div
                        className={`relative ${
                          isActive ? 'scale-110' : 'group-hover:scale-110'
                        } transition-transform duration-300`}
                      >
                        {isActive && (
                          <div className="absolute inset-0 bg-white/40 rounded-lg blur-md" />
                        )}
                        <item.icon
                          className={`relative w-5 h-5 ${
                            isActive
                              ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                              : ''
                          }`}
                        />
                      </div>

                      <span
                        className={`drop-shadow-md text-[15px] ${
                          isActive ? 'tracking-wide' : ''
                        }`}
                      >
                        {item.label}
                      </span>

                      {/* Indicateur actif */}
                      {isActive && (
                        <div className="ml-auto w-2 h-2 bg-white rounded-full shadow-lg animate-pulse" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer avec info utilisateur */}
          <div className="p-4 mt-auto space-y-3">
            {/* Card utilisateur */}
            <div className="relative group">
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur-md" />
              <div className="relative px-5 py-4 bg-white/15 backdrop-blur-lg rounded-2xl border border-white/40 shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/25 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/50 shadow-lg">
                    <span className="text-white font-bold text-sm">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 mb-0.5 drop-shadow">
                      Connecté en tant que
                    </p>
                    <p className="text-sm font-semibold text-white truncate drop-shadow-md">
                      {userName}
                    </p>
                  </div>
                </div>

                {/* Badge rôle */}
                <div className="flex justify-end">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/40 shadow-lg">
                    <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse shadow-[0_0_6px_rgba(134,239,172,0.8)]" />
                    <span className="text-xs text-white/95 font-medium drop-shadow">
                      {userRole === 'admin' ? 'Administrateur' : 'Utilisateur'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bouton déconnexion */}
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-red-500/25 backdrop-blur-lg hover:bg-red-500/35 rounded-2xl transition-all duration-300 border border-red-400/40 hover:border-red-400/60 hover:scale-[1.02] shadow-xl group"
            >
              <LogOut className="w-5 h-5 text-red-50 group-hover:rotate-12 transition-transform duration-300 drop-shadow-lg" />
              <span className="font-semibold text-red-50 drop-shadow-md text-[15px]">
                Déconnexion
              </span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </>
  );
};

export default Sidebar;
