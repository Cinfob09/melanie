import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, User, AlertCircle, ShieldCheck } from 'lucide-react';
interface LoginFormProps {
onLogin: (email: string, password: string) => Promise<boolean>;
onRegister?: (
email: string,
password: string,
fullName: string
) => Promise<boolean>;
loading?: boolean;
}
const LoginForm: React.FC<LoginFormProps> = ({
onLogin,
onRegister,
loading,
}) => {
const [isRegistering, setIsRegistering] = useState(false);
// Form States
const [email, setEmail] = useState('');
const [fullName, setFullName] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
// Legal Consent State
const [acceptedTerms, setAcceptedTerms] = useState(false);
// UI States
const [showPassword, setShowPassword] = useState(false);
const [error, setError] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);
const isLoading = isSubmitting || loading;
const handleSubmit = async (e: React.FormEvent) => {
e.preventDefault();
setError('');
setIsSubmitting(true);try {
  if (isRegistering) {
    // --- VALIDATIONS INSCRIPTION ---

    // 1. Validation Légale (Obligatoire)
    if (!acceptedTerms) {
      throw new Error('Vous devez accepter les conditions d\'utilisation et la politique de confidentialité pour créer un compte.');
    }

    // 2. Validations Standards
    if (!fullName.trim()) {
      throw new Error('Le nom complet est requis.');
    }
    if (password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
    }
    if (password !== confirmPassword) {
      throw new Error('Les mots de passe ne correspondent pas.');
    }

    if (onRegister) {
      try {
        const success = await onRegister(email, password, fullName);
        if (!success) {
          throw new Error("Impossible de créer le compte. L'email existe peut-être déjà.");
        }
      } catch (regError: any) {
        throw regError;
      }
    } else {
      throw new Error("La fonction d'inscription n'est pas disponible.");
    }
  } else {
    // --- LOGIQUE CONNEXION ---
    const success = await onLogin(email, password);
    if (!success) {
      throw new Error('Email ou mot de passe incorrect.');
    }
  }
} catch (err: any) {
  // Gestion des erreurs (Supabase ou locales)
  let errorMessage = err.message;

  if (err.message?.includes('Invalid login credentials')) {
    errorMessage = 'Email ou mot de passe incorrect.';
  } else if (err.message?.includes('Email not confirmed')) {
    errorMessage = 'Veuillez confirmer votre email avant de vous connecter.';
  } else if (err.message?.includes('User already registered')) {
    errorMessage = 'Cet email est déjà utilisé. Essayez de vous connecter.';
  } else if (err.message?.includes('Password should be at least')) {
    errorMessage = 'Le mot de passe doit contenir au moins 6 caractères.';
  }

  setError(errorMessage);
} finally {
  setIsSubmitting(false);
}};
const toggleMode = () => {
setIsRegistering(!isRegistering);
setError('');
setPassword('');
setConfirmPassword('');
setFullName('');
setAcceptedTerms(false); // Reset de la case à cocher
};
return (
<div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
<div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">{/* Header */}
    <div className="text-center">
      <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6 hover:rotate-0 transition-transform duration-300">
        <Lock className="h-8 w-8 text-white" />
      </div>
      <h2 className="mt-6 text-3xl font-extrabold text-gray-900 tracking-tight">
        {isRegistering ? 'Créer un compte pro' : 'Espace Sécurisé'}
      </h2>
      <p className="mt-2 text-sm text-gray-500">
        {isRegistering
          ? 'Gestion centralisée pour professionnels'
          : 'Connectez-vous pour accéder à vos outils'}
      </p>
    </div>

    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-4">
        
        {/* Nom Complet (Inscription seulement) */}
        {isRegistering && (
          <div className="animate-fade-in">
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Nom complet
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required={isRegistering}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
                className="pl-10 block w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100"
                placeholder="Jean Dupont"
              />
            </div>
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Adresse e-mail professionnel
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="pl-10 block w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100"
              placeholder="nom@entreprise.com"
            />
          </div>
        </div>

        {/* Mot de passe */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Mot de passe {isRegistering && <span className="text-gray-400 text-xs font-normal">(min. 6 car.)</span>}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="pl-10 pr-10 block w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100"
              placeholder="••••••••"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Confirmation (Inscription seulement) */}
        {isRegistering && (
          <div className="animate-fade-in">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required={isRegistering}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="pl-10 block w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100"
                placeholder="••••••••"
              />
            </div>
          </div>
        )}

        {/* --- SECTION LÉGALE (Inscription seulement) --- */}
        {isRegistering && (
          <div className="animate-fade-in bg-blue-50 border border-blue-100 rounded-lg p-3 mt-4">
            <div className="flex items-start gap-3">
              <div className="flex h-5 items-center">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <div className="text-sm">
                <label htmlFor="terms" className="font-medium text-gray-700 cursor-pointer">
                  J'accepte les <a href="#" className="text-blue-600 hover:underline">Conditions d'utilisation</a> et la <a href="#" className="text-blue-600 hover:underline">Politique de confidentialité</a>.
                </label>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                  <ShieldCheck className="w-3 h-3 inline mr-1 text-blue-500" />
                  Je reconnais que Outils Internes agit en tant que sous-traitant (Data Processor) pour l'hébergement sécurisé de mes données professionnelles.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="animate-fade-in bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="space-y-4">
        <button
          type="submit"
          disabled={isLoading}
          className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white transition-all transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isLoading 
              ? 'bg-blue-400 cursor-wait' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Traitement...
            </div>
          ) : isRegistering ? (
            "S'inscrire et Accepter"
          ) : (
            'Se connecter'
          )}
        </button>

        <div className="text-center pt-2">
          <p className="text-sm text-gray-600">
            {isRegistering ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
          </p>
          <button
            type="button"
            onClick={toggleMode}
            disabled={isLoading}
            className="mt-1 text-sm font-bold text-blue-600 hover:text-blue-500 transition-colors disabled:opacity-50"
          >
            {isRegistering ? 'Se connecter' : 'Créer un compte professionnel'}
          </button>
        </div>
      </div>
    </form>
  </div>
</div>
);
};
export default LoginForm;