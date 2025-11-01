import React, { useState, useMemo, useEffect } from 'react';
import MatchFilters from './MatchFilters';
import MatchList from './MatchList';
import { useMatches } from '../hooks/useMatches';
import { useTeams } from '../hooks/useTeams';

const MatchSchedule: React.FC = () => {
  // Dates par défaut : du début du mois en cours à la fin du mois suivant
  const today = new Date();
  const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const defaultEndDate = new Date(today.getFullYear(), today.getMonth() + 2, 0)
    .toISOString()
    .split('T')[0];

  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Dates utilisées pour la requête (avec debounce)
  const [debouncedStartDate, setDebouncedStartDate] = useState<string>(defaultStartDate);
  const [debouncedEndDate, setDebouncedEndDate] = useState<string>(defaultEndDate);

  // Debounce des dates pour éviter trop de requêtes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStartDate(startDate);
      setDebouncedEndDate(endDate);
    }, 500); // 500ms de délai

    return () => clearTimeout(timer);
  }, [startDate, endDate]);

  // Charger les équipes
  const { teams, loading: loadingTeams, error: errorTeams } = useTeams();

  // Charger les matchs avec les filtres (utilise les dates debounced)
  const { matches, loading: loadingMatches, error: errorMatches } = useMatches(
    debouncedStartDate,
    debouncedEndDate,
    selectedTeamIds.length > 0 ? selectedTeamIds : undefined
  );

  const handleReset = () => {
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setSelectedTeamIds([]);
    setSearchTerm('');
  };

  // Filtrer les matchs selon le terme de recherche
  const filteredMatches = React.useMemo(() => {
    if (!searchTerm.trim()) return matches;
    const search = searchTerm.toUpperCase();
    return matches.filter(match =>
      match.equipe?.IDEQUIPE?.toUpperCase().includes(search) ||
      match.EQA_nom?.toUpperCase().includes(search) ||
      match.EQB_nom?.toUpperCase().includes(search)
    );
  }, [matches, searchTerm]);

  const loading = loadingTeams || loadingMatches;
  const error = errorTeams || errorMatches;

  return (
    <main className="p-2 sm:p-4 lg:p-6">
      {/* Affichage des erreurs séparées pour mieux diagnostiquer */}
      {errorTeams && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400 font-semibold">Erreur de chargement des équipes :</p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errorTeams}</p>
        </div>
      )}

      {errorMatches && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400 font-semibold">Erreur de chargement des matchs :</p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errorMatches}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-light-primary dark:border-dark-primary"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Chargement des données...
          </p>
        </div>
      ) : (
        <>
          <MatchFilters
            startDate={startDate}
            endDate={endDate}
            selectedTeamIds={selectedTeamIds}
            teams={teams}
            searchTerm={searchTerm}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onTeamIdsChange={setSelectedTeamIds}
            onSearchChange={setSearchTerm}
            onReset={handleReset}
          />

          {/* Info sur le nombre de matchs */}
          {!loadingMatches && (
            <div className="mb-3 px-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {filteredMatches.length} match{filteredMatches.length > 1 ? 's' : ''}
              {selectedTeamIds.length > 0 && (
                <span className="font-medium"> • {selectedTeamIds.join(', ')}</span>
              )}
              {searchTerm && (
                <span className="font-medium"> • "{searchTerm}"</span>
              )}
            </div>
          )}

          <MatchList matches={filteredMatches} />
        </>
      )}
    </main>
  );
};

export default MatchSchedule;
