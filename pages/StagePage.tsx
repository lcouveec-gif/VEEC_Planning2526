import React, { useState, useMemo } from 'react';
import { useStages } from '../hooks/useStages';
import { useStageInscriptions } from '../hooks/useStageInscriptions';
import { useStagePresences } from '../hooks/useStagePresences';
import { useStageGroupes } from '../hooks/useStageGroupes';
import { useStageEncadrants } from '../hooks/useStageEncadrants';
import { useLicencies } from '../hooks/useLicencies';
import type { Stage, StageInscription, StageGroupe, StageCategorie, StageGenre } from '../types';

const CATEGORIES: StageCategorie[] = ['M11', 'M13', 'M15', 'M18', 'Senior'];
const GENRES: StageGenre[] = ['Masculin', 'Féminin'];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const JOURS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const TERRAINS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  if (!start || !end) return dates;
  const current = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  while (current <= endDate) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

const formatDateShort = (d: string) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return `${JOURS_FR[dt.getDay()]} ${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

const formatDateLong = (d: string) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }) : '';

// Stagiaires présents pour un jour donné (inscription pour ce jour)
function inscriptionsDuJour(inscriptions: StageInscription[], date: string): StageInscription[] {
  return inscriptions.filter(ins => {
    if (ins.type_inscription === 'stage_complet') return true;
    if (ins.jours && ins.jours.includes(date)) return true;
    return false;
  });
}

// Aujourd'hui au format YYYY-MM-DD
function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ─── Composant principal ───────────────────────────────────────────────────────

const StagePage: React.FC = () => {
  const { stages, loading: stagesLoading } = useStages();
  const [selectedStageId, setSelectedStageId] = useState<string>('');

  const selectedStage = stages.find(s => s.id === selectedStageId) ?? null;

  // Sélectionner automatiquement le stage actif ou le plus récent
  React.useEffect(() => {
    if (stages.length === 0 || selectedStageId) return;
    const today = todayStr();
    const active = stages.find(s => s.date_debut <= today && s.date_fin >= today);
    setSelectedStageId(active?.id ?? stages[0].id);
  }, [stages, selectedStageId]);

  if (stagesLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-500 dark:text-gray-400">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-lg font-medium">Aucun stage disponible</p>
        <p className="text-sm mt-1">Créez un stage depuis la section Admin.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      {/* Sélecteur de stage */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Stage :</label>
        <select
          value={selectedStageId}
          onChange={e => setSelectedStageId(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        >
          {stages.map(s => (
            <option key={s.id} value={s.id}>
              {s.nom} — {formatDateShort(s.date_debut)} au {formatDateShort(s.date_fin)}
            </option>
          ))}
        </select>
        {selectedStage?.gymnase && (
          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {selectedStage.gymnase}
          </span>
        )}
      </div>

      {selectedStage && <StageView stage={selectedStage} />}
    </div>
  );
};

// ─── Vue d'un stage ────────────────────────────────────────────────────────────

interface StageViewProps { stage: Stage; }

const StageView: React.FC<StageViewProps> = ({ stage }) => {
  const stageDates = useMemo(() => getDatesInRange(stage.date_debut, stage.date_fin), [stage]);

  // Sélectionner le jour courant ou le premier jour du stage
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = todayStr();
    return stageDates.includes(today) ? today : (stageDates[0] ?? '');
  });

  // Remettre à jour si le stage change
  React.useEffect(() => {
    const today = todayStr();
    setSelectedDate(stageDates.includes(today) ? today : (stageDates[0] ?? ''));
  }, [stageDates]);

  const [activeTab, setActiveTab] = useState<'presences' | 'groupes'>('presences');

  const { inscriptions, loading: inscLoading } = useStageInscriptions(stage.id);
  const { presences, togglePresence, getPresencesForDate, error: presenceError } = useStagePresences(stage.id);
  const groupesHook = useStageGroupes(stage.id);
  const { encadrants } = useStageEncadrants(stage.id);
  const { licencies } = useLicencies();

  const stagiairesJour = useMemo(() =>
    inscriptionsDuJour(inscriptions, selectedDate),
    [inscriptions, selectedDate]
  );

  const presencesJour = useMemo(() => getPresencesForDate(selectedDate), [presences, selectedDate]);

  const nbPresents = presencesJour.filter(p => p.present).length;

  // Encadrants présents ce jour
  const encadrantsJour = useMemo(() => {
    return encadrants.filter(enc => {
      if (!enc.jours || enc.jours.length === 0) return true; // null = tous les jours
      return enc.jours.includes(selectedDate);
    });
  }, [encadrants, selectedDate]);

  const getLicencie = (licencieId: string) =>
    licencies.find(l => l.id === licencieId);

  if (inscLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation par jour */}
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex overflow-x-auto">
          {stageDates.map(date => {
            const isToday = date === todayStr();
            const isSelected = date === selectedDate;
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  isSelected
                    ? 'border-indigo-600 text-indigo-600 dark:text-white dark:border-white bg-indigo-50 dark:bg-indigo-900/30'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 hover:bg-gray-50 dark:hover:text-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {formatDateShort(date)}
                {isToday && (
                  <span className="ml-1 text-xs text-indigo-500 dark:text-gray-300">★</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Onglets Présences / Groupes */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {(['presences', 'groupes'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {tab === 'presences' ? 'Présences' : 'Groupes'}
          </button>
        ))}
      </div>

      {/* Onglet Présences */}
      {activeTab === 'presences' && (
        <div className="space-y-3">
          {/* Erreur présence */}
          {presenceError && (
            <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">
              {presenceError}
            </div>
          )}
          {/* Header jour */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-light-onSurface dark:text-dark-onSurface capitalize">
              {formatDateLong(selectedDate)}
            </h3>
            {stagiairesJour.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-indigo-600 dark:text-white">{nbPresents}</span>
                {' / '}{stagiairesJour.length} présent{nbPresents > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Encadrants du jour */}
          {encadrantsJour.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Encadrants :</span>
              {encadrantsJour.map(enc => {
                const lic = getLicencie(enc.licencie_id);
                return (
                  <span key={enc.id} className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-800/60 text-indigo-700 dark:text-white font-medium">
                    {lic ? `${lic.Prenom_Licencie} ${lic.Nom_Licencie || ''}` : '—'}
                  </span>
                );
              })}
            </div>
          )}

          {/* Liste des stagiaires */}
          {stagiairesJour.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
              Aucun stagiaire inscrit pour ce jour
            </div>
          ) : (
            <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {stagiairesJour.map(ins => {
                const presence = presencesJour.find(p => p.inscription_id === ins.id);
                const isPresent = presence?.present ?? false;
                return (
                  <div key={ins.id} className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => togglePresence(ins.id, selectedDate, isPresent)}
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isPresent
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                      title={isPresent ? 'Marquer absent' : 'Marquer présent'}
                    >
                      {isPresent ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-light-onSurface dark:text-dark-onSurface">
                        {ins.nom ? `${ins.nom} ${ins.prenom}` : ins.prenom}
                        {ins.num_licence && (
                          <span className="ml-2 text-xs font-mono text-gray-400">{ins.num_licence}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {ins.categorie && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{ins.categorie}</span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-xs ${ins.type_inscription === 'stage_complet' ? 'bg-indigo-50 dark:bg-indigo-800/50 text-indigo-600 dark:text-white' : 'bg-purple-50 dark:bg-purple-800/50 text-purple-600 dark:text-white'}`}>
                          {ins.type_inscription === 'stage_complet' ? 'Stage' : 'Journée'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${ins.type_participant === 'interne' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'}`}>
                          {ins.type_participant === 'interne' ? 'Interne' : 'Externe'}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${isPresent ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'}`}>
                      {isPresent ? 'Présent' : 'Absent'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Onglet Groupes */}
      {activeTab === 'groupes' && (
        <GroupesView
          stage={stage}
          date={selectedDate}
          stageDates={stageDates}
          stagiairesJour={stagiairesJour}
          groupesHook={groupesHook}
        />
      )}
    </div>
  );
};

// ─── Vue Groupes ───────────────────────────────────────────────────────────────

interface GroupesViewProps {
  stage: Stage;
  date: string;
  stageDates: string[];
  stagiairesJour: StageInscription[];
  groupesHook: ReturnType<typeof useStageGroupes>;
}

const MAX_GROUPES = 6;

const GroupesView: React.FC<GroupesViewProps> = ({ stage, date, stageDates, stagiairesJour, groupesHook }) => {
  const { getGroupesForDate, getMembresForGroupe, createGroupe, updateGroupe, deleteGroupe, setMembre, copyFromDay, getDatesWithGroupes, loading, copying } = groupesHook;

  const groupesJour = useMemo(() => getGroupesForDate(date), [groupesHook.groupes, date]);

  // IDs des stagiaires assignés à un groupe ce jour
  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    groupesJour.forEach(g => {
      getMembresForGroupe(g.id).forEach(m => ids.add(m.inscription_id));
    });
    return ids;
  }, [groupesHook.membres, groupesJour]);

  const nonAssignes = useMemo(() =>
    stagiairesJour.filter(ins => !assignedIds.has(ins.id)),
    [stagiairesJour, assignedIds]
  );

  // Filtres non-assignés
  const [filterNom, setFilterNom] = useState('');
  const [filterCategorie, setFilterCategorie] = useState<StageCategorie | ''>('');
  const [filterGenre, setFilterGenre] = useState<StageGenre | ''>('');

  const nonAssignesFiltres = useMemo(() => {
    return nonAssignes.filter(ins => {
      if (filterNom) {
        const full = `${ins.nom ?? ''} ${ins.prenom}`.toUpperCase();
        if (!full.includes(filterNom.toUpperCase())) return false;
      }
      if (filterCategorie && ins.categorie !== filterCategorie) return false;
      if (filterGenre && ins.genre !== filterGenre) return false;
      return true;
    });
  }, [nonAssignes, filterNom, filterCategorie, filterGenre]);

  const hasFilter = filterNom !== '' || filterCategorie !== '' || filterGenre !== '';

  // Copie depuis un autre jour
  const [showCopy, setShowCopy] = useState(false);
  const datesWithGroupes = useMemo(() => getDatesWithGroupes().filter(d => d !== date), [groupesHook.groupes, date]);

  const handleCopy = async (sourceDate: string) => {
    const sourceCount = getGroupesForDate(sourceDate).length;
    const targetCount = groupesJour.length;
    const msg = targetCount > 0
      ? `Copier les ${sourceCount} groupe(s) du ${formatDateShort(sourceDate)} vers ce jour ?\n\nCela supprimera les ${targetCount} groupe(s) déjà configurés pour ce jour.`
      : `Copier les ${sourceCount} groupe(s) du ${formatDateShort(sourceDate)} vers ce jour ?`;
    if (!window.confirm(msg)) return;
    setShowCopy(false);
    await copyFromDay(sourceDate, date);
  };

  // Création groupe
  const [showNewGroupe, setShowNewGroupe] = useState(false);
  const [newNom, setNewNom] = useState('');
  const [newTerrain, setNewTerrain] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateGroupe = async () => {
    if (!newNom.trim()) return;
    setCreating(true);
    const ok = await createGroupe(date, newNom.trim(), newTerrain || null);
    if (ok) {
      setNewNom('');
      setNewTerrain('');
      setShowNewGroupe(false);
    }
    setCreating(false);
  };

  // Édition inline d'un groupe
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState('');
  const [editTerrain, setEditTerrain] = useState('');

  const startEdit = (g: StageGroupe) => {
    setEditingId(g.id);
    setEditNom(g.nom);
    setEditTerrain(g.terrain ?? '');
  };

  const saveEdit = async () => {
    if (!editingId || !editNom.trim()) return;
    await updateGroupe(editingId, { nom: editNom.trim(), terrain: editTerrain || null });
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-light-onSurface dark:text-dark-onSurface capitalize">
          {formatDateLong(date)}
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            — {groupesJour.length}/{MAX_GROUPES} groupe{groupesJour.length > 1 ? 's' : ''}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {/* Copier depuis un autre jour */}
          {datesWithGroupes.length > 0 && !copying && (
            <div className="relative">
              {showCopy ? (
                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-md px-2 py-1.5">
                  <span className="text-xs text-gray-600 dark:text-gray-400 shrink-0">Copier depuis :</span>
                  {datesWithGroupes.map(d => (
                    <button
                      key={d}
                      onClick={() => handleCopy(d)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-colors"
                    >
                      {formatDateShort(d)}
                      <span className="ml-1 text-gray-400 dark:text-gray-500">({getGroupesForDate(d).length})</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setShowCopy(false)}
                    className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs px-1"
                    title="Annuler"
                  >✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCopy(true)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-white transition-colors text-sm font-medium flex items-center gap-1"
                  title="Copier la configuration des groupes d'un autre jour"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copier depuis…
                </button>
              )}
            </div>
          )}
          {copying && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Copie en cours…
            </span>
          )}
          {groupesJour.length < MAX_GROUPES && !copying && (
            <button
              onClick={() => setShowNewGroupe(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter groupe
            </button>
          )}
        </div>
      </div>

      {/* Formulaire nouveau groupe */}
      {showNewGroupe && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du groupe</label>
            <input
              autoFocus
              type="text"
              value={newNom}
              onChange={e => setNewNom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateGroupe()}
              placeholder="Ex: Débutants, Groupe A…"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Terrain</label>
            <select
              value={newTerrain}
              onChange={e => setNewTerrain(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">—</option>
              {TERRAINS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowNewGroupe(false); setNewNom(''); setNewTerrain(''); }}
              className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm">
              Annuler
            </button>
            <button onClick={handleCreateGroupe} disabled={!newNom.trim() || creating}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
              Créer
            </button>
          </div>
        </div>
      )}

      {/* Groupes */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : groupesJour.length === 0 && !showNewGroupe ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
          Aucun groupe pour ce jour — cliquez "Ajouter groupe" pour commencer
        </div>
      ) : (
        <div className="space-y-3">
          {groupesJour.map(g => {
            const membresGroupe = getMembresForGroupe(g.id);
            const stagiairesGroupe = membresGroupe
              .map(m => stagiairesJour.find(ins => ins.id === m.inscription_id))
              .filter(Boolean) as StageInscription[];

            return (
              <div key={g.id} className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header groupe */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/40 border-b border-indigo-100 dark:border-indigo-700">
                  {editingId === g.id ? (
                    <>
                      <input
                        autoFocus
                        type="text"
                        value={editNom}
                        onChange={e => setEditNom(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit()}
                        className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-1 focus:ring-indigo-500"
                      />
                      <select
                        value={editTerrain}
                        onChange={e => setEditTerrain(e.target.value)}
                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                      >
                        <option value="">Sans terrain</option>
                        {TERRAINS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button onClick={saveEdit} className="px-3 py-1 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700">OK</button>
                      <button onClick={() => setEditingId(null)} className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs hover:bg-gray-300">✕</button>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-indigo-700 dark:text-white flex-1">{g.nom}</span>
                      {g.terrain && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-600 text-white">{g.terrain}</span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{stagiairesGroupe.length} joueur{stagiairesGroupe.length > 1 ? 's' : ''}</span>
                      <button onClick={() => startEdit(g)} className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-white/50 dark:hover:text-white dark:hover:bg-gray-700 transition-colors" title="Modifier">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => { if (window.confirm(`Supprimer le groupe "${g.nom}" ?`)) deleteGroupe(g.id); }}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-white/50 dark:hover:bg-gray-700 transition-colors" title="Supprimer">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>

                {/* Membres du groupe */}
                <div className="p-3 flex flex-wrap gap-2">
                  {stagiairesGroupe.map(ins => (
                    <div key={ins.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-800/60 text-indigo-800 dark:text-white text-sm">
                      <span>{ins.nom ? `${ins.nom} ${ins.prenom}` : ins.prenom}</span>
                      <button
                        onClick={() => setMembre(g.id, ins.id, false)}
                        className="ml-1 text-indigo-400 dark:text-indigo-200 hover:text-indigo-700 dark:hover:text-white"
                        title="Retirer du groupe"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {stagiairesGroupe.length === 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">Groupe vide</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Non assignés */}
      {nonAssignes.length > 0 && groupesJour.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 space-y-3">
          {/* Header + filtres */}
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-2 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Non assignés ({nonAssignesFiltres.length}{hasFilter && nonAssignesFiltres.length !== nonAssignes.length ? `/${nonAssignes.length}` : ''})
            </h4>
            {/* Filtre Nom */}
            <input
              type="text"
              value={filterNom}
              onChange={e => setFilterNom(e.target.value)}
              placeholder="Nom…"
              className="px-2.5 py-1 rounded-lg border border-yellow-300 dark:border-yellow-700 bg-white dark:bg-gray-800 text-xs text-light-onSurface dark:text-dark-onSurface focus:ring-1 focus:ring-indigo-500 focus:border-transparent w-32"
            />
            {/* Filtre Catégorie */}
            <select
              value={filterCategorie}
              onChange={e => setFilterCategorie(e.target.value as StageCategorie | '')}
              className="px-2.5 py-1 rounded-lg border border-yellow-300 dark:border-yellow-700 bg-white dark:bg-gray-800 text-xs text-light-onSurface dark:text-dark-onSurface focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Toutes catégories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Filtre Genre */}
            <select
              value={filterGenre}
              onChange={e => setFilterGenre(e.target.value as StageGenre | '')}
              className="px-2.5 py-1 rounded-lg border border-yellow-300 dark:border-yellow-700 bg-white dark:bg-gray-800 text-xs text-light-onSurface dark:text-dark-onSurface focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Tous genres</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {/* Effacer filtres */}
            {hasFilter && (
              <button
                onClick={() => { setFilterNom(''); setFilterCategorie(''); setFilterGenre(''); }}
                className="px-2 py-1 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Effacer les filtres"
              >
                ✕ Effacer
              </button>
            )}
          </div>

          {/* Liste filtrée */}
          {nonAssignesFiltres.length === 0 ? (
            <p className="text-xs text-yellow-700 dark:text-yellow-400 italic">Aucun joueur ne correspond aux filtres.</p>
          ) : (
            <div className="space-y-2">
              {nonAssignesFiltres.map(ins => (
                <div key={ins.id} className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-yellow-900 dark:text-yellow-200 font-medium">
                    {ins.nom ? `${ins.nom} ${ins.prenom}` : ins.prenom}
                    {ins.categorie && <span className="ml-1 text-xs text-yellow-600 dark:text-yellow-400">({ins.categorie})</span>}
                    {ins.genre && <span className="ml-1 text-xs text-yellow-600 dark:text-yellow-400">{ins.genre === 'Masculin' ? '♂' : '♀'}</span>}
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {groupesJour.map(g => (
                      <button
                        key={g.id}
                        onClick={() => setMembre(g.id, ins.id, true)}
                        className="px-2.5 py-0.5 rounded-full text-xs bg-white dark:bg-gray-800 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors font-medium"
                      >
                        → {g.nom}{g.terrain ? ` (${g.terrain})` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StagePage;
