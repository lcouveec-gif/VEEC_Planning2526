import { supabase } from '../lib/supabaseClient';
import type { Team } from '../types';

/**
 * Service pour gérer les équipes via Supabase
 * Séparation des fonctions de service pour meilleure testabilité
 */

export const teamsService = {
  /**
   * Récupérer toutes les équipes
   */
  async fetchTeams(): Promise<Team[]> {
    const { data, error } = await supabase
      .from('VEEC_Equipes_FFVB')
      .select('*')
      .order('NOM_FFVB', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Erreur lors du chargement des équipes');
    }

    return data || [];
  },

  /**
   * Créer une nouvelle équipe
   */
  async createTeam(team: Team): Promise<Team> {
    const { data, error } = await supabase
      .from('VEEC_Equipes_FFVB')
      .insert([team])
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Erreur lors de la création de l\'équipe');
    }

    if (!data) {
      throw new Error('Aucune donnée retournée après création');
    }

    return data;
  },

  /**
   * Mettre à jour une équipe
   */
  async updateTeam(idequipe: string, updates: Partial<Team>): Promise<Team> {
    const { data, error } = await supabase
      .from('VEEC_Equipes_FFVB')
      .update(updates)
      .eq('IDEQUIPE', idequipe)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Erreur lors de la mise à jour de l\'équipe');
    }

    if (!data) {
      throw new Error(`Aucune équipe trouvée avec l'IDEQUIPE: "${idequipe}"`);
    }

    return data;
  },

  /**
   * Supprimer une équipe
   */
  async deleteTeam(idequipe: string): Promise<void> {
    const { error } = await supabase
      .from('VEEC_Equipes_FFVB')
      .delete()
      .eq('IDEQUIPE', idequipe);

    if (error) {
      throw new Error(error.message || 'Erreur lors de la suppression de l\'équipe');
    }
  },
};
