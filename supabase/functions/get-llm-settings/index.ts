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

    // Créer un objet user minimal
    const user = { id: userId };

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
