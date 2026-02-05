import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Récupérer le token d'autorisation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Créer un client Supabase avec le token de l'utilisateur
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
      return new Response(
        JSON.stringify({ error: 'Configuration serveur incorrecte' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Vérifier l'authentification en décodant le JWT
    const jwt = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    const userId = payload.sub;

    if (!userId) {
      console.error('No user ID in JWT');
      return new Response(
        JSON.stringify({ error: 'Non authentifié - invalid token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    console.log('User authenticated:', userId);

    // Clé de chiffrement
    const encryptionKey = Deno.env.get('LLM_ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('LLM_ENCRYPTION_KEY not set');
      return new Response(
        JSON.stringify({ error: 'Configuration serveur incorrecte' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Récupérer la clé API déchiffrée
    const { data: decryptedSettings, error: decryptError } = await supabaseClient.rpc(
      'get_user_llm_settings_decrypted',
      {
        p_user_id: userId,
        p_encryption_key: encryptionKey,
      }
    );

    if (decryptError || !decryptedSettings || decryptedSettings.length === 0) {
      console.error('Error fetching decrypted settings:', decryptError);
      return new Response(
        JSON.stringify({ error: 'Paramètres LLM non configurés' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    const settingsRow = decryptedSettings[0];

    return new Response(
      JSON.stringify({
        apiKey: settingsRow.api_key_decrypted,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in get-llm-api-key:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
