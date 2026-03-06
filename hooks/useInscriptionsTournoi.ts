import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import type { InscriptionTournoi, ImportTournoiResult } from '../types';

interface UseInscriptionsTournoiResult {
  inscriptions: InscriptionTournoi[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createInscription: (data: Omit<InscriptionTournoi, 'created_at' | 'updated_at'>) => Promise<InscriptionTournoi | null>;
  updateInscription: (numeroBillet: number, updates: Partial<InscriptionTournoi>) => Promise<boolean>;
  deleteInscription: (numeroBillet: number) => Promise<boolean>;
  importFromExcel: (file: File, tournoiId: number) => Promise<ImportTournoiResult>;
}

// Convertit une valeur de date Excel (serial number ou Date) en ISO string
function toISO(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') {
    if (val.includes('-') || val.includes('/')) return val;
    return val;
  }
  if (typeof val === 'number') {
    // Serial Excel : jours depuis 1900-01-01 (avec le bug bissextile 1900)
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString();
  }
  return null;
}

function buildCustomFields(row: Record<string, unknown>): Record<string, string | null> | null {
  // Email et Téléphone sont des champs variables HelloAsso (col Q+), pas des champs fixes
  const fields: Record<string, string | null> = {
    email: (row['Email'] as string) || null,
    telephone: (row['Téléphone'] as string) || null,
    equipe: (row['Equipe'] as string) || null,
    niveau_equipe: (row["Niveau de l'équipe"] as string) || null,
    nom_equipe: (row["Nom d'équipe"] as string) || null,
    clubs_origine: (row["Club(s) d'origine"] as string) || null,
    commentaire: (row['Commentaire éventuel'] as string) || null,
    liste_campeurs: (row['Liste des campeurs'] as string) || null,
  };
  const hasValues = Object.values(fields).some(v => v !== null);
  return hasValues ? fields : null;
}

// Génère un numero_billet pour les inscriptions manuelles (hors HelloAsso)
// Préfixe 9_000_000_000 + timestamp partiel pour éviter tout conflit avec HelloAsso (~9 chiffres)
export function generateManualBillet(): number {
  return 9_000_000_000 + (Date.now() % 1_000_000_000);
}

export function useInscriptionsTournoi(tournoiId: number | null): UseInscriptionsTournoiResult {
  const [inscriptions, setInscriptions] = useState<InscriptionTournoi[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInscriptions = useCallback(async () => {
    if (!tournoiId) {
      setInscriptions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('inscriptions_tournoi')
        .select('*')
        .eq('tournoi_id', tournoiId)
        .order('numero_billet', { ascending: true });

      if (supabaseError) throw supabaseError;

      setInscriptions(data || []);
    } catch (err: any) {
      console.error('Error fetching inscriptions_tournoi:', err);
      setError(err.message || 'Erreur lors du chargement des inscriptions.');
      setInscriptions([]);
    } finally {
      setLoading(false);
    }
  }, [tournoiId]);

  const createInscription = async (
    data: Omit<InscriptionTournoi, 'created_at' | 'updated_at'>
  ): Promise<InscriptionTournoi | null> => {
    try {
      const { data: created, error: supabaseError } = await supabase
        .from('inscriptions_tournoi')
        .insert([data])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      await fetchInscriptions();
      return created;
    } catch (err: any) {
      console.error('Error creating inscription:', err);
      setError(err.message || 'Erreur lors de la création du billet.');
      return null;
    }
  };

  const updateInscription = async (
    numeroBillet: number,
    updates: Partial<InscriptionTournoi>
  ): Promise<boolean> => {
    try {
      const { error: supabaseError } = await supabase
        .from('inscriptions_tournoi')
        .update(updates)
        .eq('numero_billet', numeroBillet);

      if (supabaseError) throw supabaseError;

      await fetchInscriptions();
      return true;
    } catch (err: any) {
      console.error('Error updating inscription:', err);
      setError(err.message || 'Erreur lors de la mise à jour du billet.');
      return false;
    }
  };

  const deleteInscription = async (numeroBillet: number): Promise<boolean> => {
    try {
      const { error: supabaseError } = await supabase
        .from('inscriptions_tournoi')
        .delete()
        .eq('numero_billet', numeroBillet);

      if (supabaseError) throw supabaseError;

      await fetchInscriptions();
      return true;
    } catch (err: any) {
      console.error('Error deleting inscription:', err);
      setError(err.message || 'Erreur lors de la suppression de l\'inscription.');
      return false;
    }
  };

  const importFromExcel = async (
    file: File,
    tournoiId: number
  ): Promise<ImportTournoiResult> => {
    const result: ImportTournoiResult = { upserted: 0, errors: [] };

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

      const records: InscriptionTournoi[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const numeroBilletRaw = row['Numéro de billet'];
        if (!numeroBilletRaw) continue;

        try {
          const record: InscriptionTournoi = {
            numero_billet: Number(numeroBilletRaw),
            tournoi_id: tournoiId,
            reference_commande: row['Référence commande'] ? Number(row['Référence commande']) : null,
            date_commande: toISO(row['Date de la commande']),
            statut_commande: (row['Statut de la commande'] as string) || null,
            nom_participant: (row['Nom participant'] as string) || null,
            prenom_participant: (row['Prénom participant'] as string) || null,
            nom_payeur: (row['Nom payeur'] as string) || null,
            prenom_payeur: (row['Prénom payeur'] as string) || null,
            email_payeur: (row['Email payeur'] as string) || null,
            moyen_paiement: (row['Moyen de paiement'] as string) || null,
            tarif: (row['Tarif'] as string) || null,
            montant_tarif: row['Montant tarif'] ? parseFloat(String(row['Montant tarif'])) : null,
            code_promo: (row['Code Promo'] as string) || null,
            montant_code_promo: row['Montant code promo'] ? parseFloat(String(row['Montant code promo'])) : null,
            custom_fields: buildCustomFields(row),
          };
          records.push(record);
        } catch (err: any) {
          result.errors.push(`Ligne ${i + 2}: ${err.message}`);
        }
      }

      if (records.length === 0) {
        result.errors.push('Aucune ligne valide trouvée dans le fichier (colonne "Numéro de billet" manquante ?)');
        return result;
      }

      // Upsert par batch de 100
      const BATCH_SIZE = 100;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const { error: upsertError } = await supabase
          .from('inscriptions_tournoi')
          .upsert(batch, { onConflict: 'numero_billet' });

        if (upsertError) {
          result.errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${upsertError.message}`);
        } else {
          result.upserted += batch.length;
        }
      }

      await fetchInscriptions();
    } catch (err: any) {
      result.errors.push(`Erreur de lecture du fichier: ${err.message}`);
    }

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
    importFromExcel,
  };
}
