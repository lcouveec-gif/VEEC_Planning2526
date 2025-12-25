import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Team } from '../types';

interface UseTeamsResult {
  teams: Team[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTeam: (team: Team) => Promise<Team | null>;
  updateTeam: (idequipe: string, updates: Partial<Team>) => Promise<boolean>;
  deleteTeam: (idequipe: string) => Promise<boolean>;
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

  const createTeam = async (team: Team): Promise<Team | null> => {
    try {
      setError(null);
      const { data, error: supabaseError } = await supabase
        .from('VEEC_Equipes_FFVB')
        .insert([team])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      await fetchTeams();
      return data;
    } catch (err: any) {
      console.error('Error creating team:', err);
      setError(err.message || 'Erreur lors de la création de l\'équipe.');
      return null;
    }
  };

  const updateTeam = async (idequipe: string, updates: Partial<Team>): Promise<boolean> => {
    try {
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('VEEC_Equipes_FFVB')
        .update(updates)
        .eq('IDEQUIPE', idequipe)
        .select();

      if (supabaseError) throw supabaseError;

      if (!data || data.length === 0) {
        throw new Error(`Aucune équipe trouvée avec l'IDEQUIPE: "${idequipe}"`);
      }

      await fetchTeams();
      return true;
    } catch (err: any) {
      console.error('Error updating team:', err);
      setError(err.message || 'Erreur lors de la mise à jour de l\'équipe.');
      return false;
    }
  };

  const deleteTeam = async (idequipe: string): Promise<boolean> => {
    try {
      setError(null);
      const { error: supabaseError } = await supabase
        .from('VEEC_Equipes_FFVB')
        .delete()
        .eq('IDEQUIPE', idequipe);

      if (supabaseError) throw supabaseError;

      await fetchTeams();
      return true;
    } catch (err: any) {
      console.error('Error deleting team:', err);
      setError(err.message || 'Erreur lors de la suppression de l\'équipe.');
      return false;
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
    createTeam,
    updateTeam,
    deleteTeam,
  };
}
