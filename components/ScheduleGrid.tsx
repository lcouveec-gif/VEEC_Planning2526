import React, { useMemo } from 'react';
import type { TrainingSession } from '../types';
import { GYMS, COURTS } from '../constants';
import { getTeamColor } from '../utils/color';

interface ScheduleGridProps {
  schedule: TrainingSession[];
  gymFilter: string;
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

const ScheduleGrid: React.FC<ScheduleGridProps> = ({ schedule, gymFilter }) => {
  const locations = useMemo(() => {
    // Determine which gyms to display columns for.
    // If a specific gym is filtered, only show that one.
    // Otherwise, show all gyms that have sessions in the current schedule, maintaining original order.
    const gymsToShow = gymFilter !== 'all' 
      ? [gymFilter.charAt(0).toUpperCase() + gymFilter.slice(1)]
      : GYMS.filter(gym => schedule.some(s => s.gym === gym));

    return gymsToShow.flatMap(gym => COURTS.map(court => ({ gym, court, id: `${gym}-${court}` })));
  }, [schedule, gymFilter]);


  const { timeSlots, minTime, maxTime, timeStep } = useMemo(() => {
    if (schedule.length === 0) {
      return { timeSlots: [], minTime: 0, maxTime: 0, timeStep: 30 };
    }
    const allTimes = schedule.flatMap(s => [timeToMinutes(s.startTime), timeToMinutes(s.endTime)]);
    const minTimeVal = Math.min(...allTimes);
    const maxTimeVal = Math.max(...allTimes);
    const timeStep = 30; // 30 minute intervals
    
    const slots = [];
    const alignedMinTime = Math.floor(minTimeVal / timeStep) * timeStep;
    for (let t = alignedMinTime; t < maxTimeVal; t += timeStep) {
      slots.push(t);
    }
    return { timeSlots: slots, minTime: alignedMinTime, maxTime: maxTimeVal, timeStep };
  }, [schedule]);

  const groupedSchedule = useMemo(() => {
    const groups = new Map<string, TrainingSession[]>();
    schedule.forEach(session => {
        // Group sessions that occupy the exact same block of time and space
        const key = `${session.startTime}|${session.endTime}|${session.gym}|${session.courts.join(',')}`;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(session);
    });
    return Array.from(groups.values());
  }, [schedule]);

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
            const teamColor = getTeamColor(session.team);
            return (
              <div
                key={session.id}
                className={`rounded-lg p-2 text-white flex flex-col justify-center overflow-hidden transition-transform transform hover:scale-105 hover:z-10 ${teamColor}`}
                style={{
                  gridRow,
                  gridColumn,
                }}
              >
                <p className="font-bold text-sm leading-tight">{session.team}</p>
                <p className="text-xs opacity-90">{session.coach}</p>
                <p className="text-xs opacity-90 mt-1">{`${session.startTime} - ${session.endTime}`}</p>
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
                        const teamColor = getTeamColor(s.team);
                        const borderClass = index > 0 ? 'border-l border-white/30' : '';
                        return (
                            <div
                                key={s.id}
                                className={`p-2 text-white flex-1 flex flex-col justify-center overflow-hidden ${teamColor} ${borderClass} transition-transform transform hover:scale-105 hover:z-20 relative`}
                            >
                                <p className="font-bold text-sm leading-tight">{s.team}</p>
                                <p className="text-xs opacity-90">{s.coach}</p>
                                <p className="text-xs opacity-90 mt-1">{`${s.startTime} - ${s.endTime}`}</p>
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