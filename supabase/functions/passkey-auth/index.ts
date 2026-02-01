import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

// 1. En-têtes CORS complets
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // En prod, remplacez * par votre domaine exact pour plus de sécurité
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // 2. Gestion immédiate du Preflight (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, email, data } = await req.json();
    
    // Client Admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Détermination de l'origine pour WebAuthn (rpID)
    // En local, c'est souvent "localhost"
    // En prod, c'est le domaine (ex: "monapp.com")
    const origin = req.headers.get("origin") || "";
    let rpID = "localhost";
    
    try {
        if (origin) {
            const url = new URL(origin);
            rpID = url.hostname;
        }
    } catch (e) {
        console.error("Erreur parsing origin:", e);
    }

    console.log(`Action: ${action}, Origin: ${origin}, RPID: ${rpID}`);

    /* ------------------------------------------------------------------
       1. INSCRIPTION - ÉTAPE 1
       ------------------------------------------------------------------ */
    if (action === "register-generate-options") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Token manquant");

      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (userError || !user) throw new Error("Utilisateur non authentifié");

      // Vérifier doublons
      const { data: userPasskeys } = await supabaseAdmin
        .from("passkeys")
        .select("credential_id, transports")
        .eq("user_id", user.id);

      const options = await generateRegistrationOptions({
        rpName: "Outils Internes SaaS",
        rpID,
        userID: user.id,
        userName: user.email || "User",
        attestationType: "none",
        excludeCredentials: userPasskeys?.map((key) => ({
          id: key.credential_id,
          transports: key.transports as any[],
        })),
      });

      // Sauvegarde challenge
      await supabaseAdmin.from("auth_challenges").insert({
        challenge: options.challenge,
        user_id: user.id,
      });

      return new Response(JSON.stringify(options), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    /* ------------------------------------------------------------------
       2. INSCRIPTION - ÉTAPE 2
       ------------------------------------------------------------------ */
    if (action === "register-verify") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Token manquant");

      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!user) throw new Error("Non authentifié");

      const { data: challengeData } = await supabaseAdmin
        .from("auth_challenges")
        .select("challenge")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!challengeData) throw new Error("Challenge expiré ou introuvable");

      const verification = await verifyRegistrationResponse({
        response: data,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

        await supabaseAdmin.from("passkeys").insert({
          user_id: user.id,
          credential_id: credentialID,
          public_key: Buffer.from(credentialPublicKey).toString('base64'),
          counter,
          transports: data.response.transports || [],
          name: data.name || "Passkey",
        });

        await supabaseAdmin.from("auth_challenges").delete().eq("user_id", user.id);

        return new Response(JSON.stringify({ success: true }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      throw new Error("Vérification échouée");
    }

    /* ------------------------------------------------------------------
       3. LOGIN - ÉTAPE 1
       ------------------------------------------------------------------ */
    if (action === "login-generate-options") {
      if (!email) throw new Error("Email requis");
      
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (!profile) throw new Error("Utilisateur inconnu");

      const { data: userPasskeys } = await supabaseAdmin
        .from("passkeys")
        .select("credential_id, transports")
        .eq("user_id", profile.id);

      if (!userPasskeys || userPasskeys.length === 0) throw new Error("Aucune passkey pour cet email");

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: userPasskeys.map((key) => ({
          id: key.credential_id,
          transports: key.transports as any[],
        })),
      });

      await supabaseAdmin.from("auth_challenges").insert({
        challenge: options.challenge,
        user_id: profile.id,
      });

      return new Response(JSON.stringify(options), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    /* ------------------------------------------------------------------
       4. LOGIN - ÉTAPE 2
       ------------------------------------------------------------------ */
    if (action === "login-verify") {
      const { email, data: authData } = await req.json();
      
      const { data: profile } = await supabaseAdmin.from("user_profiles").select("id").eq("email", email).single();
      if (!profile) throw new Error("Utilisateur introuvable");

      const { data: passkey } = await supabaseAdmin
        .from("passkeys")
        .select("*")
        .eq("credential_id", authData.id)
        .maybeSingle();

      if (!passkey) throw new Error("Passkey non trouvée");

      const { data: challengeData } = await supabaseAdmin
        .from("auth_challenges")
        .select("challenge")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!challengeData) throw new Error("Challenge invalide");

      const publicKeyBuffer = new Uint8Array(Buffer.from(passkey.public_key, 'base64'));

      const verification = await verifyAuthenticationResponse({
        response: authData,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: {
          credentialID: passkey.credential_id,
          credentialPublicKey: publicKeyBuffer,
          counter: passkey.counter,
        },
      });

      if (verification.verified) {
        await supabaseAdmin.from("passkeys").update({
          counter: verification.authenticationInfo.newCounter,
          last_used_at: new Date().toISOString()
        }).eq("id", passkey.id);

        await supabaseAdmin.from("auth_challenges").delete().eq("user_id", profile.id);

        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.createSession({
            user_id: profile.id
        });

        if (sessionError) throw sessionError;

        return new Response(JSON.stringify({ session: sessionData }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      
      throw new Error("Échec de vérification");
    }

    throw new Error(`Action inconnue: ${action}`);

  } catch (error: any) {
    console.error("Erreur Edge Function:", error.message);
    // 3. IMPORTANT : Toujours renvoyer les headers CORS même en cas d'erreur 400/500
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});