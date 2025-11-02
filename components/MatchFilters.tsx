import React, { useState, useMemo } from 'react';
import type { Team } from '../types';

interface MatchFiltersProps {
  startDate: string;
  endDate: string;
  selectedTeamIds: string[];
  teams: Team[];
  searchTerm: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onTeamIdsChange: (teamIds: string[]) => void;
  onSearchChange: (search: string) => void;
  onReset: () => void;
}

const MatchFilters: React.FC<MatchFiltersProps> = ({
  startDate,
  endDate,
  selectedTeamIds,
  teams,
  searchTerm,
  onStartDateChange,
  onEndDateChange,
  onTeamIdsChange,
  onSearchChange,
  onReset,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Dates temporaires pour la saisie manuelle
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  // Trier les équipes par ordre alphabétique
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => a.IDEQUIPE.localeCompare(b.IDEQUIPE));
  }, [teams]);

  // Appliquer les dates personnalisées (permet les dates vides)
  const applyCustomDates = () => {
    onStartDateChange(tempStartDate || '');
    onEndDateChange(tempEndDate || '');
  };

  // Gérer la sélection/désélection d'équipes
  const handleTeamToggle = (teamId: string) => {
    if (selectedTeamIds.includes(teamId)) {
      onTeamIdsChange(selectedTeamIds.filter(id => id !== teamId));
    } else {
      onTeamIdsChange([...selectedTeamIds, teamId]);
    }
  };

  // Fonctions pour les raccourcis de dates
  const setPreviousWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Dimanche, 1=Lundi, ..., 6=Samedi
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convertir en jours depuis lundi
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysFromMonday - 7); // Lundi de la semaine précédente
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6); // Dimanche de la semaine précédente

    onStartDateChange(lastMonday.toISOString().split('T')[0]);
    onEndDateChange(lastSunday.toISOString().split('T')[0]);
  };

  const setThisWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Dimanche, 1=Lundi, ..., 6=Samedi

    // Calculer le lundi de cette semaine
    // Si dimanche (0), c'est le dernier jour → lundi est 6 jours avant
    // Si lundi (1), c'est le premier jour → lundi est 0 jour avant
    // Si mardi (2), lundi est 1 jour avant, etc.
    let daysFromMonday;
    if (dayOfWeek === 0) {
      // Dimanche : lundi est 6 jours avant
      daysFromMonday = 6;
    } else {
      // Autres jours : lundi est (dayOfWeek - 1) jours avant
      daysFromMonday = dayOfWeek - 1;
    }

    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);

    const sunday = new Date(today);
    if (dayOfWeek === 0) {
      // Si on est dimanche, c'est le dernier jour de la semaine
      sunday.setDate(today.getDate());
    } else {
      // Sinon, dimanche est dans (7 - dayOfWeek) jours
      sunday.setDate(today.getDate() + (7 - dayOfWeek));
    }

    onStartDateChange(monday.toISOString().split('T')[0]);
    onEndDateChange(sunday.toISOString().split('T')[0]);
  };

  const setNextWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Dimanche, 1=Lundi, ..., 6=Samedi

    // Calculer le lundi de la semaine prochaine
    // Si on est dimanche (0), le lundi prochain est dans 1 jour
    // Si on est lundi (1), le lundi prochain est dans 7 jours
    // Si on est mardi (2), le lundi prochain est dans 6 jours
    // etc.
    let daysUntilNextMonday;
    if (dayOfWeek === 0) {
      // Si on est dimanche, lundi prochain est demain
      daysUntilNextMonday = 1;
    } else {
      // Sinon, lundi prochain est dans (8 - dayOfWeek) jours
      daysUntilNextMonday = 8 - dayOfWeek;
    }

    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilNextMonday);

    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6); // Lundi + 6 = Dimanche

    onStartDateChange(nextMonday.toISOString().split('T')[0]);
    onEndDateChange(nextSunday.toISOString().split('T')[0]);
  };

  const setThisMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    onStartDateChange(firstDay.toISOString().split('T')[0]);
    onEndDateChange(lastDay.toISOString().split('T')[0]);
  };

  const setNextMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    onStartDateChange(firstDay.toISOString().split('T')[0]);
    onEndDateChange(lastDay.toISOString().split('T')[0]);
  };

  const setNext3Months = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 3, 0);

    onStartDateChange(firstDay.toISOString().split('T')[0]);
    onEndDateChange(lastDay.toISOString().split('T')[0]);
  };

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md mb-4">
      {/* En-tête avec bouton collapse */}
      <div className="flex items-center justify-between p-2 sm:p-3 border-b border-light-border dark:border-dark-border">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium hover:text-light-primary dark:hover:text-dark-primary transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Filtres {selectedTeamIds.length > 0 && `(${selectedTeamIds.length} équipe${selectedTeamIds.length > 1 ? 's' : ''})`}
        </button>
        <button
          onClick={onReset}
          className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Réinitialiser
        </button>
      </div>

      {/* Contenu collapsible */}
      {isExpanded && (
        <div className="p-3 sm:p-4">
          {/* Raccourcis de périodes - mise en avant */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-2">Périodes rapides</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={setPreviousWeek}
                className="px-3 py-2 text-xs font-medium bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary rounded hover:bg-light-primary/20 dark:hover:bg-dark-primary/20 transition-colors border border-light-primary/20 dark:border-dark-primary/20"
              >
                Sem. précédente
              </button>
              <button
                onClick={setThisWeek}
                className="px-3 py-2 text-xs font-medium bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary rounded hover:bg-light-primary/20 dark:hover:bg-dark-primary/20 transition-colors border border-light-primary/20 dark:border-dark-primary/20"
              >
                Cette semaine
              </button>
              <button
                onClick={setNextWeek}
                className="px-3 py-2 text-xs font-medium bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary rounded hover:bg-light-primary/20 dark:hover:bg-dark-primary/20 transition-colors border border-light-primary/20 dark:border-dark-primary/20"
              >
                Sem. prochaine
              </button>
              <button
                onClick={setThisMonth}
                className="px-3 py-2 text-xs font-medium bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary rounded hover:bg-light-primary/20 dark:hover:bg-dark-primary/20 transition-colors border border-light-primary/20 dark:border-dark-primary/20"
              >
                Ce mois
              </button>
              <button
                onClick={setNextMonth}
                className="px-3 py-2 text-xs font-medium bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary rounded hover:bg-light-primary/20 dark:hover:bg-dark-primary/20 transition-colors border border-light-primary/20 dark:border-dark-primary/20"
              >
                Mois prochain
              </button>
              <button
                onClick={setNext3Months}
                className="px-3 py-2 text-xs font-medium bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary rounded hover:bg-light-primary/20 dark:hover:bg-dark-primary/20 transition-colors border border-light-primary/20 dark:border-dark-primary/20"
              >
                3 mois
              </button>
            </div>
          </div>

        {/* Filtres détaillés */}
        <div className="space-y-3">
          {/* Dates manuelles (optionnel) */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary list-none flex items-center gap-1">
              <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Dates personnalisées
            </summary>
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {/* Filtre Date de début */}
                <div>
                  <label htmlFor="start-date" className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                    Du (optionnel)
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="start-date"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-light-border dark:border-dark-border rounded bg-light-background dark:bg-dark-background text-light-onSurface dark:text-dark-onSurface focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary"
                    />
                    {tempStartDate && (
                      <button
                        onClick={() => setTempStartDate('')}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        title="Vider la date de début"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtre Date de fin */}
                <div>
                  <label htmlFor="end-date" className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                    Au (optionnel)
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="end-date"
                      value={tempEndDate}
                      onChange={(e) => setTempEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-light-border dark:border-dark-border rounded bg-light-background dark:bg-dark-background text-light-onSurface dark:text-dark-onSurface focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary"
                    />
                    {tempEndDate && (
                      <button
                        onClick={() => setTempEndDate('')}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        title="Vider la date de fin"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bouton de validation */}
              <button
                onClick={applyCustomDates}
                className="w-full px-3 py-2 text-xs font-medium bg-light-primary dark:bg-dark-primary text-white rounded hover:bg-light-primary/90 dark:hover:bg-dark-primary/90 transition-colors"
              >
                Appliquer les dates
              </button>
            </div>
          </details>

          {/* Recherche équipe */}
          <div>
            <label htmlFor="team-search" className="block text-xs font-medium mb-1.5">
              Recherche par nom
            </label>
            <input
              type="text"
              id="team-search"
              placeholder="Filtrer par SM, SF, équipe..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-light-border dark:border-dark-border rounded bg-light-background dark:bg-dark-background text-light-onSurface dark:text-dark-onSurface focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary"
            />
          </div>

          {/* Filtre Équipes (boutons cliquables) */}
          <div>
            <label className="block text-xs font-medium mb-1.5">
              Équipes ({selectedTeamIds.length}/{sortedTeams.length})
            </label>
            <div className="flex flex-wrap gap-1.5">
              {sortedTeams.map((team) => (
                <button
                  key={team.IDEQUIPE}
                  onClick={() => handleTeamToggle(team.IDEQUIPE)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedTeamIds.includes(team.IDEQUIPE)
                      ? 'bg-light-primary dark:bg-dark-primary text-white font-medium'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {team.IDEQUIPE}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default MatchFilters;
