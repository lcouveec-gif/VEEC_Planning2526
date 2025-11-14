import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { MatchPositionData } from '../types';

interface SavedMatchPosition {
  id: string;
  match_id: string; // UUID
  team_id: string;
  match_date: string | null;
  players: any;
  set_lineups: any;
  created_at: string;
  updated_at: string;
}

export function useMatchPositions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Récupérer une composition existante pour un match
  const getMatchPosition = useCallback(async (matchId: string): Promise<MatchPositionData | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('VEEC_Match_Positions')
        .select('*')
        .eq('match_id', matchId)
        .maybeSingle(); // Utiliser maybeSingle() au lieu de single() pour éviter les erreurs si aucune ligne

      if (supabaseError) {
        console.error('Supabase error details (getMatchPosition):', {
          message: supabaseError.message,
          details: supabaseError.details,
          hint: supabaseError.hint,
          code: supabaseError.code
        });

        // Si erreur 406 ou problème RLS
        if (supabaseError.code === 'PGRST116' || supabaseError.message.includes('406')) {
          const rlsError = 'Erreur d\'accès à la table VEEC_Match_Positions. Veuillez exécuter le script supabase/fix_all_rls_policies.sql dans l\'éditeur SQL de Supabase.';
          setError(rlsError);
          console.error('RLS Policy Error:', rlsError);
          return null;
        }

        throw supabaseError;
      }

      if (!data) return null;

      const savedPosition = data as SavedMatchPosition;

      return {
        matchId: savedPosition.match_id,
        teamId: savedPosition.team_id,
        startDate: savedPosition.match_date || '',
        players: savedPosition.players,
        setLineups: savedPosition.set_lineups,
      };
    } catch (err: any) {
      console.error('Error fetching match position:', err);
      setError(err.message || 'Erreur lors du chargement de la composition.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sauvegarder ou mettre à jour une composition
  const saveMatchPosition = useCallback(async (data: MatchPositionData): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      console.log('📝 DEBUG - saveMatchPosition called with:', data);

      // Vérifier si une composition existe déjà pour ce match
      const { data: existingData, error: checkError } = await supabase
        .from('VEEC_Match_Positions')
        .select('id')
        .eq('match_id', data.matchId)
        .maybeSingle();

      if (checkError) {
        console.error('❌ DEBUG - Error checking existing data:', checkError);
        throw checkError;
      }

      console.log('🔍 DEBUG - Existing data:', existingData);

      const payload = {
        match_id: data.matchId,
        team_id: data.teamId,
        match_date: data.startDate,
        players: data.players,
        set_lineups: data.setLineups,
      };

      console.log('📦 DEBUG - Payload to save:', payload);

      if (existingData) {
        // Mise à jour
        console.log('🔄 DEBUG - Updating existing record');
        const { error: updateError } = await supabase
          .from('VEEC_Match_Positions')
          .update(payload)
          .eq('match_id', data.matchId);

        if (updateError) {
          console.error('❌ DEBUG - Update error:', updateError);
          throw updateError;
        }
        console.log('✅ DEBUG - Update successful');
      } else {
        // Insertion
        console.log('➕ DEBUG - Inserting new record');
        const { error: insertError } = await supabase
          .from('VEEC_Match_Positions')
          .insert([payload]);

        if (insertError) {
          console.error('❌ DEBUG - Insert error:', insertError);
          throw insertError;
        }
        console.log('✅ DEBUG - Insert successful');
      }

      return true;
    } catch (err: any) {
      console.error('❌ Error saving match position:', err);
      setError(err.message || 'Erreur lors de la sauvegarde de la composition.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Supprimer une composition
  const deleteMatchPosition = useCallback(async (matchId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('VEEC_Match_Positions')
        .delete()
        .eq('match_id', matchId);

      if (deleteError) throw deleteError;

      return true;
    } catch (err: any) {
      console.error('Error deleting match position:', err);
      setError(err.message || 'Erreur lors de la suppression de la composition.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getMatchPosition,
    saveMatchPosition,
    deleteMatchPosition,
  };
}
