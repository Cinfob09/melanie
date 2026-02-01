import React, { useState, useEffect } from 'react';

interface PaymentWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  userStatus: 'active' | 'inactive' | 'suspended' | 'unpaid' | 'overdue';
  daysRemaining?: number;
  onUpgrade: (plan: string) => void;
  userName?: string;
  onLogout?: () => void;
}

const PaymentWarningModal: React.FC<PaymentWarningModalProps> = ({
  isOpen,
  onClose,
  userStatus,
  daysRemaining = 0,
  onUpgrade,
  userName = 'Utilisateur',
  onLogout,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const features = [
    {
      title: '📅 Gestion de rendez-vous',
      description:
        'Planifiez et organisez vos rendez-vous clients efficacement',
    },
    {
      title: '👥 Gestion clients',
      description: 'Centralisez toutes les informations de vos clients',
    },
    {
      title: '💰 Suivi des dépenses',
      description: 'Gardez un œil sur vos revenus et dépenses',
    },
    {
      title: "🕐 Gestion d'horaire",
      description: 'Organisez votre emploi du temps professionnel',
    },
    {
      title: '📊 Statistiques détaillées',
      description: 'Analysez vos performances et votre activité',
    },
    {
      title: '📈 Rapports personnalisés',
      description: 'Générez des rapports pour suivre votre croissance',
    },
  ];

  const getWarningContent = () => {
    switch (userStatus) {
      case 'inactive':
        return {
          icon: '🔒',
          title: 'Accès Restreint',
          message:
            "Votre compte n'a pas encore été activé. Contactez l'administrateur pour obtenir l'accès à l'application.",
          urgency: 'high',
          buttonText: "Contacter l'administrateur",
        };
      case 'suspended':
        return {
          icon: '🔒',
          title: 'Compte Suspendu',
          message:
            "Votre compte a été suspendu. Veuillez contacter l'administrateur pour plus d'informations.",
          urgency: 'high',
          buttonText: "Contacter l'administrateur",
        };
      case 'unpaid':
        return {
          icon: '⚠️',
          title: 'Action Requise',
          message:
            "Veuillez contacter l'administrateur concernant votre accès à l'application.",
          urgency: 'medium',
          buttonText: "Contacter l'administrateur",
        };
      case 'overdue':
        return {
          icon: '⏰',
          title: 'Attention',
          message:
            "Veuillez contacter l'administrateur pour régulariser votre situation.",
          urgency: 'high',
          buttonText: "Contacter l'administrateur",
        };
      default:
        return {
          icon: '🔒',
          title: 'Accès Restreint',
          message: "Contactez l'administrateur pour obtenir l'accès.",
          urgency: 'medium',
          buttonText: "Contacter l'administrateur",
        };
    }
  };

  const content = getWarningContent();

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('bellerose.cedrick@cinfob.com');
    alert('Email copié dans le presse-papier !');
  };

  const handleContactAdmin = () => {
    window.location.href =
      "mailto:bellerose.cedrick@cinfob.com?subject=Demande d'accès à l'application&body=Bonjour,%0D%0A%0D%0AJe souhaiterais obtenir l'accès à l'application de gestion.%0D%0A%0D%0ACordialement";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition z-10 text-2xl"
          >
            ✕
          </button>

          <div
            className={`relative px-8 pt-8 pb-6 ${
              content.urgency === 'high'
                ? 'bg-gradient-to-r from-red-50 to-orange-50'
                : 'bg-gradient-to-r from-yellow-50 to-amber-50'
            }`}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">{content.icon}</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {content.title}
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                Bonjour {userName}, {content.message}
              </p>
            </div>
          </div>

          <div className="bg-indigo-600 text-white px-8 py-4">
            <div className="flex items-center justify-center space-x-8 text-sm flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-xl">✓</span>
                <span>Outil interne sécurisé</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xl">✓</span>
                <span>Interface intuitive</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xl">⚡</span>
                <span>Support technique inclus</span>
              </div>
            </div>
          </div>

          <div className="px-8 py-8">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-8 text-white mb-8">
              <div className="text-center">
                <div className="text-5xl mb-4">✉️</div>
                <h3 className="text-2xl font-bold mb-3">Demander l'accès</h3>
                <p className="text-indigo-100 mb-6">
                  Pour activer votre compte et accéder à toutes les
                  fonctionnalités, veuillez contacter l'administrateur :
                </p>
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 inline-block mb-4">
                  <a
                    href="mailto:bellerose.cedrick@cinfob.com"
                    className="text-xl font-semibold hover:underline"
                  >
                    bellerose.cedrick@cinfob.com
                  </a>
                </div>
                <div className="flex justify-center gap-4 flex-wrap">
                  <button
                    onClick={handleCopyEmail}
                    className="px-6 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition"
                  >
                    📋 Copier l'email
                  </button>
                  <button
                    onClick={handleContactAdmin}
                    className="px-6 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition"
                  >
                    📧 Envoyer un email
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-center text-gray-900 mb-6">
                À propos de l'application
              </h3>
              <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
                Cette application est un outil interne complet de gestion pour
                professionnels. Elle vous permet de centraliser toutes vos
                activités quotidiennes en un seul endroit.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="p-5 rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-lg transition bg-white"
                  >
                    <h4 className="font-bold text-gray-900 mb-2 text-lg">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-indigo-600 mb-2">
                    99.9%
                  </div>
                  <div className="text-sm text-gray-600">Disponibilité</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-indigo-600 mb-2">
                    100%
                  </div>
                  <div className="text-sm text-gray-600">Sécurisé</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-indigo-600 mb-2">
                    24/7
                  </div>
                  <div className="text-sm text-gray-600">
                    Support disponible
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Plus tard
              </button>
              <button
                onClick={handleContactAdmin}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center space-x-2"
              >
                <span>✉️</span>
                <span>{content.buttonText}</span>
                <span>→</span>
              </button>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full mt-4 px-6 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Se déconnecter
              </button>
            )}

            <p className="text-center text-sm text-gray-500 mt-6">
              💡 L'accès est accordé après validation par l'administrateur
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentWarningModal;
