import React, { useState, useEffect } from 'react';
import type { TeamInfo, RefereePlayer } from '../../types/referee';
import { useClubs } from '../../hooks/useClubs';
import ClubLogo from '../ClubLogo';

interface TeamSetupProps {
  onComplete: (teamA: TeamInfo, teamB: TeamInfo) => void;
  initialTeamA: TeamInfo;
  initialTeamB: TeamInfo;
}

// Fonction pour créer les joueurs par défaut
const createDefaultPlayers = (): RefereePlayer[] => {
  return [
    { number: '1', isLibero: false, isCaptain: true },
    { number: '2', isLibero: false, isCaptain: false },
    { number: '3', isLibero: false, isCaptain: false },
    { number: '4', isLibero: false, isCaptain: false },
    { number: '5', isLibero: false, isCaptain: false },
    { number: '6', isLibero: false, isCaptain: false },
    { number: '7', isLibero: false, isCaptain: false },
    { number: '8', isLibero: false, isCaptain: false },
    { number: '9', isLibero: false, isCaptain: false },
    { number: '10', isLibero: true, isCaptain: false },
  ];
};

const TeamSetup: React.FC<TeamSetupProps> = ({ onComplete, initialTeamA, initialTeamB }) => {
  const { clubs, loading: clubsLoading } = useClubs();
  const [teamA, setTeamA] = useState<TeamInfo>(initialTeamA);
  const [teamB, setTeamB] = useState<TeamInfo>(initialTeamB);
  const [editingTeam, setEditingTeam] = useState<'A' | 'B'>('A');

  // Initialiser les joueurs par défaut si les équipes sont vides
  useEffect(() => {
    if (teamA.players.length === 0) {
      setTeamA(prev => ({ ...prev, players: createDefaultPlayers() }));
    }
    if (teamB.players.length === 0) {
      setTeamB(prev => ({ ...prev, players: createDefaultPlayers() }));
    }
  }, []);

  const currentTeam = editingTeam === 'A' ? teamA : teamB;
  const setCurrentTeam = editingTeam === 'A' ? setTeamA : setTeamB;

  // Gérer le changement de club
  const handleClubChange = (clubCode: string) => {
    const club = clubs.find(c => c.code_club === clubCode);
    if (club) {
      setCurrentTeam(prev => ({
        ...prev,
        clubCode: clubCode,
        name: club.nom_court || club.nom, // Initialiser le nom avec le nom du club
      }));
    } else {
      // Aucun club sélectionné
      setCurrentTeam(prev => ({
        ...prev,
        clubCode: undefined,
        name: '', // Réinitialiser le nom
      }));
    }
  };

  const addPlayer = () => {
    const newPlayer: RefereePlayer = {
      number: '',
      isLibero: false,
      isCaptain: false,
    };
    setCurrentTeam(prev => ({
      ...prev,
      players: [...prev.players, newPlayer],
    }));
  };

  const updatePlayer = (index: number, field: keyof RefereePlayer, value: any) => {
    setCurrentTeam(prev => ({
      ...prev,
      players: prev.players.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }));
  };

  const removePlayer = (index: number) => {
    setCurrentTeam(prev => ({
      ...prev,
      players: prev.players.filter((_, i) => i !== index),
    }));
  };

  const isValid = () => {
    return (
      teamA.name.trim() !== '' &&
      teamB.name.trim() !== '' &&
      teamA.players.length >= 6 &&
      teamB.players.length >= 6 &&
      teamA.players.every(p => p.number.trim() !== '') &&
      teamB.players.every(p => p.number.trim() !== '')
    );
  };

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-light-onSurface dark:text-dark-onSurface">
        Configuration des équipes
      </h2>

      {/* Sélection d'équipe à éditer */}
      <div className="flex gap-2 mb-4 sm:mb-6">
        <button
          onClick={() => setEditingTeam('A')}
          className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base ${
            editingTeam === 'A'
              ? 'bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Équipe A {teamA.name && `(${teamA.name})`}
        </button>
        <button
          onClick={() => setEditingTeam('B')}
          className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base ${
            editingTeam === 'B'
              ? 'bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Équipe B {teamB.name && `(${teamB.name})`}
        </button>
      </div>

      {/* Informations de l'équipe */}
      <div className="space-y-4 mb-6">
        {/* Sélection du club */}
        <div>
          <label className="block text-sm font-medium mb-2 text-light-onSurface dark:text-dark-onSurface">
            Club (optionnel)
          </label>
          <div className="flex items-center gap-3">
            {currentTeam.clubCode && (
              <ClubLogo
                codeClub={currentTeam.clubCode}
                clubName={clubs.find(c => c.code_club === currentTeam.clubCode)?.nom || ''}
                size="md"
                className="flex-shrink-0"
              />
            )}
            <select
              value={currentTeam.clubCode || ''}
              onChange={(e) => handleClubChange(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-light-onSurface dark:text-dark-onSurface text-sm sm:text-base"
              disabled={clubsLoading}
            >
              <option value="">Aucun club</option>
              {clubs.map((club) => (
                <option key={club.code_club} value={club.code_club}>
                  {club.nom_court || club.nom} ({club.code_club})
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Le nom de l'équipe sera initialisé avec le nom du club
          </p>
        </div>

        {/* Nom de l'équipe */}
        <div>
          <label className="block text-sm font-medium mb-2 text-light-onSurface dark:text-dark-onSurface">
            Nom de l'équipe {editingTeam}
          </label>
          <input
            type="text"
            value={currentTeam.name}
            onChange={(e) => setCurrentTeam(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-light-onSurface dark:text-dark-onSurface text-sm sm:text-base"
            placeholder="Nom de l'équipe"
          />
        </div>

        {/* Couleurs */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-light-onSurface dark:text-dark-onSurface">
              Couleur principale
            </label>
            <input
              type="color"
              value={currentTeam.colorPrimary}
              onChange={(e) => setCurrentTeam(prev => ({ ...prev, colorPrimary: e.target.value }))}
              className="w-full h-10 rounded-lg cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-light-onSurface dark:text-dark-onSurface">
              Couleur secondaire
            </label>
            <input
              type="color"
              value={currentTeam.colorSecondary}
              onChange={(e) => setCurrentTeam(prev => ({ ...prev, colorSecondary: e.target.value }))}
              className="w-full h-10 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Liste des joueurs */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-light-onSurface dark:text-dark-onSurface">
            Joueurs ({currentTeam.players.length})
          </h3>
          <button
            onClick={addPlayer}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
          >
            + Joueur
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {currentTeam.players.map((player, index) => (
            <div
              key={index}
              className="flex gap-2 items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-lg"
            >
              {/* Numéro de joueur - Plus grand et tactile */}
              <div className="flex-shrink-0">
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={player.number}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (/^\d{1,2}$/.test(val) && parseInt(val) >= 0 && parseInt(val) <= 99)) {
                      updatePlayer(index, 'number', val);
                    }
                  }}
                  className="w-16 sm:w-20 h-12 sm:h-14 px-2 rounded-lg bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-center font-bold text-xl sm:text-2xl focus:border-light-primary dark:focus:border-dark-primary focus:ring-2 focus:ring-light-primary/30 dark:focus:ring-dark-primary/30 transition-all"
                  placeholder="N°"
                  maxLength={2}
                  min="0"
                  max="99"
                />
              </div>

              {/* Checkboxes avec labels visuels */}
              <div className="flex-1 flex gap-2 sm:gap-3">
                {/* Capitaine */}
                <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-yellow-400 dark:hover:border-yellow-500 transition-colors flex-1">
                  <input
                    type="checkbox"
                    checked={player.isCaptain}
                    onChange={(e) => {
                      // Un seul capitaine par équipe
                      if (e.target.checked) {
                        setCurrentTeam(prev => ({
                          ...prev,
                          players: prev.players.map((p, i) => ({
                            ...p,
                            isCaptain: i === index,
                          })),
                        }));
                      } else {
                        updatePlayer(index, 'isCaptain', false);
                      }
                    }}
                    className="w-5 h-5 rounded text-yellow-500 focus:ring-2 focus:ring-yellow-500"
                  />
                  <span className="text-sm font-medium whitespace-nowrap">
                    <span className="hidden sm:inline">Capitaine</span>
                    <span className="sm:hidden">Cap.</span>
                  </span>
                </label>

                {/* Libéro */}
                <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors flex-1">
                  <input
                    type="checkbox"
                    checked={player.isLibero}
                    onChange={(e) => updatePlayer(index, 'isLibero', e.target.checked)}
                    className="w-5 h-5 rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium whitespace-nowrap">
                    <span className="hidden sm:inline">Libéro</span>
                    <span className="sm:hidden">Lib.</span>
                  </span>
                </label>
              </div>

              {/* Bouton supprimer */}
              <button
                onClick={() => removePlayer(index)}
                className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-xl font-bold flex items-center justify-center"
                aria-label="Supprimer le joueur"
              >
                ×
              </button>
            </div>
          ))}

          {currentTeam.players.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Aucun joueur. Cliquez sur "+ Joueur" pour commencer.
            </div>
          )}
        </div>

        {currentTeam.players.length < 6 && (
          <p className="mt-2 text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
            <span>⚠️</span>
            <span>Minimum 6 joueurs requis pour démarrer un match</span>
          </p>
        )}
      </div>

      {/* Bouton de validation */}
      <div className="flex justify-end">
        <button
          onClick={() => onComplete(teamA, teamB)}
          disabled={!isValid()}
          className="w-full sm:w-auto px-6 py-3 bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          Continuer vers le tirage au sort
        </button>
      </div>
    </div>
  );
};

export default TeamSetup;
