import React, { useState, useMemo, useEffect } from 'react';
import { useTeams } from '../hooks/useTeams';
import { useMatches } from '../hooks/useMatches';
import MatchSelection from './PositionTracker/MatchSelection';
import PlayerRoster from './PositionTracker/PlayerRoster';
import SetLineupManager from './PositionTracker/SetLineupManager';
import type { Player, Match, MatchPositionData } from '../types';

type PositionStep = 'selection' | 'roster' | 'lineup';

interface PositionTrackerProps {
  selectedTeamId?: string;
}

const PositionTracker: React.FC<PositionTrackerProps> = ({ selectedTeamId: propSelectedTeamId }) => {
  const [currentStep, setCurrentStep] = useState<PositionStep>('selection');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(propSelectedTeamId || '');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Pré-sélectionner l'équipe si selectedTeamId est fourni
  useEffect(() => {
    if (propSelectedTeamId && propSelectedTeamId !== selectedTeamId) {
      setSelectedTeamId(propSelectedTeamId);
    }
  }, [propSelectedTeamId]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matchPositionData, setMatchPositionData] = useState<MatchPositionData | null>(null);

  const { teams, loading: loadingTeams, error: errorTeams } = useTeams();

  // Stabiliser la référence du tableau teamIds pour éviter les boucles infinies
  const teamIds = useMemo(() => {
    return selectedTeamId ? [selectedTeamId] : undefined;
  }, [selectedTeamId]);

  const { matches, loading: loadingMatches, error: errorMatches } = useMatches(
    selectedDate,
    undefined,
    teamIds
  );

  // Filtrer les matchs sans score
  const availableMatches = useMemo(() => {
    return matches.filter(match => !match.Set || match.Set.trim() === '');
  }, [matches]);

  const handleMatchSelection = (match: Match) => {
    setSelectedMatch(match);
    setCurrentStep('roster');
  };

  const handleRosterComplete = (rosterPlayers: Player[]) => {
    setPlayers(rosterPlayers);
    setCurrentStep('lineup');
  };

  const handleBack = () => {
    if (currentStep === 'roster') {
      setCurrentStep('selection');
      setSelectedMatch(null);
    } else if (currentStep === 'lineup') {
      setCurrentStep('roster');
    }
  };

  const handleReset = () => {
    setCurrentStep('selection');
    setSelectedTeamId('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedMatch(null);
    setPlayers([]);
    setMatchPositionData(null);
  };

  const loading = loadingTeams || loadingMatches;
  const error = errorTeams || errorMatches;

  return (
    <main className="p-2 sm:p-4 lg:p-6">
      {/* Breadcrumb / Étapes */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => currentStep !== 'selection' && handleReset()}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              currentStep === 'selection'
                ? 'bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary font-medium'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            1. Sélection du match
          </button>
          <span className="text-gray-400">→</span>
          <button
            onClick={() => currentStep === 'lineup' && handleBack()}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              currentStep === 'roster'
                ? 'bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary font-medium'
                : currentStep === 'lineup'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
            disabled={currentStep === 'selection'}
          >
            2. Composition (12 joueurs)
          </button>
          <span className="text-gray-400">→</span>
          <div
            className={`px-3 py-1.5 rounded-md ${
              currentStep === 'lineup'
                ? 'bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary font-medium'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
            }`}
          >
            3. Positions par set
          </div>
        </div>
      </div>

      {/* Erreurs */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400 font-semibold">Erreur :</p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
        </div>
      )}

      {/* Contenu selon l'étape */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-light-primary dark:border-dark-primary"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Chargement des données...</p>
        </div>
      ) : (
        <>
          {currentStep === 'selection' && (
            <MatchSelection
              teams={teams}
              selectedTeamId={selectedTeamId}
              selectedDate={selectedDate}
              availableMatches={availableMatches}
              onTeamChange={setSelectedTeamId}
              onDateChange={setSelectedDate}
              onMatchSelect={handleMatchSelection}
            />
          )}

          {currentStep === 'roster' && selectedMatch ? (
            <PlayerRoster
              match={selectedMatch}
              onRosterComplete={handleRosterComplete}
              onBack={handleBack}
            />
          ) : currentStep === 'roster' ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-gray-600 dark:text-gray-300">
                ⚠️ Match non sélectionné (currentStep: {currentStep}, selectedMatch: {selectedMatch ? 'Oui' : 'Non'})
              </p>
            </div>
          ) : null}

          {currentStep === 'lineup' && selectedMatch && players.length > 0 && (
            <SetLineupManager
              match={selectedMatch}
              players={players}
              onBack={handleBack}
            />
          )}
        </>
      )}
    </main>
  );
};

export default PositionTracker;
