import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'dark' | 'light';

interface AppState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // Export PDF state
  isExporting: boolean;
  setIsExporting: (isExporting: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Theme - défaut dark
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme });
        // Appliquer le thème au DOM
        const root = window.document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      },
      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === 'dark' ? 'light' : 'dark';
          // Appliquer le thème au DOM
          const root = window.document.documentElement;
          if (newTheme === 'dark') {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
          return { theme: newTheme };
        });
      },

      // Export state
      isExporting: false,
      setIsExporting: (isExporting) => set({ isExporting }),
    }),
    {
      name: 'veec-app-storage', // nom unique pour localStorage
      storage: createJSONStorage(() => localStorage),
      // Seulement persister le thème, pas isExporting
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
