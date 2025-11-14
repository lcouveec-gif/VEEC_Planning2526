import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Licencie } from '../types';

interface UseLicenciesResult {
  licencies: Licencie[];
  loading: boolean;
  error: string | null;
}

export function useLicencies(): UseLicenciesResult {
  const [licencies, setLicencies] = useState<Licencie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLicencies = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: supabaseError } = await supabase
          .from('VEEC_Licencie')
          .select('*')
          .order('Nom_Licencie', { ascending: true })
          .order('Prenom_Licencie', { ascending: true });

        if (supabaseError) {
          throw supabaseError;
        }

        setLicencies(data || []);
      } catch (err: any) {
        console.error('Error fetching licencies:', err);
        setError(err.message || 'Une erreur est survenue lors du chargement des licenciés.');
        setLicencies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLicencies();
  }, []);

  return {
    licencies,
    loading,
    error,
  };
}
