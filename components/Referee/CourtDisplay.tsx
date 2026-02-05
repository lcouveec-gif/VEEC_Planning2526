import React from 'react';
import type { TeamInfo, SetLineup, RefereePlayer, LiberoExchange } from '../../types/referee';

interface CourtDisplayProps {
  teamA: TeamInfo;
  teamB: TeamInfo;
  lineupA: SetLineup;
  lineupB: SetLineup;
  servingTeam: 'A' | 'B';
  onRotateA: (direction: 'clockwise' | 'counter') => void;
  onRotateB: (direction: 'clockwise' | 'counter') => void;
  getPlayerInfo: (team: 'A' | 'B', playerNumber: string) => RefereePlayer | undefined;
  onSubstitute: (team: 'A' | 'B', playerOut: string, playerIn: string) => void;
  substitutionMode: { team: 'A' | 'B'; playerOut: string } | null;
  onStartSubstitution: (team: 'A' | 'B', playerOut: string) => void;
  onCancelSubstitution: () => void;
  liberoExchangeA?: LiberoExchange;
  liberoExchangeB?: LiberoExchange;
}

const CourtDisplay: React.FC<CourtDisplayProps> = ({
  teamA,
  teamB,
  lineupA,
  lineupB,
  servingTeam,
  onRotateA,
  onRotateB,
  getPlayerInfo,
  onSubstitute,
  substitutionMode,
  onStartSubstitution,
  onCancelSubstitution,
  liberoExchangeA,
  liberoExchangeB,
}) => {
  const renderPlayer = (team: 'A' | 'B', position: keyof SetLineup) => {
    const lineup = team === 'A' ? lineupA : lineupB;
    const teamData = team === 'A' ? teamA : teamB;
    const playerNum = lineup[position];
    const player = getPlayerInfo(team, playerNum);

    const isServing = servingTeam === team && position === 'P1';
    const isBeingSubstituted = substitutionMode?.team === team && substitutionMode?.playerOut === playerNum;

    // Le libéro peut échanger avec les joueurs arrière (P1, P5, P6)
    const isBackRow = position === 'P1' || position === 'P5' || position === 'P6';
    const canBeReplacedByLibero = isBackRow && !player?.isLibero;

    // Couleurs pour le cercle du numéro
    const bgColor = player?.isLibero ? teamData.colorSecondary : teamData.colorPrimary;
    const textColor = player?.isLibero ? teamData.colorPrimary : teamData.colorSecondary;

    return (
      <div
        className={`relative bg-white dark:bg-gray-800 rounded p-1 sm:p-2 border-2 transition-all cursor-pointer hover:shadow-lg ${
          isServing ? 'ring-2 sm:ring-4 ring-yellow-400 ring-opacity-70 shadow-lg' : ''
        } ${isBeingSubstituted ? 'ring-2 sm:ring-4 ring-red-500 ring-opacity-70' : ''}`}
        style={{ borderColor: teamData.colorPrimary }}
        onClick={() => onStartSubstitution(team, playerNum)}
        title={
          player?.isLibero
            ? 'Cliquer pour échanger le libéro avec un joueur arrière'
            : canBeReplacedByLibero
              ? 'Cliquer pour remplacer (ou échanger avec libéro)'
              : 'Cliquer pour remplacer'
        }
      >
        {/* Badge Service */}
        {isServing && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-yellow-900 text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
            SERVICE
          </div>
        )}

        {/* Badge Remplacement */}
        {isBeingSubstituted && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
            À REMPLACER
          </div>
        )}

        {/* Numéro dans un cercle */}
        <div className="flex justify-center mb-0.5 sm:mb-1">
          <div
            className="w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-md"
            style={{ backgroundColor: bgColor }}
          >
            <span className="text-base sm:text-2xl font-bold" style={{ color: textColor }}>
              {playerNum}
            </span>
          </div>
        </div>

        {/* Position */}
        <div className="text-center text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium">
          {position}
        </div>

        {/* Badge Libéro */}
        {player?.isLibero && (
          <div className="text-center text-[7px] sm:text-[9px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            LIBÉRO
          </div>
        )}

        {/* Capitaine */}
        {player?.isCaptain && (
          <div className="absolute top-0.5 sm:top-1 right-0.5 sm:right-1 bg-blue-600 text-white text-[7px] sm:text-[8px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full">
            C
          </div>
        )}
      </div>
    );
  };

  const renderBench = (team: 'A' | 'B') => {
    const teamData = team === 'A' ? teamA : teamB;
    const lineup = team === 'A' ? lineupA : lineupB;
    const onCourtNumbers = Object.values(lineup);
    const benchPlayers = teamData.players.filter(p => !onCourtNumbers.includes(p.number));

    const isSubstitutionActive = substitutionMode?.team === team;

    // Vérifier si le joueur à remplacer est en ligne arrière pour permettre échange libéro
    let playerOutPosition: keyof SetLineup | null = null;
    if (substitutionMode?.team === team) {
      playerOutPosition = Object.entries(lineup).find(([_, num]) => num === substitutionMode.playerOut)?.[0] as keyof SetLineup || null;
    }
    const isBackRowSubstitution = playerOutPosition && (playerOutPosition === 'P1' || playerOutPosition === 'P5' || playerOutPosition === 'P6');

    // Vérifier si c'est un libéro qui sort (il peut échanger avec n'importe quel joueur arrière)
    const playerOut = substitutionMode?.team === team ? getPlayerInfo(team, substitutionMode.playerOut) : null;
    const isLiberoGoingOut = playerOut?.isLibero;

    // Si un libéro sort, on doit automatiquement faire entrer le joueur qu'il avait remplacé
    const liberoExchange = team === 'A' ? liberoExchangeA : liberoExchangeB;
    const autoReplacementPlayer = isLiberoGoingOut && liberoExchange?.liberoNumber === substitutionMode?.playerOut
      ? liberoExchange.replacedPlayerNumber
      : null;

    return (
      <div className={`mt-1 sm:mt-3 p-1.5 sm:p-3 rounded-lg border-2 transition-all ${
        isSubstitutionActive
          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-600'
          : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600'
      }`}>
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <h4 className="text-[9px] sm:text-xs font-bold text-gray-700 dark:text-gray-300">
            Banc {isSubstitutionActive && '- Sélectionner'}
          </h4>
          {isSubstitutionActive && (
            <button
              onClick={onCancelSubstitution}
              className="text-[9px] sm:text-xs bg-red-500 text-white px-1.5 sm:px-2 py-0.5 rounded hover:bg-red-600 transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-2">
          {benchPlayers.length === 0 ? (
            <div className="text-xs text-gray-500 dark:text-gray-400 italic">
              Tous les joueurs sont sur le terrain
            </div>
          ) : (
            benchPlayers.map(player => {
              const bgColor = player.isLibero ? teamData.colorSecondary : teamData.colorPrimary;
              const textColor = player.isLibero ? teamData.colorPrimary : teamData.colorSecondary;

              // Vérifier si c'est le joueur qui doit automatiquement remplacer le libéro
              const isAutoReplacement = autoReplacementPlayer === player.number;

              // Le libéro peut entrer SI le joueur sortant est en ligne arrière
              // OU un joueur normal peut toujours entrer en remplacement (sauf si c'est un libéro qui sort, sauf si c'est le remplacement automatique)
              const canSubstitute = isSubstitutionActive && (
                (player.isLibero && isBackRowSubstitution) || // Libéro peut entrer pour joueur arrière
                (!player.isLibero && !isLiberoGoingOut) ||     // Joueur normal peut entrer (sauf pour libéro)
                isAutoReplacement                               // Le joueur qui doit remplacer le libéro
              );

              const tooltipText = isAutoReplacement
                ? `Remettre #${player.number} pour remplacer le libéro #${substitutionMode?.playerOut}`
                : player.isLibero
                  ? isSubstitutionActive
                    ? isBackRowSubstitution
                      ? `Échanger libéro avec joueur arrière #${substitutionMode?.playerOut}`
                      : 'Le libéro ne peut échanger qu\'avec un joueur arrière (P1, P5, P6)'
                    : 'Libéro'
                  : isSubstitutionActive
                    ? isLiberoGoingOut
                      ? 'Seul le joueur échangé peut remplacer le libéro'
                      : `Faire entrer #${player.number}`
                    : `#${player.number}`;

              return (
                <div
                  key={player.number}
                  className="flex flex-col items-center"
                  title={tooltipText}
                >
                  <div
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow transition-all ${
                      isAutoReplacement
                        ? 'cursor-pointer hover:scale-125 ring-2 ring-purple-500 animate-pulse'
                        : canSubstitute
                          ? player.isLibero
                            ? 'cursor-pointer hover:scale-125 hover:ring-2 hover:ring-blue-500'
                            : 'cursor-pointer hover:scale-125 hover:ring-2 hover:ring-green-500'
                          : 'opacity-50 cursor-not-allowed'
                    }`}
                    style={{ backgroundColor: bgColor }}
                    onClick={() => {
                      if (canSubstitute && substitutionMode) {
                        onSubstitute(team, substitutionMode.playerOut, player.number);
                      }
                    }}
                  >
                    <span className="text-xs sm:text-sm font-bold" style={{ color: textColor }}>
                      {player.number}
                    </span>
                  </div>
                  {player.isLibero && (
                    <div className="text-[8px] text-blue-600 dark:text-blue-400 mt-0.5 text-center font-bold">
                      LIB
                    </div>
                  )}
                  {player.isCaptain && (
                    <div className="text-[8px] text-yellow-600 dark:text-yellow-400 mt-0.5 text-center font-bold">
                      CAP
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-full">
      <div className="flex flex-row gap-1 sm:gap-4">
        {/* Équipe A (gauche) */}
        <div className="flex-1">
          <div className="mb-1 sm:mb-3 flex items-center justify-between px-0.5 sm:px-1">
            <div className="flex items-center gap-1 sm:gap-2">
              <div
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shadow"
                style={{ backgroundColor: teamA.colorPrimary }}
              ></div>
              <span className="font-semibold text-[10px] sm:text-sm truncate max-w-[60px] sm:max-w-none">{teamA.name}</span>
            </div>
            <div className="flex gap-0.5 sm:gap-1">
              <button
                onClick={() => onRotateA('counter')}
                className="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors text-xs sm:text-sm font-bold"
                title="Rotation anti-horaire"
              >
                ↺
              </button>
              <button
                onClick={() => onRotateA('clockwise')}
                className="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors text-xs sm:text-sm font-bold"
                title="Rotation horaire"
              >
                ↻
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 sm:gap-2">
            {/* Colonne arrière gauche */}
            <div className="space-y-1 sm:space-y-2">
              <div className="text-[7px] sm:text-[10px] text-center font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 py-0.5 sm:py-1 rounded">
                ARRIÈRE
              </div>
              {renderPlayer('A', 'P5')}
              {renderPlayer('A', 'P6')}
              {renderPlayer('A', 'P1')}
            </div>

            {/* Colonne avant gauche (près du filet) */}
            <div className="space-y-1 sm:space-y-2">
              <div className="text-[7px] sm:text-[10px] text-center font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 py-0.5 sm:py-1 rounded">
                AVANT
              </div>
              {renderPlayer('A', 'P4')}
              {renderPlayer('A', 'P3')}
              {renderPlayer('A', 'P2')}
            </div>
          </div>

          {/* Banc équipe A */}
          {renderBench('A')}
        </div>

        {/* Filet vertical - réduit sur mobile */}
        <div className="w-0.5 sm:w-3 bg-gradient-to-b from-gray-300 via-gray-400 to-gray-300 dark:from-gray-600 dark:via-gray-500 dark:to-gray-600 flex-shrink-0 shadow-lg relative">
          <div className="hidden sm:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap -rotate-90 shadow border border-gray-300 dark:border-gray-600">
            FILET
          </div>
        </div>

        {/* Équipe B (droite) */}
        <div className="flex-1">
          <div className="mb-1 sm:mb-3 flex items-center justify-between px-0.5 sm:px-1">
            <div className="flex items-center gap-1 sm:gap-2">
              <div
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shadow"
                style={{ backgroundColor: teamB.colorPrimary }}
              ></div>
              <span className="font-semibold text-[10px] sm:text-sm truncate max-w-[60px] sm:max-w-none">{teamB.name}</span>
            </div>
            <div className="flex gap-0.5 sm:gap-1">
              <button
                onClick={() => onRotateB('counter')}
                className="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors text-xs sm:text-sm font-bold"
                title="Rotation anti-horaire"
              >
                ↺
              </button>
              <button
                onClick={() => onRotateB('clockwise')}
                className="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors text-xs sm:text-sm font-bold"
                title="Rotation horaire"
              >
                ↻
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 sm:gap-2">
            {/* Colonne avant droite (près du filet) */}
            <div className="space-y-1 sm:space-y-2">
              <div className="text-[7px] sm:text-[10px] text-center font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 py-0.5 sm:py-1 rounded">
                AVANT
              </div>
              {renderPlayer('B', 'P2')}
              {renderPlayer('B', 'P3')}
              {renderPlayer('B', 'P4')}
            </div>

            {/* Colonne arrière droite */}
            <div className="space-y-1 sm:space-y-2">
              <div className="text-[7px] sm:text-[10px] text-center font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 py-0.5 sm:py-1 rounded">
                ARRIÈRE
              </div>
              {renderPlayer('B', 'P1')}
              {renderPlayer('B', 'P6')}
              {renderPlayer('B', 'P5')}
            </div>
          </div>

          {/* Banc équipe B */}
          {renderBench('B')}
        </div>
      </div>
    </div>
  );
};

export default CourtDisplay;
