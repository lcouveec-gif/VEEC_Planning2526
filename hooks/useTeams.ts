import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsService } from '../services/teamsService';
import type { Team } from '../types';

/**
 * Query keys pour React Query
 */
export const teamsKeys = {
  all: ['teams'] as const,
  lists: () => [...teamsKeys.all, 'list'] as const,
  list: (filters?: any) => [...teamsKeys.lists(), { filters }] as const,
  details: () => [...teamsKeys.all, 'detail'] as const,
  detail: (id: string) => [...teamsKeys.details(), id] as const,
};

/**
 * Hook pour récupérer toutes les équipes avec React Query
 *
 * Avantages par rapport à l'ancien hook:
 * - Cache automatique (5 min)
 * - Refetch intelligent en arrière-plan
 * - Retry automatique en cas d'erreur
 * - Déduplication des requêtes
 * - isLoading vs isFetching (distinction entre première charge et refetch)
 */
export function useTeams() {
  const queryClient = useQueryClient();

  // Query pour récupérer les équipes
  const query = useQuery({
    queryKey: teamsKeys.lists(),
    queryFn: teamsService.fetchTeams,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation pour créer une équipe
  const createTeamMutation = useMutation({
    mutationFn: teamsService.createTeam,
    onSuccess: () => {
      // Invalider le cache pour refetch automatiquement
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() });
    },
  });

  // Mutation pour mettre à jour une équipe
  const updateTeamMutation = useMutation({
    mutationFn: ({ idequipe, updates }: { idequipe: string; updates: Partial<Team> }) =>
      teamsService.updateTeam(idequipe, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() });
    },
  });

  // Mutation pour supprimer une équipe
  const deleteTeamMutation = useMutation({
    mutationFn: teamsService.deleteTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.lists() });
    },
  });

  return {
    // Données et état de la query
    teams: query.data || [],
    loading: query.isLoading, // Première charge uniquement
    isFetching: query.isFetching, // Inclut refetch en arrière-plan
    error: query.error?.message || null,
    refetch: query.refetch,

    // Mutations
    createTeam: async (team: Team) => {
      try {
        const result = await createTeamMutation.mutateAsync(team);
        return result;
      } catch (error) {
        return null;
      }
    },
    updateTeam: async (idequipe: string, updates: Partial<Team>) => {
      try {
        await updateTeamMutation.mutateAsync({ idequipe, updates });
        return true;
      } catch (error) {
        return false;
      }
    },
    deleteTeam: async (idequipe: string) => {
      try {
        await deleteTeamMutation.mutateAsync(idequipe);
        return true;
      } catch (error) {
        return false;
      }
    },

    // États des mutations
    isCreating: createTeamMutation.isPending,
    isUpdating: updateTeamMutation.isPending,
    isDeleting: deleteTeamMutation.isPending,
  };
}
