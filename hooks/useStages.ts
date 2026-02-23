import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Stage } from '../types';

interface UseStagesResult {
  stages: Stage[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createStage: (data: Omit<Stage, 'id' | 'created_at'>) => Promise<Stage | null>;
  updateStage: (id: string, updates: Partial<Stage>) => Promise<boolean>;
  deleteStage: (id: string) => Promise<boolean>;
}

export function useStages(): UseStagesResult {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('stages')
        .select('*')
        .order('date_debut', { ascending: false });

      if (supabaseError) throw supabaseError;

      setStages(data || []);
    } catch (err: any) {
      console.error('Error fetching stages:', err);
      setError(err.message || 'Erreur lors du chargement des stages.');
      setStages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createStage = async (data: Omit<Stage, 'id' | 'created_at'>): Promise<Stage | null> => {
    try {
      const { data: created, error: supabaseError } = await supabase
        .from('stages')
        .insert([data])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      await fetchStages();
      return created;
    } catch (err: any) {
      console.error('Error creating stage:', err);
      setError(err.message || 'Erreur lors de la création du stage.');
      return null;
    }
  };

  const updateStage = async (id: string, updates: Partial<Stage>): Promise<boolean> => {
    try {
      const { error: supabaseError } = await supabase
        .from('stages')
        .update(updates)
        .eq('id', id);

      if (supabaseError) throw supabaseError;

      await fetchStages();
      return true;
    } catch (err: any) {
      console.error('Error updating stage:', err);
      setError(err.message || 'Erreur lors de la mise à jour du stage.');
      return false;
    }
  };

  const deleteStage = async (id: string): Promise<boolean> => {
    try {
      // Supprimer d'abord les inscriptions liées
      const { error: inscError } = await supabase
        .from('stage_inscriptions')
        .delete()
        .eq('stage_id', id);

      if (inscError) throw inscError;

      const { error: supabaseError } = await supabase
        .from('stages')
        .delete()
        .eq('id', id);

      if (supabaseError) throw supabaseError;

      await fetchStages();
      return true;
    } catch (err: any) {
      console.error('Error deleting stage:', err);
      setError(err.message || 'Erreur lors de la suppression du stage.');
      return false;
    }
  };

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  return {
    stages,
    loading,
    error,
    refetch: fetchStages,
    createStage,
    updateStage,
    deleteStage,
  };
}
