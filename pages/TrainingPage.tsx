import React, { useState, useMemo } from 'react';
import FilterControls from '../components/FilterControls';
import ScheduleGrid from '../components/ScheduleGrid';
import { useTrainingSessions } from '../hooks/useTrainingSessions';
import type { TrainingSession } from '../types';
import { GYMS, DAYS } from '../constants';

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
