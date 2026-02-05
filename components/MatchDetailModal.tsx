import React, { useEffect, useState } from 'react';
import type { Match, Gymnase } from '../types';
import { gymnasesService } from '../services/gymnasesService';
import ClubLogo from './ClubLogo';

interface MatchDetailModalProps {
  match: Match;
  onClose: () => void;
}

const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ match, onClose }) => {
  const [gymnase, setGymnase] = useState<Gymnase | null>(null);
  const [loadingGymnase, setLoadingGymnase] = useState(false);

  useEffect(() => {
    const loadGymnase = async () => {
      if (match.Salle) {
        setLoadingGymnase(true);
        try {
          const gymData = await gymnasesService.getGymnaseByNom(match.Salle);
          setGymnase(gymData);
        } catch (error) {
          console.error('Erreur chargement gymnase:', error);
        } finally {
          setLoadingGymnase(false);
        }
      }
    };

    loadGymnase();
  }, [match.Salle]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    if (!time || time === '00:00:00') return 'Horaire à définir';
    return time.substring(0, 5);
  };

  const isPlateau = match.Heure === '00:00:00' || !match.Heure;

  const parseSetScore = (setStr: string | undefined): { scoreA: number; scoreB: number } | null => {
    if (!setStr) return null;
    const scoreMatch = setStr.match(/(\d+)\/(\d+)/);
    if (scoreMatch) {
      return {
        scoreA: parseInt(scoreMatch[1], 10),
        scoreB: parseInt(scoreMatch[2], 10),
      };
    }
    return null;
  };

  const score = parseSetScore(match.Set);

  // Normaliser les chaînes pour la comparaison
  const normalizeString = (str: string | undefined): string => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\u2018\u2019\u201A\u201B']/g, "'")
      .toUpperCase();
  };

  // Déterminer le résultat pour l'équipe VEEC
  const getMatchResult = (): 'victory' | 'defeat' | null => {
    if (!score || !match.NOM_FFVB) return null;

    // Ignorer les matchs avec équipe exempte
    if (!match.EQA_no || !match.EQB_no || match.EQA_no.trim() === '' || match.EQB_no.trim() === '') {
      return null;
    }

    const nomFFVB = normalizeString(match.NOM_FFVB);
    const eqaName = normalizeString(match.EQA_nom);
    const eqbName = normalizeString(match.EQB_nom);
    const isTeamA = eqaName === nomFFVB;
    const isTeamB = eqbName === nomFFVB;

    if (!isTeamA && !isTeamB) return null;

    const teamWon = isTeamA ? score.scoreA > score.scoreB : score.scoreB > score.scoreA;
    return teamWon ? 'victory' : 'defeat';
  };

  const result = getMatchResult();

  // Identifier quelle équipe est le VEEC
  const nomFFVB = normalizeString(match.NOM_FFVB);
  const eqaName = normalizeString(match.EQA_nom);
  const eqbName = normalizeString(match.EQB_nom);
  const isTeamA = eqaName === nomFFVB;
  const isTeamB = eqbName === nomFFVB;

  // Déterminer qui a gagné un set spécifique
  const parseSetDetail = (setScore: string): { scoreA: number; scoreB: number } | null => {
    const match = setScore.match(/(\d+)-(\d+)/);
    if (match) {
      return {
        scoreA: parseInt(match[1], 10),
        scoreB: parseInt(match[2], 10),
      };
    }
    return null;
  };

  const openGoogleMapsDirections = () => {
    if (gymnase?.latitude && gymnase?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${gymnase.latitude},${gymnase.longitude}`;
      window.open(url, '_blank');
    } else if (gymnase?.adresse) {
      const address = [gymnase.adresse, gymnase.code_postal, gymnase.ville].filter(Boolean).join(', ');
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
      window.open(url, '_blank');
    }
  };

  const openWazeDirections = () => {
    if (gymnase?.latitude && gymnase?.longitude) {
      // Waze utilisera automatiquement la position actuelle comme point de départ
      const url = `https://waze.com/ul?ll=${gymnase.latitude},${gymnase.longitude}&navigate=yes&zoom=17`;
      window.open(url, '_blank');
    } else if (gymnase?.adresse) {
      const address = [gymnase.adresse, gymnase.code_postal, gymnase.ville].filter(Boolean).join(', ');
      // Waze utilisera automatiquement la position actuelle comme point de départ
      const url = `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
      window.open(url, '_blank');
    }
  };

  const openGoogleMapsLocation = () => {
    if (gymnase?.latitude && gymnase?.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${gymnase.latitude},${gymnase.longitude}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header compact avec charte graphique */}
        <div className="relative bg-gray-900 dark:bg-white px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Date et infos principales */}
            <div className="flex items-center gap-4 flex-wrap flex-1">
              <span className="text-2xl">{isPlateau ? '🏐' : '⚡'}</span>
              <p className="text-white dark:text-gray-900 capitalize font-bold text-lg">
                {formatDate(match.Date)}
              </p>
              <div className="px-3 py-1 bg-white/10 dark:bg-gray-900/10 rounded-lg border border-white/20 dark:border-gray-900/20">
                <span className="text-lg font-bold text-white dark:text-gray-900">{formatTime(match.Heure)}</span>
              </div>
              {match.Competition && (
                <div className="px-2 py-1 bg-white/10 dark:bg-gray-900/10 rounded border border-white/20 dark:border-gray-900/20">
                  <span className="text-xs font-semibold text-white dark:text-gray-900">{match.Competition}</span>
                </div>
              )}
              {match.equipe?.POULE_CODE && (
                <a
                  href={`https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2024-2025&poule=${match.equipe.POULE_CODE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 bg-veec-green hover:bg-veec-green/90 rounded border border-veec-green/30 transition-all hover:scale-105"
                >
                  <span className="text-xs font-semibold text-white">📊 {match.equipe.POULE_CODE}</span>
                </a>
              )}
              {(match.Arb1 || match.Arb2) && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-600">Arbitres:</span>
                  {match.Arb1 && (
                    <div className="px-2 py-0.5 bg-white/10 dark:bg-gray-900/10 rounded border border-white/20 dark:border-gray-900/20">
                      <span className="text-xs text-white dark:text-gray-900">{match.Arb1}</span>
                    </div>
                  )}
                  {match.Arb2 && (
                    <div className="px-2 py-0.5 bg-white/10 dark:bg-gray-900/10 rounded border border-white/20 dark:border-gray-900/20">
                      <span className="text-xs text-white dark:text-gray-900">{match.Arb2}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Badge résultat */}
            {result && (
              <div className={`px-4 py-2 rounded-lg font-bold text-sm ${
                result === 'victory'
                  ? 'bg-veec-green text-white'
                  : 'bg-veec-red text-white'
              }`}>
                {result === 'victory' ? '✓ Victoire' : '✗ Défaite'}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 dark:bg-gray-900/10 dark:hover:bg-gray-900/20 text-white dark:text-gray-900 transition-all hover:rotate-90"
            >
              <span className="text-xl leading-none">×</span>
            </button>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Équipes et Score - Design amélioré */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-center">
                {/* Équipe A */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-32 h-32 flex items-center justify-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 border-4 border-gray-200 dark:border-gray-700">
                    {match.EQA_club?.logo_url ? (
                      <img
                        src={match.EQA_club.logo_url}
                        alt={match.EQA_club.nom}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ClubLogo
                        codeClub={match.EQA_no}
                        clubName={match.EQA_nom}
                        size="lg"
                        showFallback={true}
                      />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {match.EQA_nom}
                    </p>
                    {match.EQA_equipe && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">
                        {match.EQA_equipe}
                      </p>
                    )}
                  </div>
                </div>

                {/* Score central */}
                <div className="flex flex-col items-center justify-center px-8">
                  {score ? (
                    <div className="text-center">
                      <div className="flex items-center gap-4 mb-2">
                        {/* Score équipe A - vert VEEC si elle a gagné ET que c'est le club, rouge VEEC sinon */}
                        <div className={`text-6xl font-black ${
                          isTeamA && result === 'victory'
                            ? 'text-veec-green'
                            : isTeamA && result === 'defeat'
                            ? 'text-veec-red'
                            : isTeamB && result === 'defeat'
                            ? 'text-veec-green'
                            : isTeamB && result === 'victory'
                            ? 'text-veec-red'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {score.scoreA}
                        </div>
                        <div className="text-4xl font-bold text-gray-400">-</div>
                        {/* Score équipe B - vert VEEC si elle a gagné ET que c'est le club, rouge VEEC sinon */}
                        <div className={`text-6xl font-black ${
                          isTeamB && result === 'victory'
                            ? 'text-veec-green'
                            : isTeamB && result === 'defeat'
                            ? 'text-veec-red'
                            : isTeamA && result === 'defeat'
                            ? 'text-veec-green'
                            : isTeamA && result === 'victory'
                            ? 'text-veec-red'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {score.scoreB}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-veec-green/10 rounded-full border border-veec-green/30">
                        <div className="w-2 h-2 bg-veec-green rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-veec-green">Terminé</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-5xl font-bold text-gray-300 dark:text-gray-600 mb-3">VS</div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-200 dark:border-blue-800">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">À venir</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Équipe B */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-32 h-32 flex items-center justify-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 border-4 border-gray-200 dark:border-gray-700">
                    {match.EQB_club?.logo_url ? (
                      <img
                        src={match.EQB_club.logo_url}
                        alt={match.EQB_club.nom}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ClubLogo
                        codeClub={match.EQB_no}
                        clubName={match.EQB_nom}
                        size="lg"
                        showFallback={true}
                      />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {match.EQB_nom}
                    </p>
                    {match.EQB_equipe && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">
                        {match.EQB_equipe}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Détail des sets */}
              {match.Score && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 text-center">
                    Détail des sets
                  </p>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {match.Score.split(/[\s,]+/).filter(s => s.trim()).map((setScore, idx) => {
                      const setDetail = parseSetDetail(setScore);
                      let setWinner: 'A' | 'B' | null = null;
                      if (setDetail) {
                        setWinner = setDetail.scoreA > setDetail.scoreB ? 'A' : 'B';
                      }

                      // Déterminer la couleur du set basé sur NOM_FFVB
                      let colorClass = 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white';
                      if (setWinner && match.NOM_FFVB && (isTeamA || isTeamB)) {
                        const teamWonSet = (setWinner === 'A' && isTeamA) || (setWinner === 'B' && isTeamB);
                        colorClass = teamWonSet
                          ? 'bg-veec-green/20 border-veec-green/40 text-veec-green'
                          : 'bg-veec-red/20 border-veec-red/40 text-veec-red';
                      }

                      return (
                        <div
                          key={idx}
                          className={`px-4 py-2 rounded-lg border shadow-sm ${colorClass}`}
                        >
                          <span className="text-xs font-medium opacity-80">Set {idx + 1}</span>
                          <p className="text-lg font-bold font-mono">{setScore}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Localisation - uniquement si le match n'a pas encore eu lieu */}
            {match.Salle && !score && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-veec-green/10 to-veec-green/5 dark:from-veec-green/20 dark:to-veec-green/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">📍</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Localisation</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{match.Salle}</p>
                    </div>
                  </div>
                </div>

                {loadingGymnase ? (
                  <div className="p-8 text-center">
                    <div className="inline-flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <div className="w-5 h-5 border-2 border-veec-green border-t-transparent rounded-full animate-spin"></div>
                      <span>Chargement des informations...</span>
                    </div>
                  </div>
                ) : gymnase ? (
                  <div className="p-6 space-y-6">
                    {/* Adresse */}
                    {(gymnase.adresse || gymnase.ville) && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-veec-green/10 rounded-lg flex-shrink-0">
                          <span className="text-xl">🏟️</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Adresse</p>
                          <p className="text-base font-medium text-gray-900 dark:text-white">
                            {gymnase.adresse || '-'}
                          </p>
                          <p className="text-base font-medium text-gray-900 dark:text-white">
                            {gymnase.code_postal} {gymnase.ville}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Carte Google Maps */}
                    {gymnase.latitude && gymnase.longitude && (
                      <div className="rounded-xl overflow-hidden shadow-lg border-2 border-gray-200 dark:border-gray-700">
                        <iframe
                          width="100%"
                          height="400"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${gymnase.latitude},${gymnase.longitude}&zoom=15`}
                        />
                      </div>
                    )}

                    {/* Boutons d'action */}
                    {((gymnase.latitude && gymnase.longitude) || gymnase.adresse) && (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                          Itinéraire vers le gymnase
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            onClick={openGoogleMapsDirections}
                            className="group relative px-5 py-3 bg-white dark:bg-gray-800 border-2 border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl font-semibold transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center gap-3"
                          >
                            <img
                              src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/googlemaps.svg"
                              alt="Google Maps"
                              className="w-6 h-6"
                              style={{ filter: 'invert(27%) sepia(98%) saturate(2476%) hue-rotate(200deg) brightness(99%) contrast(101%)' }}
                            />
                            <span className="text-blue-600 dark:text-blue-400">Google Maps</span>
                          </button>
                          <button
                            onClick={openWazeDirections}
                            className="group relative px-5 py-3 bg-white dark:bg-gray-800 border-2 border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-xl font-semibold transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center gap-3"
                          >
                            <img
                              src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/waze.svg"
                              alt="Waze"
                              className="w-6 h-6"
                              style={{ filter: 'invert(57%) sepia(86%) saturate(1757%) hue-rotate(160deg) brightness(92%) contrast(101%)' }}
                            />
                            <span className="text-cyan-600 dark:text-cyan-400">Waze</span>
                          </button>
                        </div>
                        {gymnase.latitude && gymnase.longitude && (
                          <button
                            onClick={openGoogleMapsLocation}
                            className="w-full group relative px-5 py-3 bg-veec-green hover:bg-veec-green/90 text-white rounded-xl font-semibold transition-all hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2"
                          >
                            <span className="text-xl">📍</span>
                            <span>Voir la localisation</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Club propriétaire */}
                    {gymnase.club && (
                      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                        {gymnase.club.logo_url && (
                          <div className="w-16 h-16 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg p-2">
                            <img
                              src={gymnase.club.logo_url}
                              alt={gymnase.club.nom}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Club propriétaire</p>
                          <p className="text-base font-bold text-gray-900 dark:text-white">{gymnase.club.nom}</p>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {gymnase.notes && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">ℹ️ Informations</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{gymnase.notes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ Aucune information d'adresse disponible. Vous pouvez l'ajouter dans Admin → Gymnases.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer avec bouton de fermeture */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-semibold transition-all"
          >
            Fermer
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default MatchDetailModal;
