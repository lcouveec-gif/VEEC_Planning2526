import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { StageEncadrant } from '../types';

interface UseStageEncadrantsResult {
  encadrants: StageEncadrant[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addEncadrant: (licencieId: string, jours?: string[] | null) => Promise<StageEncadrant | null>;
  updateJours: (id: string, jours: string[] | null) => Promise<boolean>;
  deleteEncadrant: (id: string) => Promise<boolean>;
}

export function useStageEncadrants(stageId: string): UseStageEncadrantsResult {
  const [encadrants, setEncadrants] = useState<StageEncadrant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEncadrants = useCallback(async () => {
    if (!stageId) {
      setEncadrants([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error: supabaseError } = await supabase
        .from('stage_encadrants')
        .select('*')
        .eq('stage_id', stageId)
        .order('created_at', { ascending: true });

      if (supabaseError) throw supabaseError;
      setEncadrants(data || []);
    } catch (err: any) {
      console.error('Error fetching encadrants:', err);
      setError(err.message || 'Erreur lors du chargement des encadrants.');
      setEncadrants([]);
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  const addEncadrant = async (
    licencieId: string,
    jours?: string[] | null,
  ): Promise<StageEncadrant | null> => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('stage_encadrants')
        .insert([{
          stage_id: stageId,
          licencie_id: licencieId,
          jours: jours && jours.length > 0 ? jours : null,
        }])
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      await fetchEncadrants();
      return data;
    } catch (err: any) {
      console.error('Error adding encadrant:', err);
      setError(err.message || 'Erreur lors de l\'ajout de l\'encadrant.');
      return null;
    }
  };

  const updateJours = async (id: string, jours: string[] | null): Promise<boolean> => {
    // Optimistic update
    setEncadrants(prev =>
      prev.map(e => e.id === id ? { ...e, jours: jours && jours.length > 0 ? jours : null } : e)
    );
    try {
      const { error: supabaseError } = await supabase
        .from('stage_encadrants')
        .update({ jours: jours && jours.length > 0 ? jours : null })
        .eq('id', id);

      if (supabaseError) throw supabaseError;
      return true;
    } catch (err: any) {
      console.error('Error updating jours:', err);
      setError(err.message || 'Erreur lors de la mise à jour des jours.');
      await fetchEncadrants(); // resync
      return false;
    }
  };

  const deleteEncadrant = async (id: string): Promise<boolean> => {
    try {
      const { error: supabaseError } = await supabase
        .from('stage_encadrants')
        .delete()
        .eq('id', id);

      if (supabaseError) throw supabaseError;
      setEncadrants(prev => prev.filter(e => e.id !== id));
      return true;
    } catch (err: any) {
      console.error('Error deleting encadrant:', err);
      setError(err.message || 'Erreur lors de la suppression de l\'encadrant.');
      return false;
    }
  };

  useEffect(() => {
    fetchEncadrants();
  }, [fetchEncadrants]);

  return {
    encadrants,
    loading,
    error,
    refetch: fetchEncadrants,
    addEncadrant,
    updateJours,
    deleteEncadrant,
  };
}
