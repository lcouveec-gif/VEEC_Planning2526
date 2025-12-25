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

/**
 * Service pour gérer les relations équipes-joueurs (collectifs)
 */
export const collectifsService = {
  /**
   * Récupérer tous les joueurs d'une équipe
   */
  async getTeamPlayers(equipeId: string): Promise<CollectifPlayer[]> {
    const { data, error } = await supabase
      .from('VEEC_Collectifs')
      .select('licencie_id, numero_maillot, poste')
      .eq('equipe_id', equipeId);

    if (error) {
      // Gestion spécifique erreur RLS
      if (error.code === 'PGRST116' || error.message.includes('406')) {
        throw new Error(
          'Erreur d\'accès à la table VEEC_Collectifs. Veuillez exécuter le script supabase/fix_collectifs_rls.sql dans l\'éditeur SQL de Supabase.'
        );
      }
      throw new Error(error.message || 'Erreur lors du chargement des joueurs de l\'équipe');
    }

    return data || [];
  },

  /**
   * Récupérer toutes les équipes d'un joueur
   */
  async getPlayerTeams(licencieId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('VEEC_Collectifs')
      .select('equipe_id')
      .eq('licencie_id', licencieId);

    if (error) {
      throw new Error(error.message || 'Erreur lors du chargement des équipes du joueur');
    }

    return data?.map(item => item.equipe_id) || [];
  },

  /**
   * Récupérer toutes les relations collectif
   */
  async getAllCollectifs(): Promise<CollectifRelation[]> {
    const { data, error } = await supabase
      .from('VEEC_Collectifs')
      .select('*')
      .order('equipe_id', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Erreur lors du chargement des collectifs');
    }

    return data || [];
  },

  /**
   * Ajouter un joueur à une équipe
   */
  async addPlayerToTeam(
    equipeId: string,
    licencieId: string,
    numeroMaillot?: number | null,
    poste?: PlayerPosition | null
  ): Promise<void> {
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

    const { error } = await supabase
      .from('VEEC_Collectifs')
      .insert([payload]);

    if (error) {
      // Erreur de doublon
      if (error.code === '23505') {
        throw new Error('Ce joueur est déjà dans cette équipe.');
      }
      throw new Error(error.message || 'Erreur lors de l\'ajout du joueur à l\'équipe');
    }
  },

  /**
   * Mettre à jour les informations d'un joueur dans une équipe
   */
  async updatePlayerInTeam(
    equipeId: string,
    licencieId: string,
    numeroMaillot: number | null,
    poste: PlayerPosition | null
  ): Promise<void> {
    const { error } = await supabase
      .from('VEEC_Collectifs')
      .update({
        numero_maillot: numeroMaillot,
        poste: poste,
      })
      .eq('equipe_id', equipeId)
      .eq('licencie_id', licencieId);

    if (error) {
      throw new Error(error.message || 'Erreur lors de la mise à jour du joueur');
    }
  },

  /**
   * Retirer un joueur d'une équipe
   */
  async removePlayerFromTeam(equipeId: string, licencieId: string): Promise<void> {
    const { error } = await supabase
      .from('VEEC_Collectifs')
      .delete()
      .eq('equipe_id', equipeId)
      .eq('licencie_id', licencieId);

    if (error) {
      throw new Error(error.message || 'Erreur lors de la suppression du joueur de l\'équipe');
    }
  },
};
