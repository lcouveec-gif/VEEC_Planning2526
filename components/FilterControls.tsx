
import React from 'react';

interface FilterControlsProps {
  dayFilter: string;
  setDayFilter: (day: string) => void;
  gymFilter: string;
  setGymFilter: (gym: string) => void;
  teamSearch: string;
  setTeamSearch: (search: string) => void;
  days: string[];
  gyms: string[];
}

const FilterControls: React.FC<FilterControlsProps> = ({
  dayFilter,
  setDayFilter,
  gymFilter,
  setGymFilter,
  teamSearch,
  setTeamSearch,
  days,
  gyms
}) => {
  const commonSelectClasses = "w-full bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary transition-all duration-200";
  const commonInputClasses = "w-full bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary transition-all duration-200";

  return (
    <div className="p-4 bg-light-surface dark:bg-dark-surface rounded-xl shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="day-filter" className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Jour</label>
          <select
            id="day-filter"
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            className={commonSelectClasses}
          >
            <option value="all">Tous les jours</option>
            {days.map(day => <option key={day} value={day} className="capitalize">{day.charAt(0).toUpperCase() + day.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="gym-filter" className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Gymnase</label>
          <select
            id="gym-filter"
            value={gymFilter}
            onChange={(e) => setGymFilter(e.target.value)}
            className={commonSelectClasses}
          >
            <option value="all">Tous les gymnases</option>
            {gyms.map(gym => <option key={gym} value={gym.toLowerCase()}>{gym}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="team-search" className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Équipe / Entraîneur</label>
          <input
            id="team-search"
            type="text"
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            placeholder="Rechercher..."
            className={commonInputClasses}
          />
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
