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

      // Requête 1 : matchs
      let query = supabase
        .from('matches')
        .select('*')
        .order('Date', { ascending: true })
        .order('Heure', { ascending: true });

      if (startDate) {
        query = query.gte('Date', startDate);
      }
      if (endDate) {
        query = query.lte('Date', endDate);
      }
      if (teamIds && teamIds.length > 0) {
        query = query.in('idequipe', teamIds);
      }

      const { data: matchesData, error: matchesError } = await query;
      if (matchesError) throw matchesError;

      // Requête 2, 3 & 4 : équipes parent + inscriptions FFVB + championnats
      const { data: teamsData } = await supabase.from('VEEC_Equipes').select('*');
      const { data: champsData } = await supabase.from('VEEC_Equipes_FFVB').select('*');
      const { data: championnatsData } = await supabase.from('championnat').select('*');

      // Fusion : associer equipe, equipe_ffvb et championnat
      const enriched: Match[] = (matchesData || []).map(m => {
        const equipe_ffvb = (champsData || []).find(c => c.IDEQUIPE === m.idequipe && c.NOM_FFVB === m.NOM_FFVB) || undefined;
        // Lien direct : match.POULE_TEAM = championnat.code_championnat
        const championnat_obj = m.POULE_TEAM
          ? (championnatsData || []).find((ch: any) => ch.code_championnat === m.POULE_TEAM) || undefined
          : undefined;
        return {
          ...m,
          equipe: (teamsData || []).find(t => t.IDEQUIPE === m.idequipe) || undefined,
          equipe_ffvb,
          championnat_obj,
        };
      });

      setMatches(enriched);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, JSON.stringify(teamIds)]);

  return {
    matches,
    loading,
    error,
    refetch: fetchMatches,
  };
}
