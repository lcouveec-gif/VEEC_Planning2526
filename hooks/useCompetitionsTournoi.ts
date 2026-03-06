import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { CompetitionTournoi, EquipeCompetitionTournoi, InscriptionTournoi } from '../types';

// ─── Hook : compétitions d'un tournoi ─────────────────────────────────────────

interface UseCompetitionsTournoiResult {
  competitions: CompetitionTournoi[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCompetition: (data: Omit<CompetitionTournoi, 'id' | 'created_at'>) => Promise<CompetitionTournoi | null>;
  updateCompetition: (id: number, updates: Partial<Omit<CompetitionTournoi, 'id' | 'created_at'>>) => Promise<boolean>;
  deleteCompetition: (id: number) => Promise<boolean>;
}

export function useCompetitionsTournoi(tournoiId: number | null): UseCompetitionsTournoiResult {
  const [competitions, setCompetitions] = useState<CompetitionTournoi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompetitions = useCallback(async () => {
    if (!tournoiId) { setCompetitions([]); setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('competitions_tournoi')
        .select('*, equipes_competitions_tournoi(count)')
        .eq('tournoi_id', tournoiId)
        .order('nom', { ascending: true });
      if (err) throw err;
      const mapped = (data || []).map((c: any) => ({
        ...c,
        nb_equipes: (c.equipes_competitions_tournoi as { count: number }[] | null)?.[0]?.count ?? 0,
        equipes_competitions_tournoi: undefined,
      }));
      setCompetitions(mapped);
    } catch (e: any) {
      setError(e.message || 'Erreur chargement compétitions.');
      setCompetitions([]);
    } finally {
      setLoading(false);
    }
  }, [tournoiId]);

  const createCompetition = async (data: Omit<CompetitionTournoi, 'id' | 'created_at'>): Promise<CompetitionTournoi | null> => {
    try {
      const { data: created, error: err } = await supabase
        .from('competitions_tournoi').insert([data]).select().single();
      if (err) throw err;
      await fetchCompetitions();
      return created;
    } catch (e: any) {
      setError(e.message); return null;
    }
  };

  const updateCompetition = async (id: number, updates: Partial<Omit<CompetitionTournoi, 'id' | 'created_at'>>): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('competitions_tournoi').update(updates).eq('id', id);
      if (err) throw err;
      await fetchCompetitions();
      return true;
    } catch (e: any) {
      setError(e.message); return false;
    }
  };

  const deleteCompetition = async (id: number): Promise<boolean> => {
    try {
      // Cascade DELETE sur equipes_competitions_tournoi via FK
      const { error: err } = await supabase.from('competitions_tournoi').delete().eq('id', id);
      if (err) throw err;
      await fetchCompetitions();
      return true;
    } catch (e: any) {
      setError(e.message); return false;
    }
  };

  useEffect(() => { fetchCompetitions(); }, [fetchCompetitions]);

  return { competitions, loading, error, refetch: fetchCompetitions, createCompetition, updateCompetition, deleteCompetition };
}

// ─── Hook : équipes d'une compétition ─────────────────────────────────────────

interface UseEquipesCompetitionResult {
  equipes: EquipeCompetitionTournoi[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createEquipe: (data: Omit<EquipeCompetitionTournoi, 'id' | 'created_at'>) => Promise<EquipeCompetitionTournoi | null>;
  updateEquipe: (id: number, updates: Partial<Omit<EquipeCompetitionTournoi, 'id' | 'created_at'>>) => Promise<boolean>;
  deleteEquipe: (id: number) => Promise<boolean>;
  initFromInscriptions: (inscriptions: InscriptionTournoi[], competition: CompetitionTournoi) => Promise<{ created: number; errors: string[] }>;
}

export function useEquipesCompetition(competitionId: number | null): UseEquipesCompetitionResult {
  const [equipes, setEquipes] = useState<EquipeCompetitionTournoi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipes = useCallback(async () => {
    if (!competitionId) { setEquipes([]); setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('equipes_competitions_tournoi')
        .select('*')
        .eq('competition_id', competitionId)
        .order('nom_equipe', { ascending: true });
      if (err) throw err;
      setEquipes(data || []);
    } catch (e: any) {
      setError(e.message || 'Erreur chargement équipes.');
      setEquipes([]);
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  const createEquipe = async (data: Omit<EquipeCompetitionTournoi, 'id' | 'created_at'>): Promise<EquipeCompetitionTournoi | null> => {
    try {
      const { data: created, error: err } = await supabase
        .from('equipes_competitions_tournoi').insert([data]).select().single();
      if (err) throw err;
      await fetchEquipes();
      return created;
    } catch (e: any) {
      setError(e.message); return null;
    }
  };

  const updateEquipe = async (id: number, updates: Partial<Omit<EquipeCompetitionTournoi, 'id' | 'created_at'>>): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('equipes_competitions_tournoi').update(updates).eq('id', id);
      if (err) throw err;
      await fetchEquipes();
      return true;
    } catch (e: any) {
      setError(e.message); return false;
    }
  };

  const deleteEquipe = async (id: number): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('equipes_competitions_tournoi').delete().eq('id', id);
      if (err) throw err;
      await fetchEquipes();
      return true;
    } catch (e: any) {
      setError(e.message); return false;
    }
  };

  // Initialise les équipes depuis les inscriptions filtrées par tarifs_eligibles
  // Groupe par custom_fields.nom_equipe, prend le premier billet comme capitaine
  const initFromInscriptions = async (
    inscriptions: InscriptionTournoi[],
    competition: CompetitionTournoi
  ): Promise<{ created: number; errors: string[] }> => {
    const result = { created: 0, errors: [] as string[] };

    const tarifs = competition.tarifs_eligibles ?? [];
    const filtered = tarifs.length > 0
      ? inscriptions.filter(i => i.tarif && tarifs.includes(i.tarif))
      : inscriptions;

    // Exclure les inscriptions sans nom d'équipe
    const avecEquipe = filtered.filter(i => i.custom_fields?.nom_equipe);

    // Grouper par nom_equipe (insensible à la casse)
    const groupes = new Map<string, InscriptionTournoi[]>();
    for (const ins of avecEquipe) {
      const key = (ins.custom_fields!.nom_equipe ?? '').trim();
      if (!key) continue;
      if (!groupes.has(key)) groupes.set(key, []);
      groupes.get(key)!.push(ins);
    }

    if (groupes.size === 0) {
      result.errors.push('Aucune inscription avec nom d\'équipe trouvée pour ces tarifs.');
      return result;
    }

    // Éviter les doublons : équipes déjà existantes dans cette compétition
    const { data: existing } = await supabase
      .from('equipes_competitions_tournoi')
      .select('nom_equipe')
      .eq('competition_id', competition.id);
    const existingNames = new Set((existing ?? []).map((e: { nom_equipe: string }) => e.nom_equipe.trim().toLowerCase()));

    const toInsert: Omit<EquipeCompetitionTournoi, 'id' | 'created_at'>[] = [];

    for (const [nomEquipe, billets] of groupes) {
      if (existingNames.has(nomEquipe.toLowerCase())) continue;

      // Capitaine = premier billet du groupe (trié par numero_billet)
      const cap = billets.sort((a, b) => a.numero_billet - b.numero_billet)[0];
      const emailContact = cap.custom_fields?.email || cap.email_payeur || null;
      const telContact = cap.custom_fields?.telephone || null;
      const niveauEquipe = cap.custom_fields?.niveau_equipe || null;

      toInsert.push({
        competition_id: competition.id,
        nom_equipe: nomEquipe,
        niveau_equipe: niveauEquipe,
        is_staff: false,
        numero_billet_capitaine: cap.numero_billet,
        nom_contact: cap.nom_participant || null,
        prenom_contact: cap.prenom_participant || null,
        email_contact: emailContact,
        telephone_contact: telContact,
      });
    }

    if (toInsert.length === 0) {
      result.errors.push('Toutes les équipes existent déjà dans cette compétition.');
      return result;
    }

    const { error: insertErr } = await supabase
      .from('equipes_competitions_tournoi')
      .insert(toInsert);

    if (insertErr) {
      result.errors.push(insertErr.message);
    } else {
      result.created = toInsert.length;
      await fetchEquipes();
    }

    return result;
  };

  useEffect(() => { fetchEquipes(); }, [fetchEquipes]);

  return { equipes, loading, error, refetch: fetchEquipes, createEquipe, updateEquipe, deleteEquipe, initFromInscriptions };
}
