import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Team } from '../types';

interface UseTeamsResult {
  teams: Team[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTeams(): UseTeamsResult {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('VEEC_Equipes_FFVB')
        .select('*')
        .order('NOM_FFVB', { ascending: true });

      if (supabaseError) {
        throw supabaseError;
      }

      setTeams(data || []);
    } catch (err: any) {
      console.error('Error fetching teams:', err);
      setError(err.message || 'Une erreur est survenue lors du chargement des équipes.');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  return {
    teams,
    loading,
    error,
    refetch: fetchTeams,
  };
}
