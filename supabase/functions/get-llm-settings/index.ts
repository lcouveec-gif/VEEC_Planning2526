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

    // Récupérer les paramètres (sans la clé API)
    const { data: settings, error: selectError } = await supabaseClient
      .from('user_llm_settings')
      .select('provider, model, endpoint, temperature, max_tokens, created_at, updated_at')
      .eq('user_id', user.id)
      .single();

    if (selectError) {
      // Si aucun paramètre n'existe, retourner null (pas une erreur)
      if (selectError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ settings: null }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      console.error('Error fetching settings:', selectError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération', details: selectError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        settings: {
          provider: settings.provider,
          model: settings.model,
          endpoint: settings.endpoint,
          temperature: settings.temperature,
          maxTokens: settings.max_tokens,
          hasApiKey: true, // Indique qu'une clé API est configurée (sans la révéler)
          createdAt: settings.created_at,
          updatedAt: settings.updated_at,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in get-llm-settings:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
