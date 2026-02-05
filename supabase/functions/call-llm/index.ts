import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallLLMRequest {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

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

    // Parser le body
    const requestData: CallLLMRequest = await req.json();

    if (!requestData.messages || !Array.isArray(requestData.messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages manquants ou invalides' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

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

    // Récupérer et déchiffrer les paramètres de l'utilisateur
    const { data: decryptedSettings, error: decryptError } = await supabaseClient.rpc(
      'get_user_llm_settings_decrypted',
      {
        p_user_id: user.id,
        p_encryption_key: encryptionKey,
      }
    );

    if (decryptError || !decryptedSettings || decryptedSettings.length === 0) {
      console.error('Error fetching decrypted settings:', decryptError);
      return new Response(
        JSON.stringify({
          error: 'Paramètres LLM non configurés',
          details: 'Veuillez configurer vos paramètres LLM dans Admin > IA/Automatisation'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // La RPC retourne un tableau, on prend le premier élément
    const settingsRow = decryptedSettings[0];

    // Extraire les paramètres
    const {
      provider,
      api_key_decrypted,
      model,
      endpoint,
      temperature: defaultTemperature,
      max_tokens: defaultMaxTokens,
    } = settingsRow;

    // Utiliser les paramètres de la requête ou ceux par défaut
    const temperature = requestData.temperature ?? defaultTemperature;
    const maxTokens = requestData.maxTokens ?? defaultMaxTokens;

    // Préparer l'appel au LLM selon le provider
    let url = endpoint;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let body: any = {};

    if (provider === 'google') {
      // Google Gemini API
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${api_key_decrypted}`;
      body = {
        contents: requestData.messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens,
        },
      };
    } else if (provider === 'anthropic') {
      // Anthropic Claude API
      headers['x-api-key'] = api_key_decrypted;
      headers['anthropic-version'] = '2023-06-01';
      body = {
        model: model,
        messages: requestData.messages,
        max_tokens: maxTokens,
        temperature: temperature,
      };
    } else {
      // OpenAI et custom
      headers['Authorization'] = `Bearer ${api_key_decrypted}`;
      body = {
        model: model,
        messages: requestData.messages,
        max_tokens: maxTokens,
        temperature: temperature,
      };
    }

    // Appeler le LLM
    const llmResponse = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!llmResponse.ok) {
      const errorData = await llmResponse.json();
      console.error('LLM API error:', errorData);
      return new Response(
        JSON.stringify({
          error: 'Erreur lors de l\'appel au LLM',
          status: llmResponse.status,
          details: errorData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: llmResponse.status,
        }
      );
    }

    const llmData = await llmResponse.json();

    // Normaliser la réponse selon le provider
    let responseText = '';
    if (provider === 'google') {
      responseText = llmData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (provider === 'anthropic') {
      responseText = llmData.content?.[0]?.text || '';
    } else {
      responseText = llmData.choices?.[0]?.message?.content || '';
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: responseText,
        rawResponse: llmData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in call-llm:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
