import React, { useState, useEffect } from 'react';

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
  const [settings, setSettings] = useState<LLMSettings>(DEFAULT_SETTINGS);
  const [isEditing, setIsEditing] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [customModel, setCustomModel] = useState('');

  // Charger les paramètres depuis le localStorage
  useEffect(() => {
    const stored = localStorage.getItem('llmSettings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  const handleSave = () => {
    if (!settings.apiKey.trim()) {
      alert('Veuillez renseigner une clé API');
      return;
    }

    localStorage.setItem('llmSettings', JSON.stringify(settings));
    setIsEditing(false);
    alert('Configuration LLM enregistrée avec succès');
  };

  const handleReset = () => {
    if (!window.confirm('Voulez-vous vraiment réinitialiser la configuration ?')) {
      return;
    }

    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('llmSettings');
    setIsEditing(false);
  };

  const handleTestConnection = async () => {
    setTestStatus({ success: false, message: 'Test en cours...' });

    try {
      const response = await fetch(settings.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            { role: 'user', content: 'Test de connexion' }
          ],
          max_tokens: 10,
        }),
      });

      if (response.ok) {
        setTestStatus({
          success: true,
          message: 'Connexion réussie ! Le LLM est opérationnel.',
        });
      } else {
        const error = await response.json();
        setTestStatus({
          success: false,
          message: `Erreur ${response.status}: ${error.error?.message || response.statusText}`,
        });
      }
    } catch (error) {
      setTestStatus({
        success: false,
        message: `Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
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
      defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      models: [
        { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (recommandé)' },
        { value: 'gemini-exp-1206', label: 'Gemini Exp 1206' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
        { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' },
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
    setSettings({
      ...settings,
      provider: providerValue,
      endpoint: provider?.defaultEndpoint || settings.endpoint,
      model: provider?.models[0]?.value || settings.model,
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
              Modifier
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  // Recharger depuis localStorage
                  const stored = localStorage.getItem('llmSettings');
                  if (stored) setSettings(JSON.parse(stored));
                  else setSettings(DEFAULT_SETTINGS);
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
              placeholder="sk-... ou AIza..."
              className="w-full px-3 py-2 pr-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {showApiKey ? 'Masquer' : 'Afficher'}
            </button>
          </div>
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
        <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
          <button
            onClick={handleTestConnection}
            disabled={!settings.apiKey}
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

        {/* Reset */}
        <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            Réinitialiser la configuration
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
          ℹ️ Information
        </h4>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Cette configuration sera utilisée pour les futures fonctionnalités IA du planning :
          génération automatique de descriptions, suggestions d'organisation, analyse de disponibilités, etc.
        </p>
      </div>
    </div>
  );
};

export default LLMConfig;
