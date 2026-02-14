import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Licencie } from '../types';

export interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
}

interface UseLicenciesResult {
  licencies: Licencie[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createLicencie: (entry: Omit<Licencie, 'id' | 'created_at'>) => Promise<Licencie | null>;
  updateLicencie: (id: string, updates: Partial<Licencie>) => Promise<boolean>;
  deleteLicencie: (id: string) => Promise<boolean>;
  importLicencies: (entries: Omit<Licencie, 'id' | 'created_at'>[]) => Promise<ImportResult>;
}

export function useLicencies(): UseLicenciesResult {
  const [licencies, setLicencies] = useState<Licencie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLicencies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('VEEC_Licencie')
        .select('*')
        .order('Nom_Licencie', { ascending: true })
        .order('Prenom_Licencie', { ascending: true });

      if (supabaseError) throw supabaseError;

      setLicencies(data || []);
    } catch (err: any) {
      console.error('Error fetching licencies:', err);
      setError(err.message || 'Une erreur est survenue lors du chargement des licenciés.');
      setLicencies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createLicencie = async (entry: Omit<Licencie, 'id' | 'created_at'>): Promise<Licencie | null> => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('VEEC_Licencie')
        .insert([entry])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      await fetchLicencies();
      return data;
    } catch (err: any) {
      console.error('Error creating licencie:', err);
      setError(err.message || 'Erreur lors de la création du licencié.');
      return null;
    }
  };

  const updateLicencie = async (id: string, updates: Partial<Licencie>): Promise<boolean> => {
    try {
      const { error: supabaseError } = await supabase
        .from('VEEC_Licencie')
        .update(updates)
        .eq('id', id);

      if (supabaseError) throw supabaseError;

      await fetchLicencies();
      return true;
    } catch (err: any) {
      console.error('Error updating licencie:', err);
      setError(err.message || 'Erreur lors de la mise à jour du licencié.');
      return false;
    }
  };

  const deleteLicencie = async (id: string): Promise<boolean> => {
    try {
      const { error: supabaseError } = await supabase
        .from('VEEC_Licencie')
        .delete()
        .eq('id', id);

      if (supabaseError) throw supabaseError;

      await fetchLicencies();
      return true;
    } catch (err: any) {
      console.error('Error deleting licencie:', err);
      setError(err.message || 'Erreur lors de la suppression du licencié.');
      return false;
    }
  };

  const importLicencies = async (entries: Omit<Licencie, 'id' | 'created_at'>[]): Promise<ImportResult> => {
    const result: ImportResult = { created: 0, updated: 0, errors: [] };

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const numLicence = String(entry.Num_Licencie || '').trim();

      try {
        // Chercher par Num_Licencie si présent
        const existing = numLicence
          ? licencies.find(l => String(l.Num_Licencie || '').trim() === numLicence)
          : null;

        if (existing) {
          // Mise à jour
          const { error: updateError } = await supabase
            .from('VEEC_Licencie')
            .update({
              Nom_Licencie: entry.Nom_Licencie || null,
              Prenom_Licencie: entry.Prenom_Licencie,
              Date_Naissance_licencie: entry.Date_Naissance_licencie || null,
              Categorie_licencie: entry.Categorie_licencie || null,
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
          result.updated++;
        } else {
          // Création
          const { error: insertError } = await supabase
            .from('VEEC_Licencie')
            .insert([{
              Nom_Licencie: entry.Nom_Licencie || null,
              Prenom_Licencie: entry.Prenom_Licencie,
              Num_Licencie: entry.Num_Licencie || null,
              Date_Naissance_licencie: entry.Date_Naissance_licencie || null,
              Categorie_licencie: entry.Categorie_licencie || null,
            }]);

          if (insertError) throw insertError;
          result.created++;
        }
      } catch (err: any) {
        result.errors.push(`Ligne ${i + 2}: ${entry.Prenom_Licencie} ${entry.Nom_Licencie || ''} - ${err.message}`);
      }
    }

    await fetchLicencies();
    return result;
  };

  useEffect(() => {
    fetchLicencies();
  }, [fetchLicencies]);

  return {
    licencies,
    loading,
    error,
    refetch: fetchLicencies,
    createLicencie,
    updateLicencie,
    deleteLicencie,
    importLicencies,
  };
}
