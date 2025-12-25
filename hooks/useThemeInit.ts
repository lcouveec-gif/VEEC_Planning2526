import { useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';

/**
 * Hook pour initialiser le thème au chargement de l'application
 * Applique la classe 'dark' au document root si nécessaire
 */
export const useThemeInit = () => {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);
};
