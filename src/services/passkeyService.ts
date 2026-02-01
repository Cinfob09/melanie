import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { supabase } from '../lib/supabase';

// Récupération dynamique de l'URL du projet depuis Vite
const PROJECT_URL = import.meta.env.VITE_SUPABASE_URL; 
const FUNCTION_URL = `${PROJECT_URL}/functions/v1/passkey-auth`;

export const registerPasskey = async (passkeyName: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Vous devez être connecté");

    // 1. Obtenir les options
    const respOptions = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ action: 'register-generate-options' })
    });
    
    if (!respOptions.ok) {
        const err = await respOptions.json();
        throw new Error(err.error || "Erreur init registration");
    }
    const options = await respOptions.json();

    // 2. Créer la clé dans le navigateur
    const attResp = await startRegistration(options);

    // 3. Envoyer pour vérification et stockage
    const respVerify = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        action: 'register-verify',
        data: { ...attResp, name: passkeyName }
      })
    });

    const verification = await respVerify.json();
    if (!verification.success) throw new Error(verification.error || "Échec vérification");
    
    return true;
  } catch (error: any) {
    console.error("Erreur registerPasskey:", error);
    throw new Error(error.message || "Erreur inconnue");
  }
};

export const loginWithPasskey = async (email: string) => {
  try {
    // 1. Obtenir les options (avec l'email pour cibler le user)
    const respOptions = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'login-generate-options', 
        email 
      })
    });

    if (!respOptions.ok) {
        const err = await respOptions.json();
        throw new Error(err.error || "Utilisateur introuvable ou pas de passkey");
    }
    const options = await respOptions.json();

    // 2. Signer avec le navigateur
    const authResp = await startAuthentication(options);

    // 3. Vérifier et obtenir la session
    const respVerify = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'login-verify', 
        email,
        data: authResp 
      })
    });

    const result = await respVerify.json();
    
    if (result.session) {
      // 4. Définir la session dans le client Supabase local
      const { error } = await supabase.auth.setSession(result.session);
      if (error) throw error;
      return true;
    }
    
    throw new Error(result.error || "Échec connexion");
  } catch (error: any) {
    console.error("Erreur loginWithPasskey:", error);
    throw new Error(error.message || "Erreur inconnue");
  }
};