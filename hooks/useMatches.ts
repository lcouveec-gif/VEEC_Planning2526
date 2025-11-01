import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Match } from '../types';

interface UseMatchesResult {
  matches: Match[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMatches(startDate?: string, endDate?: string, teamIds?: string[]): UseMatchesResult {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construction de la requête avec filtres
      let query = supabase
        .from('matches')
        .select(`
          *,
          equipe:VEEC_Equipes_FFVB!matches_idequipe_fkey(*)
        `)
        .order('Date', { ascending: true })
        .order('Heure', { ascending: true });

      // Filtre par date de début
      if (startDate) {
        query = query.gte('Date', startDate);
      }

      // Filtre par date de fin
      if (endDate) {
        query = query.lte('Date', endDate);
      }

      // Filtre par équipes (multi-sélection)
      if (teamIds && teamIds.length > 0) {
        query = query.in('idequipe', teamIds);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) {
        throw supabaseError;
      }

      setMatches(data || []);
    } catch (err: any) {
      console.error('Error fetching matches:', err);
      setError(err.message || 'Une erreur est survenue lors du chargement des matchs.');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [startDate, endDate, teamIds]);

  return {
    matches,
    loading,
    error,
    refetch: fetchMatches,
  };
}
