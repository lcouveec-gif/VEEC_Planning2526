import React, { useState, useMemo } from 'react';
import { useTournois } from '../hooks/useTournois';
import { useInscriptionsTournoi } from '../hooks/useInscriptionsTournoi';
import { useCompetitionsTournoi, useEquipesCompetition } from '../hooks/useCompetitionsTournoi';
import { useAuth } from '../hooks/useAuth';
import { useClubs } from '../hooks/useClubs';
import type { InscriptionTournoi, CompetitionTournoi } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d?: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

const formatEuro = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const formatEuroVal = (n?: number | null) =>
  n != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n) : '-';

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const CAMPING_TARIF = 'Mode camping sur place, par personne';

const normStr = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

interface ClubMatch { name: string; logo_url?: string | null; }

function matchClubName(
  token: string,
  clubs: { nom: string; nom_court?: string | null; logo_url?: string | null }[]
): ClubMatch | null {
  const t = normStr(token);
  if (!t || t.length < 2) return null;
  const tWords = t.split(' ').filter(w => w.length >= 3);

  let best: { score: number; club: typeof clubs[0] } | null = null;
  for (const club of clubs) {
    const c = normStr(club.nom);
    const cShort = club.nom_court ? normStr(club.nom_court) : '';
    // Acronyme auto : premières lettres des mots >= 3 du nom complet (ex: VAL EUROPE ESBLY COUPVRAY → VEEC)
    const acronym = c.split(' ').filter(w => w.length >= 3).map(w => w[0]).join('');

    let score = 0;
    if (cShort && t === cShort)  score = 1000; // exact sur nom_court
    else if (t === c)             score = 999;  // exact sur nom complet
    else if (acronym && t === acronym) score = 950; // acronyme (ex: VEEC)
    else if (c.includes(t) && t.length >= 4) score = 10 + t.length; // token dans le nom
    else if (tWords.length > 0) {
      // Matching mot par mot
      for (const w of tWords) {
        if (cShort && w === cShort)   score += 5;
        else if (c.includes(w))       score += 2;
      }
    }

    if (score > 0 && (!best || score > best.score)) best = { score, club };
  }
  if (!best || best.score < 2) return null;
  return { name: best.club.nom_court || best.club.nom, logo_url: best.club.logo_url };
}

const NIVEAU_ORDER = ['Nationale', 'Régionale', 'Régional', 'Région', 'Départementale', 'Départemental', 'Loisir'];
const niveauRank = (n: string): number => {
  const lower = n.toLowerCase();
  const idx = NIVEAU_ORDER.findIndex(o => lower.includes(o.toLowerCase()));
  return idx === -1 ? 998 : idx;
};

/** Badge couleur selon la force du niveau (Nationale = or, Régionale = bleu, Départementale = teal, Loisir = gris) */
const niveauBadgeClass = (niveau?: string | null): string => {
  if (!niveau) return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
  const lower = niveau.toLowerCase();
  if (lower.includes('national')) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200';
  if (lower.includes('région') || lower.includes('regional') || lower.includes('régional'))
    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
  if (lower.includes('départ') || lower.includes('depart'))
    return 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300';
  if (lower.includes('loisir'))
    return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
  return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
};

// HelloAsso peut retourner 'Validé'/'Validée' (FR), 'Processed' (EN) ou 'Sur place' (manuel)
const isValide = (s?: string | null) => s === 'Validée' || s === 'Validé' || s === 'Sur place' || s === 'Processed';
const isAnnule = (s?: string | null) => s === 'Annulée' || s === 'Annulé' || s === 'Refunded' || s === 'Cancelled';

const statutClass = (statut?: string | null) => {
  if (isValide(statut) && statut !== 'Sur place') return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
  if (isAnnule(statut)) return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
  if (statut === 'Sur place') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
  return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
};

const moyenColor = (m: string): string => {
  const mc = m.toLowerCase();
  if (mc.includes('carte') || mc.includes('cb')) return 'text-blue-600 dark:text-blue-400';
  if (mc.includes('espèce') || mc.includes('espece')) return 'text-green-600 dark:text-green-400';
  if (mc === 'staff') return 'text-purple-600 dark:text-purple-400';
  if (mc.includes('virement')) return 'text-orange-600 dark:text-orange-400';
  return 'text-gray-600 dark:text-gray-400';
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps { label: string; value: string | number; sub?: string; color?: string; }

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, color = 'green' }) => {
  const bg = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    teal: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    gray: 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700',
  }[color] ?? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
  const text = {
    green: 'text-green-700 dark:text-green-300',
    teal: 'text-teal-700 dark:text-teal-300',
    blue: 'text-blue-700 dark:text-blue-300',
    purple: 'text-purple-700 dark:text-purple-300',
    gray: 'text-gray-700 dark:text-gray-300',
  }[color] ?? 'text-gray-700 dark:text-gray-300';
  return (
    <div className={`rounded-lg border p-4 ${bg}`}>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${text}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
};

// ─── Onglet Statistiques ──────────────────────────────────────────────────────

interface StatsViewProps {
  inscriptions: InscriptionTournoi[];
  tournoiId: number | null;
}

const StatsView: React.FC<StatsViewProps> = ({ inscriptions, tournoiId }) => {
  const { competitions } = useCompetitionsTournoi(tournoiId);
  const { hasRole, user } = useAuth();
  const canSeePrivate = !!user && hasRole(['admin', 'entraineur']);
  const { clubs } = useClubs();
  const [chartMode, setChartMode] = useState<'tarif' | 'niveau'>('tarif');
  const [filterCompets, setFilterCompets] = useState<string[]>([]);

  const compets = useMemo(() =>
    [...new Set(inscriptions.map(i => i.custom_fields?.equipe).filter(Boolean))].sort() as string[],
    [inscriptions]);

  const toggleCompet = (c: string) =>
    setFilterCompets(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const inscriptionsFiltered = useMemo(() =>
    filterCompets.length > 0 ? inscriptions.filter(i => filterCompets.includes(i.custom_fields?.equipe ?? '')) : inscriptions,
    [inscriptions, filterCompets]);

  const parNiveauTarifFiltered = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    inscriptionsFiltered
      .filter(i => i.tarif !== CAMPING_TARIF)
      .forEach(i => {
        const niveau = i.custom_fields?.niveau_equipe || 'Non renseigné';
        const tarif = i.tarif || 'Non renseigné';
        if (!result[niveau]) result[niveau] = {};
        result[niveau][tarif] = (result[niveau][tarif] ?? 0) + 1;
      });
    return result;
  }, [inscriptionsFiltered]);

  const parClub = useMemo(() => {
    const counts: Record<string, { count: number; logo_url?: string | null }> = {};
    inscriptionsFiltered.forEach(i => {
      const raw = i.custom_fields?.clubs_origine;
      if (!raw?.trim()) return;
      const tokens = raw.split(/[/,;]+|\s+et\s+/i).map(t => t.trim()).filter(Boolean);
      let matched = false;
      for (const tok of tokens) {
        const m = matchClubName(tok, clubs);
        if (m) {
          if (!counts[m.name]) counts[m.name] = { count: 0, logo_url: m.logo_url };
          counts[m.name].count++;
          matched = true;
        }
      }
      if (!matched) {
        const key = raw.trim();
        if (!counts[key]) counts[key] = { count: 0 };
        counts[key].count++;
      }
    });
    return Object.entries(counts)
      .map(([name, { count, logo_url }]) => ({ name, count, logo_url }))
      .sort((a, b) => b.count - a.count);
  }, [inscriptionsFiltered, clubs]);

  const stats = useMemo(() => {
    const m = (v: number | string | null | undefined): number => { const n = Number(v ?? 0); return isNaN(n) ? 0 : n; };
    const validees = inscriptions.filter(i => isValide(i.statut_commande));
    const nbHelloAsso = inscriptions.filter(i => !!i.reference_commande).length;
    const nbManuelle = inscriptions.filter(i => !i.reference_commande).length;
    const nbCamping = inscriptions.filter(i => i.tarif === CAMPING_TARIF).length;
    const montantBrut = validees.reduce((sum, i) => sum + m(i.montant_tarif), 0);
    const montantPromo = validees.reduce((sum, i) => sum + m(i.montant_code_promo), 0);
    const montantTotal = montantBrut - montantPromo;

    const parTarif: Record<string, { count: number; montant: number }> = {};
    inscriptions.forEach(i => {
      const key = i.tarif || 'Non renseigné';
      if (!parTarif[key]) parTarif[key] = { count: 0, montant: 0 };
      parTarif[key].count++;
      parTarif[key].montant += m(i.montant_tarif) - m(i.montant_code_promo);
    });

    const parMoyen: Record<string, { count: number; montant: number }> = {};
    inscriptions.forEach(i => {
      const key = i.moyen_paiement || 'Non renseigné';
      if (!parMoyen[key]) parMoyen[key] = { count: 0, montant: 0 };
      parMoyen[key].count++;
      parMoyen[key].montant += m(i.montant_tarif) - m(i.montant_code_promo);
    });

    // Matrice niveau × tarif
    const parNiveauTarif: Record<string, Record<string, number>> = {};
    inscriptions.forEach(i => {
      const niveau = i.custom_fields?.niveau_equipe || 'Non renseigné';
      const tarif = i.tarif || 'Non renseigné';
      if (!parNiveauTarif[niveau]) parNiveauTarif[niveau] = {};
      parNiveauTarif[niveau][tarif] = (parNiveauTarif[niveau][tarif] ?? 0) + 1;
    });

    return { total: inscriptions.length, nbHelloAsso, nbManuelle, nbCamping, montantTotal, montantBrut, montantPromo, parTarif, parMoyen, parNiveauTarif };
  }, [inscriptions]);

  const nbEquipesTotal = competitions.reduce((s, c) => s + (c.nb_equipes ?? 0), 0);

  return (
    <div className="space-y-6">

      {/* ── Stats inscriptions ── */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-light-onSurface dark:text-dark-onSurface uppercase tracking-wide">
          Inscriptions
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            label="Inscriptions"
            value={stats.total}
            sub={`dont ${stats.nbHelloAsso} HelloAsso · ${stats.nbManuelle} manuelle${stats.nbManuelle !== 1 ? 's' : ''}${stats.nbCamping > 0 ? ` · ${stats.nbCamping} camping` : ''}`}
            color="green"
          />
          <StatCard label="Équipes inscrites" value={nbEquipesTotal} color="teal" />
          {canSeePrivate && (
            <StatCard
              label="Montant encaissé"
              value={formatEuro(stats.montantTotal)}
              sub={stats.montantPromo > 0 ? `${formatEuro(stats.montantBrut)} brut − ${formatEuro(stats.montantPromo)} promos` : 'validées + sur place'}
              color="green"
            />
          )}
        </div>

        {/* ── Répartition Tarif × Niveau / Niveau × Tarif (barres empilées) ── */}
        {Object.keys(parNiveauTarifFiltered).length > 0 && (() => {
          // Niveaux ordonnés par force (Nationale > … > Loisir)
          const allNiveaux = [...new Set(Object.keys(parNiveauTarifFiltered))];
          const niveauxList = allNiveaux.sort((a, b) => niveauRank(a) - niveauRank(b));

          // Tarifs → matrice inversée pour mode tarif-majeur
          const parTarifNiveau: Record<string, Record<string, number>> = {};
          Object.entries(parNiveauTarifFiltered).forEach(([niveau, tarifs]) => {
            Object.entries(tarifs).forEach(([tarif, count]) => {
              if (!parTarifNiveau[tarif]) parTarifNiveau[tarif] = {};
              parTarifNiveau[tarif][niveau] = (parTarifNiveau[tarif][niveau] ?? 0) + count;
            });
          });

          const COLORS = ['#16a34a','#0d9488','#0891b2','#4f46e5','#7c3aed','#059669','#0369a1','#ca8a04'];

          // Mode tarif-majeur : barres = tarifs, segments = niveaux
          const tarifsSorted = Object.entries(parTarifNiveau)
            .map(([t, nv]) => ({ key: t, segments: nv, total: Object.values(nv).reduce((s, v) => s + v, 0) }))
            .sort((a, b) => b.total - a.total);
          const colorOf_T = (n: string) => COLORS[niveauxList.indexOf(n) % COLORS.length] ?? '#6b7280';

          // Mode niveau-majeur : barres = niveaux, segments = tarifs
          const allTarifs = [...new Set(Object.values(parNiveauTarifFiltered).flatMap(t => Object.keys(t)))].sort();
          const niveausSorted = niveauxList
            .map(n => ({ key: n, segments: parNiveauTarifFiltered[n] ?? {}, total: Object.values(parNiveauTarifFiltered[n] ?? {}).reduce((s, v) => s + v, 0) }))
            .filter(n => n.total > 0);
          const colorOf_N = (t: string) => COLORS[allTarifs.indexOf(t) % COLORS.length] ?? '#6b7280';

          const totalFiltered = chartMode === 'tarif'
            ? tarifsSorted.reduce((s, r) => s + r.total, 0)
            : niveausSorted.reduce((s, r) => s + r.total, 0);

          const rows = chartMode === 'tarif' ? tarifsSorted : niveausSorted;
          const legendItems = chartMode === 'tarif' ? niveauxList : allTarifs;
          const colorOf = (k: string) => chartMode === 'tarif' ? colorOf_T(k) : colorOf_N(k);
          const segmentKeys = chartMode === 'tarif' ? niveauxList : allTarifs;

          return (
            <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-5">
              {/* Header avec toggle + filtre */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-light-onSurface dark:text-dark-onSurface">
                    {chartMode === 'tarif' ? 'Tarif × Niveau' : 'Niveau × Tarif'}
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {chartMode === 'tarif' ? 'Barres = tarifs · segments = niveaux' : 'Barres = niveaux · segments = tarifs'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {compets.length > 0 && (
                    <div className="flex flex-col gap-0.5">
                      <select
                        multiple
                        size={Math.min(compets.length, 4)}
                        value={filterCompets}
                        onChange={e => setFilterCompets(Array.from(e.target.selectedOptions, o => o.value))}
                        className="text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface px-2 py-1 min-w-36">
                        {compets.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {filterCompets.length > 0 && (
                        <button onClick={() => setFilterCompets([])}
                          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-left transition-colors">
                          ✕ tout désélectionner
                        </button>
                      )}
                    </div>
                  )}
                  <button onClick={() => setChartMode(m => m === 'tarif' ? 'niveau' : 'tarif')}
                    className="px-3 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-colors whitespace-nowrap">
                    ⇄ {chartMode === 'tarif' ? 'Vue Niveau' : 'Vue Tarif'}
                  </button>
                </div>
              </div>

              {/* Légende */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-5">
                {legendItems.map(n => (
                  <span key={n} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: colorOf(n) }} />
                    {n}
                  </span>
                ))}
              </div>

              <div className="space-y-4">
                {rows.map(({ key, segments, total }) => {
                  const pctTotal = totalFiltered > 0 ? Math.round(total / totalFiltered * 100) : 0;
                  return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-light-onSurface dark:text-dark-onSurface">
                          {key}
                        </span>
                        {canSeePrivate && chartMode === 'tarif' && (
                          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                            {formatEuro(stats.parTarif[key]?.montant ?? 0)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-lg font-bold tabular-nums text-light-onSurface dark:text-dark-onSurface leading-none">{total}</span>
                        <span className="text-xs font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                          {pctTotal}%
                        </span>
                      </div>
                    </div>
                    <div className="h-7 flex rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                      {segmentKeys.map(sk => {
                        const count = segments[sk] ?? 0;
                        if (!count) return null;
                        const pct = (count / total) * 100;
                        return (
                          <div key={sk} style={{ width: `${pct}%`, backgroundColor: colorOf(sk) }}
                            className="flex items-center justify-center"
                            title={`${sk} : ${count} (${Math.round(pct)}%)`}>
                            {pct >= 10 && <span className="text-white text-xs font-bold drop-shadow">{count}</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {segmentKeys.filter(sk => segments[sk]).map(sk => (
                        <span key={sk} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorOf(sk) }} />
                          {sk} : {segments[sk]}
                        </span>
                      ))}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Clubs d'origine */}
        {parClub.length > 0 && (
          <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-5">
            <h3 className="text-base font-bold text-light-onSurface dark:text-dark-onSurface mb-4">Clubs d'origine</h3>
            <div className="space-y-2">
              {(() => {
                const maxCount = parClub[0]?.count ?? 1;
                return parClub.map(({ name, count, logo_url }) => {
                  const isHome = name === 'VEEC';
                  return (
                    <div key={name} className="flex items-center gap-2">
                      {/* Logo ou initiale */}
                      <div className="w-7 h-7 flex-shrink-0 rounded overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        {logo_url
                          ? <img src={logo_url} alt={name} className="w-full h-full object-contain" />
                          : <span className="text-[10px] font-bold text-gray-400">{name.slice(0, 2)}</span>
                        }
                      </div>
                      {/* Nom + badge */}
                      <div className="w-44 flex-shrink-0 flex items-center gap-1.5 min-w-0">
                        <span className="text-xs text-light-onSurface dark:text-dark-onSurface truncate" title={name}>{name}</span>
                        {isHome && (
                          <span className="flex-shrink-0 text-[10px] font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1 py-0.5 rounded">notre club</span>
                        )}
                      </div>
                      <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isHome ? 'bg-green-500 dark:bg-green-400' : 'bg-blue-500 dark:bg-blue-400'}`}
                          style={{ width: `${Math.round(count / maxCount * 100)}%` }} />
                      </div>
                      <span className="text-xs font-bold tabular-nums text-light-onSurface dark:text-dark-onSurface w-6 text-right">{count}</span>
                    </div>
                  );
                });
              })()}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              Correspondance automatique sur les clubs enregistrés · saisie libre normalisée
            </p>
          </div>
        )}
      </section>

      {/* ── Stats compétitions ── */}
      {competitions.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-light-onSurface dark:text-dark-onSurface uppercase tracking-wide">
            Compétitions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitions.map(comp => (
              <div key={comp.id} className="bg-light-surface dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="font-semibold text-light-onSurface dark:text-dark-onSurface mb-2">{comp.nom}</p>
                <div className="flex items-end gap-1.5 mb-2">
                  <span className="text-3xl font-extrabold text-green-600 dark:text-green-400 leading-none tabular-nums">
                    {comp.nb_equipes ?? 0}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 mb-0.5">
                    équipe{(comp.nb_equipes ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>
                {comp.tarifs_eligibles && comp.tarifs_eligibles.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {comp.tarifs_eligibles.map(t => (
                      <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Moyen de paiement (admin/entraîneur, tout en bas) ── */}
      {canSeePrivate && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-light-onSurface dark:text-dark-onSurface uppercase tracking-wide">
            Paiements
          </h2>
          <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-5">
            <h3 className="text-base font-bold text-light-onSurface dark:text-dark-onSurface mb-4">Par moyen de paiement</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(stats.parMoyen).sort((a, b) => b[1].count - a[1].count).map(([moyen, data]) => (
                <div key={moyen} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <p className={`text-base font-bold ${moyenColor(moyen)}`}>{moyen}</p>
                  <p className="text-2xl font-bold text-light-onSurface dark:text-dark-onSurface mt-1">{data.count}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatEuro(data.montant)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

// ─── Détail inscription (panel expandable) ────────────────────────────────────

const InscriptionDetail: React.FC<{ ins: InscriptionTournoi }> = ({ ins }) => {
  const { hasRole, user } = useAuth();
  const canSeePrivate = !!user && hasRole(['admin', 'entraineur']);
  const isHelloAsso = !!ins.reference_commande;
  const email = ins.custom_fields?.email || ins.email_payeur;
  const telephone = ins.custom_fields?.telephone;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 pb-4 pt-2 bg-gray-50 dark:bg-gray-800/40">
      {/* Inscription */}
      <div className="space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Inscription</p>
        <DetailRow label="N° billet" value={String(ins.numero_billet)} mono />
        {isHelloAsso && canSeePrivate && <DetailRow label="Réf. commande" value={String(ins.reference_commande)} mono />}
        <DetailRow label="Date" value={ins.date_commande ? new Date(ins.date_commande).toLocaleDateString('fr-FR') : undefined} />
        <DetailRow label="Tarif" value={ins.tarif} />
        {canSeePrivate && <DetailRow label="Montant tarif" value={formatEuroVal(ins.montant_tarif)} />}
        {canSeePrivate && ins.code_promo && <DetailRow label="Code promo" value={ins.code_promo} />}
        {canSeePrivate && ins.montant_code_promo != null && <DetailRow label="Remise promo" value={formatEuroVal(ins.montant_code_promo)} />}
        <div className="flex items-center gap-2 pt-1">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            isHelloAsso ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          }`}>
            {isHelloAsso ? 'HelloAsso' : 'Manuel'}
          </span>
          {canSeePrivate && <span className="text-xs text-gray-500 dark:text-gray-400">{ins.moyen_paiement}</span>}
        </div>
      </div>

      {/* Participant / Contact */}
      <div className="space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Contact</p>
        <DetailRow label="Participant" value={[ins.prenom_participant, ins.nom_participant].filter(Boolean).join(' ')} />
        {canSeePrivate && email && <DetailRow label="Email" value={email} />}
        {canSeePrivate && telephone && <DetailRow label="Téléphone" value={telephone} />}
        {canSeePrivate && (ins.nom_payeur || ins.prenom_payeur) && (
          <DetailRow label="Payeur" value={[ins.prenom_payeur, ins.nom_payeur].filter(Boolean).join(' ')} />
        )}
        {canSeePrivate && ins.email_payeur && ins.email_payeur !== email && <DetailRow label="Email payeur" value={ins.email_payeur} />}
        {!canSeePrivate && (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">Connectez-vous en tant qu'admin ou entraîneur pour voir les coordonnées.</p>
        )}
      </div>

      {/* Équipe */}
      <div className="space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Équipe</p>
        <DetailRow label="Nom d'équipe" value={ins.custom_fields?.nom_equipe} />
        <DetailRow label="Niveau" value={ins.custom_fields?.niveau_equipe} />
        <DetailRow label="Compétition" value={ins.custom_fields?.equipe} />
        <DetailRow label="Club(s) d'origine" value={ins.custom_fields?.clubs_origine} />
        {ins.custom_fields?.commentaire && (
          <div>
            <span className="text-xs text-gray-400 dark:text-gray-500">Commentaire</span>
            <p className="text-xs text-light-onSurface dark:text-dark-onSurface mt-0.5">{ins.custom_fields.commentaire}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({ label, value, mono }) => {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs text-gray-400 dark:text-gray-500">{label} </span>
      <span className={`text-xs font-medium text-light-onSurface dark:text-dark-onSurface ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
};

// ─── Onglet Inscriptions ──────────────────────────────────────────────────────

interface InscriptionsViewProps { inscriptions: InscriptionTournoi[]; tournoiId: number | null; }

const InscriptionsView: React.FC<InscriptionsViewProps> = ({ inscriptions, tournoiId }) => {
  const { competitions: competitionsForKpi } = useCompetitionsTournoi(tournoiId);
  const { hasRole, user } = useAuth();
  const canSeePrivate = !!user && hasRole(['admin', 'entraineur']);
  const [filterTarif, setFilterTarif] = useState('');
  const [filterNiveau, setFilterNiveau] = useState('');
  const [search, setSearch] = useState('');
  const [expandedBillet, setExpandedBillet] = useState<number | null>(null);
  const [sortCol, setSortCol] = useState<'participant' | 'equipe' | 'niveau' | ''>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (col: 'participant' | 'equipe' | 'niveau') => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };
  const SortTh = ({ col, label }: { col: 'participant' | 'equipe' | 'niveau'; label: string }) => (
    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none whitespace-nowrap"
      onClick={() => toggleSort(col)}>
      {label}<span className="ml-1 opacity-60">{sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
    </th>
  );

  const stats = useMemo(() => {
    const valideesIns = inscriptions.filter(i => isValide(i.statut_commande));
    const validees = valideesIns.length;
    const m = (v: number | string | null | undefined): number => { const n = Number(v ?? 0); return isNaN(n) ? 0 : n; };
    const montantBrut = valideesIns.reduce((s, i) => s + m(i.montant_tarif), 0);
    const montantPromo = valideesIns.reduce((s, i) => s + m(i.montant_code_promo), 0);
    const montant = montantBrut - montantPromo;
    return { total: inscriptions.length, validees, montant, montantBrut, montantPromo };
  }, [inscriptions]);

  const nbEquipesKpi = competitionsForKpi.reduce((s, c) => s + (c.nb_equipes ?? 0), 0);

  const tarifs = [...new Set(inscriptions.map(i => i.tarif).filter(Boolean))];
  const niveaux = [...new Set(inscriptions.map(i => i.custom_fields?.niveau_equipe).filter(Boolean))];

  const filtered = inscriptions
    .filter(i => {
      if (filterTarif && i.tarif !== filterTarif) return false;
      if (filterNiveau && i.custom_fields?.niveau_equipe !== filterNiveau) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [
          i.prenom_participant, i.nom_participant,
          i.custom_fields?.nom_equipe,
          i.custom_fields?.niveau_equipe,
          String(i.numero_billet),
          ...(canSeePrivate ? [i.custom_fields?.email || i.email_payeur, i.custom_fields?.telephone] : []),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'participant') {
        cmp = [a.nom_participant, a.prenom_participant].filter(Boolean).join(' ')
          .localeCompare([b.nom_participant, b.prenom_participant].filter(Boolean).join(' '), 'fr');
      } else if (sortCol === 'equipe') {
        cmp = (a.custom_fields?.nom_equipe ?? '').localeCompare(b.custom_fields?.nom_equipe ?? '', 'fr');
      } else if (sortCol === 'niveau') {
        cmp = niveauRank(a.custom_fields?.niveau_equipe ?? '') - niveauRank(b.custom_fields?.niveau_equipe ?? '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  return (
    <div className="space-y-4">
      {/* KPI mini-bar */}
      <div className={`grid gap-3 ${canSeePrivate ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <StatCard label="Total inscriptions" value={stats.total} color="green" />
        {canSeePrivate && (
          <StatCard label="Montant encaissé" value={formatEuro(stats.montant)} color="green"
            sub={stats.montantPromo > 0 ? `brut ${formatEuro(stats.montantBrut)} − promos ${formatEuro(stats.montantPromo)}` : undefined} />
        )}
        <StatCard label="Équipes" value={nbEquipesKpi} color="purple" />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={canSeePrivate ? "Recherche nom, équipe, email, n° billet..." : "Recherche nom, équipe, niveau, n° billet..."}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface min-w-52"
        />
        <select value={filterTarif} onChange={e => setFilterTarif(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface">
          <option value="">Tous tarifs</option>
          {tarifs.map(t => <option key={t!} value={t!}>{t}</option>)}
        </select>
        {niveaux.length > 0 && (
          <select value={filterNiveau} onChange={e => setFilterNiveau(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface">
            <option value="">Tous niveaux</option>
            {niveaux.map(n => <option key={n!} value={n!}>{n}</option>)}
          </select>
        )}
        {(filterTarif || filterNiveau || search) && (
          <button onClick={() => { setFilterTarif(''); setFilterNiveau(''); setSearch(''); }}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            Effacer
          </button>
        )}
        <span className="text-sm text-gray-500 dark:text-gray-400 self-center">
          {filtered.length} / {inscriptions.length}
        </span>
      </div>

      {/* Tableau */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Aucun résultat</div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <SortTh col="participant" label="Participant" />
                <SortTh col="equipe" label="Équipe" />
                <SortTh col="niveau" label="Niveau" />
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Tarif</th>
                {canSeePrivate && <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Montant</th>}
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((ins: InscriptionTournoi) => (
                <React.Fragment key={ins.numero_billet}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-light-onSurface dark:text-dark-onSurface">
                        {[ins.prenom_participant, ins.nom_participant].filter(Boolean).join(' ') || '-'}
                      </div>
                      {canSeePrivate && (ins.custom_fields?.email || ins.email_payeur) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {ins.custom_fields?.email || ins.email_payeur}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {ins.custom_fields?.nom_equipe
                        ? <span className="font-medium text-light-onSurface dark:text-dark-onSurface">{ins.custom_fields.nom_equipe}</span>
                        : <span className="text-gray-400 dark:text-gray-500">-</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {ins.custom_fields?.niveau_equipe
                        ? <span className={`inline-block px-1.5 py-0.5 rounded font-medium ${niveauBadgeClass(ins.custom_fields.niveau_equipe)}`}>
                            {ins.custom_fields.niveau_equipe}
                          </span>
                        : <span className="text-gray-400 dark:text-gray-500">-</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-light-onSurface dark:text-dark-onSurface">{ins.tarif || '-'}</td>
                    {canSeePrivate && (
                      <td className="px-3 py-2 text-sm font-medium text-light-onSurface dark:text-dark-onSurface tabular-nums">
                        {ins.montant_tarif != null ? formatEuro(Number(ins.montant_tarif)) : '-'}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setExpandedBillet(expandedBillet === ins.numero_billet ? null : ins.numero_billet)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          expandedBillet === ins.numero_billet
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}>
                        {expandedBillet === ins.numero_billet ? 'Masquer' : 'Voir'}
                      </button>
                    </td>
                  </tr>
                  {expandedBillet === ins.numero_billet && (
                    <tr>
                      <td colSpan={canSeePrivate ? 6 : 5} className="p-0 border-t border-green-200 dark:border-green-800">
                        <InscriptionDetail ins={ins} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Onglet Compétitions / Équipes ────────────────────────────────────────────

const CompetitionEquipesPanel: React.FC<{ competition: CompetitionTournoi }> = ({ competition }) => {
  const { equipes, loading } = useEquipesCompetition(competition.id);
  const [search, setSearch] = useState('');

  const displayed = equipes
    .filter(eq => !search || eq.nom_equipe.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const rA = niveauRank(a.niveau_equipe ?? '');
      const rB = niveauRank(b.niveau_equipe ?? '');
      if (rA !== rB) return rA - rB;
      return a.nom_equipe.localeCompare(b.nom_equipe, 'fr');
    });

  return (
    <div className="px-4 pb-5">
      {loading ? (
        <p className="text-sm text-gray-400 py-3">Chargement...</p>
      ) : equipes.length === 0 ? (
        <p className="text-sm text-gray-400 py-3">Aucune équipe configurée</p>
      ) : (
        <>
          <div className="flex items-center gap-3 mt-3 mb-4">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une équipe..."
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface min-w-48" />
            <span className="text-xs text-gray-400">{displayed.length} / {equipes.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayed.map((eq, idx) => (
              <div key={eq.id} className="relative border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                {/* Numéro + badges */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {eq.niveau_equipe && (
                      <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${niveauBadgeClass(eq.niveau_equipe)}`}>
                        {eq.niveau_equipe}
                      </span>
                    )}
                    {eq.is_staff && (
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full font-semibold">STAFF</span>
                    )}
                  </div>
                </div>
                {/* Nom équipe */}
                <p className="font-bold text-light-onSurface dark:text-dark-onSurface text-sm leading-snug mb-3">
                  {eq.nom_equipe}
                </p>
                {/* Contact */}
                {(eq.prenom_contact || eq.nom_contact || eq.email_contact || eq.telephone_contact) && (
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-2.5 space-y-1">
                    {(eq.prenom_contact || eq.nom_contact) && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-100">
                        <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium">{[eq.prenom_contact, eq.nom_contact].filter(Boolean).join(' ')}</span>
                      </div>
                    )}
                    {eq.telephone_contact && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-200">
                        <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {eq.telephone_contact}
                      </div>
                    )}
                    {eq.email_contact && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-200">
                        <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{eq.email_contact}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface CompetitionsViewProps { tournoiId: number | null; }

const CompetitionsView: React.FC<CompetitionsViewProps> = ({ tournoiId }) => {
  const { competitions, loading } = useCompetitionsTournoi(tournoiId);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (loading) return <div className="text-center py-8 text-gray-400 text-sm">Chargement...</div>;
  if (competitions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>Aucune compétition configurée pour ce tournoi.</p>
        <p className="text-sm mt-1 text-gray-400">Rendez-vous dans l'Administration → Tournois → Compétitions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {competitions.map(comp => (
        <div key={comp.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}>
            <div className="flex items-center gap-3 flex-wrap">
              <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expandedId === comp.id ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-semibold text-light-onSurface dark:text-dark-onSurface">{comp.nom}</span>
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full font-bold">
                {comp.nb_equipes ?? 0} équipe{(comp.nb_equipes ?? 0) !== 1 ? 's' : ''}
              </span>
              {comp.tarifs_eligibles && comp.tarifs_eligibles.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {comp.tarifs_eligibles.map(t => (
                    <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {expandedId === comp.id && <CompetitionEquipesPanel competition={comp} />}
        </div>
      ))}
    </div>
  );
};

// ─── Composant principal ───────────────────────────────────────────────────────

type PageTab = 'stats' | 'inscriptions' | 'competitions';

const TournoiPage: React.FC = () => {
  const { tournois, loading: tournoiLoading } = useTournois();
  const [selectedTournoiId, setSelectedTournoiId] = useState<number | null>(null);
  const [pageTab, setPageTab] = useState<PageTab>('stats');

  React.useEffect(() => {
    if (tournois.length === 0 || selectedTournoiId) return;
    const today = todayStr();
    const active = tournois.find(t => t.date_debut && t.date_fin && t.date_debut <= today && t.date_fin >= today);
    setSelectedTournoiId(active?.id ?? tournois[0].id);
  }, [tournois, selectedTournoiId]);

  const selectedTournoi = tournois.find(t => t.id === selectedTournoiId) ?? null;
  const { inscriptions, loading: inscLoading } = useInscriptionsTournoi(selectedTournoiId);

  const tabClass = (v: PageTab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${pageTab === v
      ? 'border-green-600 text-green-700 dark:text-green-400 bg-light-surface dark:bg-dark-surface'
      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`;

  if (tournoiLoading) {
    return (
      <main className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Chargement...</div>
      </main>
    );
  }

  if (tournois.length === 0) {
    return (
      <main className="p-4 sm:p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-light-onSurface dark:text-dark-onSurface mb-6">Tournois</h1>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Aucun tournoi configuré – rendez-vous dans l'Administration.
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap gap-4 items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-light-onSurface dark:text-dark-onSurface">Tournois</h1>
          {selectedTournoi && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedTournoi.lieu && `${selectedTournoi.lieu} · `}
              {selectedTournoi.date_debut && formatDate(selectedTournoi.date_debut)}
              {selectedTournoi.date_fin && selectedTournoi.date_debut !== selectedTournoi.date_fin &&
                ` → ${formatDate(selectedTournoi.date_fin)}`}
            </p>
          )}
        </div>
        <select
          value={selectedTournoiId ?? ''}
          onChange={e => setSelectedTournoiId(e.target.value ? Number(e.target.value) : null)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface">
          {tournois.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
        </select>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex gap-1">
        <button className={tabClass('stats')} onClick={() => setPageTab('stats')}>Statistiques</button>
        <button className={tabClass('inscriptions')} onClick={() => setPageTab('inscriptions')}>
          Inscriptions {!inscLoading && inscriptions.length > 0 && `(${inscriptions.length})`}
        </button>
        <button className={tabClass('competitions')} onClick={() => setPageTab('competitions')}>Compétitions / Équipes</button>
      </div>

      {inscLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Chargement des inscriptions...</div>
      ) : pageTab === 'stats' ? (
        inscriptions.length === 0
          ? <div className="text-center py-12 bg-light-surface dark:bg-dark-surface rounded-lg shadow-md">
              <p className="text-gray-500 dark:text-gray-400">Aucune inscription pour ce tournoi.</p>
            </div>
          : <StatsView inscriptions={inscriptions} tournoiId={selectedTournoiId} />
      ) : pageTab === 'inscriptions' ? (
        inscriptions.length === 0
          ? <div className="text-center py-12 bg-light-surface dark:bg-dark-surface rounded-lg shadow-md">
              <p className="text-gray-500 dark:text-gray-400">Aucune inscription pour ce tournoi.</p>
              <p className="text-sm text-gray-400 mt-2">Importez le fichier HelloAsso ou créez des billets depuis l'Administration.</p>
            </div>
          : <InscriptionsView inscriptions={inscriptions} tournoiId={selectedTournoiId} />
      ) : (
        <CompetitionsView tournoiId={selectedTournoiId} />
      )}
    </main>
  );
};

export default TournoiPage;
