import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { StageInscription, ImportInscriptionResult } from '../types';

interface UseStageInscriptionsResult {
  inscriptions: StageInscription[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createInscription: (data: Omit<StageInscription, 'id' | 'created_at'>) => Promise<StageInscription | null>;
  updateInscription: (id: string, updates: Partial<StageInscription>) => Promise<boolean>;
  deleteInscription: (id: string) => Promise<boolean>;
  importInscriptions: (entries: Omit<StageInscription, 'id' | 'created_at'>[]) => Promise<ImportInscriptionResult>;
}

export function useStageInscriptions(stageId: string): UseStageInscriptionsResult {
  const [inscriptions, setInscriptions] = useState<StageInscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInscriptions = useCallback(async () => {
    if (!stageId) {
      setInscriptions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('stage_inscriptions')
        .select('*')
        .eq('stage_id', stageId)
        .order('nom', { ascending: true })
        .order('prenom', { ascending: true });

      if (supabaseError) throw supabaseError;

      setInscriptions(data || []);
    } catch (err: any) {
      console.error('Error fetching inscriptions:', err);
      setError(err.message || 'Erreur lors du chargement des inscriptions.');
      setInscriptions([]);
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  const buildPayload = (data: Omit<StageInscription, 'id' | 'created_at'>) => ({
    stage_id: stageId,
    nom: data.nom || null,
    prenom: data.prenom,
    categorie: data.categorie || null,
    genre: data.genre || null,
    niveau: data.niveau || null,
    num_licence: data.num_licence || null,
    type_inscription: data.type_inscription,
    type_participant: data.type_participant,
    jours: data.jours && data.jours.length > 0 ? data.jours : null,
    nb_jours: data.jours && data.jours.length > 0 ? data.jours.length : (data.nb_jours ?? null),
    montant: data.montant ?? null,
    notes: data.notes || null,
  });

  const createInscription = async (
    data: Omit<StageInscription, 'id' | 'created_at'>
  ): Promise<StageInscription | null> => {
    try {
      const { data: created, error: supabaseError } = await supabase
        .from('stage_inscriptions')
        .insert([buildPayload(data)])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      await fetchInscriptions();
      return created;
    } catch (err: any) {
      console.error('Error creating inscription:', err);
      setError(err.message || 'Erreur lors de la création de l\'inscription.');
      return null;
    }
  };

  const updateInscription = async (id: string, updates: Partial<StageInscription>): Promise<boolean> => {
    try {
      // Recalcule nb_jours si jours est fourni
      const payload: Record<string, any> = { ...updates };
      if (updates.jours !== undefined) {
        payload.nb_jours = updates.jours && updates.jours.length > 0 ? updates.jours.length : null;
        payload.jours = updates.jours && updates.jours.length > 0 ? updates.jours : null;
      }

      const { error: supabaseError } = await supabase
        .from('stage_inscriptions')
        .update(payload)
        .eq('id', id);

      if (supabaseError) throw supabaseError;

      await fetchInscriptions();
      return true;
    } catch (err: any) {
      console.error('Error updating inscription:', err);
      setError(err.message || 'Erreur lors de la mise à jour de l\'inscription.');
      return false;
    }
  };

  const deleteInscription = async (id: string): Promise<boolean> => {
    try {
      const { error: supabaseError } = await supabase
        .from('stage_inscriptions')
        .delete()
        .eq('id', id);

      if (supabaseError) throw supabaseError;

      await fetchInscriptions();
      return true;
    } catch (err: any) {
      console.error('Error deleting inscription:', err);
      setError(err.message || 'Erreur lors de la suppression de l\'inscription.');
      return false;
    }
  };

  const importInscriptions = async (
    entries: Omit<StageInscription, 'id' | 'created_at'>[]
  ): Promise<ImportInscriptionResult> => {
    const result: ImportInscriptionResult = { created: 0, updated: 0, errors: [] };

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const numLicence = String(entry.num_licence || '').trim();
      const prenomNorm = entry.prenom.trim().toLowerCase();
      const nomNorm = String(entry.nom || '').trim().toLowerCase();

      try {
        let existing: StageInscription | undefined;

        if (numLicence) {
          existing = inscriptions.find(
            ins => String(ins.num_licence || '').trim() === numLicence
          );
        } else {
          existing = inscriptions.find(
            ins =>
              ins.prenom.trim().toLowerCase() === prenomNorm &&
              String(ins.nom || '').trim().toLowerCase() === nomNorm
          );
        }

        const payload = buildPayload(entry);

        if (existing) {
          const { error: updateError } = await supabase
            .from('stage_inscriptions')
            .update(payload)
            .eq('id', existing.id);

          if (updateError) throw updateError;
          result.updated++;
        } else {
          const { error: insertError } = await supabase
            .from('stage_inscriptions')
            .insert([payload]);

          if (insertError) throw insertError;
          result.created++;
        }
      } catch (err: any) {
        result.errors.push(`Ligne ${i + 2}: ${entry.prenom} ${entry.nom || ''} - ${err.message}`);
      }
    }

    await fetchInscriptions();
    return result;
  };

  useEffect(() => {
    fetchInscriptions();
  }, [fetchInscriptions]);

  return {
    inscriptions,
    loading,
    error,
    refetch: fetchInscriptions,
    createInscription,
    updateInscription,
    deleteInscription,
    importInscriptions,
  };
}
