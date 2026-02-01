import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, User, AlertCircle, ShieldCheck, Fingerprint } from 'lucide-react';
import LegalModal from './LegalModal';
import { loginWithPasskey, registerPasskey } from '../services/passkeyService';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  onRegister?: (
    email: string,
    password: string,
    fullName: string,
    termsAcceptedAt: string
  ) => Promise<boolean>;
  loading?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onRegister,
  loading,
}) => {
  // Modes
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Champs
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // États UI / Légal
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = isSubmitting || loading;

  const handlePasskeyLogin = async () => {
    if (!email) {
      setError("Veuillez entrer votre email pour utiliser la Passkey");
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await loginWithPasskey(email);
      // Pas besoin de redirection manuelle, le auth listener de App.tsx va détecter la session
    } catch (err: any) {
      setError(err.message || "Impossible de se connecter avec la Passkey");
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isRegistering) {
        // --- VALIDATIONS INSCRIPTION ---
        if (!acceptedTerms) {
          throw new Error('Vous devez accepter les conditions pour créer un compte.');
        }
        if (!fullName.trim()) throw new Error('Le nom complet est requis.');
        if (password.length < 6) throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
        if (password !== confirmPassword) throw new Error('Les mots de passe ne correspondent pas.');

        if (onRegister) {
          const acceptanceDate = new Date().toISOString(); 

          const success = await onRegister(email, password, fullName, acceptanceDate);
          
          if (success) {
            // PROPOSITION PASSKEY APRÈS INSCRIPTION
            // Note : onRegister a créé le user mais on doit être connecté pour créer la passkey
            // useAuth.register connecte généralement l'utilisateur automatiquement via Supabase
            
            // On attend un court instant que la session soit propagée
            setTimeout(async () => {
                const wantPasskey = window.confirm("Compte créé avec succès ! \n\nVoulez-vous configurer une Passkey (FaceID/TouchID) maintenant pour vous connecter sans mot de passe la prochaine fois ?");
                
                if (wantPasskey) {
                    try {
                        await registerPasskey("Mon Appareil Principal");
                        alert("Passkey configurée !");
                    } catch (pkErr) {
                        console.error("Erreur passkey post-signup", pkErr);
                        // On ne bloque pas le flux principal, l'utilisateur est inscrit
                    }
                }
            }, 500);
          } else {
             throw new Error("Impossible de créer le compte (Email existant ?).");
          }
        } else {
          throw new Error("Inscription non disponible.");
        }
      } else {
        // --- VALIDATIONS CONNEXION ---
        const success = await onLogin(email, password);
        if (!success) throw new Error('Email ou mot de passe incorrect.');
      }
    } catch (err: any) {
      let msg = err.message;
      if (msg?.includes('Invalid login')) msg = 'Identifiants incorrects.';
      if (msg?.includes('User already registered')) msg = 'Cet email est déjà utilisé.';
      setError(msg);
      setIsSubmitting(false);
    }
    // Note: Si succès, setIsSubmitting reste true jusqu'au unmount/redirection
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setAcceptedTerms(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        
        {/* En-tête */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-all duration-300">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 tracking-tight">
            {isRegistering ? 'Créer un compte' : 'Espace Membre'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {isRegistering
              ? 'Rejoignez la plateforme de gestion'
              : 'Connectez-vous pour accéder à vos outils'}
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          
          {/* Nom Complet (Inscription seulement) */}
          {isRegistering && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required={isRegistering}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 block w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Jean Dupont"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email professionnel</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="pl-10 block w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="nom@entreprise.com"
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe {isRegistering && <span className="text-gray-400 text-xs font-normal">(min. 6 car.)</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="pl-10 pr-10 block w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
              </button>
            </div>
          </div>

          {/* Confirmation (Inscription seulement) */}
          {isRegistering && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required={isRegistering}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 block w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {/* BLOC LÉGAL (Inscription seulement) */}
          {isRegistering && (
            <div className="animate-in fade-in duration-500 bg-blue-50 p-4 rounded-xl border border-blue-100 mt-2">
              <div className="flex items-start gap-3">
                <div className="flex h-6 items-center">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                <div className="text-sm">
                  <label htmlFor="terms" className="font-medium text-gray-800 cursor-pointer select-none">
                    Je confirme avoir lu et accepté les{' '}
                    <button 
                      type="button" 
                      onClick={() => setLegalModalType('terms')} 
                      className="text-blue-600 hover:text-blue-800 hover:underline font-bold"
                    >
                      Conditions d'utilisation
                    </button>
                    {' et la '}
                    <button 
                      type="button" 
                      onClick={() => setLegalModalType('privacy')} 
                      className="text-blue-600 hover:text-blue-800 hover:underline font-bold"
                    >
                      Politique de confidentialité
                    </button>.
                  </label>
                  <p className="text-gray-500 text-xs mt-2 flex items-start gap-1.5 leading-snug">
                    <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>
                      Vos données sont hébergées de manière sécurisée. Nous agissons en tant que <strong>Sous-traitant</strong> (Data Processor) et ne revendons jamais vos informations.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-in fade-in">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-3 shrink-0" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Boutons */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white transition-all transform active:scale-95 shadow-md hover:shadow-lg ${
                isLoading ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Chargement...
                </div>
              ) : isRegistering ? "S'inscrire et Accepter" : 'Se connecter'}
            </button>

            {/* Bouton Passkey */}
            {!isRegistering && (
              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={isLoading || !email}
                className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                title={!email ? "Entrez votre email d'abord" : ""}
              >
                <Fingerprint className="h-5 w-5 mr-2 text-blue-600" />
                Se connecter avec Passkey
              </button>
            )}

            <div className="text-center mt-4">
              <p className="text-sm text-gray-600 mb-1">
                {isRegistering ? 'Vous avez déjà un compte ?' : 'Nouveau sur la plateforme ?'}
              </p>
              <button
                type="button"
                onClick={toggleMode}
                disabled={isLoading}
                className="text-sm font-bold text-blue-600 hover:text-blue-500 transition-colors"
              >
                {isRegistering ? 'Se connecter' : 'Créer un compte professionnel'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Le Modal Légal s'affiche par-dessus si activé */}
      <LegalModal type={legalModalType} onClose={() => setLegalModalType(null)} />
    </div>
  );
};

export default LoginForm;