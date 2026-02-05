import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clubsService } from '../services/clubsService';
import type { Club } from '../types';

/**
 * Hook pour gérer les clubs de volley
 */
export const useClubs = () => {
  const queryClient = useQueryClient();

  // Récupérer tous les clubs
  const {
    data: clubs = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['clubs'],
    queryFn: clubsService.fetchClubs,
  });

  // Créer un club
  const createMutation = useMutation({
    mutationFn: (club: Omit<Club, 'created_at' | 'updated_at'>) =>
      clubsService.createClub(club),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
  });

  // Mettre à jour un club
  const updateMutation = useMutation({
    mutationFn: ({ code_club, updates }: { code_club: string; updates: Partial<Club> }) =>
      clubsService.updateClub(code_club, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
  });

  // Supprimer un club
  const deleteMutation = useMutation({
    mutationFn: (code_club: string) => clubsService.deleteClub(code_club),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
  });

  return {
    clubs,
    loading,
    error: error?.message,
    refetch,
    createClub: async (club: Omit<Club, 'created_at' | 'updated_at'>) => {
      try {
        const result = await createMutation.mutateAsync(club);
        return result;
      } catch (err) {
        console.error('Erreur création club:', err);
        return null;
      }
    },
    updateClub: async (code_club: string, updates: Partial<Club>) => {
      try {
        await updateMutation.mutateAsync({ code_club, updates });
        return true;
      } catch (err) {
        console.error('Erreur mise à jour club:', err);
        return false;
      }
    },
    deleteClub: async (code_club: string) => {
      try {
        await deleteMutation.mutateAsync(code_club);
        return true;
      } catch (err) {
        console.error('Erreur suppression club:', err);
        return false;
      }
    },
  };
};

/**
 * Hook pour rechercher des clubs
 */
export const useSearchClubs = (searchTerm: string, enabled = true) => {
  return useQuery({
    queryKey: ['clubs', 'search', searchTerm],
    queryFn: () => clubsService.searchClubs(searchTerm),
    enabled: enabled && searchTerm.length >= 2,
  });
};

/**
 * Hook pour récupérer un club par son code
 */
export const useClubByCode = (codeClub: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: ['club', 'code', codeClub],
    queryFn: () => clubsService.getClubByCode(codeClub || ''),
    enabled: enabled && !!codeClub && codeClub.length >= 7,
  });
};
