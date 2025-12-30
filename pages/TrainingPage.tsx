import React, { useState, useMemo } from 'react';
import FilterControls from '../components/FilterControls';
import ScheduleGrid from '../components/ScheduleGrid';
import { useTrainingSessions } from '../hooks/useTrainingSessions';
import type { TrainingSession } from '../types';
import { GYMS, DAYS, GYM_ADDRESSES } from '../constants';

const TrainingPage: React.FC = () => {
  const [dayFilter, setDayFilter] = useState<string[]>([]);
  const [gymFilter, setGymFilter] = useState<string[]>([]);
  const [teamSearch, setTeamSearch] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  const { sessions: scheduleData, loading, error } = useTrainingSessions();

  const allTeams = useMemo(() => {
    const teams = [...new Set(scheduleData.map(s => s.team))];
    return teams.sort((a, b) => a.localeCompare(b));
  }, [scheduleData]);

  const resetFilters = () => {
    setDayFilter([]);
    setGymFilter([]);
    setTeamSearch('');
    setSelectedTeam('');
  };

  const filteredSchedule = useMemo((): TrainingSession[] => {
    return scheduleData.filter(session => {
      const dayMatch = dayFilter.length === 0 || dayFilter.includes(session.day.toLowerCase());
      const gymMatch = gymFilter.length === 0 || gymFilter.includes(session.gym.toLowerCase());
      const teamMatch = teamSearch === '' || session.team.toLowerCase().includes(teamSearch.toLowerCase()) || session.coach.toLowerCase().includes(teamSearch.toLowerCase());
      const selectedTeamMatch = selectedTeam === '' || session.team === selectedTeam;
      return dayMatch && gymMatch && teamMatch && selectedTeamMatch;
    });
  }, [scheduleData, dayFilter, gymFilter, teamSearch, selectedTeam]);

  const daysWithEvents = useMemo(() => {
    const uniqueDays = [...new Set(filteredSchedule.map(s => s.day))];
    return DAYS.filter(day => uniqueDays.includes(day));
  }, [filteredSchedule]);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-light-primary dark:border-dark-primary"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Chargement des données...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-xl text-red-600 dark:text-red-400">Erreur : {error}</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Veuillez vérifier votre connexion internet et réessayer.
          </p>
        </div>
      ) : (
        <>
          <FilterControls
            dayFilter={dayFilter}
            setDayFilter={setDayFilter}
            gymFilter={gymFilter}
            setGymFilter={setGymFilter}
            teamSearch={teamSearch}
            setTeamSearch={setTeamSearch}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
            allTeams={allTeams}
            gyms={GYMS}
            days={DAYS}
            resetFilters={resetFilters}
          />

          {/* Afficher les liens de navigation si un seul gymnase est sélectionné */}
          {gymFilter.length === 1 && (
            (() => {
              const gymKey = gymFilter[0].toLowerCase();
              const gymInfo = GYM_ADDRESSES[gymKey];

              return gymInfo ? (
                <div className="mt-6 mb-8 p-6 bg-light-surface dark:bg-dark-surface rounded-lg shadow-md border border-light-border dark:border-dark-border">
                  <h3 className="text-xl font-bold mb-3 text-light-onSurface dark:text-dark-onSurface">
                    📍 {gymInfo.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {gymInfo.address}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={gymInfo.wazeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#33CCFF] hover:bg-[#00B8FF] text-white rounded-lg font-semibold transition-colors shadow-sm"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      Ouvrir dans Waze
                    </a>
                    <a
                      href={gymInfo.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#4285F4] hover:bg-[#357ABD] text-white rounded-lg font-semibold transition-colors shadow-sm"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      Ouvrir dans Google Maps
                    </a>
                  </div>
                </div>
              ) : null;
            })()
          )}

          <div id="schedule-to-export" className="mt-8">
            {daysWithEvents.length > 0 ? (
              daysWithEvents.map(day => (
                <div key={day} className="mb-12">
                  <h2 className="text-2xl font-bold capitalize mb-4 border-b-2 border-light-border dark:border-dark-border pb-2">
                    {day}
                  </h2>
                  <ScheduleGrid
                    schedule={filteredSchedule.filter(s => s.day === day)}
                    gymFilter={gymFilter}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-light-surface dark:bg-dark-surface rounded-lg">
                <p className="text-xl text-gray-500 dark:text-gray-400">Aucun créneau ne correspond à votre recherche.</p>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
};

export default TrainingPage;
