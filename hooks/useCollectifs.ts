import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectifsService, type CollectifPlayer, type CollectifRelation } from '../services/collectifsService';
import type { PlayerPosition } from '../types';

/**
 * Query keys pour les collectifs
 */
export const collectifsKeys = {
  all: ['collectifs'] as const,
  lists: () => [...collectifsKeys.all, 'list'] as const,
  teamPlayers: (equipeId: string) => [...collectifsKeys.all, 'team', equipeId] as const,
  playerTeams: (licencieId: string) => [...collectifsKeys.all, 'player', licencieId] as const,
};

/**
 * Hook pour récupérer les joueurs d'une équipe
 */
export function useTeamPlayers(equipeId: string) {
  return useQuery({
    queryKey: collectifsKeys.teamPlayers(equipeId),
    queryFn: () => collectifsService.getTeamPlayers(equipeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!equipeId, // Ne lance pas la query si pas d'equipeId
  });
}

/**
 * Hook pour récupérer les équipes d'un joueur
 */
export function usePlayerTeams(licencieId: string) {
  return useQuery({
    queryKey: collectifsKeys.playerTeams(licencieId),
    queryFn: () => collectifsService.getPlayerTeams(licencieId),
    staleTime: 5 * 60 * 1000,
    enabled: !!licencieId,
  });
}

/**
 * Hook pour récupérer tous les collectifs
 */
export function useAllCollectifs() {
  return useQuery({
    queryKey: collectifsKeys.lists(),
    queryFn: collectifsService.getAllCollectifs,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook principal pour gérer les collectifs avec mutations
 */
export function useCollectifs() {
  const queryClient = useQueryClient();

  // Mutation pour ajouter un joueur à une équipe
  const addPlayerMutation = useMutation({
    mutationFn: ({
      equipeId,
      licencieId,
      numeroMaillot,
      poste,
    }: {
      equipeId: string;
      licencieId: string;
      numeroMaillot?: number | null;
      poste?: PlayerPosition | null;
    }) => collectifsService.addPlayerToTeam(equipeId, licencieId, numeroMaillot, poste),
    onSuccess: (_, variables) => {
      // Invalider les queries liées à cette équipe et ce joueur
      queryClient.invalidateQueries({ queryKey: collectifsKeys.teamPlayers(variables.equipeId) });
      queryClient.invalidateQueries({ queryKey: collectifsKeys.playerTeams(variables.licencieId) });
      queryClient.invalidateQueries({ queryKey: collectifsKeys.lists() });
    },
  });

  // Mutation pour mettre à jour un joueur dans une équipe
  const updatePlayerMutation = useMutation({
    mutationFn: ({
      equipeId,
      licencieId,
      numeroMaillot,
      poste,
    }: {
      equipeId: string;
      licencieId: string;
      numeroMaillot: number | null;
      poste: PlayerPosition | null;
    }) => collectifsService.updatePlayerInTeam(equipeId, licencieId, numeroMaillot, poste),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: collectifsKeys.teamPlayers(variables.equipeId) });
      queryClient.invalidateQueries({ queryKey: collectifsKeys.lists() });
    },
  });

  // Mutation pour retirer un joueur d'une équipe
  const removePlayerMutation = useMutation({
    mutationFn: ({ equipeId, licencieId }: { equipeId: string; licencieId: string }) =>
      collectifsService.removePlayerFromTeam(equipeId, licencieId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: collectifsKeys.teamPlayers(variables.equipeId) });
      queryClient.invalidateQueries({ queryKey: collectifsKeys.playerTeams(variables.licencieId) });
      queryClient.invalidateQueries({ queryKey: collectifsKeys.lists() });
    },
  });

  return {
    // État des mutations
    loading: addPlayerMutation.isPending || updatePlayerMutation.isPending || removePlayerMutation.isPending,
    error: addPlayerMutation.error?.message || updatePlayerMutation.error?.message || removePlayerMutation.error?.message || null,

    // Fonctions de query (à utiliser via les hooks dédiés ci-dessus)
    getTeamPlayers: async (equipeId: string): Promise<CollectifPlayer[]> => {
      const result = await queryClient.fetchQuery({
        queryKey: collectifsKeys.teamPlayers(equipeId),
        queryFn: () => collectifsService.getTeamPlayers(equipeId),
      });
      return result || [];
    },

    getPlayerTeams: async (licencieId: string): Promise<string[]> => {
      const result = await queryClient.fetchQuery({
        queryKey: collectifsKeys.playerTeams(licencieId),
        queryFn: () => collectifsService.getPlayerTeams(licencieId),
      });
      return result || [];
    },

    getAllCollectifs: async (): Promise<CollectifRelation[]> => {
      const result = await queryClient.fetchQuery({
        queryKey: collectifsKeys.lists(),
        queryFn: collectifsService.getAllCollectifs,
      });
      return result || [];
    },

    // Mutations
    addPlayerToTeam: async (
      equipeId: string,
      licencieId: string,
      numeroMaillot?: number | null,
      poste?: PlayerPosition | null
    ): Promise<boolean> => {
      try {
        await addPlayerMutation.mutateAsync({ equipeId, licencieId, numeroMaillot, poste });
        return true;
      } catch (error) {
        return false;
      }
    },

    updatePlayerInTeam: async (
      equipeId: string,
      licencieId: string,
      numeroMaillot: number | null,
      poste: PlayerPosition | null
    ): Promise<boolean> => {
      try {
        await updatePlayerMutation.mutateAsync({ equipeId, licencieId, numeroMaillot, poste });
        return true;
      } catch (error) {
        return false;
      }
    },

    removePlayerFromTeam: async (equipeId: string, licencieId: string): Promise<boolean> => {
      try {
        await removePlayerMutation.mutateAsync({ equipeId, licencieId });
        return true;
      } catch (error) {
        return false;
      }
    },
  };
}

// Re-export des types pour compatibilité
export type { CollectifPlayer, CollectifRelation };
