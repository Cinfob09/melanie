import React from 'react';
import { X, Shield, FileText, Lock, Server, AlertTriangle } from 'lucide-react';

interface LegalModalProps {
  type: 'terms' | 'privacy' | null;
  onClose: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-gray-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${type === 'terms' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
              {type === 'terms' ? <FileText className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-none">
                {type === 'terms' ? 'Conditions d\'Utilisation (SaaS)' : 'Politique de Confidentialité'}
              </h2>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Dernière mise à jour : Février 2026</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="p-6 overflow-y-auto text-sm space-y-8 leading-relaxed">
          
          {type === 'terms' ? (
            <>
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <Shield className="w-5 h-5" />
                  <h3 className="text-lg font-bold">1. Objet, Licence et Rôles</h3>
                </div>
                <p>
                  L'application est fournie en mode <strong>SaaS (Software as a Service)</strong>. L'Éditeur concède à l'Utilisateur une licence d'utilisation non exclusive. 
                  <strong> Le code source, le design et l'architecture restent la propriété exclusive de l'Éditeur.</strong> 
                  Vous agissez en tant que Responsable du Traitement et nous agissons en tant que Sous-traitant technique.
                </p>
              </section>

              <section className="space-y-3 bg-red-50/50 p-4 rounded-xl border border-red-100">
                <div className="flex items-center gap-2 text-red-700">
                  <Server className="w-5 h-5" />
                  <h3 className="text-lg font-bold">2. Responsabilité et Hébergement</h3>
                </div>
                <p>
                  <strong>Hébergement :</strong> Le service est hébergé via Supabase (infrastructure AWS). L'Éditeur ne peut être tenu responsable des pannes, interruptions de service ou pertes de données causées par ces prestataires tiers.
                </p>
                <p className="font-semibold text-gray-900">
                  <strong>Limitation :</strong> En cas de faute prouvée de l'Éditeur, sa responsabilité totale est strictement limitée au montant des sommes versées par le Client au cours du (1) dernier mois de service.
                </p>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <FileText className="w-5 h-5" />
                  <h3 className="text-lg font-bold">3. Propriété des Données et Réversibilité</h3>
                </div>
                <p>
                  Toutes les données saisies (clients, RDV, dépenses) restent votre propriété exclusive. En cas de résiliation, vous disposez d'un <strong>droit de récupération</strong> de vos données (format CSV/JSON) sur simple demande, sous réserve du règlement des factures dues.
                </p>
              </section>

              <section className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-lg font-bold">4. Obligations de l'Utilisateur</h3>
                </div>
                <p>
                  Vous certifiez avoir le droit légal de collecter les informations de vos clients. Vous êtes seul responsable de la gestion des accès accordés à vos employés et des actions effectuées via leurs comptes.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Lock className="w-5 h-5" />
                  <h3 className="text-lg font-bold">1. Sécurité et Traitement</h3>
                </div>
                <p>
                  Nous utilisons le chiffrement SSL/TLS et des sauvegardes quotidiennes. L'Éditeur met en œuvre les moyens techniques pour assurer la confidentialité des échanges, mais l'Utilisateur demeure responsable du choix de mots de passe robustes.
                </p>
              </section>

              <section className="space-y-3 bg-indigo-50/30 p-4 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Shield className="w-5 h-5" />
                  <h3 className="text-lg font-bold">2. Confidentialité des Affaires (NDA)</h3>
                </div>
                <p>
                  Nous garantissons une <strong>stricte confidentialité</strong> sur vos données financières (dépenses, revenus) et votre fichier client. Aucun employé de l'Éditeur n'accède à vos données sans votre autorisation explicite (ex: support technique).
                </p>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-700">
                  <FileText className="w-5 h-5" />
                  <h3 className="text-lg font-bold">3. Conformité Loi 25 (Québec)</h3>
                </div>
                <p>
                  En cas d'incident de sécurité compromettant les données, nous vous aviserons dans un délai maximal de <strong>72 heures</strong>. Nous collaborons avec vous pour permettre l'exercice des droits d'accès ou de rectification de vos propres clients.
                </p>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Server className="w-5 h-5" />
                  <h3 className="text-lg font-bold">4. Conservation et Suppression</h3>
                </div>
                <p>
                  Les données sont conservées durant la période d'abonnement. Suite à une résiliation, les données sont définitivement supprimées de nos serveurs actifs après un délai de <strong>30 jours</strong>.
                </p>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className={`px-8 py-2.5 rounded-xl text-white font-bold transition-all shadow-lg hover:shadow-xl active:scale-95 ${
              type === 'terms' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;