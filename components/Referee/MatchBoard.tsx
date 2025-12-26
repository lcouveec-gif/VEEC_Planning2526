import React, { useState } from 'react';
import CourtDisplay from './CourtDisplay';
import ClubLogo from '../ClubLogo';
import { useClubs } from '../../hooks/useClubs';
import type { MatchData, SetLineup, SetData } from '../../types/referee';

interface MatchBoardProps {
  matchData: MatchData;
  setMatchData: React.Dispatch<React.SetStateAction<MatchData>>;
  onNeedCoinTossForSet5?: () => void;
}

const MatchBoard: React.FC<MatchBoardProps> = ({ matchData, setMatchData, onNeedCoinTossForSet5 }) => {
  const { clubs } = useClubs();
  const [showLineupSetup, setShowLineupSetup] = useState(true);
  const [substitutionMode, setSubstitutionMode] = useState<{ team: 'A' | 'B'; playerOut: string } | null>(null);
  const [swappedSides, setSwappedSides] = useState(false); // État pour inverser les camps
  const currentSetData = matchData.sets[matchData.currentSet - 1];

  // Récupérer les clubs
  const clubA = matchData.teamA.clubCode ? clubs.find(c => c.code_club === matchData.teamA.clubCode) : null;
  const clubB = matchData.teamB.clubCode ? clubs.find(c => c.code_club === matchData.teamB.clubCode) : null;

  // Fonction pour inverser les camps
  const handleSwapSides = () => {
    setSwappedSides(!swappedSides);
  };

  // Rotation des joueurs (sens horaire vue de dessus)
  const rotateTeamClockwise = (lineup: SetLineup): SetLineup => {
    return {
      P1: lineup.P6,
      P2: lineup.P1,
      P3: lineup.P2,
      P4: lineup.P3,
      P5: lineup.P4,
      P6: lineup.P5,
    };
  };

  // Rotation anti-horaire
  const rotateTeamCounterClockwise = (lineup: SetLineup): SetLineup => {
    return {
      P1: lineup.P2,
      P2: lineup.P3,
      P3: lineup.P4,
      P4: lineup.P5,
      P5: lineup.P6,
      P6: lineup.P1,
    };
  };

  // Fonction de rotation manuelle
  const handleManualRotation = (team: 'A' | 'B', direction: 'clockwise' | 'counter') => {
    const updatedSets = [...matchData.sets];
    const currentSet = updatedSets[matchData.currentSet - 1];

    if (team === 'A') {
      currentSet.lineupA = direction === 'clockwise'
        ? rotateTeamClockwise(currentSet.lineupA)
        : rotateTeamCounterClockwise(currentSet.lineupA);
    } else {
      currentSet.lineupB = direction === 'clockwise'
        ? rotateTeamClockwise(currentSet.lineupB)
        : rotateTeamCounterClockwise(currentSet.lineupB);
    }

    setMatchData({ ...matchData, sets: updatedSets });
  };

  const handleSubstitution = (team: 'A' | 'B', playerOut: string, playerIn: string) => {
    const updatedSets = [...matchData.sets];
    const currentSet = updatedSets[matchData.currentSet - 1];

    // Trouver la position du joueur sortant
    const lineup = team === 'A' ? currentSet.lineupA : currentSet.lineupB;
    const position = Object.entries(lineup).find(([_, num]) => num === playerOut)?.[0] as keyof SetLineup;

    if (!position) return;

    // Vérifier si c'est un échange de libéro
    const playerOutInfo = getPlayerInfo(team, playerOut);
    const playerInInfo = getPlayerInfo(team, playerIn);
    const isBackRow = position === 'P1' || position === 'P5' || position === 'P6';

    // Si un libéro entre ou sort en position arrière, c'est un échange (pas un remplacement)
    const isLiberoExchange = isBackRow && (playerOutInfo?.isLibero || playerInInfo?.isLibero);

    if (isLiberoExchange) {
      // Stocker l'échange de libéro
      if (playerInInfo?.isLibero) {
        // Libéro entre, remplace un joueur arrière
        if (team === 'A') {
          currentSet.liberoExchangeA = {
            liberoNumber: playerIn,
            replacedPlayerNumber: playerOut,
            replacedAtPosition: position,
          };
        } else {
          currentSet.liberoExchangeB = {
            liberoNumber: playerIn,
            replacedPlayerNumber: playerOut,
            replacedAtPosition: position,
          };
        }
      } else if (playerOutInfo?.isLibero) {
        // Libéro sort, le joueur qu'il avait remplacé rentre
        // On efface l'échange enregistré
        if (team === 'A') {
          currentSet.liberoExchangeA = undefined;
        } else {
          currentSet.liberoExchangeB = undefined;
        }
      }
    }

    // Effectuer le changement
    if (team === 'A') {
      currentSet.lineupA[position] = playerIn;
    } else {
      currentSet.lineupB[position] = playerIn;
    }

    setMatchData({ ...matchData, sets: updatedSets });
    setSubstitutionMode(null);
  };

  const handleResetSet = () => {
    if (!window.confirm('Voulez-vous vraiment recommencer ce set ? Le score sera remis à 0-0 et les positions initiales seront restaurées.')) {
      return;
    }

    const updatedSets = [...matchData.sets];
    const currentSet = updatedSets[matchData.currentSet - 1];

    // Réinitialiser le score
    currentSet.score = { teamA: 0, teamB: 0 };
    currentSet.started = false;

    setMatchData({ ...matchData, sets: updatedSets });
    setShowLineupSetup(true);
  };

  const handleRemovePoint = (team: 'A' | 'B') => {
    const currentSet = matchData.sets[matchData.currentSet - 1];
    const currentScore = currentSet.score[`team${team}`];

    // Ne pas descendre en dessous de 0
    if (currentScore === 0) return;

    // Calculer le nouveau score
    const newScore = {
      ...currentSet.score,
      [`team${team}`]: currentScore - 1,
    };

    // Vérifier si le set était terminé et doit redevenir en cours
    const isSet5 = matchData.currentSet === 5;
    const winningScore = isSet5 ? 15 : 25;

    // Le set est fini si une équipe a au moins le score gagnant avec 2 points d'écart
    const wasFinished = currentSet.finished;
    const isNowFinished =
      (newScore.teamA >= winningScore && newScore.teamA - newScore.teamB >= 2) ||
      (newScore.teamB >= winningScore && newScore.teamB - newScore.teamA >= 2);

    // Retirer un point sans impact sur la rotation
    const updatedSets = [...matchData.sets];
    updatedSets[matchData.currentSet - 1] = {
      ...currentSet,
      score: newScore,
      finished: isNowFinished,
    };

    // Si le set était terminé et ne l'est plus, ajuster les sets gagnés
    let newSetsWon = { ...matchData.setsWon };
    if (wasFinished && !isNowFinished) {
      // Déterminer quelle équipe avait gagné ce set
      if (currentSet.score.teamA > currentSet.score.teamB) {
        newSetsWon.A = Math.max(0, newSetsWon.A - 1);
      } else {
        newSetsWon.B = Math.max(0, newSetsWon.B - 1);
      }
    }

    setMatchData({
      ...matchData,
      sets: updatedSets,
      setsWon: newSetsWon,
    });
  };

  const handleScorePoint = (team: 'A' | 'B') => {
    const currentSet = matchData.sets[matchData.currentSet - 1];

    // Mettre à jour le score
    const newScore = { ...currentSet.score };
    newScore[`team${team}`] = newScore[`team${team}`] + 1;

    // Vérifier si l'équipe qui marque n'avait pas le service
    const needsRotation = currentSet.servingTeam !== team;

    let newLineupA = currentSet.lineupA;
    let newLineupB = currentSet.lineupB;
    let newServingTeam = team;

    if (needsRotation) {
      // L'équipe qui recevait marque et récupère le service - rotation ANTI-HORAIRE
      if (team === 'A') {
        newLineupA = rotateTeamCounterClockwise(currentSet.lineupA);
      } else {
        newLineupB = rotateTeamCounterClockwise(currentSet.lineupB);
      }
    }

    // Vérifier si un libéro se retrouve en position avant après rotation
    // Si oui, échanger automatiquement avec le joueur qu'il avait remplacé
    let newLiberoExchangeA = currentSet.liberoExchangeA;
    let newLiberoExchangeB = currentSet.liberoExchangeB;

    if (needsRotation && team === 'A' && currentSet.liberoExchangeA) {
      // Chercher si le libéro de l'équipe A est maintenant en position avant
      const liberoNumber = currentSet.liberoExchangeA.liberoNumber;
      const liberoPosition = Object.entries(newLineupA).find(([_, num]) => num === liberoNumber)?.[0] as keyof SetLineup;

      if (liberoPosition && (liberoPosition === 'P2' || liberoPosition === 'P3' || liberoPosition === 'P4')) {
        // Le libéro est passé à l'avant, on doit le remplacer par le joueur qu'il avait échangé
        newLineupA[liberoPosition] = currentSet.liberoExchangeA.replacedPlayerNumber;
        newLiberoExchangeA = undefined; // L'échange est terminé
      }
    }

    if (needsRotation && team === 'B' && currentSet.liberoExchangeB) {
      // Chercher si le libéro de l'équipe B est maintenant en position avant
      const liberoNumber = currentSet.liberoExchangeB.liberoNumber;
      const liberoPosition = Object.entries(newLineupB).find(([_, num]) => num === liberoNumber)?.[0] as keyof SetLineup;

      if (liberoPosition && (liberoPosition === 'P2' || liberoPosition === 'P3' || liberoPosition === 'P4')) {
        // Le libéro est passé à l'avant, on doit le remplacer par le joueur qu'il avait échangé
        newLineupB[liberoPosition] = currentSet.liberoExchangeB.replacedPlayerNumber;
        newLiberoExchangeB = undefined; // L'échange est terminé
      }
    }

    // Vérifier si le set est terminé (25 points avec 2 points d'écart, ou 15 pour le 5e set)
    const isSet5 = matchData.currentSet === 5;
    const winningScore = isSet5 ? 15 : 25;
    const setFinished =
      (newScore.teamA >= winningScore && newScore.teamA - newScore.teamB >= 2) ||
      (newScore.teamB >= winningScore && newScore.teamB - newScore.teamA >= 2);

    // Mettre à jour le set
    const updatedSets = [...matchData.sets];
    updatedSets[matchData.currentSet - 1] = {
      ...currentSet,
      score: newScore,
      lineupA: newLineupA,
      lineupB: newLineupB,
      servingTeam: newServingTeam,
      finished: setFinished,
      liberoExchangeA: newLiberoExchangeA,
      liberoExchangeB: newLiberoExchangeB,
    };

    // Si le set est terminé, calculer qui a gagné
    let newSetsWon = { ...matchData.setsWon };

    if (setFinished) {
      if (newScore.teamA > newScore.teamB) {
        newSetsWon.A++;
      } else {
        newSetsWon.B++;
      }
      // Ne pas passer automatiquement au set suivant
      // L'utilisateur devra cliquer sur "Passer au set suivant"
    }

    setMatchData({
      ...matchData,
      sets: updatedSets,
      setsWon: newSetsWon,
    });
  };

  const handleNextSet = () => {
    const matchFinished = matchData.setsWon.A === 3 || matchData.setsWon.B === 3;

    if (matchFinished || matchData.sets.length >= 5) return;

    const newCurrentSet = matchData.currentSet + 1;

    // Si c'est le 5ème set et qu'on a un callback pour le tirage au sort
    if (newCurrentSet === 5 && onNeedCoinTossForSet5) {
      setMatchData({
        ...matchData,
        currentSet: newCurrentSet,
      });
      onNeedCoinTossForSet5();
      return;
    }

    // Déterminer l'équipe au service pour le nouveau set
    // Pour les sets 2, 3, 4: l'équipe qui n'avait pas le service au début du set précédent
    const previousSet = matchData.sets[matchData.sets.length - 1];
    const newServingTeam = previousSet.servingTeam === 'A' ? 'B' : 'A';

    // Initialiser avec les joueurs du set précédent
    const updatedSets = [...matchData.sets];
    updatedSets.push({
      number: newCurrentSet,
      lineupA: { ...previousSet.lineupA }, // Copie du lineup précédent
      lineupB: { ...previousSet.lineupB }, // Copie du lineup précédent
      score: { teamA: 0, teamB: 0 },
      servingTeam: newServingTeam,
      started: false,
      finished: false,
    });

    setMatchData({
      ...matchData,
      sets: updatedSets,
      currentSet: newCurrentSet,
    });
    setShowLineupSetup(true);
  };

  const handleLineupChange = (team: 'A' | 'B', position: keyof SetLineup, playerNumber: string) => {
    const updatedSets = [...matchData.sets];
    const currentSet = updatedSets[matchData.currentSet - 1];

    if (team === 'A') {
      currentSet.lineupA[position] = playerNumber;
    } else {
      currentSet.lineupB[position] = playerNumber;
    }

    setMatchData({ ...matchData, sets: updatedSets });
  };

  // Rotation pendant la configuration
  const handleConfigRotation = (team: 'A' | 'B', direction: 'clockwise' | 'counter') => {
    const updatedSets = [...matchData.sets];
    const currentSet = updatedSets[matchData.currentSet - 1];

    if (team === 'A') {
      currentSet.lineupA = direction === 'clockwise'
        ? rotateTeamClockwise(currentSet.lineupA)
        : rotateTeamCounterClockwise(currentSet.lineupA);
    } else {
      currentSet.lineupB = direction === 'clockwise'
        ? rotateTeamClockwise(currentSet.lineupB)
        : rotateTeamCounterClockwise(currentSet.lineupB);
    }

    setMatchData({ ...matchData, sets: updatedSets });
  };

  const startSet = () => {
    const currentSet = matchData.sets[matchData.currentSet - 1];

    // Vérifier que toutes les positions sont remplies
    const lineupAComplete = Object.values(currentSet.lineupA).every(num => num !== '');
    const lineupBComplete = Object.values(currentSet.lineupB).every(num => num !== '');

    if (!lineupAComplete || !lineupBComplete) {
      alert('Veuillez compléter toutes les positions des deux équipes');
      return;
    }

    const updatedSets = [...matchData.sets];
    updatedSets[matchData.currentSet - 1] = {
      ...currentSet,
      started: true,
    };

    setMatchData({ ...matchData, sets: updatedSets });
    setShowLineupSetup(false);
  };

  const getPlayerInfo = (team: 'A' | 'B', playerNumber: string) => {
    const teamData = team === 'A' ? matchData.teamA : matchData.teamB;
    return teamData.players.find(p => p.number === playerNumber);
  };

  // Si on doit configurer le lineup avant de commencer le set
  if (showLineupSetup && !currentSetData.started) {
    return (
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Configuration Set {matchData.currentSet}</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Équipe A */}
          <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {clubA ? (
                  <ClubLogo
                    codeClub={clubA.code_club}
                    clubName={clubA.nom}
                    size="sm"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: matchData.teamA.colorPrimary }}
                  ></div>
                )}
                {matchData.teamA.name}
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => handleConfigRotation('A', 'counter')}
                  className="px-2 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors text-sm font-bold"
                  title="Rotation anti-horaire"
                >
                  ↺
                </button>
                <button
                  onClick={() => handleConfigRotation('A', 'clockwise')}
                  className="px-2 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors text-sm font-bold"
                  title="Rotation horaire"
                >
                  ↻
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Colonne Arrière (gauche) */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center mb-2">Arrière</div>
                {(['P5', 'P6', 'P1'] as const).map(pos => {
                  const selectedNumbers = Object.entries(currentSetData.lineupA)
                    .filter(([key, _]) => key !== pos)
                    .map(([_, num]) => num);
                  const availablePlayers = matchData.teamA.players.filter(
                    p => !selectedNumbers.includes(p.number) || p.number === currentSetData.lineupA[pos]
                  );

                  return (
                    <div key={pos}>
                      <label className="block text-sm font-medium mb-1">{pos}</label>
                      <select
                        value={currentSetData.lineupA[pos]}
                        onChange={(e) => handleLineupChange('A', pos, e.target.value)}
                        className="w-full px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                      >
                        <option value="">-</option>
                        {availablePlayers.map(p => (
                          <option key={p.number} value={p.number}>
                            #{p.number} {p.isLibero ? '(Libéro)' : ''} {p.isCaptain ? '(Capitaine)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {/* Colonne Avant (droite, près du filet) */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center mb-2">Avant</div>
                {(['P4', 'P3', 'P2'] as const).map(pos => {
                  const selectedNumbers = Object.entries(currentSetData.lineupA)
                    .filter(([key, _]) => key !== pos)
                    .map(([_, num]) => num);
                  const availablePlayers = matchData.teamA.players.filter(
                    p => !selectedNumbers.includes(p.number) || p.number === currentSetData.lineupA[pos]
                  );

                  return (
                    <div key={pos}>
                      <label className="block text-sm font-medium mb-1">{pos}</label>
                      <select
                        value={currentSetData.lineupA[pos]}
                        onChange={(e) => handleLineupChange('A', pos, e.target.value)}
                        className="w-full px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                      >
                        <option value="">-</option>
                        {availablePlayers.map(p => (
                          <option key={p.number} value={p.number}>
                            #{p.number} {p.isLibero ? '(Libéro)' : ''} {p.isCaptain ? '(Capitaine)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Équipe B */}
          <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {clubB ? (
                  <ClubLogo
                    codeClub={clubB.code_club}
                    clubName={clubB.nom}
                    size="sm"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: matchData.teamB.colorPrimary }}
                  ></div>
                )}
                {matchData.teamB.name}
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => handleConfigRotation('B', 'counter')}
                  className="px-2 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors text-sm font-bold"
                  title="Rotation anti-horaire"
                >
                  ↺
                </button>
                <button
                  onClick={() => handleConfigRotation('B', 'clockwise')}
                  className="px-2 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors text-sm font-bold"
                  title="Rotation horaire"
                >
                  ↻
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Colonne Avant (gauche, près du filet) */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center mb-2">Avant</div>
                {(['P2', 'P3', 'P4'] as const).map(pos => {
                  const selectedNumbers = Object.entries(currentSetData.lineupB)
                    .filter(([key, _]) => key !== pos)
                    .map(([_, num]) => num);
                  const availablePlayers = matchData.teamB.players.filter(
                    p => !selectedNumbers.includes(p.number) || p.number === currentSetData.lineupB[pos]
                  );

                  return (
                    <div key={pos}>
                      <label className="block text-sm font-medium mb-1">{pos}</label>
                      <select
                        value={currentSetData.lineupB[pos]}
                        onChange={(e) => handleLineupChange('B', pos, e.target.value)}
                        className="w-full px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                      >
                        <option value="">-</option>
                        {availablePlayers.map(p => (
                          <option key={p.number} value={p.number}>
                            #{p.number} {p.isLibero ? '(Libéro)' : ''} {p.isCaptain ? '(Capitaine)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {/* Colonne Arrière (droite) */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center mb-2">Arrière</div>
                {(['P1', 'P6', 'P5'] as const).map(pos => {
                  const selectedNumbers = Object.entries(currentSetData.lineupB)
                    .filter(([key, _]) => key !== pos)
                    .map(([_, num]) => num);
                  const availablePlayers = matchData.teamB.players.filter(
                    p => !selectedNumbers.includes(p.number) || p.number === currentSetData.lineupB[pos]
                  );

                  return (
                    <div key={pos}>
                      <label className="block text-sm font-medium mb-1">{pos}</label>
                      <select
                        value={currentSetData.lineupB[pos]}
                        onChange={(e) => handleLineupChange('B', pos, e.target.value)}
                        className="w-full px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                      >
                        <option value="">-</option>
                        {availablePlayers.map(p => (
                          <option key={p.number} value={p.number}>
                            #{p.number} {p.isLibero ? '(Libéro)' : ''} {p.isCaptain ? '(Capitaine)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={startSet}
            className="px-8 py-3 bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Lancer le set {matchData.currentSet}
          </button>
        </div>
      </div>
    );
  }

  // Affichage du terrain et du match en cours
  const matchFinished = matchData.setsWon.A === 3 || matchData.setsWon.B === 3;

  // Déterminer les équipes pour l'affichage (gauche/droite) en fonction de swappedSides
  const displayTeamLeft = swappedSides ? matchData.teamB : matchData.teamA;
  const displayTeamRight = swappedSides ? matchData.teamA : matchData.teamB;
  const displayClubLeft = swappedSides ? clubB : clubA;
  const displayClubRight = swappedSides ? clubA : clubB;
  const displayScoreLeft = swappedSides ? currentSetData.score.teamB : currentSetData.score.teamA;
  const displayScoreRight = swappedSides ? currentSetData.score.teamA : currentSetData.score.teamB;
  const displaySetsLeft = swappedSides ? matchData.setsWon.B : matchData.setsWon.A;
  const displaySetsRight = swappedSides ? matchData.setsWon.A : matchData.setsWon.B;
  const teamLeftId: 'A' | 'B' = swappedSides ? 'B' : 'A';
  const teamRightId: 'A' | 'B' = swappedSides ? 'A' : 'B';

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Tableau d'affichage avec boutons de points intégrés */}
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg p-3 sm:p-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-stretch mb-3 sm:mb-4">
          {/* Équipe gauche avec boutons point */}
          <div className="text-center flex flex-col">
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-2">
              {displayClubLeft ? (
                <ClubLogo
                  codeClub={displayClubLeft.code_club}
                  clubName={displayClubLeft.nom}
                  size="sm"
                  className="flex-shrink-0"
                />
              ) : (
                <div
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0 shadow"
                  style={{ backgroundColor: displayTeamLeft.colorPrimary }}
                ></div>
              )}
              <h3 className="text-sm sm:text-lg font-bold truncate">{displayTeamLeft.name}</h3>
            </div>
            <div className="text-4xl sm:text-6xl font-bold mb-2">{displayScoreLeft}</div>
            <div className="text-xs sm:text-sm font-semibold mb-3" style={{ color: displayTeamLeft.colorPrimary }}>
              {displaySetsLeft} {displaySetsLeft > 1 ? 'Sets' : 'Set'}
            </div>
            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => handleRemovePoint(teamLeftId)}
                disabled={displayScoreLeft === 0}
                className="flex-1 px-2 sm:px-3 py-2 text-sm sm:text-base font-bold rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: displayTeamLeft.colorPrimary,
                  color: displayTeamLeft.colorSecondary,
                }}
              >
                −
              </button>
              <button
                onClick={() => handleScorePoint(teamLeftId)}
                className="flex-[2] px-3 sm:px-4 py-2 text-sm sm:text-base font-bold rounded-lg transition-all hover:scale-105 active:scale-95 shadow-md"
                style={{
                  backgroundColor: displayTeamLeft.colorPrimary,
                  color: displayTeamLeft.colorSecondary,
                }}
              >
                + Point
              </button>
            </div>
          </div>

          {/* Set actuel et score global */}
          <div className="text-center flex flex-col justify-center">
            <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              SET {matchData.currentSet}
            </div>
            <div className="text-2xl sm:text-4xl font-bold mb-2 text-gray-700 dark:text-gray-300">
              {swappedSides ? `${matchData.setsWon.B} - ${matchData.setsWon.A}` : `${matchData.setsWon.A} - ${matchData.setsWon.B}`}
            </div>
            {currentSetData.servingTeam && (
              <div className="text-xs sm:text-sm mt-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 py-1 px-2 rounded-full inline-block mx-auto">
                <span className="font-semibold">Au service:</span> {currentSetData.servingTeam === 'A' ? matchData.teamA.name : matchData.teamB.name}
              </div>
            )}
          </div>

          {/* Équipe droite avec boutons point */}
          <div className="text-center flex flex-col">
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-2">
              {displayClubRight ? (
                <ClubLogo
                  codeClub={displayClubRight.code_club}
                  clubName={displayClubRight.nom}
                  size="sm"
                  className="flex-shrink-0"
                />
              ) : (
                <div
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0 shadow"
                  style={{ backgroundColor: displayTeamRight.colorPrimary }}
                ></div>
              )}
              <h3 className="text-sm sm:text-lg font-bold truncate">{displayTeamRight.name}</h3>
            </div>
            <div className="text-4xl sm:text-6xl font-bold mb-2">{displayScoreRight}</div>
            <div className="text-xs sm:text-sm font-semibold mb-3" style={{ color: displayTeamRight.colorPrimary }}>
              {displaySetsRight} {displaySetsRight > 1 ? 'Sets' : 'Set'}
            </div>
            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => handleRemovePoint(teamRightId)}
                disabled={displayScoreRight === 0}
                className="flex-1 px-2 sm:px-3 py-2 text-sm sm:text-base font-bold rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: displayTeamRight.colorPrimary,
                  color: displayTeamRight.colorSecondary,
                }}
              >
                −
              </button>
              <button
                onClick={() => handleScorePoint(teamRightId)}
                className="flex-[2] px-3 sm:px-4 py-2 text-sm sm:text-base font-bold rounded-lg transition-all hover:scale-105 active:scale-95 shadow-md"
                style={{
                  backgroundColor: displayTeamRight.colorPrimary,
                  color: displayTeamRight.colorSecondary,
                }}
              >
                + Point
              </button>
            </div>
          </div>
        </div>

        {/* Historique des sets */}
        <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
          {matchData.sets.map((set, idx) => (
            <div
              key={idx}
              className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${
                idx === matchData.currentSet - 1
                  ? 'bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary font-bold'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              S{set.number}: {swappedSides ? `${set.score.teamB}-${set.score.teamA}` : `${set.score.teamA}-${set.score.teamB}`}
            </div>
          ))}
        </div>
      </div>

      {/* Terrain de volley */}
      {!matchFinished && (
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg p-3 sm:p-6">
          {/* Bouton pour inverser les camps */}
          <div className="flex justify-center mb-4">
            <button
              onClick={handleSwapSides}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
              title="Inverser les camps pour correspondre à la position réelle sur le terrain"
            >
              <span className="text-lg">⇄</span>
              <span>Inverser les camps</span>
            </button>
          </div>

          <CourtDisplay
            teamA={swappedSides ? matchData.teamB : matchData.teamA}
            teamB={swappedSides ? matchData.teamA : matchData.teamB}
            lineupA={swappedSides ? currentSetData.lineupB : currentSetData.lineupA}
            lineupB={swappedSides ? currentSetData.lineupA : currentSetData.lineupB}
            servingTeam={currentSetData.servingTeam}
            onRotateA={handleManualRotation.bind(null, swappedSides ? 'B' : 'A')}
            onRotateB={handleManualRotation.bind(null, swappedSides ? 'A' : 'B')}
            getPlayerInfo={(team, playerNumber) => getPlayerInfo(swappedSides ? (team === 'A' ? 'B' : 'A') : team, playerNumber)}
            onSubstitute={(team, playerOut, playerIn) => handleSubstitution(swappedSides ? (team === 'A' ? 'B' : 'A') : team, playerOut, playerIn)}
            substitutionMode={substitutionMode ? {
              team: swappedSides ? (substitutionMode.team === 'A' ? 'B' : 'A') as 'A' | 'B' : substitutionMode.team,
              playerOut: substitutionMode.playerOut
            } : null}
            onStartSubstitution={(team, playerOut) => setSubstitutionMode({
              team: swappedSides ? (team === 'A' ? 'B' : 'A') as 'A' | 'B' : team,
              playerOut
            })}
            onCancelSubstitution={() => setSubstitutionMode(null)}
            liberoExchangeA={swappedSides ? currentSetData.liberoExchangeB : currentSetData.liberoExchangeA}
            liberoExchangeB={swappedSides ? currentSetData.liberoExchangeA : currentSetData.liberoExchangeB}
          />
        </div>
      )}

      {/* Set terminé - Bouton pour lancer le set suivant */}
      {!matchFinished && currentSetData.finished && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-lg shadow-lg p-4 sm:p-6 text-center">
          <h3 className="text-xl sm:text-2xl font-bold mb-2 text-green-800 dark:text-green-200">
            Set {matchData.currentSet} terminé !
          </h3>
          <p className="text-lg mb-4 text-green-700 dark:text-green-300">
            Score: {currentSetData.score.teamA} - {currentSetData.score.teamB}
          </p>
          <button
            onClick={handleNextSet}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shadow-md"
          >
            Passer au set suivant
          </button>
        </div>
      )}

      {/* Boutons d'action */}
      {!matchFinished && !currentSetData.finished && (
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleResetSet}
            className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors shadow"
          >
            🔄 Recommencer ce set
          </button>
        </div>
      )}

      {/* Match terminé */}
      {matchFinished && (
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">🏆 Match terminé !</h2>
          <p className="text-2xl mb-6">
            Vainqueur : <strong>
              {matchData.setsWon.A === 3 ? matchData.teamA.name : matchData.teamB.name}
            </strong>
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Score final : {matchData.setsWon.A} - {matchData.setsWon.B}
          </p>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Utilisez le bouton "Réinitialiser le match" en haut de la page pour commencer un nouveau match
          </p>
        </div>
      )}
    </div>
  );
};

export default MatchBoard;
