import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { StagePresence } from '../types';

interface UseStagePresencesResult {
  presences: StagePresence[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  togglePresence: (inscriptionId: string, date: string, current: boolean) => Promise<boolean>;
  getPresencesForDate: (date: string) => StagePresence[];
}

export function useStagePresences(stageId: string): UseStagePresencesResult {
  const [presences, setPresences] = useState<StagePresence[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPresences = useCallback(async () => {
    if (!stageId) {
      setPresences([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error: supabaseError } = await supabase
        .from('stage_presences')
        .select('*')
        .eq('stage_id', stageId);

      if (supabaseError) throw supabaseError;
      setPresences(data || []);
    } catch (err: any) {
      console.error('Error fetching presences:', err);
      setError(err.message || 'Erreur lors du chargement des présences.');
      setPresences([]);
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  const togglePresence = async (
    inscriptionId: string,
    date: string,
    current: boolean,
  ): Promise<boolean> => {
    const newValue = !current;
    // Check before optimistic update so rollback knows whether to filter or map
    const wasNew = !presences.some(p => p.inscription_id === inscriptionId && p.date === date);

    // Optimistic update
    setPresences(prev => {
      const existing = prev.find(p => p.inscription_id === inscriptionId && p.date === date);
      if (existing) {
        return prev.map(p =>
          p.inscription_id === inscriptionId && p.date === date
            ? { ...p, present: newValue }
            : p
        );
      }
      return [...prev, {
        id: crypto.randomUUID(),
        stage_id: stageId,
        inscription_id: inscriptionId,
        date,
        present: newValue,
      }];
    });

    try {
      const { error: supabaseError } = await supabase
        .from('stage_presences')
        .upsert({
          stage_id: stageId,
          inscription_id: inscriptionId,
          date,
          present: newValue,
        }, { onConflict: 'inscription_id,date' });

      if (supabaseError) throw supabaseError;
      return true;
    } catch (err: any) {
      console.error('Error toggling presence:', err);
      // Rollback: remove new entries, restore old value for existing ones
      if (wasNew) {
        setPresences(prev =>
          prev.filter(p => !(p.inscription_id === inscriptionId && p.date === date))
        );
      } else {
        setPresences(prev =>
          prev.map(p =>
            p.inscription_id === inscriptionId && p.date === date
              ? { ...p, present: current }
              : p
          )
        );
      }
      setError(err.message || 'Erreur lors de la mise à jour de la présence.');
      return false;
    }
  };

  const getPresencesForDate = (date: string): StagePresence[] =>
    presences.filter(p => p.date === date);

  useEffect(() => {
    fetchPresences();
  }, [fetchPresences]);

  return {
    presences,
    loading,
    error,
    refetch: fetchPresences,
    togglePresence,
    getPresencesForDate,
  };
}
