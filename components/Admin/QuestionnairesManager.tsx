import React, { useState, useMemo } from 'react';
import { useQuestionnaireTemplates } from '../../hooks/useQuestionnaireTemplates';
import { useQuestionnaireStats } from '../../hooks/useQuestionnaireStats';
import type { QuestionnaireTemplateWithQuestions, TypeQuestion, QuestionStats } from '../../types';

const TYPE_LABELS: Record<TypeQuestion, string> = {
  texte_libre: 'Texte libre',
  note_5: 'Note sur 5',
  note_10: 'Note sur 10',
};

const TYPE_COLORS: Record<TypeQuestion, string> = {
  texte_libre: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  note_5: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  note_10: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

// ── Composant stats agrégées ────────────────────────────────────────────────
function StatsView({ templateId }: { templateId: string }) {
  const { stats, loading, error } = useQuestionnaireStats(templateId);

  if (loading) return <div className="text-sm text-gray-400 py-4 text-center">Chargement des statistiques…</div>;
  if (error) return <div className="text-sm text-red-500 py-2">{error}</div>;
  if (!stats || stats.total_reponses === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 italic">Aucune réponse enregistrée pour ce questionnaire.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full font-semibold">
          {stats.total_reponses} réponse{stats.total_reponses > 1 ? 's' : ''} au total
        </span>
        {stats.stages.map(s => (
          <span key={s.stage_id} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
            {s.nom_stage} : {s.nb_reponses}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {stats.questions.map(q => (
          <QuestionStatCard key={q.question_id} stat={q} />
        ))}
      </div>
    </div>
  );
}

function QuestionStatCard({ stat }: { stat: QuestionStats }) {
  const maxNote = stat.type_question === 'note_10' ? 10 : 5;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{stat.libelle}</p>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[stat.type_question]}`}>
          {TYPE_LABELS[stat.type_question]}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{stat.nb_reponses} réponse{stat.nb_reponses !== 1 ? 's' : ''}</p>

      {stat.type_question === 'texte_libre' ? (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {(stat.textes || []).length === 0
            ? <p className="text-xs text-gray-400 italic">Aucun texte saisi</p>
            : (stat.textes || []).map((t, i) => (
                <p key={i} className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
                  {t}
                </p>
              ))
          }
        </div>
      ) : (
        <div className="space-y-2">
          {stat.moyenne !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{stat.moyenne}</span>
              <span className="text-xs text-gray-400">/ {maxNote} (moy.) · min {stat.min} · max {stat.max}</span>
            </div>
          )}
          {/* Barres de distribution */}
          <div className="flex gap-1 items-end h-12">
            {Array.from({ length: maxNote }, (_, i) => i + 1).map(note => {
              const count = stat.distribution?.[note] || 0;
              const total = stat.nb_reponses || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={note} className="flex flex-col items-center gap-0.5 flex-1">
                  <span className="text-xs text-gray-500">{count > 0 ? count : ''}</span>
                  <div
                    className="w-full bg-indigo-500 dark:bg-indigo-400 rounded-t transition-all"
                    style={{ height: `${pct}%`, minHeight: count > 0 ? 4 : 0 }}
                  />
                  <span className="text-xs text-gray-400">{note}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Formulaire question ────────────────────────────────────────────────────
interface QuestionFormProps {
  onAdd: (libelle: string, type: TypeQuestion, obligatoire: boolean) => Promise<void>;
  onCancel: () => void;
}
function QuestionForm({ onAdd, onCancel }: QuestionFormProps) {
  const [libelle, setLibelle] = useState('');
  const [type, setType] = useState<TypeQuestion>('note_5');
  const [obligatoire, setObligatoire] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libelle.trim()) return;
    setSaving(true);
    await onAdd(libelle, type, obligatoire);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="border border-dashed border-indigo-300 dark:border-indigo-600 rounded-lg p-3 space-y-2 bg-indigo-50/50 dark:bg-indigo-900/10">
      <input
        type="text"
        value={libelle}
        onChange={e => setLibelle(e.target.value)}
        placeholder="Libellé de la question…"
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        autoFocus
      />
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={type}
          onChange={e => setType(e.target.value as TypeQuestion)}
          className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="note_5">Note sur 5</option>
          <option value="note_10">Note sur 10</option>
          <option value="texte_libre">Texte libre</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={obligatoire}
            onChange={e => setObligatoire(e.target.checked)}
            className="rounded"
          />
          Obligatoire
        </label>
        <div className="flex gap-1 ml-auto">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!libelle.trim() || saving}
            className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
          >
            {saving ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ── Vue détail d'un template ───────────────────────────────────────────────
interface TemplateDetailProps {
  template: QuestionnaireTemplateWithQuestions;
  onBack: () => void;
  hooks: ReturnType<typeof useQuestionnaireTemplates>;
}
function TemplateDetail({ template, onBack, hooks }: TemplateDetailProps) {
  const { updateTemplate, deleteTemplate, addQuestion, updateQuestion, deleteQuestion, reorderQuestions } = hooks;
  const [nom, setNom] = useState(template.nom);
  const [description, setDescription] = useState(template.description || '');
  const [editingHeader, setEditingHeader] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editLibelle, setEditLibelle] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSaveHeader = async () => {
    if (!nom.trim()) return;
    setSavingHeader(true);
    await updateTemplate(template.id, { nom: nom.trim(), description: description.trim() || null });
    setSavingHeader(false);
    setEditingHeader(false);
  };

  const handleAddQuestion = async (libelle: string, type: TypeQuestion, obligatoire: boolean) => {
    await addQuestion(template.id, libelle, type, obligatoire);
    setShowAddQuestion(false);
  };

  const handleDeleteTemplate = async () => {
    setDeleting(true);
    const ok = await deleteTemplate(template.id);
    if (ok) onBack();
    else setDeleting(false);
  };

  const handleMoveQuestion = async (idx: number, dir: -1 | 1) => {
    const newOrder = [...template.questions];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    await reorderQuestions(template.id, newOrder.map(q => q.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="px-3 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium">
          ← Retour
        </button>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex-1 truncate">{template.nom}</h3>
        <button
          onClick={() => { setEditingHeader(!editingHeader); setNom(template.nom); setDescription(template.description || ''); }}
          className="px-3 py-1.5 text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          ✎ Modifier infos
        </button>
      </div>

      {/* Formulaire édition header */}
      {editingHeader && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
          <input
            type="text"
            value={nom}
            onChange={e => setNom(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            placeholder="Nom du questionnaire"
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
            placeholder="Description (optionnelle)"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditingHeader(false)} className="px-3 py-1.5 text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Annuler</button>
            <button onClick={handleSaveHeader} disabled={!nom.trim() || savingHeader} className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
              {savingHeader ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {template.description && !editingHeader && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
      )}

      {/* Questions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            Questions ({template.questions.length})
          </h4>
          {!showAddQuestion && (
            <button
              onClick={() => setShowAddQuestion(true)}
              className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              + Ajouter une question
            </button>
          )}
        </div>

        <div className="space-y-2">
          {template.questions.length === 0 && !showAddQuestion && (
            <p className="text-sm text-gray-400 italic text-center py-4">Aucune question. Ajoutez-en une.</p>
          )}

          {template.questions.map((q, idx) => (
            <div key={q.id} className="flex items-start gap-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {/* Réordonnancement */}
              <div className="flex flex-col gap-0.5 mt-0.5">
                <button
                  onClick={() => handleMoveQuestion(idx, -1)}
                  disabled={idx === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                  title="Monter"
                >▲</button>
                <button
                  onClick={() => handleMoveQuestion(idx, 1)}
                  disabled={idx === template.questions.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                  title="Descendre"
                >▼</button>
              </div>

              <div className="flex-1 min-w-0">
                {editingQuestionId === q.id ? (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={editLibelle}
                      onChange={e => setEditLibelle(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (editLibelle.trim()) {
                            await updateQuestion(q.id, { libelle: editLibelle.trim() });
                          }
                          setEditingQuestionId(null);
                        }}
                        className="px-2 py-0.5 text-xs bg-green-600 text-white rounded"
                      >OK</button>
                      <button onClick={() => setEditingQuestionId(null)} className="px-2 py-0.5 text-xs bg-gray-400 text-white rounded">Annuler</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono w-5 text-right shrink-0">{idx + 1}.</span>
                    <p className="text-sm text-gray-800 dark:text-gray-200 flex-1">{q.libelle}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[q.type_question]}`}>
                  {TYPE_LABELS[q.type_question]}
                </span>
                {q.obligatoire && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">*</span>
                )}
                <button
                  onClick={() => { setEditingQuestionId(q.id); setEditLibelle(q.libelle); }}
                  className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5"
                  title="Modifier"
                >✎</button>
                <button
                  onClick={() => deleteQuestion(q.id)}
                  className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-0.5"
                  title="Supprimer"
                >✕</button>
              </div>
            </div>
          ))}

          {showAddQuestion && (
            <QuestionForm
              onAdd={handleAddQuestion}
              onCancel={() => setShowAddQuestion(false)}
            />
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div>
        <button
          onClick={() => setShowStats(!showStats)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 mb-3"
        >
          <span>{showStats ? '▼' : '▶'}</span>
          Statistiques globales
        </button>
        {showStats && <StatsView templateId={template.id} />}
      </div>

      {/* Zone danger */}
      <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Zone de danger</h4>
        {confirmDelete ? (
          <div className="flex gap-2 items-center">
            <span className="text-sm text-red-700 dark:text-red-400">Supprimer ce questionnaire et toutes ses données ?</span>
            <button
              onClick={handleDeleteTemplate}
              disabled={deleting}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50"
            >
              {deleting ? 'Suppression…' : 'Confirmer'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 text-sm bg-gray-400 text-white rounded-md">Annuler</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-3 py-1.5 text-sm rounded-md border border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Supprimer ce questionnaire
          </button>
        )}
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
const QuestionnairesManager: React.FC = () => {
  const hooks = useQuestionnaireTemplates();
  const { templates, loading, error } = hooks;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newNom, setNewNom] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === selectedId) ?? null,
    [templates, selectedId],
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom.trim()) return;
    setCreating(true);
    const created = await hooks.createTemplate(newNom.trim(), newDesc.trim() || undefined);
    setCreating(false);
    if (created) {
      setNewNom('');
      setNewDesc('');
      setShowCreate(false);
      setSelectedId(created.id);
    }
  };

  if (loading) {
    return (
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-8 shadow-md text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Chargement…</p>
      </div>
    );
  }

  if (selectedTemplate) {
    return (
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 shadow-md">
        {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">{error}</div>}
        <TemplateDetail
          template={selectedTemplate}
          onBack={() => setSelectedId(null)}
          hooks={hooks}
        />
      </div>
    );
  }

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 shadow-md space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Questionnaires types</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Créez des questionnaires réutilisables pour recueillir les retours des stagiaires</p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg"
          >
            + Nouveau questionnaire
          </button>
        )}
      </div>

      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">{error}</div>}

      {/* Formulaire création */}
      {showCreate && (
        <form onSubmit={handleCreate} className="border border-indigo-200 dark:border-indigo-700 rounded-lg p-4 space-y-3 bg-indigo-50/50 dark:bg-indigo-900/10">
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Nouveau questionnaire</h4>
          <input
            type="text"
            value={newNom}
            onChange={e => setNewNom(e.target.value)}
            placeholder="Nom du questionnaire *"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            autoFocus
          />
          <textarea
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Description (optionnelle)"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowCreate(false); setNewNom(''); setNewDesc(''); }} className="px-3 py-1.5 text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Annuler</button>
            <button type="submit" disabled={!newNom.trim() || creating} className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
              {creating ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      {/* Liste des templates */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">Aucun questionnaire créé</p>
          <p className="text-sm">Créez votre premier questionnaire pour commencer</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className="text-left border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all bg-white dark:bg-gray-800/50"
            >
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">{t.nom}</h4>
              {t.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{t.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {t.questions.length === 0
                  ? <span className="text-xs text-gray-400 italic">Aucune question</span>
                  : t.questions.slice(0, 3).map(q => (
                      <span key={q.id} className={`text-xs px-1.5 py-0.5 rounded-full ${TYPE_COLORS[q.type_question]}`}>
                        {TYPE_LABELS[q.type_question]}
                      </span>
                    ))
                }
                {t.questions.length > 3 && (
                  <span className="text-xs text-gray-400">+{t.questions.length - 3}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">{t.questions.length} question{t.questions.length !== 1 ? 's' : ''}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionnairesManager;
