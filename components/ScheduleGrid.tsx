
import React, { useState, useEffect, useMemo } from 'react';
import type { TrainingSession } from '../types';
import { GYMS, COURTS } from '../constants';
import { getTeamColorStyles } from '../utils/color';
import { CourtIcon, StarIcon } from './icons/ThemeIcons';

interface ScheduleGridProps {
  schedule: TrainingSession[];
  gymFilter: string[];
  highlightedTeam: string;
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


const ScheduleGrid: React.FC<ScheduleGridProps> = ({ schedule, gymFilter, highlightedTeam }) => {
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
                        <div className="space-y-4">
                            {sessionsByGym[gym]
                                .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
                                .map(session => {
                                    const teamColorStyles = getTeamColorStyles(session.team);
                                    const isHighlighted = highlightedTeam && session.team === highlightedTeam;
                                    const isDimmed = highlightedTeam && session.team !== highlightedTeam;

                                    return (
                                        <div
                                            key={session.id}
                                            className={`p-5 rounded-xl shadow-md flex gap-5 items-center relative transition-all duration-300 ${isDimmed ? 'opacity-40 hover:opacity-100' : ''} ${isHighlighted ? 'ring-2 ring-offset-2 ring-offset-light-surface dark:ring-offset-dark-surface ring-yellow-400 dark:ring-yellow-300' : ''}`}
                                            style={{ backgroundColor: teamColorStyles.backgroundColor, color: teamColorStyles.color }}
                                        >
                                            {isHighlighted && (
                                                <div className="absolute top-2 right-2 text-yellow-300">
                                                    <StarIcon className="w-6 h-6" />
                                                </div>
                                            )}
                                            <div className="w-1/4 flex-shrink-0 text-center pr-5 border-r border-current border-opacity-30">
                                                <p className="font-bold text-xl sm:text-2xl">{session.startTime}</p>
                                                <p className="text-base opacity-80">{session.endTime}</p>
                                            </div>
                                            <div className="w-3/4 flex flex-col gap-1.5">
                                                <p className="font-bold text-xl sm:text-2xl leading-tight">{session.team}</p>
                                                <p className="text-lg opacity-90">{session.coach}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <CourtIcon className="w-5 h-5 flex-shrink-0 opacity-80" />
                                                    <p className="text-base font-medium opacity-90">{session.courts.join(', ')}</p>
                                                </div>
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
            const isHighlighted = highlightedTeam && session.team === highlightedTeam;
            const isDimmed = highlightedTeam && session.team !== highlightedTeam;
            return (
              <div
                key={session.id}
                className={`rounded-lg p-2 flex flex-col justify-center overflow-hidden transition-all duration-300 transform hover:scale-105 hover:z-20 ${isDimmed ? 'opacity-40' : ''} ${isHighlighted ? 'ring-2 ring-yellow-400 dark:ring-yellow-300 z-10' : ''}`}
                style={{
                  gridRow,
                  gridColumn,
                  ...teamColorStyles
                }}
              >
                <p className="font-bold text-base leading-tight">{session.team}</p>
                <p className="text-sm opacity-90">{session.coach}</p>
                <p className="text-sm opacity-90 mt-1">{`${session.startTime} - ${session.endTime}`}</p>
              </div>
            );
          } else {
             const isGroupDimmed = highlightedTeam && !sessionGroup.some(s => s.team === highlightedTeam);
             return (
                <div
                    key={sessionGroup.map(s => s.id).join('-')}
                    style={{ gridRow, gridColumn }}
                    className={`rounded-lg overflow-hidden flex flex-row shadow-lg transition-opacity duration-300 ${isGroupDimmed ? 'opacity-40 hover:opacity-100' : ''}`}
                >
                    {sessionGroup.sort((a,b) => a.team.localeCompare(b.team)).map((s, index) => {
                        const teamColorStyles = getTeamColorStyles(s.team);
                        const borderClass = index > 0 ? 'border-l border-white/30' : '';
                        const isTeamHighlighted = highlightedTeam && s.team === highlightedTeam;
                        return (
                            <div
                                key={s.id}
                                className={`p-2 flex-1 flex flex-col justify-center overflow-hidden ${borderClass} transition-transform transform hover:scale-105 hover:z-20 relative ${isTeamHighlighted ? 'ring-1 ring-inset ring-yellow-400 dark:ring-yellow-300' : ''}`}
                                style={teamColorStyles}
                            >
                                <p className="font-bold text-base leading-tight">{s.team}</p>
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
