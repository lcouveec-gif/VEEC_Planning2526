import React, { useState } from 'react';
import TeamSetup from './Referee/TeamSetup';
import CoinToss from './Referee/CoinToss';
import MatchBoard from './Referee/MatchBoard';
import type { MatchData, RefereeStep, TeamInfo, CoinTossResult } from '../types/referee';

const Referee: React.FC = () => {
  const [step, setStep] = useState<RefereeStep>('setup');
  const [matchData, setMatchData] = useState<MatchData>({
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

  const handleBackToSetup = () => {
    if (window.confirm('Voulez-vous vraiment recommencer ? Toutes les données seront perdues.')) {
      setStep('setup');
      setMatchData({
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
            onBack={handleBackToSetup}
            onNeedCoinTossForSet5={() => setStep('coinToss')}
          />
        )}
      </div>
    </div>
  );
};

export default Referee;
