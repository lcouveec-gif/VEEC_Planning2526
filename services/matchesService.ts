import { supabase } from '../lib/supabaseClient';
import type { Match } from '../types';

export interface MatchesFilters {
  startDate?: string;
  endDate?: string;
  teamIds?: string[];
}

/**
 * Service pour gérer les matchs via Supabase
 */
export const matchesService = {
  /**
   * Récupérer les matchs avec filtres optionnels
   */
  async fetchMatches(filters: MatchesFilters = {}): Promise<Match[]> {
    const { startDate, endDate, teamIds } = filters;

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

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || 'Erreur lors du chargement des matchs');
    }

    return data || [];
  },
};
