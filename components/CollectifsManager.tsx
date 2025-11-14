import React, { useState, useEffect, useMemo } from 'react';
import { useCollectifs, type CollectifPlayer } from '../hooks/useCollectifs';
import { useLicencies } from '../hooks/useLicencies';
import { useTeams } from '../hooks/useTeams';
import type { Licencie, PlayerPosition } from '../types';
import PlayerNumberBadge from './PlayerNumberBadge';

const POSTES: PlayerPosition[] = ['Passeur', 'Libéro', 'R4', 'Pointu', 'Central'];

type SortField = 'name' | 'number';
type SortDirection = 'asc' | 'desc';

const CollectifsManager: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [teamPlayers, setTeamPlayers] = useState<CollectifPlayer[]>([]);
  const [searchPlayer, setSearchPlayer] = useState<string>('');
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editNumero, setEditNumero] = useState<string>('');
  const [editPoste, setEditPoste] = useState<PlayerPosition | ''>('');
  const [addingPlayer, setAddingPlayer] = useState<string | null>(null);
  const [addNumero, setAddNumero] = useState<string>('');
  const [addPoste, setAddPoste] = useState<PlayerPosition | ''>('');
  const [sortField, setSortField] = useState<SortField>('number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { teams, loading: loadingTeams, error: teamsError } = useTeams();
  const { licencies, loading: loadingLicencies, error: licenciesError } = useLicencies();
  const {
    loading: collectifsLoading,
    error: collectifsError,
    getTeamPlayers,
    addPlayerToTeam,
    updatePlayerInTeam,
    removePlayerFromTeam,
  } = useCollectifs();

  // Trier les équipes par IDEQUIPE
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => a.IDEQUIPE.localeCompare(b.IDEQUIPE));
  }, [teams]);

  // Charger les joueurs de l'équipe sélectionnée
  useEffect(() => {
    if (selectedTeam) {
      loadTeamPlayers();
    } else {
      setTeamPlayers([]);
    }
  }, [selectedTeam]);

  const loadTeamPlayers = async () => {
    if (!selectedTeam) return;
    const players = await getTeamPlayers(selectedTeam);
    setTeamPlayers(players);
  };

  // Filtrer les joueurs disponibles (non dans l'équipe)
  const availablePlayers = useMemo(() => {
    const teamPlayerIds = teamPlayers.map(tp => tp.licencie_id);
    return licencies.filter(l => !teamPlayerIds.includes(l.id));
  }, [licencies, teamPlayers]);

  // Filtrer les joueurs selon la recherche
  const filteredAvailablePlayers = useMemo(() => {
    if (!searchPlayer) return availablePlayers;
    const search = searchPlayer.toLowerCase();
    return availablePlayers.filter(
      l =>
        l.Nom_Licencie?.toLowerCase().includes(search) ||
        l.Prenom_Licencie?.toLowerCase().includes(search)
    );
  }, [availablePlayers, searchPlayer]);

  // Fonction pour changer le tri
  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      // Inverser la direction si on clique sur le même champ
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nouveau champ : tri ascendant par défaut
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Joueurs actuels de l'équipe avec leurs informations
  const currentPlayersWithInfo = useMemo(() => {
    const playersWithInfo = teamPlayers.map(tp => {
      const licencie = licencies.find(l => l.id === tp.licencie_id);
      return {
        ...tp,
        licencie,
      };
    }).filter(p => p.licencie); // Filtrer ceux qui n'ont pas de licencié trouvé

    // Trier les joueurs
    const sorted = [...playersWithInfo].sort((a, b) => {
      if (sortField === 'number') {
        // Tri par numéro : les joueurs sans numéro à la fin
        const numA = a.numero_maillot ?? 999;
        const numB = b.numero_maillot ?? 999;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      } else {
        // Tri par nom
        const nameA = `${a.licencie!.Nom_Licencie} ${a.licencie!.Prenom_Licencie}`.toLowerCase();
        const nameB = `${b.licencie!.Nom_Licencie} ${b.licencie!.Prenom_Licencie}`.toLowerCase();
        return sortDirection === 'asc'
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
    });

    return sorted;
  }, [licencies, teamPlayers, sortField, sortDirection]);

  const handleStartAdd = (licencieId: string) => {
    setAddingPlayer(licencieId);
    setAddNumero('');
    setAddPoste('');
  };

  const handleConfirmAdd = async (licencieId: string) => {
    if (!selectedTeam) return;

    const numero = addNumero ? parseInt(addNumero, 10) : null;
    const poste = addPoste || null;

    const success = await addPlayerToTeam(selectedTeam, licencieId, numero, poste as PlayerPosition | null);
    if (success) {
      await loadTeamPlayers();
      setSearchPlayer('');
      setAddingPlayer(null);
      setAddNumero('');
      setAddPoste('');
    }
  };

  const handleCancelAdd = () => {
    setAddingPlayer(null);
    setAddNumero('');
    setAddPoste('');
  };

  const handleEditPlayer = (licencieId: string, currentNumero: number | null, currentPoste: PlayerPosition | null) => {
    setEditingPlayer(licencieId);
    setEditNumero(currentNumero ? String(currentNumero) : '');
    setEditPoste(currentPoste || '');
  };

  const handleSaveEdit = async (licencieId: string) => {
    if (!selectedTeam) return;

    const numero = editNumero ? parseInt(editNumero, 10) : null;
    const poste = editPoste || null;

    const success = await updatePlayerInTeam(selectedTeam, licencieId, numero, poste as PlayerPosition | null);
    if (success) {
      await loadTeamPlayers();
      setEditingPlayer(null);
      setEditNumero('');
      setEditPoste('');
    }
  };

  const handleCancelEdit = () => {
    setEditingPlayer(null);
    setEditNumero('');
    setEditPoste('');
  };

  const handleRemovePlayer = async (licencieId: string) => {
    if (!selectedTeam) return;
    const success = await removePlayerFromTeam(selectedTeam, licencieId);
    if (success) {
      await loadTeamPlayers();
    }
  };

  return (
    <div className="space-y-6">
      {/* Sélection de l'équipe */}
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 shadow-md">
        <label htmlFor="team-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Équipe <span className="text-red-500">*</span>
        </label>
        <select
          id="team-select"
          value={selectedTeam}
          onChange={e => setSelectedTeam(e.target.value)}
          className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
          disabled={loadingTeams}
        >
          <option value="">-- Sélectionner une équipe --</option>
          {sortedTeams.map(team => (
            <option key={team.IDEQUIPE} value={team.IDEQUIPE}>
              {team.IDEQUIPE} - {team.NOM_FFVB}
            </option>
          ))}
        </select>
        {teamsError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{teamsError}</p>
        )}
      </div>

      {selectedTeam && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Joueurs de l'équipe */}
          <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-light-onSurface dark:text-dark-onSurface">
                Joueurs de l'équipe ({currentPlayersWithInfo.length})
              </h3>

              {/* Boutons de tri */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleSortChange('number')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                    sortField === 'number'
                      ? 'bg-light-primary dark:bg-dark-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  N°
                  {sortField === 'number' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => handleSortChange('name')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                    sortField === 'name'
                      ? 'bg-light-primary dark:bg-dark-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Nom
                  {sortField === 'name' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </div>
            </div>

            {collectifsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-primary dark:border-dark-primary"></div>
              </div>
            ) : currentPlayersWithInfo.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Aucun joueur dans cette équipe
              </p>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {currentPlayersWithInfo.map(playerInfo => {
                  const isEditing = editingPlayer === playerInfo.licencie_id;

                  return (
                    <div
                      key={playerInfo.licencie_id}
                      className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {playerInfo.licencie!.Nom_Licencie} {playerInfo.licencie!.Prenom_Licencie}
                          </p>
                          {playerInfo.licencie!.Num_Licencie && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Licence: {playerInfo.licencie!.Num_Licencie}
                            </p>
                          )}

                          {isEditing ? (
                            <div className="mt-3 space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  placeholder="N°"
                                  value={editNumero}
                                  onChange={(e) => setEditNumero(e.target.value)}
                                  className="w-20 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />
                                <select
                                  value={editPoste}
                                  onChange={(e) => setEditPoste(e.target.value as PlayerPosition | '')}
                                  className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                  <option value="">-- Poste --</option>
                                  {POSTES.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveEdit(playerInfo.licencie_id)}
                                  className="px-3 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm font-medium"
                                >
                                  Sauvegarder
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 flex gap-2 items-center text-sm">
                              {playerInfo.numero_maillot && (
                                <PlayerNumberBadge numero={playerInfo.numero_maillot} size="sm" />
                              )}
                              {playerInfo.poste && (
                                <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                  {playerInfo.poste}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditPlayer(playerInfo.licencie_id, playerInfo.numero_maillot, playerInfo.poste)}
                              className="px-3 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                              disabled={collectifsLoading}
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => handleRemovePlayer(playerInfo.licencie_id)}
                              className="px-3 py-1 rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
                              disabled={collectifsLoading}
                            >
                              Retirer
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ajouter des joueurs */}
          <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 shadow-md">
            <h3 className="text-xl font-bold text-light-onSurface dark:text-dark-onSurface mb-4">
              Ajouter des joueurs
            </h3>

            {/* Barre de recherche */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Rechercher un joueur..."
                value={searchPlayer}
                onChange={e => setSearchPlayer(e.target.value)}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              />
            </div>

            {loadingLicencies ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-primary dark:border-dark-primary"></div>
              </div>
            ) : licenciesError ? (
              <p className="text-red-600 dark:text-red-400 text-center py-8">
                Erreur: {licenciesError}
              </p>
            ) : filteredAvailablePlayers.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                {searchPlayer ? 'Aucun joueur trouvé' : 'Tous les joueurs sont déjà dans l\'équipe'}
              </p>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {filteredAvailablePlayers.map(player => {
                  const isAdding = addingPlayer === player.id;

                  return (
                    <div
                      key={player.id}
                      className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 hover:border-light-primary dark:hover:border-dark-primary transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {player.Nom_Licencie} {player.Prenom_Licencie}
                          </p>
                          {player.Num_Licencie && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Licence: {player.Num_Licencie}
                            </p>
                          )}
                          {player.Categorie_licencie && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {player.Categorie_licencie}
                            </p>
                          )}

                          {isAdding && (
                            <div className="mt-3 space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  placeholder="N° (optionnel)"
                                  value={addNumero}
                                  onChange={(e) => setAddNumero(e.target.value)}
                                  className="w-32 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />
                                <select
                                  value={addPoste}
                                  onChange={(e) => setAddPoste(e.target.value as PlayerPosition | '')}
                                  className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                  <option value="">-- Poste (optionnel) --</option>
                                  {POSTES.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleConfirmAdd(player.id)}
                                  className="px-3 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm font-medium"
                                  disabled={collectifsLoading}
                                >
                                  Confirmer
                                </button>
                                <button
                                  onClick={handleCancelAdd}
                                  className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {!isAdding && (
                          <button
                            onClick={() => handleStartAdd(player.id)}
                            className="px-3 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm font-medium"
                            disabled={collectifsLoading}
                          >
                            Ajouter
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages d'erreur */}
      {collectifsError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{collectifsError}</p>
        </div>
      )}
    </div>
  );
};

export default CollectifsManager;
