import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Team, TeamFFVB, TeamWithChampionships } from '../types';

interface UseTeamsResult {
  teams: TeamWithChampionships[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // CRUD équipe parent (VEEC_Equipes)
  createTeam: (team: Team) => Promise<Team | null>;
  updateTeam: (idequipe: string, updates: Partial<Team>) => Promise<boolean>;
  deleteTeam: (idequipe: string) => Promise<boolean>;
  // CRUD championnat (VEEC_Equipes_FFVB)
  createChampionship: (entry: TeamFFVB) => Promise<TeamFFVB | null>;
  updateChampionship: (idequipe: string, pouleTeam: string, updates: Partial<TeamFFVB>) => Promise<boolean>;
  deleteChampionship: (idequipe: string, pouleTeam: string) => Promise<boolean>;
}

export function useTeams(): UseTeamsResult {
  const [teams, setTeams] = useState<TeamWithChampionships[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Requête 1 : équipes parent
      const { data: teamsData, error: teamsError } = await supabase
        .from('VEEC_Equipes')
        .select('*')
        .order('IDEQUIPE', { ascending: true });

      if (teamsError) throw teamsError;
      console.log('[useTeams] VEEC_Equipes:', teamsData?.length, 'lignes', teamsData);

      // Requête 2 : championnats
      const { data: champsData, error: champsError } = await supabase
        .from('VEEC_Equipes_FFVB')
        .select('*');

      if (champsError) throw champsError;

      // Fusion : associer les championnats à chaque équipe
      const merged: TeamWithChampionships[] = (teamsData || []).map(team => ({
        ...team,
        championships: (champsData || []).filter(c => c.IDEQUIPE === team.IDEQUIPE),
      }));

      setTeams(merged);
    } catch (err: any) {
      console.error('Error fetching teams:', err);
      setError(err.message || 'Une erreur est survenue lors du chargement des équipes.');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- CRUD Équipe parent (VEEC_Equipes) ---

  const createTeam = async (team: Team): Promise<Team | null> => {
    try {
      setError(null);
      const { data, error: supabaseError } = await supabase
        .from('VEEC_Equipes')
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
        .from('VEEC_Equipes')
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
        .from('VEEC_Equipes')
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

  // --- CRUD Championnat (VEEC_Equipes_FFVB) ---

  const createChampionship = async (entry: TeamFFVB): Promise<TeamFFVB | null> => {
    try {
      setError(null);
      const { data, error: supabaseError } = await supabase
        .from('VEEC_Equipes_FFVB')
        .insert([entry])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      await fetchTeams();
      return data;
    } catch (err: any) {
      console.error('Error creating championship:', err);
      setError(err.message || 'Erreur lors de la création du championnat.');
      return null;
    }
  };

  const updateChampionship = async (idequipe: string, pouleTeam: string, updates: Partial<TeamFFVB>): Promise<boolean> => {
    try {
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('VEEC_Equipes_FFVB')
        .update(updates)
        .eq('IDEQUIPE', idequipe)
        .eq('POULE_TEAM', pouleTeam)
        .select();

      if (supabaseError) throw supabaseError;

      if (!data || data.length === 0) {
        throw new Error(`Aucun championnat trouvé pour IDEQUIPE="${idequipe}" et POULE_TEAM="${pouleTeam}"`);
      }

      await fetchTeams();
      return true;
    } catch (err: any) {
      console.error('Error updating championship:', err);
      setError(err.message || 'Erreur lors de la mise à jour du championnat.');
      return false;
    }
  };

  const deleteChampionship = async (idequipe: string, pouleTeam: string): Promise<boolean> => {
    try {
      setError(null);
      const { error: supabaseError } = await supabase
        .from('VEEC_Equipes_FFVB')
        .delete()
        .eq('IDEQUIPE', idequipe)
        .eq('POULE_TEAM', pouleTeam);

      if (supabaseError) throw supabaseError;

      await fetchTeams();
      return true;
    } catch (err: any) {
      console.error('Error deleting championship:', err);
      setError(err.message || 'Erreur lors de la suppression du championnat.');
      return false;
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return {
    teams,
    loading,
    error,
    refetch: fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    createChampionship,
    updateChampionship,
    deleteChampionship,
  };
}
