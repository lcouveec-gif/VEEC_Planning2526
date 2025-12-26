import { supabase } from '../lib/supabaseClient';
import type { Gymnase } from '../types';

export const gymnasesService = {
  /**
   * Récupérer tous les gymnases avec leur club
   */
  async fetchGymnases(): Promise<Gymnase[]> {
    const { data, error } = await supabase
      .from('gymnases')
      .select(`
        *,
        club:clubs(code_club, nom, nom_court, ville, logo_url)
      `)
      .order('nom', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Erreur lors du chargement des gymnases');
    }

    return data || [];
  },

  /**
   * Rechercher un gymnase par nom avec son club
   */
  async searchGymnases(searchTerm: string): Promise<Gymnase[]> {
    const { data, error } = await supabase
      .from('gymnases')
      .select(`
        *,
        club:clubs(code_club, nom, nom_court, ville, logo_url)
      `)
      .or(`nom.ilike.%${searchTerm}%,adresse.ilike.%${searchTerm}%,ville.ilike.%${searchTerm}%`)
      .order('nom', { ascending: true});

    if (error) {
      throw new Error(error.message || 'Erreur lors de la recherche de gymnases');
    }

    return data || [];
  },

  /**
   * Récupérer un gymnase par son nom exact avec son club
   */
  async getGymnaseByNom(nom: string): Promise<Gymnase | null> {
    const { data, error } = await supabase
      .from('gymnases')
      .select(`
        *,
        club:clubs(code_club, nom, nom_court, ville, logo_url)
      `)
      .eq('nom', nom)
      .single();

    if (error) {
      return null;
    }

    return data;
  },

  /**
   * Récupérer un gymnase par son ID avec son club
   */
  async getGymnaseById(id: string): Promise<Gymnase | null> {
    const { data, error } = await supabase
      .from('gymnases')
      .select(`
        *,
        club:clubs(code_club, nom, nom_court, ville, logo_url)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return data;
  },

  /**
   * Créer un nouveau gymnase
   */
  async createGymnase(gymnase: Omit<Gymnase, 'id' | 'created_at' | 'updated_at'>): Promise<Gymnase> {
    const { data, error } = await supabase
      .from('gymnases')
      .insert([gymnase])
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Erreur lors de la création du gymnase');
    }

    if (!data) {
      throw new Error('Aucune donnée retournée après la création');
    }

    return data;
  },

  /**
   * Mettre à jour un gymnase
   */
  async updateGymnase(id: string, updates: Partial<Gymnase>): Promise<Gymnase> {
    console.log('🔧 updateGymnase service appelé:', { id, updates });

    // Effectuer l'update avec count pour vérifier combien de lignes sont affectées
    const { data: updateData, error: updateError, count } = await supabase
      .from('gymnases')
      .update(updates)
      .eq('id', id)
      .select('*', { count: 'exact' });

    console.log('📊 Résultat update Supabase:', { updateData, error: updateError, count });

    if (updateError) {
      console.error('❌ Erreur Supabase update:', updateError);
      throw new Error(updateError.message || 'Erreur lors de la mise à jour du gymnase');
    }

    if (!updateData || updateData.length === 0) {
      console.warn('⚠️ Aucune ligne affectée par l\'update');
      throw new Error('Aucun gymnase trouvé avec cet ID ou modification bloquée par RLS');
    }

    // Récupérer ensuite les données mises à jour avec le club
    const { data, error: selectError } = await supabase
      .from('gymnases')
      .select(`
        *,
        club:clubs(code_club, nom, nom_court, ville, logo_url)
      `)
      .eq('id', id)
      .single();

    console.log('📥 Données récupérées après update:', data);

    if (selectError || !data) {
      throw new Error(`Erreur lors de la récupération des données: ${selectError?.message || 'Gymnase introuvable'}`);
    }

    return data;
  },

  /**
   * Supprimer un gymnase
   */
  async deleteGymnase(id: string): Promise<void> {
    const { error } = await supabase
      .from('gymnases')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Erreur lors de la suppression du gymnase');
    }
  },

  /**
   * Géocoder une adresse pour obtenir les coordonnées GPS
   * Utilise l'API Geocoding de Google Maps
   */
  async geocodeAddress(adresse: string, ville?: string, codePostal?: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      // Construire l'adresse complète
      const fullAddress = [adresse, codePostal, ville].filter(Boolean).join(', ');
      console.log('🗺️ Géocodage de l\'adresse:', fullAddress);

      // Note: Vous devrez ajouter votre clé API Google Maps
      // dans les variables d'environnement: VITE_GOOGLE_MAPS_API_KEY
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        console.warn('❌ VITE_GOOGLE_MAPS_API_KEY non définie');
        return null;
      }

      console.log('🔑 API Key présente:', apiKey.substring(0, 10) + '...');

      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;
      console.log('🌐 URL appelée:', url.replace(apiKey, 'API_KEY_HIDDEN'));

      const response = await fetch(url);
      const data = await response.json();

      console.log('📡 Réponse Google Maps API:', data);

      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        console.log('✅ Coordonnées trouvées:', location);
        return {
          latitude: location.lat,
          longitude: location.lng,
        };
      }

      console.warn('⚠️ Géocodage échoué. Status:', data.status);
      if (data.error_message) {
        console.error('❌ Message d\'erreur API:', data.error_message);
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur géocodage:', error);
      return null;
    }
  },
};
