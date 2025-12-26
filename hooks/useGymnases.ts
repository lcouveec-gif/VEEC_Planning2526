import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gymnasesService } from '../services/gymnasesService';
import type { Gymnase } from '../types';

/**
 * Hook pour gérer les gymnases
 */
export const useGymnases = () => {
  const queryClient = useQueryClient();

  // Récupérer tous les gymnases
  const {
    data: gymnases = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['gymnases'],
    queryFn: gymnasesService.fetchGymnases,
  });

  // Créer un gymnase
  const createMutation = useMutation({
    mutationFn: (gymnase: Omit<Gymnase, 'id' | 'created_at' | 'updated_at'>) =>
      gymnasesService.createGymnase(gymnase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymnases'] });
    },
  });

  // Mettre à jour un gymnase
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Gymnase> }) =>
      gymnasesService.updateGymnase(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymnases'] });
    },
  });

  // Supprimer un gymnase
  const deleteMutation = useMutation({
    mutationFn: (id: string) => gymnasesService.deleteGymnase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymnases'] });
    },
  });

  return {
    gymnases,
    loading,
    error: error?.message,
    refetch,
    createGymnase: async (gymnase: Omit<Gymnase, 'id' | 'created_at' | 'updated_at'>) => {
      try {
        const result = await createMutation.mutateAsync(gymnase);
        return result;
      } catch (err) {
        console.error('Erreur création gymnase:', err);
        return null;
      }
    },
    updateGymnase: async (id: string, updates: Partial<Gymnase>) => {
      try {
        await updateMutation.mutateAsync({ id, updates });
        return true;
      } catch (err) {
        console.error('Erreur mise à jour gymnase:', err);
        return false;
      }
    },
    deleteGymnase: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch (err) {
        console.error('Erreur suppression gymnase:', err);
        return false;
      }
    },
  };
};

/**
 * Hook pour rechercher des gymnases
 */
export const useSearchGymnases = (searchTerm: string, enabled = true) => {
  return useQuery({
    queryKey: ['gymnases', 'search', searchTerm],
    queryFn: () => gymnasesService.searchGymnases(searchTerm),
    enabled: enabled && searchTerm.length >= 2,
  });
};

/**
 * Hook pour récupérer un gymnase par son nom
 */
export const useGymnaseByNom = (nom: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: ['gymnase', 'nom', nom],
    queryFn: () => gymnasesService.getGymnaseByNom(nom || ''),
    enabled: enabled && !!nom && nom.length > 0,
  });
};

/**
 * Hook pour récupérer un gymnase par son ID
 */
export const useGymnaseById = (id: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: ['gymnase', 'id', id],
    queryFn: () => gymnasesService.getGymnaseById(id || ''),
    enabled: enabled && !!id,
  });
};
