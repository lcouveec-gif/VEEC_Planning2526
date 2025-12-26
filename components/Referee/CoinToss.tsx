import React, { useState } from 'react';
import type { TeamInfo, CoinTossResult, CoinTossChoice } from '../../types/referee';
import ClubLogo from '../ClubLogo';
import { useClubs } from '../../hooks/useClubs';

interface CoinTossProps {
  teamA: TeamInfo;
  teamB: TeamInfo;
  onComplete: (result: CoinTossResult) => void;
  onBack: () => void;
}

const CoinToss: React.FC<CoinTossProps> = ({ teamA, teamB, onComplete, onBack }) => {
  const { clubs } = useClubs();
  const [isFlipping, setIsFlipping] = useState(false);
  const [winner, setWinner] = useState<'A' | 'B' | null>(null);
  const [choice, setChoice] = useState<CoinTossChoice | null>(null);
  const [manualMode, setManualMode] = useState(false);

  // Récupérer les clubs
  const clubA = teamA.clubCode ? clubs.find(c => c.code_club === teamA.clubCode) : null;
  const clubB = teamB.clubCode ? clubs.find(c => c.code_club === teamB.clubCode) : null;

  const flipCoin = () => {
    setIsFlipping(true);
    setWinner(null);
    setChoice(null);

    // Simulation du tirage au sort
    setTimeout(() => {
      const result: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';
      setWinner(result);
      setIsFlipping(false);
    }, 1500);
  };

  const setManualWinner = (team: 'A' | 'B') => {
    setWinner(team);
    setChoice(null);
  };

  const handleChoice = (selectedChoice: CoinTossChoice) => {
    setChoice(selectedChoice);
  };

  const handleConfirm = () => {
    if (winner && choice) {
      onComplete({ winner, choice });
    }
  };

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-light-onSurface dark:text-dark-onSurface text-center">
        Tirage au sort
      </h2>

      <div className="mb-8">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="flex justify-center mb-3">
              {clubA ? (
                <ClubLogo
                  codeClub={clubA.code_club}
                  clubName={clubA.nom}
                  size="lg"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full"
                  style={{ backgroundColor: teamA.colorPrimary }}
                ></div>
              )}
            </div>
            <h3 className="font-bold text-lg">{teamA.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Équipe A</p>
          </div>
          <div className="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="flex justify-center mb-3">
              {clubB ? (
                <ClubLogo
                  codeClub={clubB.code_club}
                  clubName={clubB.nom}
                  size="lg"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full"
                  style={{ backgroundColor: teamB.colorPrimary }}
                ></div>
              )}
            </div>
            <h3 className="font-bold text-lg">{teamB.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Équipe B</p>
          </div>
        </div>

        {/* Mode de tirage */}
        {!winner && (
          <div className="mb-6">
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => setManualMode(false)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  !manualMode
                    ? 'bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Tirage automatique
              </button>
              <button
                onClick={() => setManualMode(true)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  manualMode
                    ? 'bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Tirage manuel
              </button>
            </div>

            {!manualMode ? (
              <div className="text-center">
                <button
                  onClick={flipCoin}
                  disabled={isFlipping}
                  className={`px-8 py-4 rounded-full font-bold text-lg transition-all ${
                    isFlipping
                      ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed animate-pulse'
                      : 'bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary hover:scale-105'
                  }`}
                >
                  {isFlipping ? 'Tirage en cours...' : '🪙 Lancer la pièce'}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  Sélectionnez le gagnant du tirage au sort :
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setManualWinner('A')}
                    className="px-6 py-4 rounded-lg font-bold text-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    style={{ borderLeft: `4px solid ${teamA.colorPrimary}` }}
                  >
                    {teamA.name}
                  </button>
                  <button
                    onClick={() => setManualWinner('B')}
                    className="px-6 py-4 rounded-lg font-bold text-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    style={{ borderLeft: `4px solid ${teamB.colorPrimary}` }}
                  >
                    {teamB.name}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Résultat du tirage */}
        {winner && (
          <div className="mb-8 text-center">
            <div className="inline-block px-6 py-4 bg-gray-200 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Gagnant du tirage</p>
              <p className="text-2xl font-bold">
                {winner === 'A' ? teamA.name : teamB.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                (Équipe {winner})
              </p>
            </div>
          </div>
        )}

        {/* Choix du capitaine gagnant */}
        {winner && !choice && (
          <div className="mb-6">
            <p className="text-center mb-4 font-medium">
              Quel est le choix du capitaine de {winner === 'A' ? teamA.name : teamB.name} ?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleChoice('service')}
                className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                🏐 Service
              </button>
              <button
                onClick={() => handleChoice('reception')}
                className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                🤚 Réception
              </button>
              <button
                onClick={() => handleChoice('terrain')}
                className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                📍 Choix du terrain
              </button>
            </div>
          </div>
        )}

        {/* Récapitulatif */}
        {winner && choice && (
          <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold mb-2">Récapitulatif :</h4>
            <ul className="space-y-1 text-sm">
              <li>
                • Gagnant du tirage : <strong>{winner === 'A' ? teamA.name : teamB.name}</strong> (Équipe {winner})
              </li>
              <li>
                • Choix : <strong>
                  {choice === 'service' ? 'Service' : choice === 'reception' ? 'Réception' : 'Choix du terrain'}
                </strong>
              </li>
              <li>
                • Service au 1er set : <strong>
                  {choice === 'service'
                    ? (winner === 'A' ? teamA.name : teamB.name)
                    : (winner === 'A' ? teamB.name : teamA.name)
                  }
                </strong>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Boutons de navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
        >
          ← Retour
        </button>
        <button
          onClick={handleConfirm}
          disabled={!winner || !choice}
          className="px-6 py-3 bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Commencer le match →
        </button>
      </div>
    </div>
  );
};

export default CoinToss;
