import React, { useMemo } from 'react';
import type { TeamWithChampionships, Match } from '../../types';

interface MatchSelectionProps {
  teams: TeamWithChampionships[];
  selectedTeamId: string;
  selectedDate: string;
  availableMatches: Match[];
  onTeamChange: (teamId: string) => void;
  onDateChange: (date: string) => void;
  onMatchSelect: (match: Match) => void;
}

const MatchSelection: React.FC<MatchSelectionProps> = ({
  teams,
  selectedTeamId,
  selectedDate,
  availableMatches,
  onTeamChange,
  onDateChange,
  onMatchSelect,
}) => {
  // Trier les équipes par ordre alphabétique
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => a.IDEQUIPE.localeCompare(b.IDEQUIPE));
  }, [teams]);

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-light-onSurface dark:text-dark-onSurface">
        Sélection du match
      </h2>

      <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 shadow-md space-y-6">
        {/* Sélection de l'équipe */}
        <div>
          <label htmlFor="team-select" className="block text-sm font-medium mb-2">
            Équipe <span className="text-red-500">*</span>
          </label>
          <select
            id="team-select"
            value={selectedTeamId}
            onChange={(e) => onTeamChange(e.target.value)}
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
          >
            <option value="">-- Sélectionner une équipe --</option>
            {sortedTeams.map((team) => (
              <option key={team.IDEQUIPE} value={team.IDEQUIPE}>
                {team.IDEQUIPE} - {team.NOM_EQUIPE || team.IDEQUIPE}
              </option>
            ))}
          </select>
        </div>

        {/* Sélection de la date */}
        <div>
          <label htmlFor="date-select" className="block text-sm font-medium mb-2">
            Date de début
          </label>
          <input
            id="date-select"
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
          />
        </div>

        {/* Liste des matchs disponibles */}
        {selectedTeamId && (
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Matchs disponibles (sans score)
            </h3>
            {availableMatches.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400">
                  Aucun match sans score trouvé pour cette équipe et cette période.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableMatches.map((match) => {
                  const isHome = match.EQA_no === '0775819';
                  const opponentName = isHome ? match.EQB_nom : match.EQA_nom;
                  const location = isHome ? 'Domicile' : 'Extérieur';

                  return (
                    <button
                      key={match.id}
                      onClick={() => onMatchSelect(match)}
                      className="w-full text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-light-primary dark:hover:border-dark-primary bg-white dark:bg-gray-800 transition-all hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-lg mb-1">
                            {match.EQA_nom} vs {match.EQB_nom}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="inline-flex items-center gap-2">
                              <span>{match.Date ? new Date(match.Date).toLocaleDateString('fr-FR') : 'Date inconnue'}</span>
                              {match.Heure && <span>• {match.Heure}</span>}
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  isHome
                                    ? 'bg-veec-green/20 text-veec-green'
                                    : 'bg-veec-blue/20 text-veec-blue'
                                }`}
                              >
                                {location}
                              </span>
                            </span>
                          </div>
                          {match.Salle && (
                            <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                              📍 {match.Salle}
                            </div>
                          )}
                          {match.championnat_obj?.nom_championnat && (
                            <div className="text-sm text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                              🏆 {match.championnat_obj.nom_championnat}
                              {match.championnat_obj.url_championnat && (
                                <a
                                  href={match.championnat_obj.url_championnat}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-light-primary dark:text-dark-primary hover:underline ml-1"
                                >
                                  ↗
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <svg
                            className="w-6 h-6 text-light-primary dark:text-dark-primary"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!selectedTeamId && (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">
              Sélectionnez une équipe pour voir les matchs disponibles
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchSelection;
