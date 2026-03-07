import React, { useState } from 'react';
import { useWebhooks, type Webhook, type WebhookFormData, type WebhookMethod, type WebhookAuthType } from '../../hooks/useWebhooks';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildHeaders(w: Webhook): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (w.auth_type === 'bearer' && w.auth_value) {
    headers['Authorization'] = `Bearer ${w.auth_value}`;
  } else if (w.auth_type === 'basic' && w.auth_value) {
    headers['Authorization'] = `Basic ${btoa(w.auth_value)}`;
  } else if (w.auth_type === 'header' && w.auth_value) {
    const sep = w.auth_value.indexOf(':');
    if (sep > 0) {
      headers[w.auth_value.slice(0, sep).trim()] = w.auth_value.slice(sep + 1).trim();
    }
  }
  return headers;
}

const METHODS: WebhookMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const AUTH_TYPES: { value: WebhookAuthType; label: string }[] = [
  { value: 'none', label: 'Aucune' },
  { value: 'bearer', label: 'Bearer token' },
  { value: 'basic', label: 'Basic (user:pass)' },
  { value: 'header', label: 'Header personnalisé' },
];

const emptyForm = (): WebhookFormData => ({
  name: '',
  endpoint: '',
  method: 'POST',
  auth_type: 'none',
  auth_value: null,
});

const webhookToForm = (w: Webhook): WebhookFormData => ({
  name: w.name,
  endpoint: w.endpoint,
  method: w.method,
  auth_type: w.auth_type,
  auth_value: w.auth_value,
});

// ─── Formulaire ───────────────────────────────────────────────────────────────

interface FormProps {
  form: WebhookFormData;
  setForm: React.Dispatch<React.SetStateAction<WebhookFormData>>;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  isEdit?: boolean;
}

const WebhookForm: React.FC<FormProps> = ({ form, setForm, saving, onSave, onCancel, isEdit }) => {
  const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface text-sm';
  const labelClass = 'block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400 uppercase tracking-wide';

  const authPlaceholder = {
    none: '',
    bearer: 'eyJhbGciOi...',
    basic: 'utilisateur:motdepasse',
    header: 'X-API-Key:ma-cle-secrete',
  }[form.auth_type] ?? '';

  const authHelp = {
    none: '',
    bearer: 'Token envoyé dans Authorization: Bearer <token>',
    basic: 'Encodé en Base64 → Authorization: Basic <base64>',
    header: 'Format : NomHeader:valeur  (ex: X-Api-Key:abc123)',
  }[form.auth_type] ?? '';

  return (
    <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/40">
      <h3 className="font-semibold text-light-onSurface dark:text-dark-onSurface">
        {isEdit ? 'Modifier le webhook' : 'Nouveau webhook'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nom */}
        <div>
          <label className={labelClass}>Nom</label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ex: MajInscriptions" className={inputClass} />
        </div>

        {/* Méthode */}
        <div>
          <label className={labelClass}>Méthode HTTP</label>
          <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value as WebhookMethod }))}
            className={inputClass}>
            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Endpoint */}
      <div>
        <label className={labelClass}>URL endpoint</label>
        <input type="url" value={form.endpoint} onChange={e => setForm(f => ({ ...f, endpoint: e.target.value }))}
          placeholder="https://n8n.example.fr/webhook/..." className={inputClass} />
      </div>

      {/* Authentification */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Authentification</label>
          <select value={form.auth_type} onChange={e => setForm(f => ({ ...f, auth_type: e.target.value as WebhookAuthType, auth_value: null }))}
            className={inputClass}>
            {AUTH_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>

        {form.auth_type !== 'none' && (
          <div>
            <label className={labelClass}>Valeur</label>
            <input type="password" value={form.auth_value ?? ''}
              onChange={e => setForm(f => ({ ...f, auth_value: e.target.value || null }))}
              placeholder={authPlaceholder} className={inputClass} autoComplete="new-password" />
            {authHelp && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{authHelp}</p>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={saving || !form.name.trim() || !form.endpoint.trim()}
          className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors">
          {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors hover:bg-gray-300 dark:hover:bg-gray-600">
          Annuler
        </button>
      </div>
    </div>
  );
};

// ─── Composant principal ───────────────────────────────────────────────────────

interface ExecStatus { success: boolean; message: string; at: number; }

const WebhookManager: React.FC = () => {
  const { webhooks, loading, error, create, update, remove } = useWebhooks();
  const [form, setForm] = useState<WebhookFormData>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [execStatus, setExecStatus] = useState<Record<string, ExecStatus>>({});

  const openCreate = () => { setForm(emptyForm()); setEditingId(null); setShowForm(true); };
  const openEdit = (w: Webhook) => { setForm(webhookToForm(w)); setEditingId(w.id); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const handleSave = async () => {
    setSaving(true);
    if (editingId) {
      await update(editingId, form);
    } else {
      await create(form);
    }
    setSaving(false);
    closeForm();
  };

  const handleDelete = async (w: Webhook) => {
    if (!window.confirm(`Supprimer le webhook "${w.name}" ?`)) return;
    await remove(w.id);
  };

  const handleExecute = async (w: Webhook) => {
    setExecStatus(prev => ({ ...prev, [w.id]: { success: false, message: 'Exécution...', at: Date.now() } }));
    try {
      const response = await fetch(w.endpoint, {
        method: w.method,
        headers: buildHeaders(w),
        body: ['GET', 'HEAD'].includes(w.method) ? undefined : JSON.stringify({
          source: 'VEEC Planning Admin',
          timestamp: new Date().toISOString(),
        }),
      });
      setExecStatus(prev => ({
        ...prev,
        [w.id]: { success: response.ok, message: response.ok ? `Succès (${response.status})` : `Erreur ${response.status} ${response.statusText}`, at: Date.now() },
      }));
    } catch (err: any) {
      setExecStatus(prev => ({
        ...prev,
        [w.id]: { success: false, message: `Erreur : ${err.message ?? 'inconnue'}`, at: Date.now() },
      }));
    }
  };

  const methodColor = (m: WebhookMethod) => ({
    GET: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    POST: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    PUT: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    PATCH: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    DELETE: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  }[m] ?? 'bg-gray-100 text-gray-600');

  const authLabel = (w: Webhook) => {
    if (w.auth_type === 'none') return null;
    const label = AUTH_TYPES.find(a => a.value === w.auth_type)?.label ?? w.auth_type;
    return <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">🔒 {label}</span>;
  };

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-light-onSurface dark:text-dark-onSurface">Webhooks</h2>
        <button onClick={openCreate}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter
        </button>
      </div>

      {/* Formulaire création / édition */}
      {showForm && (
        <WebhookForm form={form} setForm={setForm} saving={saving}
          onSave={handleSave} onCancel={closeForm} isEdit={!!editingId} />
      )}

      {/* Liste */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Chargement...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500 text-sm">{error}</div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          Aucun webhook configuré. Cliquez sur Ajouter pour en créer un.
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(w => {
            const status = execStatus[w.id];
            const isRecent = status && (Date.now() - status.at) < 8000;
            return (
              <div key={w.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-bold text-light-onSurface dark:text-dark-onSurface">{w.name}</h4>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${methodColor(w.method)}`}>{w.method}</span>
                      {authLabel(w)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 break-all">{w.endpoint}</p>
                    {status && isRecent && (
                      <div className={`mt-2 text-xs px-3 py-1.5 rounded inline-block ${
                        status.success
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                      }`}>
                        {status.message}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleExecute(w)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors whitespace-nowrap"
                      title="Lancer">
                      ▶ Lancer
                    </button>
                    <button onClick={() => openEdit(w)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
                      title="Modifier">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(w)}
                      className="px-3 py-2 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg text-sm transition-colors"
                      title="Supprimer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WebhookManager;
