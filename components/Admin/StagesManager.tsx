import React, { useState, useRef } from 'react';
import { useStages } from '../../hooks/useStages';
import { useStageInscriptions } from '../../hooks/useStageInscriptions';
import { useStageEncadrants } from '../../hooks/useStageEncadrants';
import { useLicencies } from '../../hooks/useLicencies';
import type {
  Stage,
  StageInscription,
  StageCategorie,
  StageGenre,
  StageNiveau,
  TypeInscription,
  TypeParticipant,
  ImportInscriptionResult,
  StageEncadrant,
  Licencie,
} from '../../types';

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIES: StageCategorie[] = ['M11', 'M13', 'M15', 'M18', 'Senior'];
const GENRES: StageGenre[] = ['Masculin', 'Féminin'];
const NIVEAUX: StageNiveau[] = ['Débutant', 'Confirmé', 'Expert'];

const JOURS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

// ─── Helpers dates ─────────────────────────────────────────────────────────────

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  if (!start || !end) return dates;
  const current = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  while (current <= endDate) {
    // Utiliser les méthodes locales (getFullYear/Month/Date) pour éviter le décalage UTC
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

const formatDate = (d: string) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

const formatDateShort = (d: string) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return `${JOURS_FR[dt.getDay()]} ${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

const formatEuro = (n?: number | null) =>
  n != null ? `${n.toFixed(0)} €` : '-';

// ─── Recherche licence dans VEEC_Licencie ──────────────────────────────────────

const normalizeForSearch = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

function findLicenceNum(
  nom: string | null | undefined,
  prenom: string,
  licencies: Licencie[],
): string | null {
  if (!prenom?.trim()) return null;
  const normPrenom = normalizeForSearch(prenom);
  const normNom = nom ? normalizeForSearch(nom) : null;
  const found = licencies.find(l => {
    const lPrenom = normalizeForSearch(l.Prenom_Licencie || '');
    const lNom = normalizeForSearch(l.Nom_Licencie || '');
    if (lPrenom !== normPrenom) return false;
    if (normNom !== null && normNom !== '' && lNom !== normNom) return false;
    return true;
  });
  return found?.Num_Licencie != null ? String(found.Num_Licencie) : null;
}

// ─── Parsing de date (formats multiples) ──────────────────────────────────────
// Accepte : YYYY-MM-DD, DD/MM/YYYY, D/M/YYYY, DD.MM.YYYY (Excel FR)

function parseDateStr(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  // ISO : 2026-02-24
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // FR avec slash ou point : 24/02/2026 ou 24.02.2026 ou 4/2/2026
  const mFr = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
  if (mFr) return `${mFr[3]}-${mFr[2].padStart(2, '0')}-${mFr[1].padStart(2, '0')}`;
  return null;
}

// ─── Auto-calcul montant ───────────────────────────────────────────────────────

function calcMontant(
  stage: Stage,
  typeInscription: TypeInscription,
  typeParticipant: TypeParticipant,
  jours?: string[] | null,
  nbJoursFallback?: number | null,
): number | null {
  const nbJours = (jours && jours.length > 0) ? jours.length : (nbJoursFallback ?? 0);
  if (typeInscription === 'stage_complet') {
    const tarif = typeParticipant === 'interne'
      ? stage.tarif_stage_interne
      : stage.tarif_stage_externe;
    return tarif ?? null;
  }
  // journee
  const tarifJour = typeParticipant === 'interne'
    ? stage.tarif_jour_interne
    : stage.tarif_jour_externe;
  if (tarifJour != null && nbJours > 0) return tarifJour * nbJours;
  return null;
}

// ─── Types internes ────────────────────────────────────────────────────────────

type StageViewMode = 'list' | 'create-stage' | 'edit-stage' | 'detail';

type InscriptionFormData = Omit<StageInscription, 'id' | 'created_at'>;

const emptyInscription = (stageId: string): InscriptionFormData => ({
  stage_id: stageId,
  nom: '',
  prenom: '',
  categorie: null,
  genre: null,
  niveau: null,
  num_licence: '',
  type_inscription: 'stage_complet',
  type_participant: 'externe',
  jours: null,
  nb_jours: null,
  montant: null,
  notes: '',
});

// ─── Composant principal ───────────────────────────────────────────────────────

const StagesManager: React.FC = () => {
  const { stages, loading: stagesLoading, error: stagesError, refetch: refetchStages, createStage, updateStage, deleteStage } = useStages();

  const [viewMode, setViewMode] = useState<StageViewMode>('list');
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [stageForm, setStageForm] = useState<Partial<Stage>>({});
  const [stageSaving, setStageSaving] = useState(false);

  const openCreateStage = () => {
    setStageForm({ nom: '', date_debut: '', date_fin: '', description: '' });
    setViewMode('create-stage');
  };

  const openEditStage = (stage: Stage) => {
    setSelectedStage(stage);
    setStageForm({ ...stage });
    setViewMode('edit-stage');
  };

  const openDetail = (stage: Stage) => {
    setSelectedStage(stage);
    setViewMode('detail');
  };

  const handleSaveStage = async () => {
    if (!stageForm.nom?.trim()) { alert('Le nom du stage est obligatoire.'); return; }
    if (!stageForm.date_debut) { alert('La date de début est obligatoire.'); return; }
    if (!stageForm.date_fin) { alert('La date de fin est obligatoire.'); return; }
    if (stageForm.date_debut > stageForm.date_fin) { alert('La date de fin doit être après la date de début.'); return; }

    setStageSaving(true);
    try {
      const payload = {
        nom: stageForm.nom!.trim(),
        date_debut: stageForm.date_debut!,
        date_fin: stageForm.date_fin!,
        tarif_stage_interne: stageForm.tarif_stage_interne ?? null,
        tarif_stage_externe: stageForm.tarif_stage_externe ?? null,
        tarif_jour_interne: stageForm.tarif_jour_interne ?? null,
        tarif_jour_externe: stageForm.tarif_jour_externe ?? null,
        description: stageForm.description?.trim() || null,
        gymnase: stageForm.gymnase?.trim() || 'David Douillet (Coupvray)',
      };

      if (viewMode === 'create-stage') {
        const created = await createStage(payload);
        if (created) setViewMode('list');
        else alert('Erreur lors de la création du stage.');
      } else if (viewMode === 'edit-stage' && selectedStage) {
        const ok = await updateStage(selectedStage.id, payload);
        if (ok) {
          setSelectedStage({ ...selectedStage, ...payload });
          setViewMode('list');
        } else {
          alert('Erreur lors de la mise à jour.');
        }
      }
    } finally {
      setStageSaving(false);
    }
  };

  const handleDeleteStage = async (stage: Stage) => {
    if (!window.confirm(`Supprimer le stage "${stage.nom}" et toutes ses inscriptions ?`)) return;
    const ok = await deleteStage(stage.id);
    if (ok) setViewMode('list');
  };

  if (viewMode === 'create-stage' || viewMode === 'edit-stage') {
    return <StageForm
      form={stageForm}
      setForm={setStageForm}
      saving={stageSaving}
      isEdit={viewMode === 'edit-stage'}
      stage={viewMode === 'edit-stage' ? selectedStage : null}
      onSave={handleSaveStage}
      onCancel={() => setViewMode('list')}
      onDelete={viewMode === 'edit-stage' && selectedStage ? () => handleDeleteStage(selectedStage) : undefined}
    />;
  }

  if (viewMode === 'detail' && selectedStage) {
    return <StageDetail
      stage={selectedStage}
      onBack={() => setViewMode('list')}
      onEdit={() => openEditStage(selectedStage)}
    />;
  }

  // ─── Vue Liste ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-light-onSurface dark:text-dark-onSurface">
          {stagesLoading ? 'Chargement...' : `${stages.length} stage${stages.length > 1 ? 's' : ''}`}
        </h3>
        <div className="flex gap-2">
          <button onClick={refetchStages} disabled={stagesLoading}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
            Actualiser
          </button>
          <button onClick={openCreateStage}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau stage
          </button>
        </div>
      </div>

      {stagesError && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
          {stagesError}
        </div>
      )}

      {stagesLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-light-primary dark:border-dark-primary"></div>
        </div>
      ) : stages.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium">Aucun stage</p>
          <p className="text-sm mt-1">Créez votre premier stage avec le bouton ci-dessus.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stages.map((stage) => (
            <StageCard key={stage.id} stage={stage}
              onClick={() => openDetail(stage)}
              onEdit={() => openEditStage(stage)}
              onDelete={() => handleDeleteStage(stage)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Carte Stage ───────────────────────────────────────────────────────────────

interface StageCardProps { stage: Stage; onClick: () => void; onEdit: () => void; onDelete: () => void; }

const StageCard: React.FC<StageCardProps> = ({ stage, onClick, onEdit, onDelete }) => {
  const rangeDates = getDatesInRange(stage.date_debut, stage.date_fin);
  return (
    <div onClick={onClick}
      className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer group">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-lg font-bold text-light-onSurface dark:text-dark-onSurface truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {stage.nom}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {formatDate(stage.date_debut)} → {formatDate(stage.date_fin)}
              {rangeDates.length > 0 && <span className="ml-2 text-xs text-indigo-500">({rangeDates.length} jour{rangeDates.length > 1 ? 's' : ''})</span>}
            </p>
            {/* Jours du stage */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {rangeDates.map(d => (
                <span key={d} className="px-1.5 py-0.5 rounded text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                  {formatDateShort(d)}
                </span>
              ))}
            </div>
            {stage.description && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1.5 line-clamp-2">{stage.description}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Modifier">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors" title="Supprimer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tarifs */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {(stage.tarif_stage_interne != null || stage.tarif_stage_externe != null) && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-md px-2 py-1.5">
              <div className="font-semibold text-indigo-700 dark:text-indigo-400 mb-0.5">Stage complet</div>
              <div className="text-gray-700 dark:text-gray-300">Interne : {formatEuro(stage.tarif_stage_interne)}</div>
              <div className="text-gray-700 dark:text-gray-300">Externe : {formatEuro(stage.tarif_stage_externe)}</div>
            </div>
          )}
          {(stage.tarif_jour_interne != null || stage.tarif_jour_externe != null) && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-md px-2 py-1.5">
              <div className="font-semibold text-purple-700 dark:text-purple-400 mb-0.5">À la journée</div>
              <div className="text-gray-700 dark:text-gray-300">Interne : {formatEuro(stage.tarif_jour_interne)}</div>
              <div className="text-gray-700 dark:text-gray-300">Externe : {formatEuro(stage.tarif_jour_externe)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Formulaire Stage ──────────────────────────────────────────────────────────

interface StageFormProps {
  form: Partial<Stage>; setForm: React.Dispatch<React.SetStateAction<Partial<Stage>>>;
  saving: boolean; isEdit: boolean; stage: Stage | null;
  onSave: () => void; onCancel: () => void; onDelete?: () => void;
}

const StageForm: React.FC<StageFormProps> = ({ form, setForm, saving, isEdit, stage, onSave, onCancel, onDelete }) => {
  const numInput = (field: keyof Stage, val: string) => {
    const n = parseFloat(val);
    setForm(f => ({ ...f, [field]: isNaN(n) ? null : n }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onCancel}
          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-xl font-semibold text-light-onSurface dark:text-dark-onSurface">
          {isEdit ? `Modifier : ${stage?.nom}` : 'Nouveau stage'}
        </h3>
      </div>

      <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom du stage <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.nom || ''}
              onChange={(e) => setForm(f => ({ ...f, nom: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Stage été volley" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date de début <span className="text-red-500">*</span>
            </label>
            <input type="date" value={form.date_debut || ''}
              onChange={(e) => setForm(f => ({ ...f, date_debut: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date de fin <span className="text-red-500">*</span>
            </label>
            <input type="date" value={form.date_fin || ''}
              onChange={(e) => setForm(f => ({ ...f, date_fin: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          {/* Aperçu des jours */}
          {form.date_debut && form.date_fin && form.date_debut <= form.date_fin && (
            <div className="md:col-span-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Jours du stage :</p>
              <div className="flex flex-wrap gap-1">
                {getDatesInRange(form.date_debut, form.date_fin).map(d => (
                  <span key={d} className="px-2 py-0.5 rounded text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                    {formatDateShort(d)}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gymnase</label>
            <input type="text" value={form.gymnase ?? 'David Douillet (Coupvray)'}
              onChange={(e) => setForm(f => ({ ...f, gymnase: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="David Douillet (Coupvray)" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea rows={2} value={form.description || ''}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Informations supplémentaires..." />
          </div>
        </div>

        {/* Tarifs */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-indigo-500"></span>
            Tarifs
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              { label: 'Stage complet — Interne', field: 'tarif_stage_interne' },
              { label: 'Stage complet — Externe', field: 'tarif_stage_externe' },
              { label: 'À la journée — Interne', field: 'tarif_jour_interne' },
              { label: 'À la journée — Externe', field: 'tarif_jour_externe' },
            ] as { label: string; field: keyof Stage }[]).map(({ label, field }) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                <div className="relative">
                  <input type="number" min="0" step="0.5"
                    value={form[field] != null ? String(form[field]) : ''}
                    onChange={(e) => numInput(field, e.target.value)}
                    className="w-full pl-3 pr-7 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <div>
            {isEdit && onDelete && (
              <button onClick={onDelete}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium">
                Supprimer ce stage
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium">
              Annuler
            </button>
            <button onClick={onSave} disabled={saving}
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Enregistrement...</> : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Détail Stage + Inscriptions ───────────────────────────────────────────────

interface StageDetailProps { stage: Stage; onBack: () => void; onEdit: () => void; }

const StageDetail: React.FC<StageDetailProps> = ({ stage, onBack, onEdit }) => {
  const {
    inscriptions, loading, error, refetch,
    createInscription, updateInscription, deleteInscription, importInscriptions,
  } = useStageInscriptions(stage.id);

  const { licencies } = useLicencies();
  const {
    encadrants, addEncadrant, updateJours: updateEncadrantJours, updateRoleStage, deleteEncadrant,
  } = useStageEncadrants(stage.id);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportInscriptionResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [filterType, setFilterType] = useState<string>('');

  // Modal inscription
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inscForm, setInscForm] = useState<InscriptionFormData>(emptyInscription(stage.id));
  const [inscSaving, setInscSaving] = useState(false);

  const stageDates = getDatesInRange(stage.date_debut, stage.date_fin);

  const filtered = inscriptions.filter(ins => {
    if (!filterType) return true;
    return ins.type_inscription === filterType || ins.type_participant === filterType;
  });

  const totalMontant = inscriptions.reduce((s, i) => s + (i.montant ?? 0), 0);

  // ─── Modal helpers ──────────────────────────────────────────────────────────

  const openCreateModal = () => {
    const defaultJours = stageDates; // stage_complet → tous les jours par défaut
    const autoMontant = calcMontant(stage, 'stage_complet', 'externe', defaultJours);
    setEditingId(null);
    setInscForm({
      ...emptyInscription(stage.id),
      jours: defaultJours,
      nb_jours: defaultJours.length,
      montant: autoMontant,
    });
    setModalOpen(true);
  };

  const openEditModal = (ins: StageInscription) => {
    setEditingId(ins.id);
    setInscForm({
      stage_id: ins.stage_id,
      nom: ins.nom ?? '',
      prenom: ins.prenom,
      categorie: ins.categorie ?? null,
      genre: ins.genre ?? null,
      niveau: ins.niveau ?? null,
      num_licence: ins.num_licence ?? '',
      type_inscription: ins.type_inscription,
      type_participant: ins.type_participant,
      jours: ins.jours ?? null,
      nb_jours: ins.nb_jours ?? null,
      montant: ins.montant ?? null,
      notes: ins.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleInscFormChange = <K extends keyof InscriptionFormData>(
    key: K, value: InscriptionFormData[K]
  ) => {
    setInscForm(prev => {
      const updated = { ...prev, [key]: value };

      // Quand nom ou prénom change, chercher la licence dans VEEC_Licencie
      if (key === 'nom' || key === 'prenom') {
        const nom = key === 'nom' ? String(value ?? '') : (updated.nom ?? '');
        const prenom = key === 'prenom' ? String(value ?? '') : updated.prenom;
        if (!updated.num_licence?.trim()) {
          const found = findLicenceNum(nom, prenom, licencies);
          if (found) updated.num_licence = found;
        }
      }

      // Quand on change la formule
      if (key === 'type_inscription') {
        if (value === 'stage_complet') {
          updated.jours = stageDates; // auto-sélectionner tous les jours
        }
        // Pour 'journee', garder la sélection actuelle
      }

      // Synchroniser nb_jours depuis jours
      if (key === 'jours' || key === 'type_inscription') {
        const j = updated.jours;
        updated.nb_jours = j && j.length > 0 ? j.length : null;
      }

      // Recalcul auto du montant (nb_jours comme fallback si jours non sélectionnés)
      updated.montant = calcMontant(stage, updated.type_inscription, updated.type_participant, updated.jours, updated.nb_jours);

      return updated;
    });
  };

  const toggleJour = (date: string) => {
    const current = inscForm.jours ?? [];
    const next = current.includes(date)
      ? current.filter(d => d !== date)
      : [...current, date].sort();
    handleInscFormChange('jours', next.length > 0 ? next : null);
  };

  const handleSaveInscription = async () => {
    if (!inscForm.prenom.trim()) { alert('Le prénom est obligatoire.'); return; }
    setInscSaving(true);
    try {
      const payload: Omit<StageInscription, 'id' | 'created_at'> = {
        stage_id: stage.id,
        nom: inscForm.nom?.trim() || null,
        prenom: inscForm.prenom.trim(),
        categorie: inscForm.categorie || null,
        genre: inscForm.genre || null,
        niveau: inscForm.niveau || null,
        num_licence: inscForm.num_licence?.trim() || null,
        type_inscription: inscForm.type_inscription,
        type_participant: inscForm.type_participant,
        jours: inscForm.jours && inscForm.jours.length > 0 ? inscForm.jours : null,
        nb_jours: inscForm.jours ? inscForm.jours.length : null,
        montant: inscForm.montant ?? null,
        notes: inscForm.notes?.trim() || null,
      };

      if (editingId) {
        const ok = await updateInscription(editingId, payload);
        if (ok) setModalOpen(false); else alert('Erreur lors de la mise à jour.');
      } else {
        const created = await createInscription(payload);
        if (created) setModalOpen(false); else alert('Erreur lors de la création.');
      }
    } finally {
      setInscSaving(false);
    }
  };

  const handleDeleteInscription = async (ins: StageInscription) => {
    if (!window.confirm(`Supprimer l'inscription de ${ins.prenom} ${ins.nom || ''} ?`)) return;
    await deleteInscription(ins.id);
    setModalOpen(false);
  };

  // ─── CSV ────────────────────────────────────────────────────────────────────

  const handleDownloadTemplate = () => {
    // Nouveau format : 1 ligne par stagiaire pour forfait, 1 ligne par jour pour journée
    const day1 = stageDates[0] || '';
    const day2 = stageDates[1] || stageDates[0] || '';
    const header = 'Nom;Prenom;Num_Licence;Categorie;Genre;Niveau;Type_Inscription;Date;Notes';
    // Exemples : DUPONT forfait licencié (1 ligne), MARTIN forfait externe (1 ligne),
    //            DURAND journée externe (2 lignes = 2 jours)
    const examples = [
      `DUPONT;Jean;2412345;Senior;Masculin;Confirmé;Licenciés: Forfait;;`,
      `MARTIN;Marie;;Senior;Féminin;Débutant;Externes: Forfait;;`,
      `DURAND;Lucas;;M15;Masculin;Débutant;Externes: 1 Jour;${day1};`,
      `DURAND;Lucas;;M15;Masculin;Débutant;Externes: 1 Jour;${day2};`,
    ];
    const csv = [header, ...examples].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modele_inscriptions_${stage.nom.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { alert('Le fichier est vide ou ne contient que l\'en-tête.'); return; }

      const sep = lines[0].includes(';') ? ';' : ',';
      const columns = lines[0].split(sep).map(c =>
        c.trim().toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlever accents
      );

      const idx = {
        nom: columns.findIndex(c => c === 'nom'),
        prenom: columns.findIndex(c => c.includes('prenom')),
        numLicence: columns.findIndex(c => c.includes('licence') || c === 'num_licence'),
        categorie: columns.findIndex(c => c.includes('categ')),
        genre: columns.findIndex(c => c === 'genre'),
        niveau: columns.findIndex(c => c === 'niveau'),
        typeInscription: columns.findIndex(c => c.includes('type_insc') || c === 'type_inscription'),
        date: columns.findIndex(c => c === 'date'),
        notes: columns.findIndex(c => c === 'notes'),
      };

      if (idx.prenom === -1) {
        alert('Colonne "Prenom" introuvable. Colonnes détectées : ' + columns.join(', '));
        return;
      }

      // ── Interprétation du champ Type_Inscription ──────────────────────────────
      // Valeurs acceptées (insensible à la casse, accents optionnels) :
      //   "Licenciés: Forfait" | "Externes: Forfait" → stage_complet interne|externe
      //   "Licenciés: 1 Jour"  | "Externes: 1 Jour"  → journee interne|externe
      const parseTypeCol = (raw: string): { type_inscription: TypeInscription; type_participant: TypeParticipant } => {
        const s = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const isForfait = s.includes('forfait');
        const isInterne = s.includes('licenci') || s.includes('interne');
        return {
          type_inscription: isForfait ? 'stage_complet' : 'journee',
          type_participant: isInterne ? 'interne' : 'externe',
        };
      };

      // ── Structure intermédiaire (1 objet par ligne CSV) ───────────────────────
      interface RawRow {
        nom: string | null; prenom: string;
        num_licence: string | null;
        categorie: StageCategorie | null; genre: StageGenre | null; niveau: StageNiveau | null;
        type_inscription: TypeInscription; type_participant: TypeParticipant;
        date: string | null; // date précise pour "1 Jour", null pour forfait
        notes: string | null;
      }

      const rawRows: RawRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(sep).map(v => v.trim());
        const prenom = idx.prenom >= 0 ? vals[idx.prenom] : '';
        if (!prenom) continue;

        const typeRaw = idx.typeInscription >= 0 ? vals[idx.typeInscription] || '' : '';
        const { type_inscription, type_participant } = parseTypeCol(typeRaw);

        // Parser la date (accepte YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY)
        const dateRaw = idx.date >= 0 ? vals[idx.date] || '' : '';
        const date = parseDateStr(dateRaw);

        rawRows.push({
          nom: idx.nom >= 0 ? vals[idx.nom] || null : null,
          prenom,
          num_licence: idx.numLicence >= 0 ? vals[idx.numLicence] || null : null,
          categorie: (idx.categorie >= 0 ? vals[idx.categorie] || null : null) as StageCategorie | null,
          genre: (idx.genre >= 0 ? vals[idx.genre] || null : null) as StageGenre | null,
          niveau: (idx.niveau >= 0 ? vals[idx.niveau] || null : null) as StageNiveau | null,
          type_inscription,
          type_participant,
          date,
          notes: idx.notes >= 0 ? vals[idx.notes] || null : null,
        });
      }

      if (rawRows.length === 0) { alert('Aucune ligne valide dans le fichier.'); return; }

      // ── Regroupement par stagiaire ────────────────────────────────────────────
      // Clé : num_licence (si présent) ou prenom|nom (insensible casse)
      const groups = new Map<string, RawRow[]>();
      for (const row of rawRows) {
        const key = row.num_licence?.trim()
          || `${row.prenom.trim().toLowerCase()}|${(row.nom || '').trim().toLowerCase()}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      }

      // ── Construction des inscriptions (1 par groupe) ──────────────────────────
      const entries: Omit<StageInscription, 'id' | 'created_at'>[] = [];

      for (const rows of groups.values()) {
        const first = rows[0];
        let jours: string[] | null;

        if (first.type_inscription === 'stage_complet') {
          // Forfait → tous les jours du stage
          jours = stageDates.length > 0 ? stageDates : null;
        } else {
          // Journée → collecter les dates des lignes du groupe
          const dates = rows.map(r => r.date).filter(Boolean).sort() as string[];
          jours = dates.length > 0 ? dates : null;
        }

        const montant = calcMontant(stage, first.type_inscription, first.type_participant, jours);

        // Si le CSV n'a pas de num_licence, chercher dans VEEC_Licencie par nom+prénom (majuscules)
        const numLicence = first.num_licence?.trim()
          || findLicenceNum(first.nom, first.prenom, licencies)
          || null;

        entries.push({
          stage_id: stage.id,
          nom: first.nom,
          prenom: first.prenom,
          categorie: first.categorie,
          genre: first.genre,
          niveau: first.niveau,
          num_licence: numLicence,
          type_inscription: first.type_inscription,
          type_participant: first.type_participant,
          jours,
          nb_jours: jours ? jours.length : null,
          montant,
          notes: first.notes,
        });
      }

      if (entries.length === 0) { alert('Aucune inscription valide dans le fichier.'); return; }
      const result = await importInscriptions(entries);
      setImportResult(result);
    } catch (err) {
      console.error('CSV import error:', err);
      alert('Erreur lors de la lecture du fichier CSV.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <button onClick={onBack}
          className="self-start p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-light-onSurface dark:text-dark-onSurface">{stage.nom}</h3>
            <button onClick={onEdit}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Modifier le stage">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            {formatDate(stage.date_debut)} → {formatDate(stage.date_fin)}
          </p>
          {/* Jours du stage */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {stageDates.map(d => (
              <span key={d} className="px-1.5 py-0.5 rounded text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                {formatDateShort(d)}
              </span>
            ))}
          </div>
          {/* Tarifs résumés */}
          <div className="flex flex-wrap gap-2 mt-2">
            {stage.tarif_stage_interne != null && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                Stage interne {formatEuro(stage.tarif_stage_interne)}
              </span>
            )}
            {stage.tarif_stage_externe != null && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                Stage externe {formatEuro(stage.tarif_stage_externe)}
              </span>
            )}
            {stage.tarif_jour_interne != null && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                Journée interne {formatEuro(stage.tarif_jour_interne)}
              </span>
            )}
            {stage.tarif_jour_externe != null && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                Journée externe {formatEuro(stage.tarif_jour_externe)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Inscrits', value: inscriptions.length },
          { label: 'Internes', value: inscriptions.filter(i => i.type_participant === 'interne').length },
          { label: 'Externes', value: inscriptions.filter(i => i.type_participant === 'externe').length },
          { label: 'Total montants', value: totalMontant > 0 ? `${totalMontant.toFixed(0)} €` : '-' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-light-surface dark:bg-dark-surface rounded-lg p-3 shadow-sm text-center">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Section Encadrants */}
      <EncadrantsSection
        stage={stage}
        stageDates={stageDates}
        encadrants={encadrants}
        licencies={licencies}
        onAdd={addEncadrant}
        onUpdateJours={updateEncadrantJours}
        onUpdateRoleStage={updateRoleStage}
        onDelete={deleteEncadrant}
      />

      {/* Barre d'actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm">
          <option value="">Tous ({inscriptions.length})</option>
          <option value="stage_complet">Stage complet ({inscriptions.filter(i => i.type_inscription === 'stage_complet').length})</option>
          <option value="journee">À la journée ({inscriptions.filter(i => i.type_inscription === 'journee').length})</option>
          <option value="interne">Internes ({inscriptions.filter(i => i.type_participant === 'interne').length})</option>
          <option value="externe">Externes ({inscriptions.filter(i => i.type_participant === 'externe').length})</option>
        </select>

        <div className="flex gap-2 flex-wrap">
          <button onClick={refetch} disabled={loading}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 text-sm">
            Actualiser
          </button>
          <button onClick={handleDownloadTemplate}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Modèle CSV</span>
          </button>
          <label className={`px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors font-medium flex items-center gap-2 cursor-pointer text-sm ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="hidden sm:inline">{importing ? 'Import...' : 'Import CSV'}</span>
            <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleImportCsv} className="hidden" disabled={importing} />
          </label>
          <button onClick={openCreateModal}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Nouveau</span>
          </button>
        </div>
      </div>

      {/* Erreur / Import result */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}
      {importResult && (
        <div className={`p-4 rounded-lg border text-sm ${importResult.errors.length > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'}`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">Import terminé :</span>{' '}
              {importResult.created > 0 && <span className="text-green-700 dark:text-green-400">{importResult.created} créé{importResult.created > 1 ? 's' : ''}</span>}
              {importResult.created > 0 && importResult.updated > 0 && ', '}
              {importResult.updated > 0 && <span className="text-blue-700 dark:text-blue-400">{importResult.updated} mis à jour</span>}
              {importResult.errors.length > 0 && <span className="text-red-600 dark:text-red-400">, {importResult.errors.length} erreur{importResult.errors.length > 1 ? 's' : ''}</span>}
            </div>
            <button onClick={() => setImportResult(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {importResult.errors.length > 0 && (
            <ul className="mt-2 text-xs text-red-600 dark:text-red-400 space-y-1">
              {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Tableau inscriptions */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        </div>
      ) : (
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Nom</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Prénom</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell">Cat.</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">Niveau</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Formule</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Jours de présence</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Montant</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((ins) => (
                  <tr key={ins.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    onClick={() => openEditModal(ins)}>
                    <td className="px-4 py-3 font-medium text-light-onSurface dark:text-dark-onSurface">{ins.nom || '-'}</td>
                    <td className="px-4 py-3 text-light-onSurface dark:text-dark-onSurface">{ins.prenom}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {ins.categorie ? (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{ins.categorie}</span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400 text-xs">{ins.niveau || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium w-fit ${ins.type_inscription === 'stage_complet' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'}`}>
                          {ins.type_inscription === 'stage_complet' ? 'Stage' : 'Journée'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium w-fit ${ins.type_participant === 'interne' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}`}>
                          {ins.type_participant === 'interne' ? 'Interne' : 'Externe'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {ins.jours && ins.jours.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {ins.jours.map(d => (
                            <span key={d} className="px-1.5 py-0.5 rounded text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                              {formatDateShort(d)}
                            </span>
                          ))}
                        </div>
                      ) : ins.nb_jours != null && ins.nb_jours > 0 ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          {ins.nb_jours} jour{ins.nb_jours > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-light-onSurface dark:text-dark-onSurface">
                      {ins.montant != null ? `${ins.montant.toFixed(0)} €` : '-'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleDeleteInscription(ins)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {filterType ? 'Aucune inscription pour ce filtre' : 'Aucune inscription pour ce stage'}
            </div>
          )}
        </div>
      )}

      {/* Modal inscription */}
      {modalOpen && (
        <InscriptionModal
          form={inscForm}
          onChange={handleInscFormChange}
          toggleJour={toggleJour}
          stageDates={stageDates}
          stage={stage}
          editingId={editingId}
          saving={inscSaving}
          onSave={handleSaveInscription}
          onDelete={editingId ? () => {
            const ins = inscriptions.find(i => i.id === editingId);
            if (ins) handleDeleteInscription(ins);
          } : undefined}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};

// ─── Section Encadrants ────────────────────────────────────────────────────────

interface EncadrantsSectionProps {
  stage: Stage;
  stageDates: string[];
  encadrants: StageEncadrant[];
  licencies: Licencie[];
  onAdd: (licencieId: string, jours?: string[] | null) => Promise<StageEncadrant | null>;
  onUpdateJours: (id: string, jours: string[] | null) => Promise<boolean>;
  onUpdateRoleStage: (id: string, role: 'responsable' | 'encadrant') => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const EncadrantsSection: React.FC<EncadrantsSectionProps> = ({
  stageDates, encadrants, licencies, onAdd, onUpdateJours, onUpdateRoleStage, onDelete,
}) => {
  const [open, setOpen] = useState(true);
  const [addingId, setAddingId] = useState('');
  const [adding, setAdding] = useState(false);

  const licenciesDispos = licencies.filter(
    l => !encadrants.some(e => e.licencie_id === l.id)
  );

  const getLicencie = (licencieId: string) => licencies.find(l => l.id === licencieId);

  const handleAdd = async () => {
    if (!addingId) return;
    setAdding(true);
    // Par défaut : tous les jours
    await onAdd(addingId, null);
    setAddingId('');
    setAdding(false);
  };

  const toggleJourEncadrant = async (enc: StageEncadrant, date: string) => {
    const current = enc.jours ?? stageDates;
    let next: string[];
    if (current.includes(date)) {
      next = current.filter(d => d !== date);
    } else {
      next = [...current, date].sort();
    }
    await onUpdateJours(enc.id, next.length > 0 ? next : null);
  };

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* En-tête section */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Encadrants ({encadrants.length})
        </button>
        {open && (
          <div className="flex items-center gap-2">
            <select
              value={addingId}
              onChange={e => setAddingId(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">— Ajouter encadrant —</option>
              {licenciesDispos
                .sort((a, b) => (a.Nom_Licencie || '').localeCompare(b.Nom_Licencie || ''))
                .map(l => (
                  <option key={l.id} value={l.id}>
                    {l.Nom_Licencie} {l.Prenom_Licencie}
                  </option>
                ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!addingId || adding}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 text-xs font-medium transition-colors"
            >
              + Ajouter
            </button>
          </div>
        )}
      </div>

      {/* Tableau des encadrants */}
      {open && (
        <div className="overflow-x-auto">
          {encadrants.length === 0 ? (
            <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
              Aucun encadrant associé à ce stage
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-2 font-medium">Nom</th>
                  <th className="px-3 py-2 font-medium text-center whitespace-nowrap">Rôle stage</th>
                  {stageDates.map(d => (
                    <th key={d} className="px-2 py-2 font-medium text-center whitespace-nowrap">
                      {formatDateShort(d)}
                    </th>
                  ))}
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {encadrants.map(enc => {
                  const lic = getLicencie(enc.licencie_id);
                  const joursEnc = enc.jours ?? stageDates;
                  const isResponsable = enc.role_stage === 'responsable';
                  return (
                    <tr key={enc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2 font-medium text-light-onSurface dark:text-dark-onSurface whitespace-nowrap">
                        {isResponsable && <span className="mr-1 text-amber-500" title="Responsable du stage">★</span>}
                        {lic ? `${lic.Nom_Licencie || ''} ${lic.Prenom_Licencie}` : '—'}
                        {enc.jours === null && (
                          <span className="ml-2 text-xs text-gray-400">(tous)</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => onUpdateRoleStage(enc.id, isResponsable ? 'encadrant' : 'responsable')}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            isResponsable
                              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 hover:bg-amber-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          title={isResponsable ? 'Passer en encadrant' : 'Définir comme responsable du stage'}
                        >
                          {isResponsable ? '★ Responsable' : 'Encadrant'}
                        </button>
                      </td>
                      {stageDates.map(d => {
                        const isPresent = joursEnc.includes(d);
                        return (
                          <td key={d} className="px-2 py-2 text-center">
                            <button
                              onClick={() => toggleJourEncadrant(enc, d)}
                              className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto transition-all ${
                                isPresent
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'border-gray-300 dark:border-gray-600 text-transparent hover:border-indigo-400'
                              }`}
                            >
                              {isPresent && (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-2 py-2">
                        <button
                          onClick={() => { if (window.confirm(`Retirer cet encadrant du stage ?`)) onDelete(enc.id); }}
                          className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Modal Inscription ─────────────────────────────────────────────────────────

interface InscriptionModalProps {
  form: InscriptionFormData;
  onChange: <K extends keyof InscriptionFormData>(key: K, value: InscriptionFormData[K]) => void;
  toggleJour: (date: string) => void;
  stageDates: string[];
  stage: Stage;
  editingId: string | null;
  saving: boolean;
  onSave: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

const InscriptionModal: React.FC<InscriptionModalProps> = ({
  form, onChange, toggleJour, stageDates, stage, editingId, saving, onSave, onDelete, onClose,
}) => {
  const selectedJours = form.jours ?? [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-light-surface dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-light-onSurface dark:text-dark-onSurface">
              {editingId ? 'Modifier l\'inscription' : 'Nouvelle inscription'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-5">
            {/* Stagiaire */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Stagiaire</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                  <input type="text" value={form.nom || ''} onChange={(e) => onChange('nom', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="DUPONT" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom <span className="text-red-500">*</span></label>
                  <input type="text" value={form.prenom} onChange={(e) => onChange('prenom', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="Jean" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie</label>
                  <select value={form.categorie || ''} onChange={(e) => onChange('categorie', e.target.value as StageCategorie || null)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm">
                    <option value="">—</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Genre</label>
                  <select value={form.genre || ''} onChange={(e) => onChange('genre', e.target.value as StageGenre || null)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm">
                    <option value="">—</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Niveau</label>
                  <select value={form.niveau || ''} onChange={(e) => onChange('niveau', e.target.value as StageNiveau || null)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm">
                    <option value="">—</option>
                    {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">N° Licence</label>
                  <input type="text" value={form.num_licence || ''} onChange={(e) => onChange('num_licence', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
                    placeholder="Interne uniquement" />
                </div>
              </div>
            </div>

            {/* Inscription */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Inscription</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Formule</label>
                  <select value={form.type_inscription} onChange={(e) => onChange('type_inscription', e.target.value as TypeInscription)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm">
                    <option value="stage_complet">Stage complet</option>
                    <option value="journee">À la journée</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Participant</label>
                  <select value={form.type_participant} onChange={(e) => onChange('type_participant', e.target.value as TypeParticipant)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm">
                    <option value="externe">Externe</option>
                    <option value="interne">Interne (club)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Montant
                    <span className="ml-1 text-xs text-indigo-500 dark:text-indigo-400">(auto)</span>
                  </label>
                  <div className="relative">
                    <input type="number" min="0" step="0.5" value={form.montant ?? ''}
                      onChange={(e) => onChange('montant', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full pl-3 pr-7 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      placeholder="0" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <input type="text" value={form.notes || ''} onChange={(e) => onChange('notes', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="Remarques..." />
                </div>
              </div>
            </div>

            {/* Sélection des jours */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Jours de présence
                  {selectedJours.length > 0 && (
                    <span className="ml-2 normal-case font-normal text-indigo-600 dark:text-indigo-400">
                      ({selectedJours.length} jour{selectedJours.length > 1 ? 's' : ''})
                    </span>
                  )}
                </h4>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => onChange('jours', stageDates)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                    Tous
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button type="button"
                    onClick={() => onChange('jours', null)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:underline">
                    Aucun
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {stageDates.map(date => {
                  const isSelected = selectedJours.includes(date);
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => toggleJour(date)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-white border-white' : 'border-gray-300 dark:border-gray-500'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      {formatDateShort(date)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
            <div>
              {onDelete && (
                <button onClick={onDelete}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium text-sm">
                  Supprimer
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium text-sm">
                Annuler
              </button>
              <button onClick={onSave} disabled={saving}
                className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm">
                {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Enregistrement...</> : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StagesManager;
