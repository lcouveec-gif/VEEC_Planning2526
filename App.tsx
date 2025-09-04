
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import FilterControls from './components/FilterControls';
import ScheduleGrid from './components/ScheduleGrid';
import { scheduleData } from './data/scheduleData';
import type { TrainingSession } from './types';
import { GYMS, DAYS } from './constants';

// For PDF export libraries from CDN
declare const html2canvas: any;

const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [dayFilter, setDayFilter] = useState<string[]>([]);
  const [gymFilter, setGymFilter] = useState<string[]>([]);
  const [teamSearch, setTeamSearch] = useState<string>('');
  const [highlightedTeam, setHighlightedTeam] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

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

  const allTeams = useMemo(() => {
    const teams = [...new Set(scheduleData.map(s => s.team))];
    return teams.sort((a, b) => a.localeCompare(b));
  }, []);

  const resetFilters = () => {
    setDayFilter([]);
    setGymFilter([]);
    setTeamSearch('');
    setHighlightedTeam('');
  };
  
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
        const { jsPDF } = (window as any).jspdf;
        const content = document.getElementById('schedule-to-export');
        if (!content) {
            console.error("Exportable content not found!");
            setIsExporting(false);
            return;
        }

        const themeBackgroundColor = theme === 'dark' ? '#121212' : '#F7F9FC';

        const canvas = await html2canvas(content, {
            scale: 2,
            useCORS: true,
            backgroundColor: themeBackgroundColor,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        
        // Always fit the image to the page width and scale height proportionally.
        const imgWidthInPdf = pdfWidth;
        const imgHeightInPdf = imgWidthInPdf / ratio;
        
        let heightLeft = imgHeightInPdf;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidthInPdf, imgHeightInPdf);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidthInPdf, imgHeightInPdf);
            heightLeft -= pdfHeight;
        }

        pdf.save('planning-fsvecv.pdf');
    } catch (error) {
        console.error("Error exporting to PDF", error);
    } finally {
        setIsExporting(false);
    }
  };

  const filteredSchedule = useMemo((): TrainingSession[] => {
    return scheduleData.filter(session => {
      const dayMatch = dayFilter.length === 0 || dayFilter.includes(session.day.toLowerCase());
      const gymMatch = gymFilter.length === 0 || gymFilter.includes(session.gym.toLowerCase());
      const teamMatch = teamSearch === '' || session.team.toLowerCase().includes(teamSearch.toLowerCase()) || session.coach.toLowerCase().includes(teamSearch.toLowerCase());
      return dayMatch && gymMatch && teamMatch;
    });
  }, [dayFilter, gymFilter, teamSearch]);
  
  const daysWithEvents = useMemo(() => {
    const uniqueDays = [...new Set(filteredSchedule.map(s => s.day))];
    return DAYS.filter(day => uniqueDays.includes(day));
  }, [filteredSchedule]);


  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background text-light-onSurface dark:text-dark-onSurface font-sans transition-colors duration-300">
      <Header theme={theme} toggleTheme={toggleTheme} onExportPdf={handleExportPdf} isExporting={isExporting} />
      <main className="p-4 sm:p-6 lg:p-8">
        <FilterControls
          dayFilter={dayFilter}
          setDayFilter={setDayFilter}
          gymFilter={gymFilter}
          setGymFilter={setGymFilter}
          teamSearch={teamSearch}
          setTeamSearch={setTeamSearch}
          highlightedTeam={highlightedTeam}
          setHighlightedTeam={setHighlightedTeam}
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
                            highlightedTeam={highlightedTeam}
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