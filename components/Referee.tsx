import React, { useState, useEffect } from 'react';
import TeamSetup from './Referee/TeamSetup';
import CoinToss from './Referee/CoinToss';
import MatchBoard from './Referee/MatchBoard';
import type { MatchData, RefereeStep, TeamInfo, CoinTossResult } from '../types/referee';

const STORAGE_KEY_MATCH = 'veec_referee_match_data';
const STORAGE_KEY_STEP = 'veec_referee_step';

const getInitialMatchData = (): MatchData => ({
  teamA: {
    name: '',
    colorPrimary: '#000000',
    colorSecondary: '#FFFFFF',
    players: [],
  },
  teamB: {
    name: '',
    colorPrimary: '#1E40AF',
    colorSecondary: '#FFFFFF',
    players: [],
  },
  sets: [],
  currentSet: 0,
  setsWon: {
    A: 0,
    B: 0,
  },
});

const Referee: React.FC = () => {
  // Charger les données depuis le localStorage au démarrage
  const [step, setStep] = useState<RefereeStep>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_STEP);
    return (saved as RefereeStep) || 'setup';
  });

  const [matchData, setMatchData] = useState<MatchData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MATCH);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Erreur chargement données match:', e);
        return getInitialMatchData();
      }
    }
    return getInitialMatchData();
  });

  // Sauvegarder dans le localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STEP, step);
  }, [step]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(matchData));
  }, [matchData]);

  const handleTeamsSetup = (teamA: TeamInfo, teamB: TeamInfo) => {
    setMatchData(prev => ({
      ...prev,
      teamA,
      teamB,
    }));
    setStep('coinToss');
  };

  const handleCoinToss = (result: CoinTossResult) => {
    setMatchData(prev => {
      // Si on a déjà des sets (c'est un tirage pour le set 5)
      if (prev.sets.length > 0) {
        const newSets = [...prev.sets];
        newSets.push({
          number: 5,
          lineupA: { P1: '', P2: '', P3: '', P4: '', P5: '', P6: '' },
          lineupB: { P1: '', P2: '', P3: '', P4: '', P5: '', P6: '' },
          score: { teamA: 0, teamB: 0 },
          servingTeam: result.choice === 'service' ? result.winner : result.winner === 'A' ? 'B' : 'A',
          started: false,
          finished: false,
        });
        return {
          ...prev,
          coinToss: result,
          sets: newSets,
        };
      } else {
        // Premier tirage au sort (set 1)
        return {
          ...prev,
          coinToss: result,
          sets: [
            {
              number: 1,
              lineupA: { P1: '', P2: '', P3: '', P4: '', P5: '', P6: '' },
              lineupB: { P1: '', P2: '', P3: '', P4: '', P5: '', P6: '' },
              score: { teamA: 0, teamB: 0 },
              servingTeam: result.choice === 'service' ? result.winner : result.winner === 'A' ? 'B' : 'A',
              started: false,
              finished: false,
            },
          ],
          currentSet: 1,
        };
      }
    });
    setStep('match');
  };

  const handleResetMatch = () => {
    if (window.confirm('Voulez-vous vraiment réinitialiser le match ? Toutes les données seront perdues.')) {
      const initialData = getInitialMatchData();
      setStep('setup');
      setMatchData(initialData);
      localStorage.removeItem(STORAGE_KEY_MATCH);
      localStorage.removeItem(STORAGE_KEY_STEP);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'setup':
        return 'Configuration des équipes';
      case 'coinToss':
        return 'Tirage au sort';
      case 'match':
        return 'Match en cours';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Bouton Réinitialiser */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleResetMatch}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            <span className="text-lg">🔄</span>
            <span className="hidden sm:inline">Réinitialiser le match</span>
            <span className="sm:hidden">Réinitialiser</span>
          </button>
        </div>

        {/* Workflow Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-4">
            {/* Étape 1 */}
            <div className="flex items-center">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-bold transition-colors ${
                  step === 'setup'
                    ? 'bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                1
              </div>
              <span className="ml-2 text-xs sm:text-sm font-medium hidden sm:inline">
                Équipes
              </span>
            </div>

            {/* Flèche */}
            <div className="text-gray-400 text-xl">→</div>

            {/* Étape 2 */}
            <div className="flex items-center">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-bold transition-colors ${
                  step === 'coinToss'
                    ? 'bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                2
              </div>
              <span className="ml-2 text-xs sm:text-sm font-medium hidden sm:inline">
                Tirage
              </span>
            </div>

            {/* Flèche */}
            <div className="text-gray-400 text-xl">→</div>

            {/* Étape 3 */}
            <div className="flex items-center">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-bold transition-colors ${
                  step === 'match'
                    ? 'bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                3
              </div>
              <span className="ml-2 text-xs sm:text-sm font-medium hidden sm:inline">
                Match
              </span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-center text-light-onSurface dark:text-dark-onSurface">
            {getStepTitle()}
          </h2>
        </div>

        {step === 'setup' && (
          <TeamSetup
            onComplete={handleTeamsSetup}
            initialTeamA={matchData.teamA}
            initialTeamB={matchData.teamB}
          />
        )}

        {step === 'coinToss' && (
          <CoinToss
            teamA={matchData.teamA}
            teamB={matchData.teamB}
            onComplete={handleCoinToss}
            onBack={() => setStep('setup')}
          />
        )}

        {step === 'match' && (
          <MatchBoard
            matchData={matchData}
            setMatchData={setMatchData}
            onNeedCoinTossForSet5={() => setStep('coinToss')}
          />
        )}
      </div>
    </div>
  );
};

export default Referee;
