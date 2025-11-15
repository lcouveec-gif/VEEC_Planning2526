import React, { useState, useEffect, useMemo } from 'react';
import { useLicencies } from '../../hooks/useLicencies';
import { useMatchPositions } from '../../hooks/useMatchPositions';
import { useCollectifs, type CollectifPlayer } from '../../hooks/useCollectifs';
import type { Match, Player, PlayerPosition, Licencie } from '../../types';
import PlayerNumberBadge from '../PlayerNumberBadge';

interface PlayerRosterProps {
  match: Match;
  onRosterComplete: (players: Player[]) => void;
  onBack: () => void;
}

const PLAYER_POSITIONS: PlayerPosition[] = ['Passeur', 'Libéro', 'R4', 'Pointu', 'Central'];

type PlayerSource = 'collectif' | 'all';
type SortField = 'number' | 'name';
type SortDirection = 'asc' | 'desc';

const PlayerRoster: React.FC<PlayerRosterProps> = ({ match, onRosterComplete, onBack }) => {
  const { licencies, loading: loadingLicencies } = useLicencies();
  const { loading: loadingSave, getMatchPosition, saveMatchPosition, deleteMatchPosition } = useMatchPositions();
  const { getTeamPlayers, loading: loadingCollectif } = useCollectifs();

  const [players, setPlayers] = useState<Player[]>(
    Array.from({ length: 12 }, (_, i) => ({
      prenom: '',
      nom: '',
      numero_licence: '',
      numero_maillot: i + 1,
      defaultPosition: 'Central' as PlayerPosition,
    }))
  );
  const [hasLoadedData, setHasLoadedData] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [playerSource, setPlayerSource] = useState<PlayerSource>('collectif');
  const [collectifPlayers, setCollectifPlayers] = useState<CollectifPlayer[]>([]);
  const [sortField, setSortField] = useState<SortField>('number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const isHome = match.EQA_no === '0775819';
  // Utiliser idequipe qui contient le code équipe (ex: SM4) et non le code club
  const teamId = match.idequipe || '';
  const teamName = isHome ? match.EQA_nom : match.EQB_nom;
  const opponentName = isHome ? match.EQB_nom : match.EQA_nom;

  // Charger le collectif de l'équipe
  useEffect(() => {
    const loadCollectif = async () => {
      if (teamId) {
        console.log('🔍 DEBUG - Loading collectif for teamId:', teamId);
        console.log('🔍 DEBUG - Team details:', {
          isHome,
          teamName,
          EQA_no: match.EQA_no,
          EQB_no: match.EQB_no,
        });
        try {
          const collectif = await getTeamPlayers(teamId);
          console.log('🔍 DEBUG - Collectif loaded:', collectif);
          setCollectifPlayers(collectif || []);
          // Si pas de collectif, basculer automatiquement sur "Tous"
          if (!collectif || collectif.length === 0) {
            console.log('⚠️ DEBUG - No collectif found, switching to "all"');
            setPlayerSource('all');
          } else {
            console.log('✅ DEBUG - Collectif loaded with', collectif.length, 'players');
          }
        } catch (err) {
          console.warn('❌ Collectif not available:', err);
          setCollectifPlayers([]);
          setPlayerSource('all'); // Basculer sur "Tous" en cas d'erreur
        }
      }
    };
    loadCollectif();
  }, [teamId, getTeamPlayers]);

  // Charger la composition existante
  useEffect(() => {
    const loadExistingPosition = async () => {
      if (!match.id || hasLoadedData) return;

      const existingData = await getMatchPosition(match.id);
      if (existingData && existingData.players.length > 0) {
        const savedPlayers = [...existingData.players];
        while (savedPlayers.length < 12) {
          savedPlayers.push({
            prenom: '',
            nom: '',
            numero_licence: '',
            numero_maillot: savedPlayers.length + 1,
            defaultPosition: 'Central' as PlayerPosition,
          });
        }
        setPlayers(savedPlayers);
        setHasLoadedData(true);
      }
    };
    loadExistingPosition();
  }, [match.id, getMatchPosition, hasLoadedData]);

  // IDs des joueurs déjà sélectionnés
  const selectedLicencieIds = useMemo(() => {
    return new Set(players.filter(p => p.licencieId).map(p => p.licencieId!));
  }, [players]);

  // Joueurs du collectif avec leurs infos complètes (exclure les joueurs déjà sélectionnés)
  const collectifWithDetails = useMemo(() => {
    if (loadingLicencies || !licencies.length) return [];
    return collectifPlayers
      .filter(cp => !selectedLicencieIds.has(cp.licencie_id)) // Filtrer les joueurs déjà sélectionnés
      .map(cp => {
        const licencie = licencies.find(l => l.id === cp.licencie_id);
        return { ...cp, licencie };
      })
      .filter(cp => cp.licencie);
  }, [collectifPlayers, licencies, loadingLicencies, selectedLicencieIds]);

  // Joueurs disponibles triés par nom (seulement si "all" est sélectionné, exclure les joueurs déjà sélectionnés)
  const sortedLicencies = useMemo(() => {
    if (playerSource !== 'all' || loadingLicencies) return [];
    return [...licencies]
      .filter(l => !selectedLicencieIds.has(l.id)) // Filtrer les joueurs déjà sélectionnés
      .sort((a, b) => {
        const nameA = `${a.Nom_Licencie || ''} ${a.Prenom_Licencie}`.toLowerCase();
        const nameB = `${b.Nom_Licencie || ''} ${b.Prenom_Licencie}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [licencies, playerSource, loadingLicencies, selectedLicencieIds]);

  const handleSelectPlayer = (index: number, licencieId: string) => {
    if (licencieId === '') {
      setEditingIndex(null);
      return;
    }

    const licencie = licencies.find(l => l.id === licencieId);
    if (!licencie) return;

    const updatedPlayers = [...players];
    const currentPlayer = updatedPlayers[index];
    const collectifInfo = collectifPlayers.find(cp => cp.licencie_id === licencieId);

    updatedPlayers[index] = {
      prenom: licencie.Prenom_Licencie,
      nom: licencie.Nom_Licencie || '',
      numero_licence: licencie.Num_Licencie ? String(licencie.Num_Licencie) : '',
      numero_maillot: collectifInfo?.numero_maillot || currentPlayer.numero_maillot,
      licencieId: licencie.id,
      defaultPosition: collectifInfo?.poste || 'Central',
    };

    setPlayers(updatedPlayers);
    setEditingIndex(null);
  };

  const handleUpdateNumero = (index: number, value: string) => {
    const updatedPlayers = [...players];
    updatedPlayers[index].numero_maillot = parseInt(value) || 1;
    setPlayers(updatedPlayers);
  };

  const handleUpdatePoste = (index: number, value: PlayerPosition) => {
    const updatedPlayers = [...players];
    updatedPlayers[index].defaultPosition = value;
    setPlayers(updatedPlayers);
  };

  const handleRemovePlayer = (index: number) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = {
      prenom: '',
      nom: '',
      numero_licence: '',
      numero_maillot: index + 1,
      defaultPosition: 'Central' as PlayerPosition,
    };
    setPlayers(updatedPlayers);
  };

  const handleSave = async () => {
    const filledPlayers = players.filter(p => p.prenom.trim() !== '');
    if (filledPlayers.length < 6) {
      alert('Vous devez renseigner au minimum 6 joueurs pour sauvegarder.');
      return;
    }

    console.log('💾 DEBUG - Saving match position with data:', {
      matchId: match.id,
      teamId: teamId,
      startDate: match.Date || new Date().toISOString(),
      playersCount: filledPlayers.length,
    });

    const matchPositionData = {
      matchId: match.id,
      teamId: teamId,
      startDate: match.Date || new Date().toISOString(),
      players: filledPlayers,
      setLineups: [],
    };

    const success = await saveMatchPosition(matchPositionData);
    console.log('💾 DEBUG - Save result:', success);
    if (success) {
      alert('Liste des joueurs sauvegardée avec succès !');
    } else {
      alert('Erreur lors de la sauvegarde. Vérifiez la console pour plus de détails.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filledPlayers = players.filter(p => p.prenom.trim() !== '');
    if (filledPlayers.length < 6) {
      alert('Vous devez renseigner au minimum 6 joueurs pour continuer.');
      return;
    }
    onRosterComplete(filledPlayers);
  };

  const handleResetClick = () => setShowResetConfirm(true);

  const handleResetConfirm = async () => {
    if (!match.id) {
      setShowResetConfirm(false);
      return;
    }

    const success = await deleteMatchPosition(match.id);
    if (success) {
      setPlayers(
        Array.from({ length: 12 }, (_, i) => ({
          prenom: '',
          nom: '',
          numero_licence: '',
          numero_maillot: i + 1,
          defaultPosition: 'Central' as PlayerPosition,
        }))
      );
      setHasLoadedData(false);
      alert('Composition et positions supprimées avec succès !');
    }
    setShowResetConfirm(false);
  };

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleLoadCollectif = () => {
    if (collectifPlayers.length === 0) {
      alert('Aucun collectif disponible pour cette équipe.');
      return;
    }

    const confirmLoad = window.confirm(
      `Charger les ${Math.min(12, collectifPlayers.length)} premiers joueurs du collectif ?\n\nCela remplacera la composition actuelle.`
    );

    if (!confirmLoad) return;

    // Prendre les 12 premiers joueurs du collectif
    const playersToLoad = collectifPlayers.slice(0, 12);

    // Créer le tableau de joueurs
    const newPlayers: Player[] = playersToLoad.map((cp, index) => {
      const licencie = licencies.find(l => l.id === cp.licencie_id);
      if (licencie) {
        return {
          prenom: licencie.Prenom_Licencie,
          nom: licencie.Nom_Licencie || '',
          numero_licence: licencie.Num_Licencie ? String(licencie.Num_Licencie) : '',
          numero_maillot: cp.numero_maillot || (index + 1),
          licencieId: licencie.id,
          defaultPosition: cp.poste || 'Central',
        };
      }
      return {
        prenom: '',
        nom: '',
        numero_licence: '',
        numero_maillot: index + 1,
        defaultPosition: 'Central' as PlayerPosition,
      };
    });

    // Compléter avec des joueurs vides jusqu'à 12
    while (newPlayers.length < 12) {
      newPlayers.push({
        prenom: '',
        nom: '',
        numero_licence: '',
        numero_maillot: newPlayers.length + 1,
        defaultPosition: 'Central' as PlayerPosition,
      });
    }

    setPlayers(newPlayers);
  };

  // Tri des joueurs affichés
  const sortedPlayers = useMemo(() => {
    const playersCopy = [...players];

    return playersCopy.sort((a, b) => {
      // Les joueurs vides vont toujours à la fin
      const aEmpty = !a.prenom.trim();
      const bEmpty = !b.prenom.trim();

      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;

      // Tri selon le champ sélectionné
      if (sortField === 'number') {
        const numA = a.numero_maillot ?? 999;
        const numB = b.numero_maillot ?? 999;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      } else {
        const nameA = `${a.nom} ${a.prenom}`.toLowerCase();
        const nameB = `${b.nom} ${b.prenom}`.toLowerCase();
        return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
    });
  }, [players, sortField, sortDirection]);

  const filledCount = players.filter(p => p.prenom.trim() !== '').length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-light-onSurface dark:text-dark-onSurface mb-1">
          Composition - {teamName}
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          vs {opponentName} • {match.Date ? new Date(match.Date).toLocaleDateString('fr-FR') : ''} {match.Heure && `• ${match.Heure}`}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-4 shadow-md">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filledCount}/12 joueurs • Min. 6 requis
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {hasLoadedData && (
                <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  Composition chargée
                </span>
              )}
              {/* Bouton charger collectif */}
              <button
                type="button"
                onClick={handleLoadCollectif}
                disabled={loadingCollectif || collectifPlayers.length === 0}
                className="px-3 py-1.5 text-xs rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                title={collectifPlayers.length === 0 ? 'Aucun collectif disponible' : 'Charger automatiquement les joueurs du collectif'}
              >
                📋 Charger collectif
              </button>
              {/* Boutons de tri */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Trier:</span>
                <button
                  type="button"
                  onClick={() => handleSortChange('number')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    sortField === 'number'
                      ? 'bg-light-primary dark:bg-dark-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  N° {sortField === 'number' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => handleSortChange('name')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    sortField === 'name'
                      ? 'bg-light-primary dark:bg-dark-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Nom {sortField === 'name' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {sortedPlayers.map((player, index) => {
              // Retrouver l'index original du joueur dans le tableau players
              const originalIndex = players.findIndex(p =>
                p.prenom === player.prenom &&
                p.nom === player.nom &&
                p.numero_maillot === player.numero_maillot &&
                p.defaultPosition === player.defaultPosition
              );
              const isEditing = editingIndex === originalIndex;
              const isEmpty = !player.prenom.trim();

              return (
                <div
                  key={originalIndex}
                  className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                >
                  {/* Bouton Modifier/Ajouter */}
                  <button
                    type="button"
                    onClick={() => setEditingIndex(isEditing ? null : originalIndex)}
                    className="flex-shrink-0 w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center"
                  >
                    {isEditing ? '✓' : isEmpty ? '+' : '✎'}
                  </button>

                  {isEditing ? (
                    /* Mode édition */
                    <div className="flex-1 grid grid-cols-12 gap-2">
                      {/* Toggle source */}
                      <div className="col-span-12 sm:col-span-12 flex gap-1 mb-1">
                        <button
                          type="button"
                          onClick={() => setPlayerSource('collectif')}
                          disabled={loadingCollectif || collectifWithDetails.length === 0}
                          className={`flex-1 px-2 py-1 text-xs rounded ${
                            playerSource === 'collectif'
                              ? 'bg-light-primary dark:bg-dark-primary text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={collectifWithDetails.length === 0 ? 'Aucun collectif configuré pour cette équipe' : ''}
                        >
                          Collectif {loadingCollectif ? '...' : `(${collectifWithDetails.length})`}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlayerSource('all')}
                          disabled={loadingLicencies}
                          className={`flex-1 px-2 py-1 text-xs rounded ${
                            playerSource === 'all'
                              ? 'bg-light-primary dark:bg-dark-primary text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          } disabled:opacity-50`}
                        >
                          Tous {loadingLicencies ? '...' : `(${licencies.length})`}
                        </button>
                      </div>

                      {/* Message si pas de collectif */}
                      {!loadingCollectif && collectifWithDetails.length === 0 && playerSource === 'collectif' && (
                        <div className="col-span-12 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 p-2 rounded">
                          ℹ️ Aucun collectif configuré. Utilisez "Tous" ou configurez le collectif dans Admin.
                        </div>
                      )}

                      {/* Sélection joueur */}
                      <select
                        value={player.licencieId || ''}
                        onChange={(e) => handleSelectPlayer(originalIndex, e.target.value)}
                        className="col-span-7 sm:col-span-8 px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                        disabled={loadingLicencies || loadingCollectif}
                      >
                        <option value="">
                          {loadingLicencies ? 'Chargement...' : '-- Sélectionner --'}
                        </option>
                        {playerSource === 'collectif'
                          ? collectifWithDetails.map((cp) => (
                              <option key={cp.licencie_id} value={cp.licencie_id}>
                                {cp.licencie!.Nom_Licencie} {cp.licencie!.Prenom_Licencie}
                                {cp.numero_maillot && ` (${cp.numero_maillot})`}
                                {cp.poste && ` - ${cp.poste}`}
                              </option>
                            ))
                          : sortedLicencies.map((licencie) => (
                              <option key={licencie.id} value={licencie.id}>
                                {licencie.Nom_Licencie} {licencie.Prenom_Licencie}
                              </option>
                            ))}
                      </select>

                      {/* Numéro */}
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={player.numero_maillot}
                        onChange={(e) => handleUpdateNumero(originalIndex, e.target.value)}
                        className="col-span-3 sm:col-span-2 px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                        placeholder="N°"
                      />

                      {/* Poste */}
                      <select
                        value={player.defaultPosition}
                        onChange={(e) => handleUpdatePoste(originalIndex, e.target.value as PlayerPosition)}
                        className="col-span-12 px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                      >
                        {PLAYER_POSITIONS.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    /* Mode affichage */
                    <>
                      <div className="flex-1 min-w-0">
                        {isEmpty ? (
                          <span className="text-sm text-gray-400 dark:text-gray-500">Joueur {originalIndex + 1}</span>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <PlayerNumberBadge numero={player.numero_maillot} size="sm" position={player.defaultPosition} />
                              <span className="font-medium text-sm">
                                {player.nom} {player.prenom}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{player.defaultPosition}</div>
                          </>
                        )}
                      </div>
                      {!isEmpty && (
                        <button
                          type="button"
                          onClick={() => handleRemovePlayer(originalIndex)}
                          className="flex-shrink-0 w-8 h-8 rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center text-sm"
                        >
                          ×
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBack}
                disabled={loadingSave}
                className="px-4 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                ← Retour
              </button>

              {hasLoadedData && (
                <button
                  type="button"
                  onClick={handleResetClick}
                  disabled={loadingSave}
                  className="px-4 py-2 text-sm rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={loadingSave}
                className="px-4 py-2 text-sm rounded-md bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loadingSave ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>

              <button
                type="submit"
                disabled={loadingSave}
                className="px-4 py-2 text-sm rounded-md bg-light-primary dark:bg-dark-primary text-white hover:opacity-90 transition-colors disabled:opacity-50"
              >
                Continuer →
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Modale de confirmation Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Êtes-vous sûr de vouloir supprimer la composition d'équipe et toutes les positions de sets associées ?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-4">⚠️ Cette action est irréversible.</p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleResetConfirm}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerRoster;
