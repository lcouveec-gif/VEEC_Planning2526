import React, { useState, useEffect } from 'react';
import VolleyballCourt from './VolleyballCourt';
import { useMatchPositions } from '../../hooks/useMatchPositions';
import type { Match, Player, CourtPlayer, SetLineup } from '../../types';

interface SetLineupManagerProps {
  match: Match;
  players: Player[];
  onBack: () => void;
}

const SetLineupManager: React.FC<SetLineupManagerProps> = ({ match, players, onBack }) => {
  const [currentSet, setCurrentSet] = useState<number>(1);
  const [numberOfSets, setNumberOfSets] = useState<number>(3);
  const [setLineups, setSetLineups] = useState<SetLineup[]>([
    { setNumber: 1, players: [] },
    { setNumber: 2, players: [] },
    { setNumber: 3, players: [] },
  ]);
  const [hasLoadedData, setHasLoadedData] = useState<boolean>(false);

  const { loading, error, getMatchPosition, saveMatchPosition } = useMatchPositions();

  // Charger la composition existante au montage du composant
  useEffect(() => {
    const loadExistingPosition = async () => {
      if (!match.id || hasLoadedData) return;

      const existingData = await getMatchPosition(match.id);
      if (existingData) {
        console.log('📥 DEBUG - Loading existing data:', existingData);

        // Si les setLineups sont vides ou inexistants, créer les 3 sets par défaut
        if (!existingData.setLineups || existingData.setLineups.length === 0) {
          console.log('⚠️ DEBUG - No set lineups found, initializing with 3 default sets');
          setNumberOfSets(3);
          setSetLineups([
            { setNumber: 1, players: [] },
            { setNumber: 2, players: [] },
            { setNumber: 3, players: [] },
          ]);
        } else {
          // Restaurer le nombre de sets
          console.log('✅ DEBUG - Restoring', existingData.setLineups.length, 'sets');
          setNumberOfSets(existingData.setLineups.length);
          setSetLineups(existingData.setLineups);
        }
        setHasLoadedData(true);
      }
    };

    loadExistingPosition();
  }, [match.id, getMatchPosition, hasLoadedData]);

  const handleAddSet = () => {
    if (numberOfSets < 5) {
      const newSetNumber = numberOfSets + 1;
      setNumberOfSets(newSetNumber);
      setSetLineups([...setLineups, { setNumber: newSetNumber, players: [] }]);
    }
  };

  const handleRemoveSet = () => {
    if (numberOfSets > 3) {
      const newSetNumber = numberOfSets - 1;
      setNumberOfSets(newSetNumber);
      setSetLineups(setLineups.slice(0, -1));
      if (currentSet > newSetNumber) {
        setCurrentSet(newSetNumber);
      }
    }
  };

  const handleLineupChange = (lineup: CourtPlayer[]) => {
    console.log('🔄 DEBUG - handleLineupChange called with:', lineup);
    console.log('🔄 DEBUG - Current set:', currentSet);
    console.log('🔄 DEBUG - Current setLineups before update:', setLineups);

    const updatedLineups = [...setLineups];
    const currentLineupIndex = setLineups.findIndex(sl => sl.setNumber === currentSet);
    console.log('🔄 DEBUG - Current lineup index:', currentLineupIndex);

    if (currentLineupIndex !== -1) {
      updatedLineups[currentLineupIndex] = {
        ...updatedLineups[currentLineupIndex],
        players: lineup
      };
      console.log('🔄 DEBUG - Updated lineups:', updatedLineups);
      setSetLineups(updatedLineups);
    } else {
      console.warn('⚠️ DEBUG - Current lineup index not found!');
    }
  };

  const handleSave = async () => {
    // Validation optionnelle : avertir si des sets ne sont pas complets, mais permettre la sauvegarde
    const incompleteSets = setLineups.filter(sl => {
      const courtPlayers = sl.players.filter(cp => cp.position !== 'Bench' && cp.position !== 'Libéro');
      return courtPlayers.length > 0 && courtPlayers.length !== 6;
    });

    if (incompleteSets.length > 0) {
      const confirmSave = window.confirm(
        `Le(s) set(s) ${incompleteSets.map(s => s.setNumber).join(', ')} ne sont pas complets (6 joueurs requis).\n\nVoulez-vous tout de même sauvegarder ?`
      );
      if (!confirmSave) {
        return;
      }
    }

    // Déterminer l'ID de l'équipe et la date du match
    const isHome = match.EQA_no === '0775819';
    const teamId = isHome ? match.EQA_no : match.EQB_no;
    const matchDate = match.Date || new Date().toISOString();

    // Préparer les données à sauvegarder
    const matchPositionData = {
      matchId: match.id,
      teamId: teamId,
      startDate: matchDate,
      players: players,
      setLineups: setLineups,
    };

    // Sauvegarder dans Supabase
    const success = await saveMatchPosition(matchPositionData);

    if (success) {
      alert('Configuration des positions sauvegardée avec succès !');
    } else {
      alert(`Erreur lors de la sauvegarde : ${error || 'Erreur inconnue'}`);
    }
  };

  const isHome = match.EQA_no === '0775819';
  const teamName = isHome ? match.EQA_nom : match.EQB_nom;
  const opponentName = isHome ? match.EQB_nom : match.EQA_nom;

  const currentSetLineup = setLineups.find(sl => sl.setNumber === currentSet);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-light-onSurface dark:text-dark-onSurface mb-2">
          Positions par set
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <div className="font-medium text-lg mb-1">
            {teamName} vs {opponentName}
          </div>
          <div>
            {match.Date ? new Date(match.Date).toLocaleDateString('fr-FR') : ''}
            {match.Heure && ` • ${match.Heure}`}
          </div>
        </div>
        {hasLoadedData && (
          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              ℹ️ Composition existante chargée depuis la base de données
            </p>
          </div>
        )}
      </div>

      {/* Sélecteur de set */}
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-4 shadow-md mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium">Sets :</span>
            <div className="flex gap-2">
              {setLineups.map((sl) => (
                <button
                  key={sl.setNumber}
                  onClick={() => setCurrentSet(sl.setNumber)}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    currentSet === sl.setNumber
                      ? 'bg-light-primary dark:bg-dark-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Set {sl.setNumber}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRemoveSet}
              disabled={numberOfSets <= 3}
              className="px-3 py-2 rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              - Retirer set
            </button>
            <button
              onClick={handleAddSet}
              disabled={numberOfSets >= 5}
              className="px-3 py-2 rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              + Ajouter set
            </button>
          </div>
        </div>
      </div>

      {/* Court de volley */}
      <VolleyballCourt
        players={players}
        currentLineup={currentSetLineup?.players || []}
        onLineupChange={handleLineupChange}
      />

      {/* Boutons d'action */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="px-6 py-2.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Retour
        </button>

        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2.5 rounded-md bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Sauvegarde en cours...
            </>
          ) : (
            'Sauvegarder'
          )}
        </button>
      </div>
    </div>
  );
};

export default SetLineupManager;
