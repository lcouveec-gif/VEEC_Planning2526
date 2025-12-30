import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LLMSettings {
  provider: string;
  apiKey: string;
  model: string;
  endpoint: string;
  temperature: number;
  maxTokens: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Créer un client Supabase avec le token de l'utilisateur
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Parser le body
    const settings: LLMSettings = await req.json();

    // Validation des données
    if (!settings.provider || !settings.apiKey || !settings.model || !settings.endpoint) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (settings.temperature < 0 || settings.temperature > 2) {
      return new Response(
        JSON.stringify({ error: 'Température doit être entre 0 et 2' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (settings.maxTokens < 100 || settings.maxTokens > 32000) {
      return new Response(
        JSON.stringify({ error: 'Max tokens doit être entre 100 et 32000' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Clé de chiffrement (à définir dans les secrets Supabase)
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

    // Chiffrer la clé API avec pgcrypto
    // Note: On utilise une requête SQL directe pour utiliser pgcrypto
    const { data: existingSettings } = await supabaseClient
      .from('user_llm_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Préparer les données chiffrées
    const encryptedData = {
      user_id: user.id,
      provider: settings.provider,
      model: settings.model,
      endpoint: settings.endpoint,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
    };

    // UPSERT avec chiffrement de la clé API
    const { error: upsertError } = await supabaseClient.rpc(
      'upsert_user_llm_settings',
      {
        p_user_id: user.id,
        p_provider: settings.provider,
        p_api_key: settings.apiKey,
        p_model: settings.model,
        p_endpoint: settings.endpoint,
        p_temperature: settings.temperature,
        p_max_tokens: settings.maxTokens,
        p_encryption_key: encryptionKey,
      }
    );

    if (upsertError) {
      console.error('Error upserting settings:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la sauvegarde', details: upsertError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Paramètres sauvegardés avec succès' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in save-llm-settings:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
