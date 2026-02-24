import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { StageGroupe, StageGroupeMembre, StageGroupeEncadrant, RoleGroupeEncadrant } from '../types';

interface UseStageGroupesResult {
  groupes: StageGroupe[];
  membres: StageGroupeMembre[];
  groupeEncadrants: StageGroupeEncadrant[];
  loading: boolean;
  copying: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createGroupe: (date: string, nom: string, terrain?: string | null) => Promise<StageGroupe | null>;
  updateGroupe: (id: string, updates: Partial<Pick<StageGroupe, 'nom' | 'terrain'>>) => Promise<boolean>;
  deleteGroupe: (id: string) => Promise<boolean>;
  setMembre: (groupeId: string, inscriptionId: string, assign: boolean) => Promise<boolean>;
  setGroupeEncadrant: (groupeId: string, encadrantId: string, role: RoleGroupeEncadrant | null) => Promise<boolean>;
  copyFromDay: (sourceDate: string, targetDate: string) => Promise<boolean>;
  getGroupesForDate: (date: string) => StageGroupe[];
  getMembresForGroupe: (groupeId: string) => StageGroupeMembre[];
  getEncadrantsForGroupe: (groupeId: string) => StageGroupeEncadrant[];
  getDatesWithGroupes: () => string[];
}

export function useStageGroupes(stageId: string): UseStageGroupesResult {
  const [groupes, setGroupes] = useState<StageGroupe[]>([]);
  const [membres, setMembres] = useState<StageGroupeMembre[]>([]);
  const [groupeEncadrants, setGroupeEncadrants] = useState<StageGroupeEncadrant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copying, setCopying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!stageId) {
      setGroupes([]);
      setMembres([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // Fetch groupes
      const { data: groupesData, error: gErr } = await supabase
        .from('stage_groupes')
        .select('*')
        .eq('stage_id', stageId)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (gErr) throw gErr;
      const groupesList: StageGroupe[] = groupesData || [];
      setGroupes(groupesList);

      // Fetch membres et encadrants pour ces groupes
      if (groupesList.length > 0) {
        const groupeIds = groupesList.map(g => g.id);
        const [{ data: membresData, error: mErr }, { data: encData, error: encErr }] = await Promise.all([
          supabase.from('stage_groupe_membres').select('*').in('groupe_id', groupeIds),
          supabase.from('stage_groupe_encadrants').select('*').in('groupe_id', groupeIds),
        ]);

        if (mErr) throw mErr;
        if (encErr) throw encErr;
        setMembres(membresData || []);
        setGroupeEncadrants(encData || []);
      } else {
        setMembres([]);
        setGroupeEncadrants([]);
      }
    } catch (err: any) {
      console.error('Error fetching groupes:', err);
      setError(err.message || 'Erreur lors du chargement des groupes.');
      setGroupes([]);
      setMembres([]);
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  const createGroupe = async (
    date: string,
    nom: string,
    terrain?: string | null,
  ): Promise<StageGroupe | null> => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('stage_groupes')
        .insert([{ stage_id: stageId, date, nom: nom.trim(), terrain: terrain || null }])
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      await fetchAll();
      return data;
    } catch (err: any) {
      console.error('Error creating groupe:', err);
      setError(err.message || 'Erreur lors de la création du groupe.');
      return null;
    }
  };

  const updateGroupe = async (
    id: string,
    updates: Partial<Pick<StageGroupe, 'nom' | 'terrain'>>,
  ): Promise<boolean> => {
    try {
      const { error: supabaseError } = await supabase
        .from('stage_groupes')
        .update(updates)
        .eq('id', id);

      if (supabaseError) throw supabaseError;
      await fetchAll();
      return true;
    } catch (err: any) {
      console.error('Error updating groupe:', err);
      setError(err.message || 'Erreur lors de la mise à jour du groupe.');
      return false;
    }
  };

  const deleteGroupe = async (id: string): Promise<boolean> => {
    try {
      // Supprimer d'abord les membres
      const { error: mErr } = await supabase
        .from('stage_groupe_membres')
        .delete()
        .eq('groupe_id', id);

      if (mErr) throw mErr;

      const { error: gErr } = await supabase
        .from('stage_groupes')
        .delete()
        .eq('id', id);

      if (gErr) throw gErr;
      await fetchAll();
      return true;
    } catch (err: any) {
      console.error('Error deleting groupe:', err);
      setError(err.message || 'Erreur lors de la suppression du groupe.');
      return false;
    }
  };

  const setMembre = async (
    groupeId: string,
    inscriptionId: string,
    assign: boolean,
  ): Promise<boolean> => {
    try {
      if (assign) {
        const { error: supabaseError } = await supabase
          .from('stage_groupe_membres')
          .upsert({ groupe_id: groupeId, inscription_id: inscriptionId }, { onConflict: 'groupe_id,inscription_id' });

        if (supabaseError) throw supabaseError;
        // Optimistic update
        setMembres(prev => {
          if (prev.some(m => m.groupe_id === groupeId && m.inscription_id === inscriptionId)) return prev;
          return [...prev, { id: crypto.randomUUID(), groupe_id: groupeId, inscription_id: inscriptionId }];
        });
      } else {
        const { error: supabaseError } = await supabase
          .from('stage_groupe_membres')
          .delete()
          .eq('groupe_id', groupeId)
          .eq('inscription_id', inscriptionId);

        if (supabaseError) throw supabaseError;
        // Optimistic update
        setMembres(prev => prev.filter(m => !(m.groupe_id === groupeId && m.inscription_id === inscriptionId)));
      }
      return true;
    } catch (err: any) {
      console.error('Error setting membre:', err);
      setError(err.message || 'Erreur lors de la modification du groupe.');
      await fetchAll(); // resync
      return false;
    }
  };

  const setGroupeEncadrant = async (
    groupeId: string,
    encadrantId: string,
    role: RoleGroupeEncadrant | null,
  ): Promise<boolean> => {
    try {
      if (role === null) {
        // Retirer l'encadrant du groupe
        const { error: delErr } = await supabase
          .from('stage_groupe_encadrants')
          .delete()
          .eq('groupe_id', groupeId)
          .eq('encadrant_id', encadrantId);
        if (delErr) throw delErr;
        setGroupeEncadrants(prev =>
          prev.filter(ge => !(ge.groupe_id === groupeId && ge.encadrant_id === encadrantId))
        );
      } else {
        // Ajouter ou changer le rôle (upsert)
        const { data, error: upsErr } = await supabase
          .from('stage_groupe_encadrants')
          .upsert({ groupe_id: groupeId, encadrant_id: encadrantId, role }, { onConflict: 'groupe_id,encadrant_id' })
          .select()
          .single();
        if (upsErr) throw upsErr;
        setGroupeEncadrants(prev => {
          const filtered = prev.filter(ge => !(ge.groupe_id === groupeId && ge.encadrant_id === encadrantId));
          return [...filtered, data];
        });
      }
      return true;
    } catch (err: any) {
      console.error('Error setting groupe encadrant:', err);
      setError(err.message || 'Erreur lors de la modification de l\'encadrant du groupe.');
      return false;
    }
  };

  const copyFromDay = async (sourceDate: string, targetDate: string): Promise<boolean> => {
    const sourceGroupes = groupes.filter(g => g.date === sourceDate);
    if (sourceGroupes.length === 0) return true;

    setCopying(true);
    setError(null);
    try {
      // 1. Supprimer les groupes existants du jour cible
      const targetGroupes = groupes.filter(g => g.date === targetDate);
      if (targetGroupes.length > 0) {
        const targetIds = targetGroupes.map(g => g.id);
        const { error: mDelErr } = await supabase
          .from('stage_groupe_membres')
          .delete()
          .in('groupe_id', targetIds);
        if (mDelErr) throw mDelErr;

        const { error: gDelErr } = await supabase
          .from('stage_groupes')
          .delete()
          .in('id', targetIds);
        if (gDelErr) throw gDelErr;
      }

      // 2. Recréer les groupes sources sur le jour cible avec leurs membres
      for (const sg of sourceGroupes) {
        const { data: newGroupe, error: createErr } = await supabase
          .from('stage_groupes')
          .insert([{ stage_id: stageId, date: targetDate, nom: sg.nom, terrain: sg.terrain || null }])
          .select()
          .single();
        if (createErr) throw createErr;

        const sourceMembres = membres.filter(m => m.groupe_id === sg.id);
        if (sourceMembres.length > 0) {
          const { error: mInsErr } = await supabase
            .from('stage_groupe_membres')
            .insert(sourceMembres.map(m => ({
              groupe_id: newGroupe.id,
              inscription_id: m.inscription_id,
            })));
          if (mInsErr) throw mInsErr;
        }
      }

      await fetchAll();
      return true;
    } catch (err: any) {
      console.error('Error copying groups:', err);
      setError(err.message || 'Erreur lors de la copie des groupes.');
      await fetchAll(); // resync
      return false;
    } finally {
      setCopying(false);
    }
  };

  const getGroupesForDate = (date: string): StageGroupe[] =>
    groupes.filter(g => g.date === date);

  const getMembresForGroupe = (groupeId: string): StageGroupeMembre[] =>
    membres.filter(m => m.groupe_id === groupeId);

  const getEncadrantsForGroupe = (groupeId: string): StageGroupeEncadrant[] =>
    groupeEncadrants.filter(ge => ge.groupe_id === groupeId);

  const getDatesWithGroupes = (): string[] =>
    [...new Set(groupes.map(g => g.date))].sort();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    groupes,
    membres,
    groupeEncadrants,
    loading,
    copying,
    error,
    refetch: fetchAll,
    createGroupe,
    updateGroupe,
    deleteGroupe,
    setMembre,
    setGroupeEncadrant,
    copyFromDay,
    getGroupesForDate,
    getMembresForGroupe,
    getEncadrantsForGroupe,
    getDatesWithGroupes,
  };
}
