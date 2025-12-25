import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { useAppStore } from '../stores/useAppStore';
import { useThemeInit } from '../hooks/useThemeInit';

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

const Layout: React.FC = () => {
  // Initialiser le thème au chargement
  useThemeInit();

  // Récupérer l'état global depuis Zustand
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const isExporting = useAppStore((state) => state.isExporting);
  const setIsExporting = useAppStore((state) => state.setIsExporting);

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

        const themeBackgroundColor = theme === 'dark' ? '#0d0d0d' : '#f5f5f5';

        const canvas = await (window as any).html2canvas(content, {
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

  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background text-light-onSurface dark:text-dark-onSurface font-sans transition-colors duration-300">
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        onExportPdf={handleExportPdf}
        isExporting={isExporting}
        onSubscribeToNotifications={handleSubscribe}
      />
      <Outlet />
    </div>
  );
};

export default Layout;
