import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import FilterControls from './components/FilterControls';
import ScheduleGrid from './components/ScheduleGrid';
import MatchSchedule from './components/MatchSchedule';
import { useTrainingSessions } from './hooks/useTrainingSessions';
import type { TrainingSession } from './types';
import { GYMS, DAYS } from './constants';

type PageType = 'training' | 'matches';

// For PDF export libraries from CDN
declare const html2canvas: any;

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('training');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [dayFilter, setDayFilter] = useState<string[]>([]);
  const [gymFilter, setGymFilter] = useState<string[]>([]);
  const [teamSearch, setTeamSearch] = useState<string>('');
  const [highlightedTeam, setHighlightedTeam] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Charger les données depuis Supabase
  const { sessions: scheduleData, loading, error } = useTrainingSessions();

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

  const handleSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported by your browser.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Permission for notifications was denied.');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.VITE_VAPID_PUBLIC_KEY!),
      });
      
      const apiUrl = `${process.env.VITE_API_URL}/save-subscription`;
      console.log(`Fetching to: ${apiUrl}`);
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      alert('Successfully subscribed to notifications!');
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      alert('Failed to subscribe to notifications.');
    }
  };

  const allTeams = useMemo(() => {
    const teams = [...new Set(scheduleData.map(s => s.team))];
    return teams.sort((a, b) => a.localeCompare(b));
  }, [scheduleData]);

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
  }, [scheduleData, dayFilter, gymFilter, teamSearch]);
  
  const daysWithEvents = useMemo(() => {
    const uniqueDays = [...new Set(filteredSchedule.map(s => s.day))];
    return DAYS.filter(day => uniqueDays.includes(day));
  }, [filteredSchedule]);


  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background text-light-onSurface dark:text-dark-onSurface font-sans transition-colors duration-300">
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        onExportPdf={handleExportPdf}
        isExporting={isExporting}
        onSubscribeToNotifications={handleSubscribe}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
      {currentPage === 'training' ? (
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
            </>
          )}
        </main>
      ) : (
        <MatchSchedule />
      )}
    </div>
  );
};

export default App;