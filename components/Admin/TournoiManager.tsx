import React, { useState, useRef } from 'react';
import { useTournois } from '../../hooks/useTournois';
import { useInscriptionsTournoi, generateManualBillet } from '../../hooks/useInscriptionsTournoi';
import { useCompetitionsTournoi, useEquipesCompetition, initAllEquipesFromCompet, initAllEquipesFromTarif } from '../../hooks/useCompetitionsTournoi';
import type { Tournoi, InscriptionTournoi, ImportTournoiResult, CompetitionTournoi, EquipeCompetitionTournoi } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d?: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

const formatEuro = (n?: number | null) =>
  n != null ? `${n.toFixed(2)} €` : '-';

function slugify(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const STATUTS = ['Validée', 'Annulée', 'En attente', 'Sur place'];
const MOYENS_PAIEMENT_MANUEL = ['Sur place', 'Espèces', 'Virement', 'CB', 'Chèque', 'Staff'];

const statutClass = (statut?: string | null) => {
  if (statut === 'Validée' || statut === 'Validé' || statut === 'Processed') return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
  if (statut === 'Annulée' || statut === 'Annulé' || statut === 'Refunded' || statut === 'Cancelled') return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
  if (statut === 'Sur place') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
  return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
};

// ─── Types internes ────────────────────────────────────────────────────────────

type Tab = 'tournois' | 'inscriptions' | 'competitions';
type TournoiViewMode = 'list' | 'form';
type InscriptionViewMode = 'list' | 'form';

interface TournoiFormData {
  slug: string; nom: string; date_debut: string; date_fin: string; lieu: string;
}

const emptyTournoiForm = (): TournoiFormData => ({ slug: '', nom: '', date_debut: '', date_fin: '', lieu: '' });

interface BilletFormData {
  numero_billet: number;
  // ── Champs fixes HelloAsso (colonnes A–P) ──────────────────────────────────
  reference_commande: string;       // présent = origine HelloAsso
  statut_commande: string;
  moyen_paiement: string;           // auto "Carte bancaire" si reference_commande
  nom_participant: string;
  prenom_participant: string;
  tarif: string;
  montant_tarif: string;
  code_promo: string;
  montant_code_promo: string;
  nom_payeur: string;
  prenom_payeur: string;
  email_payeur: string;
  // ── Champs variables HelloAsso (colonnes Q+) ───────────────────────────────
  email: string;
  telephone: string;
  nom_equipe: string;
  niveau_equipe: string;
  equipe: string;
  clubs_origine: string;
  commentaire: string;
}

const emptyBilletForm = (_tournoiId: number): BilletFormData => ({
  numero_billet: generateManualBillet(),
  reference_commande: '',
  statut_commande: 'Validée',
  moyen_paiement: 'Sur place',
  nom_participant: '', prenom_participant: '',
  tarif: '', montant_tarif: '',
  code_promo: '', montant_code_promo: '',
  nom_payeur: '', prenom_payeur: '', email_payeur: '',
  email: '', telephone: '',
  nom_equipe: '', niveau_equipe: '', equipe: '', clubs_origine: '', commentaire: '',
});

// ─── Formulaire billet ────────────────────────────────────────────────────────

interface BilletFormProps {
  form: BilletFormData;
  setForm: (f: BilletFormData) => void;
  isEdit: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const SectionHeader: React.FC<{ label: string; badge: string; badgeColor: string; description: string }> =
  ({ label, badge, badgeColor, description }) => (
    <div className="flex items-center gap-3 mb-3">
      <span className={`px-2 py-0.5 rounded text-xs font-bold tracking-wide ${badgeColor}`}>{badge}</span>
      <span className="text-sm font-semibold text-light-onSurface dark:text-dark-onSurface">{label}</span>
      <span className="text-xs text-gray-400 dark:text-gray-500">{description}</span>
    </div>
  );

const BilletForm: React.FC<BilletFormProps> = ({ form, setForm, isEdit, saving, onSave, onCancel, onDelete }) => {
  const f = form;
  const s = (k: keyof BilletFormData) => (v: string) => setForm({ ...f, [k]: v });

  const isHelloAsso = !!f.reference_commande.trim();

  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface text-sm";
  const inputReadonly = "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm cursor-default";
  const labelClass = "block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400 uppercase tracking-wide";

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-5 shadow-md space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-light-onSurface dark:text-dark-onSurface">
            {isEdit ? `Billet #${f.numero_billet}` : 'Créer un billet manuel'}
          </h3>
          {isEdit && (
            <span className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isHelloAsso
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
            }`}>
              {isHelloAsso ? (
                <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>HelloAsso – Carte bancaire</>
              ) : (
                <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>Inscription manuelle</>
              )}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">N° {f.numero_billet}</span>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1 : Champs fixes HelloAsso (colonnes A–P)
      ══════════════════════════════════════════════════════════════ */}
      <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4 bg-blue-50/30 dark:bg-blue-900/10">
        <SectionHeader
          label="Données HelloAsso"
          badge="CHAMPS FIXES"
          badgeColor="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
          description="Colonnes A–P de l'export HelloAsso"
        />

        {/* Référence commande (détermine l'origine) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Référence commande</label>
            <input
              type="number"
              value={f.reference_commande}
              onChange={e => {
                const ref = e.target.value;
                setForm({
                  ...f,
                  reference_commande: ref,
                  moyen_paiement: ref.trim() ? 'Carte bancaire' : (f.moyen_paiement === 'Carte bancaire' ? 'Sur place' : f.moyen_paiement),
                });
              }}
              className={inputClass}
              placeholder="Ex: 123456 (vide = inscription manuelle)"
              readOnly={isEdit && isHelloAsso}
            />
            {!isEdit && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Laisser vide pour une inscription manuelle
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Moyen de paiement <span className="text-red-500">*</span></label>
            {isHelloAsso ? (
              <input type="text" value="Carte bancaire" readOnly className={inputReadonly} />
            ) : (
              <select value={f.moyen_paiement} onChange={e => s('moyen_paiement')(e.target.value)} className={inputClass}>
                <option value="">-- Sélectionner --</option>
                {MOYENS_PAIEMENT_MANUEL.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Participant */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Prénom <span className="text-red-500">*</span></label>
            <input type="text" value={f.prenom_participant} onChange={e => s('prenom_participant')(e.target.value)} className={inputClass} placeholder="Marie" />
          </div>
          <div>
            <label className={labelClass}>Nom <span className="text-red-500">*</span></label>
            <input type="text" value={f.nom_participant} onChange={e => s('nom_participant')(e.target.value)} className={inputClass} placeholder="DUPONT" />
          </div>
        </div>

        {/* Tarif & montant */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tarif</label>
            <input type="text" value={f.tarif} onChange={e => s('tarif')(e.target.value)} className={inputClass} placeholder="Adulte, Jeune..." />
          </div>
          <div>
            <label className={labelClass}>Montant tarif (€)</label>
            <input type="number" min="0" step="0.01" value={f.montant_tarif} onChange={e => s('montant_tarif')(e.target.value)} className={inputClass} placeholder="0.00" />
          </div>
          <div>
            <label className={labelClass}>Code promo</label>
            <input type="text" value={f.code_promo} onChange={e => s('code_promo')(e.target.value)} className={inputClass} placeholder="" />
          </div>
          <div>
            <label className={labelClass}>Montant code promo (€)</label>
            <input type="number" min="0" step="0.01" value={f.montant_code_promo} onChange={e => s('montant_code_promo')(e.target.value)} className={inputClass} placeholder="0.00" />
          </div>
        </div>

        {/* Statut */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Statut <span className="text-red-500">*</span></label>
            <select value={f.statut_commande} onChange={e => s('statut_commande')(e.target.value)} className={inputClass}>
              {STATUTS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* Payeur */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Payeur</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Prénom payeur</label>
              <input type="text" value={f.prenom_payeur} onChange={e => s('prenom_payeur')(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nom payeur</label>
              <input type="text" value={f.nom_payeur} onChange={e => s('nom_payeur')(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email payeur</label>
              <input type="email" value={f.email_payeur} onChange={e => s('email_payeur')(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2 : Champs variables HelloAsso (colonnes Q+)
      ══════════════════════════════════════════════════════════════ */}
      <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 space-y-4 bg-purple-50/30 dark:bg-purple-900/10">
        <SectionHeader
          label="Données complémentaires"
          badge="CHAMPS VARIABLES"
          badgeColor="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
          description="Colonnes Q+ de l'export HelloAsso (custom_fields)"
        />

        {/* Contact */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Email participant</label>
            <input type="email" value={f.email} onChange={e => s('email')(e.target.value)} className={inputClass} placeholder="marie@email.com" />
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input type="text" value={f.telephone} onChange={e => s('telephone')(e.target.value)} className={inputClass} placeholder="06 12 34 56 78" />
          </div>
        </div>

        {/* Équipe */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Nom d'équipe</label>
            <input type="text" value={f.nom_equipe} onChange={e => s('nom_equipe')(e.target.value)} className={inputClass} placeholder="Les Volcans" />
          </div>
          <div>
            <label className={labelClass}>Niveau équipe</label>
            <input type="text" value={f.niveau_equipe} onChange={e => s('niveau_equipe')(e.target.value)} className={inputClass} placeholder="Régional, National..." />
          </div>
          <div>
            <label className={labelClass}>Rôle / Equipe</label>
            <input type="text" value={f.equipe} onChange={e => s('equipe')(e.target.value)} className={inputClass} placeholder="Joueur, Staff..." />
          </div>
          <div>
            <label className={labelClass}>Club(s) d'origine</label>
            <input type="text" value={f.clubs_origine} onChange={e => s('clubs_origine')(e.target.value)} className={inputClass} placeholder="VEEC, ..." />
          </div>
        </div>

        <div>
          <label className={labelClass}>Commentaire</label>
          <textarea value={f.commentaire} onChange={e => s('commentaire')(e.target.value)} className={`${inputClass} resize-none`} rows={2} placeholder="Informations complémentaires..." />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button onClick={onSave} disabled={saving}
          className="px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors text-sm">
          {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer le billet'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">
          Annuler
        </button>
        {isEdit && onDelete && (
          <button onClick={onDelete}
            className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm">
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Convertit InscriptionTournoi → BilletFormData ───────────────────────────

function inscriptionToForm(ins: InscriptionTournoi): BilletFormData {
  return {
    numero_billet: ins.numero_billet,
    reference_commande: ins.reference_commande != null ? String(ins.reference_commande) : '',
    statut_commande: ins.statut_commande || 'Validée',
    moyen_paiement: ins.moyen_paiement || '',
    nom_participant: ins.nom_participant || '',
    prenom_participant: ins.prenom_participant || '',
    tarif: ins.tarif || '',
    montant_tarif: ins.montant_tarif != null ? String(ins.montant_tarif) : '',
    code_promo: ins.code_promo || '',
    montant_code_promo: ins.montant_code_promo != null ? String(ins.montant_code_promo) : '',
    nom_payeur: ins.nom_payeur || '',
    prenom_payeur: ins.prenom_payeur || '',
    email_payeur: ins.email_payeur || '',
    email: ins.custom_fields?.email || '',
    telephone: ins.custom_fields?.telephone || '',
    nom_equipe: ins.custom_fields?.nom_equipe || '',
    niveau_equipe: ins.custom_fields?.niveau_equipe || '',
    equipe: ins.custom_fields?.equipe || '',
    clubs_origine: ins.custom_fields?.clubs_origine || '',
    commentaire: ins.custom_fields?.commentaire || '',
  };
}

// ─── Convertit BilletFormData → payload Supabase ─────────────────────────────

function formToPayload(f: BilletFormData, tournoiId: number): InscriptionTournoi {
  const isHelloAsso = !!f.reference_commande.trim();

  const cf: Record<string, string | null> = {
    email: f.email.trim() || null,
    telephone: f.telephone.trim() || null,
    nom_equipe: f.nom_equipe.trim() || null,
    niveau_equipe: f.niveau_equipe.trim() || null,
    equipe: f.equipe.trim() || null,
    clubs_origine: f.clubs_origine.trim() || null,
    commentaire: f.commentaire.trim() || null,
  };
  const hasCustom = Object.values(cf).some(v => v !== null);

  return {
    numero_billet: f.numero_billet,
    tournoi_id: tournoiId,
    reference_commande: f.reference_commande.trim() ? Number(f.reference_commande) : null,
    statut_commande: f.statut_commande || null,
    moyen_paiement: isHelloAsso ? 'Carte bancaire' : (f.moyen_paiement || null),
    nom_participant: f.nom_participant.trim() || null,
    prenom_participant: f.prenom_participant.trim() || null,
    tarif: f.tarif.trim() || null,
    montant_tarif: f.montant_tarif !== '' ? parseFloat(f.montant_tarif) : null,
    code_promo: f.code_promo.trim() || null,
    montant_code_promo: f.montant_code_promo !== '' ? parseFloat(f.montant_code_promo) : null,
    nom_payeur: f.nom_payeur.trim() || null,
    prenom_payeur: f.prenom_payeur.trim() || null,
    email_payeur: f.email_payeur.trim() || null,
    custom_fields: hasCustom ? cf : null,
  };
}

// ─── Sous-composant : onglet Tournois ─────────────────────────────────────────

interface TournoiFormProps {
  form: TournoiFormData; setForm: (f: TournoiFormData) => void;
  isEdit: boolean; saving: boolean;
  currentLogoUrl?: string | null; logoUploading?: boolean;
  onSave: () => void; onCancel: () => void; onDelete?: () => void;
  onLogoUpload?: (file: File) => Promise<void>;
}

const TournoiForm: React.FC<TournoiFormProps> = ({ form, setForm, isEdit, saving, currentLogoUrl, logoUploading, onSave, onCancel, onDelete, onLogoUpload }) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const handleNomChange = (nom: string) =>
    setForm({ ...form, nom, slug: isEdit ? form.slug : slugify(nom) });

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 shadow-md space-y-4">
      <h3 className="text-lg font-bold text-light-onSurface dark:text-dark-onSurface">
        {isEdit ? 'Modifier le tournoi' : 'Créer un tournoi'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-light-onSurface dark:text-dark-onSurface">
            Nom <span className="text-red-500">*</span>
          </label>
          <input type="text" value={form.nom} onChange={e => handleNomChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface"
            placeholder="Ex: Green Tournoi 2026" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-light-onSurface dark:text-dark-onSurface">
            Slug <span className="text-red-500">*</span>
          </label>
          <input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface font-mono text-sm"
            placeholder="green_tournoi_2026" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-light-onSurface dark:text-dark-onSurface">Date de début</label>
          <input type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-light-onSurface dark:text-dark-onSurface">Date de fin</label>
          <input type="date" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1 text-light-onSurface dark:text-dark-onSurface">Lieu</label>
          <input type="text" value={form.lieu} onChange={e => setForm({ ...form, lieu: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface"
            placeholder="Ex: Val d'Europe" />
        </div>
        {isEdit && onLogoUpload && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1 text-light-onSurface dark:text-dark-onSurface">Logo du tournoi</label>
            <div className="flex items-center gap-4">
              {currentLogoUrl
                ? <img src={currentLogoUrl} alt="Logo" className="w-20 h-20 object-contain rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-1" />
                : <div className="w-20 h-20 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 text-xs">Aucun</div>
              }
              <div>
                <button type="button" disabled={logoUploading}
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 transition-colors">
                  {logoUploading ? 'Upload...' : currentLogoUrl ? 'Changer le logo' : 'Choisir un logo'}
                </button>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP · max 2 Mo</p>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) onLogoUpload(f); e.target.value = ''; }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onSave} disabled={saving}
          className="px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors">
          {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
          Annuler
        </button>
        {isEdit && onDelete && (
          <button onClick={onDelete} className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Sous-composant : onglet Inscriptions ─────────────────────────────────────

interface InscriptionsTabProps { tournois: Tournoi[]; }

const InscriptionsTab: React.FC<InscriptionsTabProps> = ({ tournois }) => {
  const [selectedTournoiId, setSelectedTournoiId] = useState<number | null>(
    tournois.length > 0 ? tournois[0].id : null
  );
  const [viewMode, setViewMode] = useState<InscriptionViewMode>('list');
  const [editingIns, setEditingIns] = useState<InscriptionTournoi | null>(null);
  const [billetForm, setBilletForm] = useState<BilletFormData | null>(null);
  const [billetSaving, setBilletSaving] = useState(false);

  const [importResult, setImportResult] = useState<ImportTournoiResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [filterNiveau, setFilterNiveau] = useState('');
  const [filterTarif, setFilterTarif] = useState('');
  const [filterMoyen, setFilterMoyen] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'billet' | 'participant' | 'tarif'>('billet');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { inscriptions, loading, error, createInscription, updateInscription, deleteInscription, importFromExcel } =
    useInscriptionsTournoi(selectedTournoiId);

  const openCreate = () => {
    if (!selectedTournoiId) return;
    setEditingIns(null);
    setBilletForm(emptyBilletForm(selectedTournoiId!));
    setViewMode('form');
  };

  const openEdit = (ins: InscriptionTournoi) => {
    setEditingIns(ins);
    setBilletForm(inscriptionToForm(ins));
    setViewMode('form');
  };

  const handleSaveBillet = async () => {
    if (!billetForm || !selectedTournoiId) return;
    if (!billetForm.prenom_participant.trim()) { alert('Le prénom est obligatoire.'); return; }

    setBilletSaving(true);
    const payload = formToPayload(billetForm, selectedTournoiId);

    if (editingIns) {
      const ok = await updateInscription(editingIns.numero_billet, payload);
      if (ok) setViewMode('list');
      else alert('Erreur lors de la mise à jour.');
    } else {
      const created = await createInscription(payload);
      if (created) setViewMode('list');
      else alert('Erreur lors de la création du billet.');
    }
    setBilletSaving(false);
  };

  const handleDeleteBillet = async () => {
    if (!editingIns) return;
    if (!window.confirm(`Supprimer le billet #${editingIns.numero_billet} ?`)) return;
    const ok = await deleteInscription(editingIns.numero_billet);
    if (ok) setViewMode('list');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTournoiId) return;
    setImporting(true);
    setImportResult(null);
    const result = await importFromExcel(file, selectedTournoiId);
    setImportResult(result);
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const tarifs = [...new Set(inscriptions.map(i => i.tarif).filter(Boolean))];
  const moyens = [...new Set(inscriptions.map(i => i.moyen_paiement).filter(Boolean))];
  const niveaux = [...new Set(inscriptions.map(i => i.custom_fields?.niveau_equipe).filter(Boolean))].sort() as string[];

  const toggleSort = (col: 'billet' | 'participant' | 'tarif') => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: 'billet' | 'participant' | 'tarif' }) => (
    <span className="ml-1 inline-block opacity-60">
      {sortBy === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  const filtered = inscriptions
    .filter(i => {
      if (filterNiveau && i.custom_fields?.niveau_equipe !== filterNiveau) return false;
      if (filterTarif && i.tarif !== filterTarif) return false;
      if (filterMoyen && i.moyen_paiement !== filterMoyen) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [
          i.prenom_participant, i.nom_participant,
          i.custom_fields?.nom_equipe,
          i.custom_fields?.email || i.email_payeur,
          i.custom_fields?.telephone,
          String(i.numero_billet),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'participant') {
        const na = [a.nom_participant, a.prenom_participant].filter(Boolean).join(' ').toLowerCase();
        const nb = [b.nom_participant, b.prenom_participant].filter(Boolean).join(' ').toLowerCase();
        cmp = na.localeCompare(nb, 'fr');
      } else if (sortBy === 'tarif') {
        cmp = (a.tarif ?? '').localeCompare(b.tarif ?? '', 'fr');
      } else {
        cmp = a.numero_billet - b.numero_billet;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  // ── Vue formulaire ─────────────────────────────────────────────────────────
  if (viewMode === 'form' && billetForm) {
    return (
      <div>
        <button onClick={() => setViewMode('list')}
          className="mb-4 px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium">
          ← Retour à la liste
        </button>
        <BilletForm
          form={billetForm}
          setForm={setBilletForm}
          isEdit={!!editingIns}
          saving={billetSaving}
          onSave={handleSaveBillet}
          onCancel={() => setViewMode('list')}
          onDelete={editingIns ? handleDeleteBillet : undefined}
        />
      </div>
    );
  }

  // ── Vue liste ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Sélecteur + actions */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium mb-1 text-light-onSurface dark:text-dark-onSurface">Tournoi</label>
          <select
            value={selectedTournoiId ?? ''}
            onChange={e => { setSelectedTournoiId(e.target.value ? Number(e.target.value) : null); setImportResult(null); }}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface"
          >
            <option value="">-- Sélectionner --</option>
            {tournois.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
          </select>
        </div>

        {selectedTournoiId && (
          <>
            <button onClick={openCreate}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau billet
            </button>
            <div>
              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
              <button onClick={() => fileInputRef.current?.click()} disabled={importing}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {importing ? 'Import...' : 'Importer Excel'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Résultat import */}
      {importResult && (
        <div className={`p-4 rounded-lg border ${importResult.errors.length === 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'}`}>
          <p className="font-semibold text-green-800 dark:text-green-200">
            {importResult.upserted} inscription(s) importée(s) / mise(s) à jour
          </p>
          {importResult.errors.map((e, i) => (
            <p key={i} className="text-sm text-red-700 dark:text-red-300 mt-1">{e}</p>
          ))}
        </div>
      )}

      {/* Filtres + recherche */}
      {inscriptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Recherche nom, équipe, n° billet..."
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface min-w-48"
          />
          <select value={filterNiveau} onChange={e => setFilterNiveau(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface">
            <option value="">Tous niveaux</option>
            {niveaux.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={filterTarif} onChange={e => setFilterTarif(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface">
            <option value="">Tous tarifs</option>
            {tarifs.map(t => <option key={t!} value={t!}>{t}</option>)}
          </select>
          <select value={filterMoyen} onChange={e => setFilterMoyen(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface">
            <option value="">Tous paiements</option>
            {moyens.map(m => <option key={m!} value={m!}>{m}</option>)}
          </select>
          {(filterNiveau || filterTarif || filterMoyen || search) && (
            <button onClick={() => { setFilterNiveau(''); setFilterTarif(''); setFilterMoyen(''); setSearch(''); }}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              Effacer
            </button>
          )}
          <span className="text-sm text-gray-500 dark:text-gray-400 self-center">
            {filtered.length} / {inscriptions.length}
          </span>
        </div>
      )}

      {/* Tableau */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Chargement...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : !selectedTournoiId ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Sélectionnez un tournoi</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {inscriptions.length === 0 ? 'Aucun billet – importez un fichier Excel ou créez un billet manuel' : 'Aucun résultat pour ces filtres'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort('billet')}>
                  N° billet<SortIcon col="billet" />
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort('participant')}>
                  Participant<SortIcon col="participant" />
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort('tarif')}>
                  Tarif<SortIcon col="tarif" />
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Montant</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Origine</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Paiement</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Équipe</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((ins: InscriptionTournoi) => (
                <tr key={ins.numero_billet} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => openEdit(ins)}>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500 dark:text-gray-400">{ins.numero_billet}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-light-onSurface dark:text-dark-onSurface">
                      {[ins.prenom_participant, ins.nom_participant].filter(Boolean).join(' ') || '-'}
                    </div>
                    {(ins.custom_fields?.email || ins.email_payeur) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {ins.custom_fields?.email || ins.email_payeur}
                      </div>
                    )}
                    {ins.custom_fields?.telephone && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">{ins.custom_fields.telephone}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-light-onSurface dark:text-dark-onSurface">{ins.tarif || '-'}</td>
                  <td className="px-3 py-2 text-light-onSurface dark:text-dark-onSurface">{formatEuro(ins.montant_tarif)}</td>
                  <td className="px-3 py-2">
                    {ins.reference_commande
                      ? <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">HelloAsso</span>
                      : <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Manuel</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-light-onSurface dark:text-dark-onSurface">{ins.moyen_paiement || '-'}</td>
                  <td className="px-3 py-2 text-xs">
                    <div className="text-light-onSurface dark:text-dark-onSurface font-medium">
                      {ins.custom_fields?.nom_equipe || '-'}
                    </div>
                    {ins.custom_fields?.niveau_equipe && (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                        {ins.custom_fields.niveau_equipe}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(ins)}
                      className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
                      title="Modifier">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Sous-composant : panel équipes d'une compétition ────────────────────────

interface EquipesPanelProps {
  competition: CompetitionTournoi;
  tournoiInscriptions: InscriptionTournoi[];
  onEquipesChanged?: () => void;
}

const EquipesPanel: React.FC<EquipesPanelProps> = ({ competition, tournoiInscriptions, onEquipesChanged }) => {
  const { equipes, loading, createEquipe, updateEquipe, deleteEquipe, initFromInscriptions, initFromCompetField } = useEquipesCompetition(competition.id);
  const [editingEquipe, setEditingEquipe] = useState<EquipeCompetitionTournoi | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [initing, setIniting] = useState<'tarif' | 'compet' | null>(null);
  const [initResult, setInitResult] = useState<{ created: number; errors: string[] } | null>(null);
  const [saving, setSaving] = useState(false);

  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface text-sm";
  const labelClass = "block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400 uppercase tracking-wide";

  const emptyForm = (): Omit<EquipeCompetitionTournoi, 'id' | 'created_at'> => ({
    competition_id: competition.id,
    nom_equipe: '',
    niveau_equipe: null,
    is_staff: false,
    numero_billet_capitaine: null,
    nom_contact: null,
    prenom_contact: null,
    email_contact: null,
    telephone_contact: null,
  });

  const [form, setForm] = useState(emptyForm());

  const openCreate = () => { setEditingEquipe(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (eq: EquipeCompetitionTournoi) => {
    setEditingEquipe(eq);
    setForm({
      competition_id: competition.id,
      nom_equipe: eq.nom_equipe,
      niveau_equipe: eq.niveau_equipe ?? null,
      is_staff: eq.is_staff ?? false,
      numero_billet_capitaine: eq.numero_billet_capitaine ?? null,
      nom_contact: eq.nom_contact ?? null,
      prenom_contact: eq.prenom_contact ?? null,
      email_contact: eq.email_contact ?? null,
      telephone_contact: eq.telephone_contact ?? null,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nom_equipe.trim()) { alert('Le nom d\'équipe est obligatoire.'); return; }
    setSaving(true);
    if (editingEquipe) {
      await updateEquipe(editingEquipe.id, form);
    } else {
      await createEquipe(form);
    }
    setSaving(false);
    setShowForm(false);
    onEquipesChanged?.();
  };

  const handleDelete = async (eq: EquipeCompetitionTournoi) => {
    if (!window.confirm(`Supprimer l'équipe "${eq.nom_equipe}" ?`)) return;
    await deleteEquipe(eq.id);
    onEquipesChanged?.();
  };

  const handleInitTarif = async () => {
    if (!window.confirm(`Initialiser depuis les tarifs (${competition.tarifs_eligibles?.join(', ') || 'tous'}) ?`)) return;
    setIniting('tarif');
    setInitResult(null);
    const res = await initFromInscriptions(tournoiInscriptions, competition);
    setInitResult(res);
    setIniting(null);
    onEquipesChanged?.();
  };

  const handleInitCompet = async () => {
    if (!window.confirm(`Initialiser depuis le champ compétition = "${competition.nom}" ?`)) return;
    setIniting('compet');
    setInitResult(null);
    const res = await initFromCompetField(tournoiInscriptions, competition);
    setInitResult(res);
    setIniting(null);
    onEquipesChanged?.();
  };

  const sf = (k: keyof typeof form) => (v: string | boolean | null) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/30">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-semibold text-light-onSurface dark:text-dark-onSurface">
            Équipes — {competition.nom}
          </h4>
          {competition.tarifs_eligibles && competition.tarifs_eligibles.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {competition.tarifs_eligibles.map(t => (
                <span key={t} className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleInitCompet} disabled={!!initing}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1"
            title={`Filtre : custom_fields.equipe = "${competition.nom}"`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {initing === 'compet' ? 'Initialisation...' : 'Init depuis compét.'}
          </button>
          <button onClick={handleInitTarif} disabled={!!initing}
            className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1"
            title={`Filtre : tarifs éligibles (${competition.tarifs_eligibles?.join(', ') || 'tous'})`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {initing === 'tarif' ? 'Initialisation...' : 'Init depuis tarif'}
          </button>
          <button onClick={openCreate}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter équipe
          </button>
        </div>
      </div>

      {/* Résultat initialisation */}
      {initResult && (
        <div className={`p-3 rounded-lg text-sm ${initResult.errors.length === 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'}`}>
          {initResult.created > 0 && <p className="font-semibold">{initResult.created} équipe(s) créée(s)</p>}
          {initResult.errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      {/* Formulaire ajout/édition équipe */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
          <h5 className="text-sm font-semibold text-light-onSurface dark:text-dark-onSurface">
            {editingEquipe ? 'Modifier l\'équipe' : 'Nouvelle équipe'}
          </h5>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nom d'équipe <span className="text-red-500">*</span></label>
              <input type="text" value={form.nom_equipe} onChange={e => sf('nom_equipe')(e.target.value)} className={inputClass} placeholder="Les Volcans" />
            </div>
            <div>
              <label className={labelClass}>Niveau</label>
              <input type="text" value={form.niveau_equipe ?? ''} onChange={e => sf('niveau_equipe')(e.target.value || null)} className={inputClass} placeholder="Régional, National..." />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="is_staff_chk" checked={form.is_staff ?? false} onChange={e => sf('is_staff')(e.target.checked)} className="rounded" />
              <label htmlFor="is_staff_chk" className="text-sm text-light-onSurface dark:text-dark-onSurface">Équipe Staff</label>
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide pt-1">Contact capitaine</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Prénom</label>
              <input type="text" value={form.prenom_contact ?? ''} onChange={e => sf('prenom_contact')(e.target.value || null)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nom</label>
              <input type="text" value={form.nom_contact ?? ''} onChange={e => sf('nom_contact')(e.target.value || null)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={form.email_contact ?? ''} onChange={e => sf('email_contact')(e.target.value || null)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Téléphone</label>
              <input type="text" value={form.telephone_contact ?? ''} onChange={e => sf('telephone_contact')(e.target.value || null)} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-1.5 text-sm bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors">
              {saving ? 'Enregistrement...' : editingEquipe ? 'Enregistrer' : 'Créer'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des équipes */}
      {loading ? (
        <div className="text-center py-4 text-gray-400 text-sm">Chargement...</div>
      ) : equipes.length === 0 ? (
        <div className="text-center py-4 text-gray-400 text-sm">Aucune équipe — initialisez depuis les inscriptions ou ajoutez manuellement</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Équipe</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Contact capitaine</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Billet</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {equipes.map(eq => (
                <tr key={eq.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-light-onSurface dark:text-dark-onSurface">{eq.nom_equipe}</span>
                      {eq.is_staff && (
                        <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded font-medium">STAFF</span>
                      )}
                    </div>
                    {eq.niveau_equipe && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">{eq.niveau_equipe}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-light-onSurface dark:text-dark-onSurface">
                      {[eq.prenom_contact, eq.nom_contact].filter(Boolean).join(' ') || '-'}
                    </div>
                    {eq.email_contact && <div className="text-xs text-gray-500 dark:text-gray-400">{eq.email_contact}</div>}
                    {eq.telephone_contact && <div className="text-xs text-gray-400 dark:text-gray-500">{eq.telephone_contact}</div>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-400 dark:text-gray-500">
                    {eq.numero_billet_capitaine ?? '-'}
                  </td>
                  <td className="px-3 py-2 flex gap-2 justify-end">
                    <button onClick={() => openEdit(eq)}
                      className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors" title="Modifier">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(eq)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 transition-colors" title="Supprimer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Sous-composant : onglet Compétitions ─────────────────────────────────────

interface CompetitionsTabProps {
  tournois: Tournoi[];
}

const CompetitionsTab: React.FC<CompetitionsTabProps> = ({ tournois }) => {
  const [selectedTournoiId, setSelectedTournoiId] = useState<number | null>(
    tournois.length > 0 ? tournois[0].id : null
  );
  const { inscriptions } = useInscriptionsTournoi(selectedTournoiId);
  const [expandedCompId, setExpandedCompId] = useState<number | null>(null);
  const [showCompForm, setShowCompForm] = useState(false);
  const [editingComp, setEditingComp] = useState<CompetitionTournoi | null>(null);
  const [compForm, setCompForm] = useState({ nom: '', tarifs_raw: '', nb_joueurs: '' });
  const [savingComp, setSavingComp] = useState(false);
  const [globalIniting, setGlobalIniting] = useState<'compet' | 'tarif' | null>(null);
  const [globalInitResult, setGlobalInitResult] = useState<{ totalCreated: number; errors: string[] } | null>(null);

  const { competitions, loading, refetch: refetchCompetitions, createCompetition, updateCompetition, deleteCompetition } =
    useCompetitionsTournoi(selectedTournoiId);


  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface text-sm";
  const labelClass = "block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400 uppercase tracking-wide";

  const openCreateComp = () => { setEditingComp(null); setCompForm({ nom: '', tarifs_raw: '', nb_joueurs: '' }); setShowCompForm(true); };
  const openEditComp = (c: CompetitionTournoi) => {
    setEditingComp(c);
    setCompForm({ nom: c.nom, tarifs_raw: (c.tarifs_eligibles ?? []).join(', '), nb_joueurs: c.nb_joueurs != null ? String(c.nb_joueurs) : '' });
    setShowCompForm(true);
  };

  const handleSaveComp = async () => {
    if (!compForm.nom.trim() || !selectedTournoiId) { alert('Le nom est obligatoire.'); return; }
    setSavingComp(true);
    const tarifs = compForm.tarifs_raw.split(',').map(t => t.trim()).filter(Boolean);
    const nb_joueurs = compForm.nb_joueurs !== '' ? Number(compForm.nb_joueurs) : null;
    if (editingComp) {
      await updateCompetition(editingComp.id, { nom: compForm.nom.trim(), tarifs_eligibles: tarifs, nb_joueurs });
    } else {
      await createCompetition({ tournoi_id: selectedTournoiId, nom: compForm.nom.trim(), tarifs_eligibles: tarifs, nb_joueurs });
    }
    setSavingComp(false);
    setShowCompForm(false);
  };

  const handleDeleteComp = async (c: CompetitionTournoi) => {
    if (!window.confirm(`Supprimer la compétition "${c.nom}" et toutes ses équipes ?`)) return;
    await deleteCompetition(c.id);
    if (expandedCompId === c.id) setExpandedCompId(null);
  };

  // Tarifs distincts dans les inscriptions du tournoi sélectionné (pour aide à la saisie)
  const tarifsDisponibles = [...new Set(inscriptions.map(i => i.tarif).filter(Boolean))].sort();

  const handleGlobalInitCompet = async () => {
    if (competitions.length === 0) return;
    if (!window.confirm(`Initialiser les équipes depuis le champ compétition pour TOUTES les ${competitions.length} compétitions ?`)) return;
    setGlobalIniting('compet'); setGlobalInitResult(null);
    const r = await initAllEquipesFromCompet(competitions, inscriptions);
    setGlobalInitResult(r); setGlobalIniting(null);
    refetchCompetitions();
  };

  const handleGlobalInitTarif = async () => {
    if (competitions.length === 0) return;
    if (!window.confirm(`Initialiser les équipes depuis les tarifs pour TOUTES les ${competitions.length} compétitions ?`)) return;
    setGlobalIniting('tarif'); setGlobalInitResult(null);
    const r = await initAllEquipesFromTarif(competitions, inscriptions);
    setGlobalInitResult(r); setGlobalIniting(null);
    refetchCompetitions();
  };

  return (
    <div className="space-y-4">
      {/* Sélecteur tournoi */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium mb-1 text-light-onSurface dark:text-dark-onSurface">Tournoi</label>
          <select
            value={selectedTournoiId ?? ''}
            onChange={e => { setSelectedTournoiId(e.target.value ? Number(e.target.value) : null); setExpandedCompId(null); setShowCompForm(false); }}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface">
            <option value="">-- Sélectionner --</option>
            {tournois.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
          </select>
        </div>
        {selectedTournoiId && (
          <>
            <button onClick={openCreateComp}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle compétition
            </button>
            <button onClick={handleGlobalInitCompet} disabled={!!globalIniting || competitions.length === 0}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-1.5 whitespace-nowrap"
              title="Init toutes compétitions depuis custom_fields.equipe">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {globalIniting === 'compet' ? 'Init...' : 'Init toutes (compét.)'}
            </button>
            <button onClick={handleGlobalInitTarif} disabled={!!globalIniting || competitions.length === 0}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-1.5 whitespace-nowrap"
              title="Init toutes compétitions depuis tarifs éligibles">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {globalIniting === 'tarif' ? 'Init...' : 'Init toutes (tarif)'}
            </button>
          </>
        )}
      </div>
      {globalInitResult && (
        <div className={`p-3 rounded-lg text-sm ${globalInitResult.errors.length > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'}`}>
          <span className="font-semibold">{globalInitResult.totalCreated} équipe{globalInitResult.totalCreated !== 1 ? 's' : ''} créée{globalInitResult.totalCreated !== 1 ? 's' : ''}</span>
          {globalInitResult.errors.length > 0 && (
            <ul className="mt-1 text-xs text-amber-700 dark:text-amber-300 list-disc list-inside">
              {globalInitResult.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <button onClick={() => setGlobalInitResult(null)} className="ml-3 text-xs text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* Formulaire compétition */}
      {showCompForm && (
        <div className="bg-light-surface dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-light-onSurface dark:text-dark-onSurface">
            {editingComp ? 'Modifier la compétition' : 'Créer une compétition'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nom <span className="text-red-500">*</span></label>
              <input type="text" value={compForm.nom} onChange={e => setCompForm(f => ({ ...f, nom: e.target.value }))} className={inputClass} placeholder="Ex: Senior, Jeunes A..." />
            </div>
            <div>
              <label className={labelClass}>Joueurs / équipe <span className="text-xs font-normal text-gray-400">(nb théorique)</span></label>
              <input type="number" min="1" max="20" value={compForm.nb_joueurs} onChange={e => setCompForm(f => ({ ...f, nb_joueurs: e.target.value }))} className={inputClass} placeholder="Ex: 4" />
            </div>
            <div>
              <label className={labelClass}>Tarifs éligibles <span className="text-xs font-normal text-gray-400">(séparés par des virgules)</span></label>
              <input type="text" value={compForm.tarifs_raw} onChange={e => setCompForm(f => ({ ...f, tarifs_raw: e.target.value }))} className={inputClass} placeholder="Adulte, Jeune..." />
              {tarifsDisponibles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tarifsDisponibles.map(t => (
                    <button key={t!} type="button"
                      onClick={() => {
                        const curr = compForm.tarifs_raw.split(',').map(x => x.trim()).filter(Boolean);
                        if (!curr.includes(t!)) setCompForm(f => ({ ...f, tarifs_raw: [...curr, t!].join(', ') }));
                      }}
                      className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded transition-colors">
                      + {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveComp} disabled={savingComp}
              className="px-4 py-1.5 text-sm bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors">
              {savingComp ? 'Enregistrement...' : editingComp ? 'Enregistrer' : 'Créer'}
            </button>
            <button onClick={() => setShowCompForm(false)}
              className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des compétitions */}
      {!selectedTournoiId ? (
        <div className="text-center py-8 text-gray-400 text-sm">Sélectionnez un tournoi</div>
      ) : loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Chargement...</div>
      ) : competitions.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">Aucune compétition — créez-en une !</div>
      ) : (
        <div className="space-y-3">
          {competitions.map(comp => (
            <div key={comp.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* En-tête compétition */}
              <div
                className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => setExpandedCompId(expandedCompId === comp.id ? null : comp.id)}>
                <div className="flex items-center gap-3">
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedCompId === comp.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-semibold text-light-onSurface dark:text-dark-onSurface">{comp.nom}</span>
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full font-medium">
                    {comp.nb_equipes ?? 0} équipe{(comp.nb_equipes ?? 0) !== 1 ? 's' : ''}
                  </span>
                  {comp.nb_joueurs != null && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                      {comp.nb_joueurs} j/éq.
                    </span>
                  )}
                  {comp.tarifs_eligibles && comp.tarifs_eligibles.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {comp.tarifs_eligibles.map(t => (
                        <span key={t} className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEditComp(comp)}
                    className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors" title="Modifier">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDeleteComp(comp)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 transition-colors" title="Supprimer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Panel équipes (expandable) */}
              {expandedCompId === comp.id && (
                <div className="px-4 pb-4">
                  <EquipesPanel competition={comp} tournoiInscriptions={inscriptions} onEquipesChanged={refetchCompetitions} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Composant principal ───────────────────────────────────────────────────────

const TournoiManager: React.FC = () => {
  const { tournois, loading, error, createTournoi, updateTournoi, deleteTournoi, uploadLogo } = useTournois();
  const [activeTab, setActiveTab] = useState<Tab>('tournois');
  const [viewMode, setViewMode] = useState<TournoiViewMode>('list');
  const [editingTournoi, setEditingTournoi] = useState<Tournoi | null>(null);
  const [form, setForm] = useState<TournoiFormData>(emptyTournoiForm());
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const openCreate = () => { setEditingTournoi(null); setForm(emptyTournoiForm()); setViewMode('form'); };
  const openEdit = (t: Tournoi) => {
    setEditingTournoi(t);
    setForm({ slug: t.slug, nom: t.nom, date_debut: t.date_debut || '', date_fin: t.date_fin || '', lieu: t.lieu || '' });
    setViewMode('form');
  };

  const handleSave = async () => {
    if (!form.slug.trim()) { alert('Le slug est obligatoire.'); return; }
    if (!form.nom.trim()) { alert('Le nom est obligatoire.'); return; }
    setSaving(true);
    const payload = { slug: form.slug.trim(), nom: form.nom.trim(), date_debut: form.date_debut || null, date_fin: form.date_fin || null, lieu: form.lieu.trim() || null };
    if (editingTournoi) {
      const ok = await updateTournoi(editingTournoi.id, payload);
      if (ok) setViewMode('list'); else alert('Erreur lors de la mise à jour.');
    } else {
      const created = await createTournoi(payload);
      if (created) setViewMode('list'); else alert('Erreur lors de la création.');
    }
    setSaving(false);
  };

  const handleDelete = async (t: Tournoi) => {
    if (!window.confirm(`Supprimer "${t.nom}" et toutes ses inscriptions ?`)) return;
    const ok = await deleteTournoi(t.id);
    if (ok) setViewMode('list');
  };

  const handleLogoUpload = async (file: File) => {
    if (!editingTournoi) return;
    setLogoUploading(true);
    await uploadLogo(editingTournoi.id, editingTournoi.slug, file);
    setLogoUploading(false);
  };

  const tabClass = (tab: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${activeTab === tab
      ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-light-surface dark:bg-dark-surface'
      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`;

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200 dark:border-gray-700 flex gap-1">
        <button className={tabClass('tournois')} onClick={() => setActiveTab('tournois')}>Tournois</button>
        <button className={tabClass('inscriptions')} onClick={() => setActiveTab('inscriptions')}>Inscriptions</button>
        <button className={tabClass('competitions')} onClick={() => setActiveTab('competitions')}>Compétitions</button>
      </div>

      {activeTab === 'tournois' && (
        viewMode === 'form'
          ? <TournoiForm form={form} setForm={setForm} isEdit={!!editingTournoi} saving={saving}
              currentLogoUrl={editingTournoi?.logo_url} logoUploading={logoUploading}
              onSave={handleSave} onCancel={() => setViewMode('list')}
              onDelete={editingTournoi ? () => handleDelete(editingTournoi) : undefined}
              onLogoUpload={editingTournoi ? handleLogoUpload : undefined} />
          : <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={openCreate}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors">
                  + Créer un tournoi
                </button>
              </div>
              {loading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">Chargement...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">{error}</div>
              ) : tournois.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">Aucun tournoi – créez-en un !</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nom</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Dates</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Lieu</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Slug</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {tournois.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 font-medium text-light-onSurface dark:text-dark-onSurface">{t.nom}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {t.date_debut ? formatDate(t.date_debut) : '-'}
                            {t.date_debut && t.date_fin && t.date_debut !== t.date_fin && <> → {formatDate(t.date_fin)}</>}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{t.lieu || '-'}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{t.slug}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => openEdit(t)}
                              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors">
                              Modifier
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
      )}

      {activeTab === 'inscriptions' && <InscriptionsTab tournois={tournois} />}
      {activeTab === 'competitions' && <CompetitionsTab tournois={tournois} />}
    </div>
  );
};

export default TournoiManager;
