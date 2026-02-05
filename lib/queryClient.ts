import { QueryClient } from '@tanstack/react-query';

/**
 * Configuration globale du QueryClient pour React Query
 *
 * Options principales :
 * - staleTime: Durée pendant laquelle les données sont considérées fraîches (pas de refetch)
 * - cacheTime: Durée de conservation des données en cache après qu'elles ne soient plus utilisées
 * - retry: Nombre de tentatives en cas d'échec
 * - refetchOnWindowFocus: Refetch automatique quand la fenêtre reprend le focus
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Données considérées fraîches pendant 5 minutes
      staleTime: 5 * 60 * 1000,

      // Cache conservé 10 minutes après non-utilisation
      gcTime: 10 * 60 * 1000,

      // Retry 2 fois en cas d'erreur
      retry: 2,

      // Retry avec délai exponentiel (1s, 2s, 4s)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch quand la fenêtre reprend le focus
      refetchOnWindowFocus: true,

      // Ne pas refetch automatiquement au mount si données fraîches
      refetchOnMount: true,

      // Refetch toutes les 5 minutes en arrière-plan pour données critiques
      refetchInterval: false, // Désactivé par défaut, peut être overridé par query
    },
    mutations: {
      // Retry une fois pour les mutations
      retry: 1,
    },
  },
});
