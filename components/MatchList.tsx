import React from 'react';
import type { Match } from '../types';

interface MatchListProps {
  matches: Match[];
}

const MatchList: React.FC<MatchListProps> = ({ matches }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Formater l'heure en HH:MM
  const formatTime = (timeStr: string | undefined): string => {
    if (!timeStr) return '--:--';
    // Si l'heure contient déjà le format HH:MM, l'extraire
    const match = timeStr.match(/(\d{1,2}:\d{2})/);
    return match ? match[1] : timeStr;
  };

  // Extraire le score du champ "Set" (format: "3/0", "3/1", etc.)
  const parseSetScore = (setStr: string | undefined): { scoreA: number; scoreB: number } | null => {
    if (!setStr) return null;
    const match = setStr.match(/(\d+)\/(\d+)/);
    if (match) {
      return {
        scoreA: parseInt(match[1], 10),
        scoreB: parseInt(match[2], 10),
      };
    }
    return null;
  };

  // Déterminer le résultat pour l'équipe (victoire/défaite)
  const getMatchResult = (match: Match): 'victory' | 'defeat' | null => {
    const score = parseSetScore(match.Set);
    if (!score || !match.NOM_FFVB) return null;

    // Comparer avec NOM_FFVB pour identifier l'équipe du club
    const isTeamA = match.EQA_nom === match.NOM_FFVB;
    const isTeamB = match.EQB_nom === match.NOM_FFVB;

    if (!isTeamA && !isTeamB) return null;

    const teamWon = isTeamA ? score.scoreA > score.scoreB : score.scoreB > score.scoreA;
    return teamWon ? 'victory' : 'defeat';
  };

  // Déterminer quelle équipe a gagné un set spécifique
  const parseSetDetail = (setScore: string): { scoreA: number; scoreB: number } | null => {
    const match = setScore.match(/(\d+)-(\d+)/);
    if (match) {
      return {
        scoreA: parseInt(match[1], 10),
        scoreB: parseInt(match[2], 10),
      };
    }
    return null;
  };

  const groupMatchesByDate = (matches: Match[]) => {
    const grouped: { [key: string]: Match[] } = {};
    matches.forEach((match) => {
      const dateKey = match.Date || '';
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(match);
    });
    return grouped;
  };

  const groupedMatches = groupMatchesByDate(matches);
  const sortedDates = Object.keys(groupedMatches).sort();

  if (matches.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12 bg-light-surface dark:bg-dark-surface rounded-lg">
        <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400">
          Aucun match trouvé
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {sortedDates.map((date) => (
        <div key={date} className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden">
          <div className="bg-light-primary dark:bg-dark-primary text-white px-3 sm:px-4 py-2">
            <h2 className="text-sm sm:text-base font-bold capitalize">{formatDate(date)}</h2>
          </div>
          <div className="divide-y divide-light-border dark:divide-dark-border">
            {groupedMatches[date].map((match) => {
              const score = parseSetScore(match.Set);
              const result = getMatchResult(match);
              // Identifier si l'équipe du club est A ou B en comparant avec NOM_FFVB
              const isTeamA = match.EQA_nom === match.NOM_FFVB;
              const isTeamB = match.EQB_nom === match.NOM_FFVB;

              return (
              <div
                key={match.id}
                className="p-3 sm:p-4 hover:bg-light-background dark:hover:bg-dark-background transition-colors"
              >
                <div className="flex flex-col gap-2">
                  {/* Ligne 1: Heure et badges */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-base sm:text-lg font-semibold text-light-primary dark:text-dark-primary">
                      {formatTime(match.Heure)}
                    </span>
                    <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                      {result && (
                        <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                          result === 'victory'
                            ? 'bg-green-500 dark:bg-green-600 text-white'
                            : 'bg-red-500 dark:bg-red-600 text-white'
                        }`}>
                          {result === 'victory' ? 'Victoire' : 'Défaite'}
                        </span>
                      )}
                      {match.Championnat && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                          {match.Championnat}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ligne 2: Équipes et score global */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm sm:text-base font-semibold truncate">
                        {match.EQA_nom}
                      </div>
                      <div className="text-sm sm:text-base font-semibold truncate mt-0.5">
                        {match.EQB_nom}
                      </div>
                    </div>
                    {score && (
                      <div className="flex flex-col items-center justify-center rounded px-3 py-1.5">
                        {/* Score de l'équipe A - vert si elle a gagné ET que c'est le club, rouge sinon */}
                        <span className={`text-xl sm:text-2xl font-bold ${
                          isTeamA && result === 'victory'
                            ? 'text-green-600 dark:text-green-400'
                            : isTeamA && result === 'defeat'
                            ? 'text-red-600 dark:text-red-400'
                            : isTeamB && result === 'defeat'
                            ? 'text-green-600 dark:text-green-400'
                            : isTeamB && result === 'victory'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-light-primary dark:text-dark-primary'
                        }`}>
                          {score.scoreA}
                        </span>
                        {/* Score de l'équipe B - vert si elle a gagné ET que c'est le club, rouge sinon */}
                        <span className={`text-xl sm:text-2xl font-bold ${
                          isTeamB && result === 'victory'
                            ? 'text-green-600 dark:text-green-400'
                            : isTeamB && result === 'defeat'
                            ? 'text-red-600 dark:text-red-400'
                            : isTeamA && result === 'defeat'
                            ? 'text-green-600 dark:text-green-400'
                            : isTeamA && result === 'victory'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-light-primary dark:text-dark-primary'
                        }`}>
                          {score.scoreB}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ligne 3: Détail des sets */}
                  {match.Score && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Sets:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {match.Score.split(/[\s,]+/).filter(s => s.trim()).map((setScore, idx) => {
                          const setDetail = parseSetDetail(setScore);
                          let setWinner: 'A' | 'B' | null = null;
                          if (setDetail) {
                            setWinner = setDetail.scoreA > setDetail.scoreB ? 'A' : 'B';
                          }

                          // Déterminer la couleur du set basé sur NOM_FFVB
                          let colorClass = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
                          if (setWinner && match.NOM_FFVB && (isTeamA || isTeamB)) {
                            const teamWonSet = (setWinner === 'A' && isTeamA) || (setWinner === 'B' && isTeamB);
                            colorClass = teamWonSet
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-semibold';
                          }

                          return (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded text-xs font-mono ${colorClass}`}
                            >
                              {setScore}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ligne 4: Infos équipe et salle */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {match.equipe?.IDEQUIPE && (
                      <span className="font-medium text-light-primary dark:text-dark-primary">
                        {match.equipe.IDEQUIPE}
                      </span>
                    )}
                    {match.Salle && (
                      <span>📍 {match.Salle}</span>
                    )}
                  </div>

                  {/* Ligne 5: Arbitres */}
                  {(match.Arb1 || match.Arb2) && (
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      Arbitres: {[match.Arb1, match.Arb2].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MatchList;
