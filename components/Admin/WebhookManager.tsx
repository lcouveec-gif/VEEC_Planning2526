import React, { useState, useEffect } from 'react';

interface Webhook {
  id: string;
  name: string;
  endpoint: string;
}

const WebhookManager: React.FC = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [newWebhook, setNewWebhook] = useState({ name: '', endpoint: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<{ [key: string]: { success: boolean; message: string; timestamp: number } }>({});

  // Charger les webhooks depuis le localStorage
  useEffect(() => {
    const stored = localStorage.getItem('webhooks');
    if (stored) {
      setWebhooks(JSON.parse(stored));
    } else {
      // Webhook prédéfini
      const defaultWebhook: Webhook = {
        id: 'default-1',
        name: 'MajBaseMatch',
        endpoint: 'https://n8n.coutellec.fr/webhook/veec/calendriers/update',
      };
      setWebhooks([defaultWebhook]);
      localStorage.setItem('webhooks', JSON.stringify([defaultWebhook]));
    }
  }, []);

  const handleAddWebhook = () => {
    if (!newWebhook.name.trim() || !newWebhook.endpoint.trim()) {
      alert('Veuillez renseigner un nom et un endpoint');
      return;
    }

    const webhook: Webhook = {
      id: `webhook-${Date.now()}`,
      name: newWebhook.name,
      endpoint: newWebhook.endpoint,
    };

    const updatedWebhooks = [...webhooks, webhook];
    setWebhooks(updatedWebhooks);
    localStorage.setItem('webhooks', JSON.stringify(updatedWebhooks));

    setNewWebhook({ name: '', endpoint: '' });
    setIsAdding(false);
  };

  const handleDeleteWebhook = (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce webhook ?')) {
      return;
    }

    const updatedWebhooks = webhooks.filter(w => w.id !== id);
    setWebhooks(updatedWebhooks);
    localStorage.setItem('webhooks', JSON.stringify(updatedWebhooks));
  };

  const handleExecuteWebhook = async (webhook: Webhook) => {
    setExecutionStatus(prev => ({
      ...prev,
      [webhook.id]: { success: false, message: 'Exécution en cours...', timestamp: Date.now() },
    }));

    try {
      const response = await fetch(webhook.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'VEEC Planning Admin',
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setExecutionStatus(prev => ({
          ...prev,
          [webhook.id]: {
            success: true,
            message: `Succès (${response.status})`,
            timestamp: Date.now(),
          },
        }));
      } else {
        setExecutionStatus(prev => ({
          ...prev,
          [webhook.id]: {
            success: false,
            message: `Erreur ${response.status}: ${response.statusText}`,
            timestamp: Date.now(),
          },
        }));
      }
    } catch (error) {
      setExecutionStatus(prev => ({
        ...prev,
        [webhook.id]: {
          success: false,
          message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          timestamp: Date.now(),
        },
      }));
    }
  };

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestion des Webhooks</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary rounded-lg hover:opacity-90 transition-opacity"
        >
          {isAdding ? 'Annuler' : '+ Ajouter un webhook'}
        </button>
      </div>

      {isAdding && (
        <div className="mb-6 p-4 border-2 border-light-primary dark:border-dark-primary rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Nouveau webhook</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nom</label>
              <input
                type="text"
                value={newWebhook.name}
                onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                placeholder="Ex: MajBaseMatch"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Endpoint (URL)</label>
              <input
                type="url"
                value={newWebhook.endpoint}
                onChange={(e) => setNewWebhook({ ...newWebhook, endpoint: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
            </div>
            <button
              onClick={handleAddWebhook}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {webhooks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Aucun webhook configuré
          </div>
        ) : (
          webhooks.map(webhook => {
            const status = executionStatus[webhook.id];
            const isRecent = status && (Date.now() - status.timestamp) < 5000;

            return (
              <div
                key={webhook.id}
                className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-1">{webhook.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
                      {webhook.endpoint}
                    </p>
                    {status && isRecent && (
                      <div
                        className={`mt-2 text-sm px-3 py-1 rounded inline-block ${
                          status.success
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                        }`}
                      >
                        {status.message}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExecuteWebhook(webhook)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors whitespace-nowrap"
                      title="Lancer le webhook"
                    >
                      ▶ Lancer
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WebhookManager;
