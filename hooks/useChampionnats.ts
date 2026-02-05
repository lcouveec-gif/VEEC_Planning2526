import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Championnat } from '../types';

interface UseChampionnatsResult {
  championnats: Championnat[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createChampionnat: (entry: Omit<Championnat, 'id' | 'created_at'>) => Promise<Championnat | null>;
  updateChampionnat: (id: number, updates: Partial<Championnat>) => Promise<boolean>;
  deleteChampionnat: (id: number) => Promise<boolean>;
}

export function useChampionnats(): UseChampionnatsResult {
  const [championnats, setChampionnats] = useState<Championnat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChampionnats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('championnat')
        .select('*')
        .order('code_championnat', { ascending: true });

      if (supabaseError) throw supabaseError;
      setChampionnats(data || []);
    } catch (err: any) {
      console.error('Error fetching championnats:', err);
      setError(err.message || 'Erreur lors du chargement des championnats.');
      setChampionnats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createChampionnat = async (entry: Omit<Championnat, 'id' | 'created_at'>): Promise<Championnat | null> => {
    try {
      setError(null);
      const { data, error: supabaseError } = await supabase
        .from('championnat')
        .insert([entry])
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      await fetchChampionnats();
      return data;
    } catch (err: any) {
      console.error('Error creating championnat:', err);
      setError(err.message || 'Erreur lors de la création du championnat.');
      return null;
    }
  };

  const updateChampionnat = async (id: number, updates: Partial<Championnat>): Promise<boolean> => {
    try {
      setError(null);
      const { data, error: supabaseError } = await supabase
        .from('championnat')
        .update(updates)
        .eq('id', id)
        .select();

      if (supabaseError) throw supabaseError;
      if (!data || data.length === 0) {
        throw new Error(`Aucun championnat trouvé avec l'id: ${id}`);
      }

      await fetchChampionnats();
      return true;
    } catch (err: any) {
      console.error('Error updating championnat:', err);
      setError(err.message || 'Erreur lors de la mise à jour du championnat.');
      return false;
    }
  };

  const deleteChampionnat = async (id: number): Promise<boolean> => {
    try {
      setError(null);
      const { error: supabaseError } = await supabase
        .from('championnat')
        .delete()
        .eq('id', id);

      if (supabaseError) throw supabaseError;
      await fetchChampionnats();
      return true;
    } catch (err: any) {
      console.error('Error deleting championnat:', err);
      setError(err.message || 'Erreur lors de la suppression du championnat.');
      return false;
    }
  };

  useEffect(() => {
    fetchChampionnats();
  }, [fetchChampionnats]);

  return {
    championnats,
    loading,
    error,
    refetch: fetchChampionnats,
    createChampionnat,
    updateChampionnat,
    deleteChampionnat,
  };
}
