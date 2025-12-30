import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../stores/useAuthStore';

interface LLMSettings {
  provider: string;
  apiKey: string;
  model: string;
  endpoint: string;
  temperature: number;
  maxTokens: number;
}

const DEFAULT_SETTINGS: LLMSettings = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  temperature: 0.7,
  maxTokens: 2000,
};

interface Provider {
  value: string;
  label: string;
  defaultEndpoint: string;
  models: { value: string; label: string }[];
}

const LLMConfig: React.FC = () => {
  const { user, session } = useAuthStore();
  const [settings, setSettings] = useState<LLMSettings>(DEFAULT_SETTINGS);
  const [isEditing, setIsEditing] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [customModel, setCustomModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasExistingSettings, setHasExistingSettings] = useState(false);

  // Charger les paramètres depuis Supabase
  useEffect(() => {
    if (!user || !session) {
      setLoading(false);
      return;
    }

    loadSettings();
  }, [user, session]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-llm-settings', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error loading settings:', error);
        setHasExistingSettings(false);
        return;
      }

      if (data.settings) {
        setSettings({
          provider: data.settings.provider,
          apiKey: '••••••••••••', // Masqué - ne jamais afficher la vraie clé
          model: data.settings.model,
          endpoint: data.settings.endpoint,
          temperature: data.settings.temperature,
          maxTokens: data.settings.maxTokens,
        });
        setHasExistingSettings(true);
      } else {
        setHasExistingSettings(false);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setHasExistingSettings(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session) {
      alert('Vous devez être connecté pour sauvegarder vos paramètres');
      return;
    }

    // Si on modifie des paramètres existants et que la clé API n'a pas changé, ne pas la renvoyer
    if (hasExistingSettings && settings.apiKey === '••••••••••••') {
      alert('Veuillez saisir votre nouvelle clé API ou conserver la clé existante');
      return;
    }

    if (!settings.apiKey.trim() || settings.apiKey === '••••••••••••') {
      alert('Veuillez renseigner une clé API');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('save-llm-settings', {
        body: {
          provider: settings.provider,
          apiKey: settings.apiKey,
          model: settings.model,
          endpoint: settings.endpoint,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error saving settings:', error);
        alert(`Erreur lors de la sauvegarde: ${error.message}`);
        return;
      }

      if (data.error) {
        alert(`Erreur: ${data.error}`);
        return;
      }

      alert('Configuration LLM enregistrée avec succès');
      setIsEditing(false);
      await loadSettings(); // Recharger les paramètres
    } catch (err: any) {
      console.error('Error saving settings:', err);
      alert(`Erreur: ${err.message}`);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Voulez-vous vraiment réinitialiser la configuration ?')) {
      return;
    }

    setSettings(DEFAULT_SETTINGS);
    setIsEditing(false);
    setHasExistingSettings(false);
    setCustomModel('');
  };

  const handleTestConnection = async () => {
    if (!session) {
      setTestStatus({ success: false, message: 'Vous devez être connecté' });
      return;
    }

    setTestStatus({ success: false, message: 'Test en cours...' });

    try {
      const { data, error } = await supabase.functions.invoke('call-llm', {
        body: {
          messages: [{ role: 'user', content: 'Test' }],
          maxTokens: 10,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        setTestStatus({
          success: false,
          message: `Erreur: ${error.message}`,
        });
        return;
      }

      if (data.error) {
        setTestStatus({
          success: false,
          message: `Erreur: ${data.error}`,
        });
        return;
      }

      if (data.success) {
        setTestStatus({
          success: true,
          message: 'Connexion réussie ! Le LLM est opérationnel.',
        });
      }
    } catch (err: any) {
      setTestStatus({
        success: false,
        message: `Erreur de connexion: ${err.message}`,
      });
    }
  };

  const providers: Provider[] = [
    {
      value: 'openai',
      label: 'OpenAI',
      defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
      models: [
        { value: 'gpt-4o', label: 'GPT-4o (recommandé)' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'o1-preview', label: 'O1 Preview' },
        { value: 'o1-mini', label: 'O1 Mini' },
      ],
    },
    {
      value: 'anthropic',
      label: 'Anthropic (Claude)',
      defaultEndpoint: 'https://api.anthropic.com/v1/messages',
      models: [
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (recommandé)' },
        { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
        { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
      ],
    },
    {
      value: 'google',
      label: 'Google (Gemini)',
      defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
      models: [
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (recommandé)' },
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
        { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Experimental' },
        { value: 'gemini-flash-latest', label: 'Gemini Flash Latest' },
        { value: 'gemini-pro-latest', label: 'Gemini Pro Latest' },
        { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
        { value: 'gemini-exp-1206', label: 'Gemini Experimental 1206' },
        { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview' },
      ],
    },
    {
      value: 'custom',
      label: 'Personnalisé',
      defaultEndpoint: '',
      models: [],
    },
  ];

  const currentProvider = providers.find(p => p.value === settings.provider);
  const availableModels = currentProvider?.models || [];
  const isCustomModel = customModel === 'custom';

  const handleProviderChange = (providerValue: string) => {
    const provider = providers.find(p => p.value === providerValue);
    const defaultModel = provider?.models[0]?.value || 'gpt-4o';
    setSettings({
      ...settings,
      provider: providerValue,
      endpoint: provider?.defaultEndpoint || settings.endpoint,
      model: defaultModel,
    });
    setCustomModel('');
  };

  const handleModelChange = (modelValue: string) => {
    if (modelValue === 'custom') {
      setCustomModel('custom');
    } else {
      setSettings({ ...settings, model: modelValue });
      setCustomModel('');
    }
  };

  if (loading) {
    return (
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg p-6">
        <p className="text-center">Chargement des paramètres...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg p-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
            🔒 Connexion requise
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Vous devez être connecté pour configurer vos paramètres IA.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Configuration LLM</h2>
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary rounded-lg hover:opacity-90 transition-opacity"
            >
              {hasExistingSettings ? 'Modifier' : 'Configurer'}
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  if (hasExistingSettings) {
                    loadSettings(); // Recharger les paramètres existants
                  } else {
                    setSettings(DEFAULT_SETTINGS);
                  }
                  setCustomModel('');
                }}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                Enregistrer
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Provider */}
        <div>
          <label className="block text-sm font-medium mb-2">Fournisseur LLM</label>
          <select
            value={settings.provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            disabled={!isEditing}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {providers.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-medium mb-2">Modèle</label>
          {availableModels.length > 0 ? (
            <>
              <select
                value={isCustomModel ? 'custom' : settings.model}
                onChange={(e) => handleModelChange(e.target.value)}
                disabled={!isEditing}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {availableModels.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
                <option value="custom">Autre modèle (personnalisé)...</option>
              </select>
              {isCustomModel && (
                <input
                  type="text"
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Entrez le nom du modèle..."
                  className="w-full px-3 py-2 mt-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              )}
            </>
          ) : (
            <input
              type="text"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              disabled={!isEditing}
              placeholder="Nom du modèle..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          )}
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium mb-2">Clé API</label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              disabled={!isEditing}
              placeholder={hasExistingSettings ? '••••••••••••' : 'sk-... ou AIza...'}
              className="w-full px-3 py-2 pr-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {showApiKey ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          {hasExistingSettings && isEditing && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Laissez vide pour conserver votre clé API actuelle
            </p>
          )}
        </div>

        {/* Endpoint */}
        <div>
          <label className="block text-sm font-medium mb-2">Endpoint API</label>
          <input
            type="url"
            value={settings.endpoint}
            onChange={(e) => setSettings({ ...settings, endpoint: e.target.value })}
            disabled={!isEditing}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Température ({settings.temperature})
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
              disabled={!isEditing}
              className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Précis (0)</span>
              <span>Créatif (2)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium mb-2">Tokens maximum</label>
            <input
              type="number"
              value={settings.maxTokens}
              onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) || 0 })}
              disabled={!isEditing}
              min="100"
              max="32000"
              step="100"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Test Connection */}
        {hasExistingSettings && (
          <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
            <button
              onClick={handleTestConnection}
              disabled={!hasExistingSettings}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tester la connexion
            </button>

            {testStatus && (
              <div
                className={`mt-3 px-4 py-3 rounded-lg ${
                  testStatus.success
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                }`}
              >
                {testStatus.message}
              </div>
            )}
          </div>
        )}

        {/* Reset */}
        {hasExistingSettings && (
          <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              Réinitialiser la configuration
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LLMConfig;
