import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { PlayerPosition } from '../types';

export interface CollectifRelation {
  id: string;
  equipe_id: string;
  licencie_id: string;
  numero_maillot: number | null;
  poste: PlayerPosition | null;
  created_at: string;
  updated_at: string;
}

export interface CollectifPlayer {
  licencie_id: string;
  numero_maillot: number | null;
  poste: PlayerPosition | null;
}

export interface PlayerWithTeams {
  licencie_id: string;
  equipe_ids: string[];
}

export interface TeamWithPlayers {
  equipe_id: string;
  licencie_ids: string[];
}

export function useCollectifs() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Récupérer tous les joueurs d'une équipe avec leurs informations
  const getTeamPlayers = useCallback(async (equipeId: string): Promise<CollectifPlayer[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('VEEC_Collectifs')
        .select('licencie_id, numero_maillot, poste')
        .eq('equipe_id', equipeId);

      if (supabaseError) {
        console.error('Supabase error details:', {
          message: supabaseError.message,
          details: supabaseError.details,
          hint: supabaseError.hint,
          code: supabaseError.code
        });

        // Si erreur 406 ou PGRST116, c'est probablement un problème de RLS
        if (supabaseError.code === 'PGRST116' || supabaseError.message.includes('406')) {
          const rlsError = 'Erreur d\'accès à la table VEEC_Collectifs. Veuillez exécuter le script supabase/fix_collectifs_rls.sql dans l\'éditeur SQL de Supabase.';
          setError(rlsError);
          console.error('RLS Policy Error:', rlsError);
        }

        throw supabaseError;
      }

      return data || [];
    } catch (err: any) {
      console.error('Error fetching team players:', err);
      if (!error) { // Si l'erreur n'a pas déjà été définie ci-dessus
        setError(err.message || 'Erreur lors du chargement des joueurs de l\'équipe.');
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Récupérer toutes les équipes d'un joueur
  const getPlayerTeams = useCallback(async (licencieId: string): Promise<string[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('VEEC_Collectifs')
        .select('equipe_id')
        .eq('licencie_id', licencieId);

      if (supabaseError) throw supabaseError;

      return data?.map(item => item.equipe_id) || [];
    } catch (err: any) {
      console.error('Error fetching player teams:', err);
      setError(err.message || 'Erreur lors du chargement des équipes du joueur.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Ajouter un joueur à une équipe
  const addPlayerToTeam = useCallback(async (
    equipeId: string,
    licencieId: string,
    numeroMaillot?: number | null,
    poste?: PlayerPosition | null
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const payload: any = {
        equipe_id: equipeId,
        licencie_id: licencieId,
      };

      if (numeroMaillot !== undefined && numeroMaillot !== null) {
        payload.numero_maillot = numeroMaillot;
      }

      if (poste !== undefined && poste !== null) {
        payload.poste = poste;
      }

      const { error: insertError } = await supabase
        .from('VEEC_Collectifs')
        .insert([payload]);

      if (insertError) {
        // Vérifier si c'est une erreur de doublon
        if (insertError.code === '23505') {
          setError('Ce joueur est déjà dans cette équipe.');
        } else {
          throw insertError;
        }
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('Error adding player to team:', err);
      setError(err.message || 'Erreur lors de l\'ajout du joueur à l\'équipe.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mettre à jour les informations d'un joueur dans une équipe
  const updatePlayerInTeam = useCallback(async (
    equipeId: string,
    licencieId: string,
    numeroMaillot: number | null,
    poste: PlayerPosition | null
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('VEEC_Collectifs')
        .update({
          numero_maillot: numeroMaillot,
          poste: poste,
        })
        .eq('equipe_id', equipeId)
        .eq('licencie_id', licencieId);

      if (updateError) throw updateError;

      return true;
    } catch (err: any) {
      console.error('Error updating player in team:', err);
      setError(err.message || 'Erreur lors de la mise à jour du joueur.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Retirer un joueur d'une équipe
  const removePlayerFromTeam = useCallback(async (equipeId: string, licencieId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('VEEC_Collectifs')
        .delete()
        .eq('equipe_id', equipeId)
        .eq('licencie_id', licencieId);

      if (deleteError) throw deleteError;

      return true;
    } catch (err: any) {
      console.error('Error removing player from team:', err);
      setError(err.message || 'Erreur lors de la suppression du joueur de l\'équipe.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Récupérer toutes les relations collectif
  const getAllCollectifs = useCallback(async (): Promise<CollectifRelation[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('VEEC_Collectifs')
        .select('*')
        .order('equipe_id', { ascending: true });

      if (supabaseError) throw supabaseError;

      return data || [];
    } catch (err: any) {
      console.error('Error fetching all collectifs:', err);
      setError(err.message || 'Erreur lors du chargement des collectifs.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getTeamPlayers,
    getPlayerTeams,
    addPlayerToTeam,
    updatePlayerInTeam,
    removePlayerFromTeam,
    getAllCollectifs,
  };
}
