import { supabase } from '../lib/supabaseClient';
import type { Club } from '../types';

/**
 * Service pour gérer les clubs de volley et leurs logos
 */
export const clubsService = {
  /**
   * Récupérer tous les clubs
   */
  async fetchClubs(): Promise<Club[]> {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .order('nom', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Erreur lors du chargement des clubs');
    }

    return data || [];
  },

  /**
   * Rechercher un club par nom (partiel) ou code
   */
  async searchClubs(searchTerm: string): Promise<Club[]> {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .or(`nom.ilike.%${searchTerm}%,nom_court.ilike.%${searchTerm}%,ville.ilike.%${searchTerm}%,code_club.ilike.%${searchTerm}%`)
      .order('nom', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Erreur lors de la recherche de clubs');
    }

    return data || [];
  },

  /**
   * Récupérer un club par son code
   */
  async getClubByCode(codeClub: string): Promise<Club | null> {
    // Extraire les 7 premiers caractères pour le code club
    const cleanCode = codeClub?.substring(0, 7);

    if (!cleanCode) return null;

    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .eq('code_club', cleanCode)
      .single();

    if (error) {
      return null; // Ne pas throw, juste retourner null si pas trouvé
    }

    return data;
  },

  /**
   * Créer un nouveau club
   */
  async createClub(club: Omit<Club, 'created_at' | 'updated_at'>): Promise<Club> {
    const { data, error } = await supabase
      .from('clubs')
      .insert([club])
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Erreur lors de la création du club');
    }

    if (!data) {
      throw new Error('Aucune donnée retournée après création');
    }

    return data;
  },

  /**
   * Mettre à jour un club
   */
  async updateClub(codeClub: string, updates: Partial<Club>): Promise<Club> {
    const { data, error } = await supabase
      .from('clubs')
      .update(updates)
      .eq('code_club', codeClub)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Erreur lors de la mise à jour du club');
    }

    if (!data) {
      throw new Error(`Aucun club trouvé avec le code: "${codeClub}"`);
    }

    return data;
  },

  /**
   * Supprimer un club
   */
  async deleteClub(codeClub: string): Promise<void> {
    const { error } = await supabase
      .from('clubs')
      .delete()
      .eq('code_club', codeClub);

    if (error) {
      throw new Error(error.message || 'Erreur lors de la suppression du club');
    }
  },

  /**
   * Uploader un logo de club
   * Le nom du fichier sera automatiquement: code_club.png
   */
  async uploadLogo(codeClub: string, file: File): Promise<string | null> {
    try {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        throw new Error('Le fichier doit être une image');
      }

      // Vérifier la taille (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('L\'image ne doit pas dépasser 2 MB');
      }

      // Nom de fichier basé sur le code club: code_club.png
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${codeClub}.${fileExt}`;

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('club-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true, // Remplacer si existe déjà
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtenir l'URL publique
      const { data } = supabase.storage
        .from('club-logos')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Erreur upload logo:', error);
      return null;
    }
  },

  /**
   * Supprimer un logo de club
   */
  async deleteLogo(logoUrl: string): Promise<boolean> {
    try {
      // Extraire le nom du fichier de l'URL
      const urlParts = logoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      const { error } = await supabase.storage
        .from('club-logos')
        .remove([fileName]);

      if (error) {
        console.error('Erreur suppression logo:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur suppression logo:', error);
      return false;
    }
  },
};
