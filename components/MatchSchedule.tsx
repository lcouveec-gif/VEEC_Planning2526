import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MatchFilters from './MatchFilters';
import MatchList from './MatchList';
import { useMatches } from '../hooks/useMatches';
import { useTeams } from '../hooks/useTeams';

const STORAGE_KEY_FILTERS = 'veec_match_filters';

const MatchSchedule: React.FC = () => {
  const { teamId: selectedTeamId } = useParams<{ teamId?: string }>();
  // Dates par défaut : date du jour et pas de date de fin (tous les matchs à venir)
  const today = new Date();
  const defaultStartDate = today.toISOString().split('T')[0];
  const defaultEndDate = ''; // Pas de date de fin par défaut

  // Charger les filtres depuis localStorage
  const loadFiltersFromStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FILTERS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erreur chargement filtres:', e);
    }
    return null;
  };

  const savedFilters = loadFiltersFromStorage();

  // Utiliser les valeurs sauvegardées si elles existent (même si vides), sinon les valeurs par défaut
  const [startDate, setStartDate] = useState<string>(
    savedFilters && 'startDate' in savedFilters ? savedFilters.startDate : defaultStartDate
  );
  const [endDate, setEndDate] = useState<string>(
    savedFilters && 'endDate' in savedFilters ? savedFilters.endDate : defaultEndDate
  );
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(
    savedFilters?.selectedTeamIds || []
  );
  const [searchTerm, setSearchTerm] = useState<string>(
    savedFilters?.searchTerm || ''
  );
  const [locationFilter, setLocationFilter] = useState<'all' | 'home' | 'away'>(
    savedFilters?.locationFilter || 'all'
  );

  // Dates utilisées pour la requête (avec debounce) - initialisées avec les mêmes valeurs
  const [debouncedStartDate, setDebouncedStartDate] = useState<string>(
    savedFilters && 'startDate' in savedFilters ? savedFilters.startDate : defaultStartDate
  );
  const [debouncedEndDate, setDebouncedEndDate] = useState<string>(
    savedFilters && 'endDate' in savedFilters ? savedFilters.endDate : defaultEndDate
  );

  // Sauvegarder les filtres dans localStorage à chaque changement
  useEffect(() => {
    const filters = {
      startDate,
      endDate,
      selectedTeamIds,
      searchTerm,
      locationFilter,
    };
    localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(filters));
  }, [startDate, endDate, selectedTeamIds, searchTerm, locationFilter]);

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

  // Pré-sélectionner l'équipe si selectedTeamId est fourni
  useEffect(() => {
    if (selectedTeamId && !selectedTeamIds.includes(selectedTeamId)) {
      setSelectedTeamIds([selectedTeamId]);
    }
  }, [selectedTeamId]);

  // Charger les matchs avec les filtres (utilise les dates debounced)
  // Passer undefined si les dates sont vides pour permettre des plages ouvertes
  const { matches, loading: loadingMatches, error: errorMatches } = useMatches(
    debouncedStartDate || undefined,
    debouncedEndDate || undefined,
    selectedTeamIds.length > 0 ? selectedTeamIds : undefined
  );

  const handleReset = () => {
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setSelectedTeamIds([]);
    setSearchTerm('');
    setLocationFilter('all');
    localStorage.removeItem(STORAGE_KEY_FILTERS);
  };

  // Fonction de normalisation des chaînes (utilisée pour la comparaison)
  const normalizeString = (str: string | undefined): string => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\u2018\u2019\u201A\u201B']/g, "'")
      .toUpperCase();
  };

  // Filtrer les matchs pour n'afficher que ceux où les équipes sélectionnées jouent réellement
  const filteredByTeam = React.useMemo(() => {
    // Étape 1 : Filtrer les matchs où NOM_FFVB correspond à EQA_nom ou EQB_nom
    // Cela élimine les matchs erronés dans la base de données
    const validMatches = matches.filter(match => {
      if (!match.NOM_FFVB) return false;

      const normalizedNomFFVB = normalizeString(match.NOM_FFVB);
      const normalizedEQA = normalizeString(match.EQA_nom);
      const normalizedEQB = normalizeString(match.EQB_nom);

      // Le match est valide si NOM_FFVB correspond à l'une des deux équipes qui jouent
      return normalizedNomFFVB === normalizedEQA || normalizedNomFFVB === normalizedEQB;
    });

    // Étape 2 : Si aucune équipe n'est sélectionnée, retourner tous les matchs valides
    if (selectedTeamIds.length === 0) return validMatches;

    // Étape 3 : Filtrer par équipes sélectionnées
    const selectedTeamNames = teams
      .filter(team => selectedTeamIds.includes(team.IDEQUIPE))
      .map(team => normalizeString(team.NOM_FFVB));

    const filtered = validMatches.filter(match => {
      const matchTeamName = normalizeString(match.NOM_FFVB);
      return selectedTeamNames.includes(matchTeamName);
    });

    return filtered;
  }, [matches, selectedTeamIds, teams]);

  // Filtrer les matchs selon le terme de recherche
  const filteredBySearch = React.useMemo(() => {
    if (!searchTerm.trim()) return filteredByTeam;
    const search = searchTerm.toUpperCase();
    return filteredByTeam.filter(match =>
      match.equipe?.IDEQUIPE?.toUpperCase().includes(search) ||
      match.EQA_nom?.toUpperCase().includes(search) ||
      match.EQB_nom?.toUpperCase().includes(search)
    );
  }, [filteredByTeam, searchTerm]);

  // Filtrer les matchs selon la localisation (Domicile/Extérieur)
  const filteredMatches = React.useMemo(() => {
    if (locationFilter === 'all') return filteredBySearch;

    return filteredBySearch.filter(match => {
      const isHome = match.EQA_no === '0775819'; // Notre club reçoit si EQA_no = 0775819

      if (locationFilter === 'home') {
        return isHome;
      } else {
        return !isHome;
      }
    });
  }, [filteredBySearch, locationFilter]);

  // Calculer les statistiques pour les équipes sélectionnées
  const teamStats = React.useMemo(() => {
    if (selectedTeamIds.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let victories = 0;
    let defeats = 0;
    let upcoming = 0;
    let totalCounted = 0; // Nombre de matchs réellement comptés

    filteredMatches.forEach(match => {
      // Ignorer les matchs avec équipe exempte
      if (!match.EQA_no || !match.EQB_no || match.EQA_no.trim() === '' || match.EQB_no.trim() === '') {
        return;
      }

      const matchDate = match.Date ? new Date(match.Date) : null;
      if (!matchDate) return;

      // Déterminer si le match est à venir ou passé
      if (matchDate >= today) {
        // Match à venir (pas encore joué)
        if (!match.Set || match.Set.trim() === '') {
          upcoming++;
          totalCounted++;
        } else {
          // Match joué (a un score)
          const scoreMatch = match.Set.match(/(\d+)\/(\d+)/);
          if (scoreMatch) {
            const scoreA = parseInt(scoreMatch[1], 10);
            const scoreB = parseInt(scoreMatch[2], 10);

            const nomFFVB = normalizeString(match.NOM_FFVB);
            const eqaName = normalizeString(match.EQA_nom);
            const isTeamA = eqaName === nomFFVB;

            const won = isTeamA ? scoreA > scoreB : scoreB > scoreA;
            if (won) victories++;
            else defeats++;
            totalCounted++;
          }
        }
      } else {
        // Match passé
        const scoreMatch = match.Set?.match(/(\d+)\/(\d+)/);
        if (scoreMatch) {
          const scoreA = parseInt(scoreMatch[1], 10);
          const scoreB = parseInt(scoreMatch[2], 10);

          const nomFFVB = normalizeString(match.NOM_FFVB);
          const eqaName = normalizeString(match.EQA_nom);
          const isTeamA = eqaName === nomFFVB;

          const won = isTeamA ? scoreA > scoreB : scoreB > scoreA;
          if (won) victories++;
          else defeats++;
          totalCounted++;
        }
      }
    });

    return { victories, defeats, upcoming, totalCounted };
  }, [filteredMatches]);

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
            locationFilter={locationFilter}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onTeamIdsChange={setSelectedTeamIds}
            onSearchChange={setSearchTerm}
            onLocationFilterChange={setLocationFilter}
            onReset={handleReset}
          />

          {/* Info sur le nombre de matchs et statistiques */}
          {!loadingMatches && (
            <div className="mb-3 px-2 space-y-2">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {teamStats ? teamStats.totalCounted : filteredMatches.length} match{(teamStats ? teamStats.totalCounted : filteredMatches.length) > 1 ? 's' : ''}
                {selectedTeamIds.length > 0 && (
                  <span className="font-medium"> • {selectedTeamIds.join(', ')}</span>
                )}
                {searchTerm && (
                  <span className="font-medium"> • "{searchTerm}"</span>
                )}
              </div>

              {/* Statistiques des équipes sélectionnées */}
              {teamStats && (
                <div className="flex gap-2 items-center">
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-veec-green/20 dark:bg-veec-green/30 text-veec-green dark:text-veec-green border border-veec-green/30">
                    V: {teamStats.victories}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-veec-red/20 dark:bg-veec-red/30 text-veec-red dark:text-veec-red border border-veec-red/30">
                    D: {teamStats.defeats}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600">
                    P: {teamStats.upcoming}
                  </span>
                </div>
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
