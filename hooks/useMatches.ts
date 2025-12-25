import { useQuery } from '@tanstack/react-query';
import { matchesService, type MatchesFilters } from '../services/matchesService';

/**
 * Query keys pour les matchs
 */
export const matchesKeys = {
  all: ['matches'] as const,
  lists: () => [...matchesKeys.all, 'list'] as const,
  list: (filters: MatchesFilters) => [...matchesKeys.lists(), filters] as const,
};

/**
 * Hook pour récupérer les matchs avec filtres optionnels
 *
 * @param startDate - Date de début (format YYYY-MM-DD)
 * @param endDate - Date de fin (format YYYY-MM-DD)
 * @param teamIds - IDs des équipes à filtrer
 *
 * Avantages React Query:
 * - Cache par combinaison de filtres
 * - Refetch automatique si les filtres changent
 * - Pas de refetch inutile si les filtres sont identiques
 */
export function useMatches(startDate?: string, endDate?: string, teamIds?: string[]) {
  const filters: MatchesFilters = {
    startDate,
    endDate,
    teamIds,
  };

  const query = useQuery({
    queryKey: matchesKeys.list(filters),
    queryFn: () => matchesService.fetchMatches(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    matches: query.data || [],
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}
