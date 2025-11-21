
import React from 'react';

interface FilterControlsProps {
  dayFilter: string[];
  setDayFilter: (days: string[]) => void;
  gymFilter: string[];
  setGymFilter: (gyms: string[]) => void;
  teamSearch: string;
  setTeamSearch: (search: string) => void;
  selectedTeam: string;
  setSelectedTeam: (team: string) => void;
  allTeams: string[];
  days: string[];
  gyms: string[];
  resetFilters: () => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  dayFilter,
  setDayFilter,
  gymFilter,
  setGymFilter,
  teamSearch,
  setTeamSearch,
  selectedTeam,
  setSelectedTeam,
  allTeams,
  days,
  gyms,
  resetFilters
}) => {
  const handleDayToggle = (day: string) => {
    const newSelection = dayFilter.includes(day)
      ? dayFilter.filter(d => d !== day)
      : [...dayFilter, day];
    setDayFilter(newSelection);
  };

  const handleGymToggle = (gym: string) => {
    const gymLower = gym.toLowerCase();
    const newSelection = gymFilter.includes(gymLower)
      ? gymFilter.filter(g => g !== gymLower)
      : [...gymFilter, gymLower];
    setGymFilter(newSelection);
  };

  const commonInputClasses = "w-full bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary transition-all duration-200";

  return (
    <div className="p-4 bg-light-surface dark:bg-dark-surface rounded-xl shadow-lg space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-300">Jours</label>
          <div className="flex flex-wrap gap-2">
            {days.map(day => {
              const isSelected = dayFilter.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayToggle(day)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-light-surface dark:focus:ring-offset-dark-surface focus:ring-light-primary dark:focus:ring-dark-primary ${
                    isSelected
                      ? 'bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary'
                      : 'bg-gray-200/50 dark:bg-dark-border hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-300">Gymnases</label>
          <div className="flex flex-wrap gap-2">
            {gyms.map(gym => {
              const isSelected = gymFilter.includes(gym.toLowerCase());
              return (
                <button
                  key={gym}
                  type="button"
                  onClick={() => handleGymToggle(gym)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-light-surface dark:focus:ring-offset-dark-surface focus:ring-light-primary dark:focus:ring-dark-primary ${
                    isSelected
                      ? 'bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary'
                      : 'bg-gray-200/50 dark:bg-dark-border hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {gym}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="pt-4 border-t border-light-border dark:border-dark-border grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="w-full">
            <label htmlFor="team-search" className="sr-only">Rechercher par équipe ou coach</label>
            <input
                id="team-search"
                type="text"
                placeholder="Rechercher par équipe ou coach..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className={commonInputClasses}
            />
        </div>
        <div className="w-full">
            <label htmlFor="select-team" className="sr-only">Filtrer par équipe</label>
            <select
                id="select-team"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className={commonInputClasses}
                aria-label="Filtrer par équipe"
            >
                <option value="">Toutes les équipes</option>
                {allTeams.map(team => (
                    <option key={team} value={team}>{team}</option>
                ))}
            </select>
        </div>
        <button
            onClick={resetFilters}
            className="w-full md:w-auto justify-self-stretch md:justify-self-end px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-light-primary dark:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-primary dark:focus:ring-dark-primary transition-colors"
        >
            Réinitialiser
        </button>
      </div>
    </div>
  );
};

export default FilterControls;
