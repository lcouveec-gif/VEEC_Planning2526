
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import FilterControls from './components/FilterControls';
import ScheduleGrid from './components/ScheduleGrid';
import { scheduleData } from './data/scheduleData';
import type { TrainingSession } from './types';
import { GYMS, DAYS } from './constants';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [gymFilter, setGymFilter] = useState<string>('all');
  const [teamSearch, setTeamSearch] = useState<string>('');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const filteredSchedule = useMemo((): TrainingSession[] => {
    return scheduleData.filter(session => {
      const dayMatch = dayFilter === 'all' || session.day.toLowerCase() === dayFilter.toLowerCase();
      const gymMatch = gymFilter === 'all' || session.gym.toLowerCase() === gymFilter.toLowerCase();
      const teamMatch = teamSearch === '' || session.team.toLowerCase().includes(teamSearch.toLowerCase()) || session.coach.toLowerCase().includes(teamSearch.toLowerCase());
      return dayMatch && gymMatch && teamMatch;
    });
  }, [dayFilter, gymFilter, teamSearch]);
  
  const daysWithEvents = useMemo(() => {
    if (dayFilter !== 'all') return [dayFilter];
    
    const uniqueDays = [...new Set(filteredSchedule.map(s => s.day))];
    return DAYS.filter(day => uniqueDays.includes(day));

  }, [filteredSchedule, dayFilter]);


  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background text-light-onSurface dark:text-dark-onSurface font-sans transition-colors duration-300">
      <Header theme={theme} toggleTheme={toggleTheme} />
      <main className="p-4 sm:p-6 lg:p-8">
        <FilterControls
          dayFilter={dayFilter}
          setDayFilter={setDayFilter}
          gymFilter={gymFilter}
          setGymFilter={setGymFilter}
          teamSearch={teamSearch}
          setTeamSearch={setTeamSearch}
          gyms={GYMS}
          days={DAYS}
        />
        <div className="mt-8">
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
      </main>
    </div>
  );
};

export default App;