import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { TrainingSession } from '../types';

interface UseTrainingSessionsResult {
  sessions: TrainingSession[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTrainingSessions(): UseTrainingSessionsResult {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('training_sessions')
        .select('*')
        .order('id', { ascending: true });

      if (supabaseError) {
        throw supabaseError;
      }

      // Transformer les données Supabase en format TrainingSession
      const formattedSessions: TrainingSession[] = (data || []).map((item: any) => ({
        id: item.id,
        team: item.team,
        coach: item.coach,
        day: item.day,
        gym: item.gym,
        courts: item.courts, // Supposant que courts est déjà un tableau
        startTime: item.start_time,
        endTime: item.end_time,
      }));

      setSessions(formattedSessions);
    } catch (err: any) {
      console.error('Error fetching training sessions:', err);
      setError(err.message || 'Une erreur est survenue lors du chargement des données.');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return {
    sessions,
    loading,
    error,
    refetch: fetchSessions,
  };
}
