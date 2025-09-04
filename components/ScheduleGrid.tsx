import React, { useState, useEffect, useMemo } from 'react';
import type { TrainingSession } from '../types';
import { GYMS, COURTS } from '../constants';
import { getTeamColorStyles } from '../utils/color';

interface ScheduleGridProps {
  schedule: TrainingSession[];
  gymFilter: string[];
}

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * Custom hook to check if a media query matches.
 * @param query The media query string (e.g., '(max-width: 768px)').
 */
const useMediaQuery = (query: string): boolean => {
  // Ensure window is defined for server-side rendering safety, though not strictly needed for this client-side app.
  if (typeof window === 'undefined') {
    return false;
  }

  const [matches, setMatches] = useState(window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Add the listener
    mediaQueryList.addEventListener('change', listener);

    // Initial check in case state changed between initial render and effect run
    setMatches(mediaQueryList.matches);

    // Cleanup by removing the listener
    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query]);

  return matches;
};


const ScheduleGrid: React.FC<ScheduleGridProps> = ({ schedule, gymFilter }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  const { timeSlots, minTime, maxTime, timeStep, locations, groupedSchedule } = useMemo(() => {
    if (isMobile || schedule.length === 0) {
      return { timeSlots: [], minTime: 0, maxTime: 0, timeStep: 30, locations: [], groupedSchedule: [] };
    }

    const gymsWithEventsOnDay = GYMS.filter(gym => schedule.some(s => s.gym === gym));
    const gymsToShow = gymFilter.length > 0
      ? gymsWithEventsOnDay.filter(gym => gymFilter.includes(gym.toLowerCase()))
      : gymsWithEventsOnDay;
    const currentLocations = gymsToShow.flatMap(gym => COURTS.map(court => ({ gym, court, id: `${gym}-${court}` })));

    if (currentLocations.length === 0) {
       return { timeSlots: [], minTime: 0, maxTime: 0, timeStep: 30, locations: [], groupedSchedule: [] };
    }

    const allTimes = schedule.flatMap(s => [timeToMinutes(s.startTime), timeToMinutes(s.endTime)]);
    const minTimeVal = Math.min(...allTimes);
    const maxTimeVal = Math.max(...allTimes);
    const step = 30;
    
    const slots = [];
    const alignedMinTime = Math.floor(minTimeVal / step) * step;
    for (let t = alignedMinTime; t < maxTimeVal; t += step) {
      slots.push(t);
    }

    const groups = new Map<string, TrainingSession[]>();
    schedule.forEach(session => {
        const key = `${session.startTime}|${session.endTime}|${session.gym}|${session.courts.join(',')}`;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(session);
    });

    return { 
        timeSlots: slots, 
        minTime: alignedMinTime, 
        maxTime: maxTimeVal, 
        timeStep: step, 
        locations: currentLocations, 
        groupedSchedule: Array.from(groups.values())
    };
  }, [schedule, gymFilter, isMobile]);
  
  // Mobile View: Vertical list of cards grouped by gym
  if (isMobile) {
    const sessionsByGym = schedule.reduce<Record<string, TrainingSession[]>>((acc, session) => {
        if (!acc[session.gym]) acc[session.gym] = [];
        acc[session.gym].push(session);
        return acc;
    }, {});
    
    const gymsWithEvents = Object.keys(sessionsByGym);

    const gymsToShow = gymFilter.length > 0 
        ? gymsWithEvents.filter(gym => gymFilter.includes(gym.toLowerCase()))
        : gymsWithEvents;

    if (gymsToShow.length === 0) {
        return null;
    }

    return (
        <div className="space-y-8">
            {gymsToShow
                .sort((gymA, gymB) => GYMS.indexOf(gymA) - GYMS.indexOf(gymB))
                .map(gym => (
                    <div key={gym}>
                        <h3 className="text-xl font-semibold mb-3 text-light-onSurface dark:text-dark-onSurface sticky top-[80px] bg-light-background/80 dark:bg-dark-background/80 backdrop-blur-sm py-2 z-10">{gym}</h3>
                        <div className="space-y-3">
                            {sessionsByGym[gym]
                                .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
                                .map(session => {
                                    const teamColorStyles = getTeamColorStyles(session.team);
                                    return (
                                        <div
                                            key={session.id}
                                            className="p-3 rounded-lg shadow-md flex"
                                            style={{ backgroundColor: teamColorStyles.backgroundColor, color: teamColorStyles.color }}
                                        >
                                            <div className="w-1/4 pr-3 border-r border-current border-opacity-30 flex flex-col justify-center items-center text-center">
                                                <p className="font-bold text-base sm:text-lg">{session.startTime}</p>
                                                <p className="text-xs sm:text-sm opacity-80">{session.endTime}</p>
                                            </div>
                                            <div className="w-3/4 pl-4 flex flex-col justify-center">
                                                <p className="font-bold text-base sm:text-lg leading-tight">{session.team}</p>
                                                <p className="text-sm opacity-90">{session.coach}</p>
                                                <p className="text-xs opacity-80 mt-1">Terrain(s): {session.courts.join(', ')}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                ))}
        </div>
    );
  }

  // Desktop Grid View
  if (schedule.length === 0 || locations.length === 0) {
    return null;
  }

  return (
    <div className="w-full overflow-x-auto bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg p-4">
      <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${locations.length}, minmax(180px, 1fr))`, gridTemplateRows: `60px repeat(${timeSlots.length}, 40px)` }}>
        {/* Top-left empty cell */}
        <div className="sticky top-0 left-0 z-20 bg-light-surface dark:bg-dark-surface border-b-2 border-r border-light-border dark:border-dark-border"></div>

        {/* Header row with locations */}
        {locations.map((loc, index) => {
            const isNewGym = loc.court === 'T1';
            const separatorClass = index > 0 
                ? (isNewGym ? 'border-l-4 border-gray-300 dark:border-gray-600' : 'border-l')
                : '';
            const endBorderClass = index === locations.length - 1 ? 'border-r' : '';

            return (
              <div key={loc.id} className={`sticky top-0 z-10 flex items-center justify-center p-2 border-b-2 ${separatorClass} ${endBorderClass} border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface font-semibold`} style={{ gridColumn: index + 2 }}>
                <div className="text-center">
                  <div>{loc.gym}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{loc.court}</div>
                </div>
              </div>
            );
        })}

        {/* Time column */}
        {timeSlots.map((time, index) => (
          <div key={time} className="sticky left-0 z-10 flex items-center justify-center pr-2 text-sm text-gray-500 dark:text-gray-400 bg-light-surface dark:bg-dark-surface border-r border-b border-light-border dark:border-dark-border" style={{ gridRow: index + 2 }}>
            {index % 2 === 0 ? formatTime(time) : ''}
          </div>
        ))}
        
        {/* Grid lines */}
        {timeSlots.map((_, rowIndex) => 
            locations.map((loc, colIndex) => {
                const isNewGym = loc.court === 'T1';
                const separatorClass = colIndex > 0
                    ? (isNewGym ? 'border-l-4 border-gray-300 dark:border-gray-600' : 'border-l')
                    : '';
                const endBorderClass = colIndex === locations.length - 1 ? 'border-r' : '';
                return (
                    <div key={`${rowIndex}-${colIndex}`} className={`border-b ${separatorClass} ${endBorderClass} border-light-border dark:border-dark-border`} style={{ gridRow: rowIndex + 2, gridColumn: colIndex + 2 }}></div>
                )
            })
        )}

        {/* Schedule session cards */}
        {groupedSchedule.map(sessionGroup => {
          const session = sessionGroup[0]; // Base position on the first session in the group
          const startMinutes = timeToMinutes(session.startTime);
          const endMinutes = timeToMinutes(session.endTime);
          
          const startRowIndex = Math.floor((startMinutes - minTime) / timeStep);
          const endRowIndex = Math.floor((endMinutes - minTime) / timeStep);
          
          const rowSpan = Math.max(1, endRowIndex - startRowIndex);

          const startCourt = session.courts[0];
          const colSpan = session.courts.length;
          
          const startColIndex = locations.findIndex(loc => loc.gym === session.gym && loc.court === startCourt);
          
          if (startColIndex === -1) return null;

          const gridRow = `${startRowIndex + 2} / span ${rowSpan}`;
          const gridColumn = `${startColIndex + 2} / span ${colSpan}`;
          
          if (sessionGroup.length === 1) {
            const teamColorStyles = getTeamColorStyles(session.team);
            return (
              <div
                key={session.id}
                className="rounded-lg p-2 flex flex-col justify-center overflow-hidden transition-transform transform hover:scale-105 hover:z-10"
                style={{
                  gridRow,
                  gridColumn,
                  ...teamColorStyles
                }}
              >
                <p className="font-bold text-sm leading-tight">{session.team}</p>
                <p className="text-sm opacity-90">{session.coach}</p>
                <p className="text-sm opacity-90 mt-1">{`${session.startTime} - ${session.endTime}`}</p>
              </div>
            );
          } else {
             return (
                <div
                    key={sessionGroup.map(s => s.id).join('-')}
                    style={{ gridRow, gridColumn }}
                    className="rounded-lg overflow-hidden flex flex-row shadow-lg"
                >
                    {sessionGroup.sort((a,b) => a.team.localeCompare(b.team)).map((s, index) => {
                        const teamColorStyles = getTeamColorStyles(s.team);
                        const borderClass = index > 0 ? 'border-l border-white/30' : '';
                        return (
                            <div
                                key={s.id}
                                className={`p-2 flex-1 flex flex-col justify-center overflow-hidden ${borderClass} transition-transform transform hover:scale-105 hover:z-20 relative`}
                                style={teamColorStyles}
                            >
                                <p className="font-bold text-sm leading-tight">{s.team}</p>
                                <p className="text-sm opacity-90">{s.coach}</p>
                                <p className="text-sm opacity-90 mt-1">{`${s.startTime} - ${s.endTime}`}</p>
                            </div>
                        );
                    })}
                </div>
            );
          }
        })}
      </div>
    </div>
  );
};


export default ScheduleGrid;