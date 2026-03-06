import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Tournoi } from '../types';

interface UseTournoisResult {
  tournois: Tournoi[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTournoi: (data: Omit<Tournoi, 'id' | 'created_at'>) => Promise<Tournoi | null>;
  updateTournoi: (id: number, updates: Partial<Omit<Tournoi, 'id' | 'created_at'>>) => Promise<boolean>;
  deleteTournoi: (id: number) => Promise<boolean>;
}

export function useTournois(): UseTournoisResult {
  const [tournois, setTournois] = useState<Tournoi[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTournois = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('tournois')
        .select('*')
        .order('date_debut', { ascending: false });

      if (supabaseError) throw supabaseError;

      setTournois(data || []);
    } catch (err: any) {
      console.error('Error fetching tournois:', err);
      setError(err.message || 'Erreur lors du chargement des tournois.');
      setTournois([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTournoi = async (
    data: Omit<Tournoi, 'id' | 'created_at'>
  ): Promise<Tournoi | null> => {
    try {
      const { data: created, error: supabaseError } = await supabase
        .from('tournois')
        .insert([data])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      await fetchTournois();
      return created;
    } catch (err: any) {
      console.error('Error creating tournoi:', err);
      setError(err.message || 'Erreur lors de la création du tournoi.');
      return null;
    }
  };

  const updateTournoi = async (
    id: number,
    updates: Partial<Omit<Tournoi, 'id' | 'created_at'>>
  ): Promise<boolean> => {
    try {
      const { error: supabaseError } = await supabase
        .from('tournois')
        .update(updates)
        .eq('id', id);

      if (supabaseError) throw supabaseError;

      await fetchTournois();
      return true;
    } catch (err: any) {
      console.error('Error updating tournoi:', err);
      setError(err.message || 'Erreur lors de la mise à jour du tournoi.');
      return false;
    }
  };

  const deleteTournoi = async (id: number): Promise<boolean> => {
    try {
      // Supprimer d'abord les inscriptions liées
      const { error: inscError } = await supabase
        .from('inscriptions_tournoi')
        .delete()
        .eq('tournoi_id', id);

      if (inscError) throw inscError;

      const { error: supabaseError } = await supabase
        .from('tournois')
        .delete()
        .eq('id', id);

      if (supabaseError) throw supabaseError;

      await fetchTournois();
      return true;
    } catch (err: any) {
      console.error('Error deleting tournoi:', err);
      setError(err.message || 'Erreur lors de la suppression du tournoi.');
      return false;
    }
  };

  useEffect(() => {
    fetchTournois();
  }, [fetchTournois]);

  return {
    tournois,
    loading,
    error,
    refetch: fetchTournois,
    createTournoi,
    updateTournoi,
    deleteTournoi,
  };
}
