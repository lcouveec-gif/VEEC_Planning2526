import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTeams } from '../hooks/useTeams';
import { useCollectifPlayers } from '../hooks/useCollectifPlayers';
import type { TeamWithChampionships } from '../types';

interface TeamViewProps {
  onNavigate?: (page: 'matches' | 'position' | 'admin' | 'training', teamId?: string, adminSection?: string) => void;
}

const TeamCard: React.FC<{ team: TeamWithChampionships; onNavigate?: (page: 'matches' | 'position' | 'admin' | 'training', teamId?: string, adminSection?: string) => void }> = ({ team, onNavigate }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { playerCount, loading: loadingCount } = useCollectifPlayers(team.IDEQUIPE);

  const handleCalendarClick = (url: string | null | undefined) => {
    if (url) window.open(url, '_blank');
  };

  const handlePouleClick = (url: string | null | undefined) => {
    if (url) window.open(url, '_blank');
  };

  return (
    <>
      <div
        className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out overflow-hidden cursor-pointer"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Vue compacte - uniquement l'ID de l'équipe */}
        {!isExpanded && (
          <div className="p-6 flex items-center justify-center min-h-[100px]">
            <h3 className="text-3xl font-bold text-light-primary dark:text-dark-primary">
              {team.IDEQUIPE}
            </h3>
          </div>
        )}

        {/* Vue étendue - tous les détails */}
        {isExpanded && (
          <div className="p-6">
        {/* En-tête avec image miniature */}
        <div className="flex items-start gap-4 mb-4">
          {/* Miniature de l'image cliquable */}
          {team.image_url && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowImageModal(true);
              }}
              className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img
                src={team.image_url}
                alt={team.NOM_EQUIPE || team.IDEQUIPE}
                className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
              />
            </div>
          )}

          {/* ID et Nom */}
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold text-light-primary dark:text-dark-primary mb-1">
              {team.IDEQUIPE}
            </h3>
            {team.NOM_EQUIPE && (
              <p className="text-lg font-medium text-light-onSurface dark:text-dark-onSurface">
                {team.NOM_EQUIPE}
              </p>
            )}
          </div>
        </div>

        {/* Liste des championnats */}
        {team.championships.length > 0 && (
          <div className="mb-4 space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {team.championships.length} championnat{team.championships.length > 1 ? 's' : ''}
            </p>
            {team.championships.map((champ) => (
              <div
                key={`${champ.IDEQUIPE}-${champ.POULE_TEAM}`}
                className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {/* Nom du championnat */}
                {champ.POULE_NOM && (
                  <p className="text-sm font-medium text-light-onSurface dark:text-dark-onSurface mb-1">
                    {champ.POULE_NOM}
                  </p>
                )}
                {champ.NOM_FFVB && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {champ.NOM_FFVB}
                  </p>
                )}

                {/* Poule + liens */}
                <div className="flex items-center gap-2 flex-wrap">
                  {champ.POULE_TEAM && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePouleClick(champ.URL_FFVB);
                      }}
                      disabled={!champ.URL_FFVB}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                        champ.URL_FFVB
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-default'
                      }`}
                    >
                      <span>{champ.POULE_TEAM}</span>
                      {champ.URL_FFVB && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Calendrier */}
                  {champ.QRCODE_URL && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCalendarClick(champ.QRCODE_URL);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary hover:bg-light-primary/20 dark:hover:bg-dark-primary/20 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Calendrier</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowQRModal(champ.QRCODE_URL!);
                        }}
                        className="p-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                        title="Afficher QR Code"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {team.championships.length === 0 && (
          <div className="mb-4 text-sm text-gray-500 dark:text-gray-400 italic">
            Aucun championnat enregistré
          </div>
        )}

        {/* Nombre de joueurs dans le collectif */}
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>
            {loadingCount ? (
              <span className="inline-block w-8 h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
            ) : (
              `${playerCount} joueur${playerCount > 1 ? 's' : ''}`
            )}
          </span>
        </div>

        {/* Navigation vers autres sections */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate?.('training', team.IDEQUIPE);
            }}
            className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
            title="Voir les entraînements"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-xs font-medium">Entraînements</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate?.('matches', team.IDEQUIPE);
            }}
            className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            title="Voir les matchs"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs font-medium">Matchs</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate?.('position', team.IDEQUIPE);
            }}
            className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
            title="Gérer les positions"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            <span className="text-xs font-medium">Position</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate?.('admin', team.IDEQUIPE, 'collectifs');
            }}
            className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Gérer le collectif"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-xs font-medium">Collectif</span>
          </button>
        </div>
          </div>
        )}
      </div>

      {/* Modale pour l'image en grand */}
      {showImageModal && team.image_url && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={team.image_url}
              alt={team.NOM_EQUIPE || team.IDEQUIPE}
              className="rounded-lg max-w-full h-auto"
            />
            <p className="text-center mt-4 text-white font-medium">{team.NOM_EQUIPE || team.IDEQUIPE}</p>
          </div>
        </div>
      )}

      {/* Modale pour le QR Code */}
      {showQRModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowQRModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-light-onSurface dark:text-dark-onSurface">
                QR Code - {team.IDEQUIPE}
              </h3>
              <button
                onClick={() => setShowQRModal(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col items-center">
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG value={showQRModal} size={200} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center break-all">
                {showQRModal}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const TeamView: React.FC<TeamViewProps> = ({ onNavigate }) => {
  const { teams, loading, error } = useTeams();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTeams = teams
    .filter(team =>
      team.NOM_EQUIPE?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.IDEQUIPE?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.championships.some(c =>
        c.NOM_FFVB?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.NOM_CAL?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.POULE_NOM?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
    .sort((a, b) => (a.IDEQUIPE || '').localeCompare(b.IDEQUIPE || ''));

  return (
    <main className="p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-light-onSurface dark:text-dark-onSurface mb-2">
            Équipes du club
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Consultez les informations et calendriers de toutes nos équipes
          </p>
        </div>

        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Rechercher une équipe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-primary dark:border-dark-primary"></div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {filteredTeams.length} équipe{filteredTeams.length > 1 ? 's' : ''}
              {searchTerm && ` sur ${teams.length}`}
            </div>

            {/* Grille d'équipes - Desktop et Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeams.map((team) => (
                <TeamCard key={team.IDEQUIPE} team={team} onNavigate={onNavigate} />
              ))}
            </div>

            {/* Aucune équipe */}
            {filteredTeams.length === 0 && (
              <div className="text-center py-16 bg-light-surface dark:bg-dark-surface rounded-lg">
                <p className="text-xl text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'Aucune équipe trouvée' : 'Aucune équipe'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default TeamView;
