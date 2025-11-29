import React, { useState, useEffect } from 'react';
import type { TeamInfo, RefereePlayer, PlayerPosition, PlayerRole } from '../../types/referee';

interface TeamSetupProps {
  onComplete: (teamA: TeamInfo, teamB: TeamInfo) => void;
  initialTeamA: TeamInfo;
  initialTeamB: TeamInfo;
}

const POSITIONS: PlayerPosition[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
const ROLES: PlayerRole[] = ['Passeur', 'Pointu', 'R4', 'Central', 'Libéro'];

// Fonction pour créer les joueurs par défaut
const createDefaultPlayers = (): RefereePlayer[] => {
  return [
    { number: '1', position: 'P1', role: 'Passeur', isLibero: false, isCaptain: true },
    { number: '2', position: 'P2', role: 'R4', isLibero: false, isCaptain: false },
    { number: '3', position: 'P3', role: 'Central', isLibero: false, isCaptain: false },
    { number: '4', position: 'P4', role: 'R4', isLibero: false, isCaptain: false },
    { number: '5', position: 'P5', role: 'Pointu', isLibero: false, isCaptain: false },
    { number: '6', position: 'P6', role: 'Central', isLibero: false, isCaptain: false },
    { number: '7', position: 'P1', role: 'Libéro', isLibero: true, isCaptain: false },
  ];
};

const TeamSetup: React.FC<TeamSetupProps> = ({ onComplete, initialTeamA, initialTeamB }) => {
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

  const addPlayer = () => {
    const newPlayer: RefereePlayer = {
      number: '',
      position: 'P1',
      role: 'Passeur',
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
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-light-onSurface dark:text-dark-onSurface">
        Configuration des équipes
      </h2>

      {/* Sélection d'équipe à éditer */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setEditingTeam('A')}
          className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
            editingTeam === 'A'
              ? 'bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Équipe A {teamA.name && `(${teamA.name})`}
        </button>
        <button
          onClick={() => setEditingTeam('B')}
          className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
            editingTeam === 'B'
              ? 'bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Équipe B {teamB.name && `(${teamB.name})`}
        </button>
      </div>

      {/* Informations de l'équipe */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Nom de l'équipe {editingTeam}
          </label>
          <input
            type="text"
            value={currentTeam.name}
            onChange={(e) => setCurrentTeam(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-light-onSurface dark:text-dark-onSurface"
            placeholder="Nom de l'équipe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
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
          <label className="block text-sm font-medium mb-2">
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

      {/* Liste des joueurs */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Joueurs ({currentTeam.players.length} joueurs)
          </h3>
          <button
            onClick={addPlayer}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            + Ajouter un joueur
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {currentTeam.players.map((player, index) => (
            <div
              key={index}
              className="flex gap-2 items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-lg"
            >
              {/* Numéro */}
              <div className="w-14">
                <input
                  type="text"
                  value={player.number}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (/^\d{1,2}$/.test(val) && parseInt(val) >= 0 && parseInt(val) <= 99)) {
                      updatePlayer(index, 'number', val);
                    }
                  }}
                  className="w-full px-2 py-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-center font-bold text-sm"
                  placeholder="N°"
                  maxLength={2}
                />
              </div>

              {/* Rôle */}
              <div className="flex-1">
                <select
                  value={player.role}
                  onChange={(e) => {
                    const newRole = e.target.value as PlayerRole;
                    updatePlayer(index, 'role', newRole);
                    // Si on sélectionne Libéro, cocher automatiquement isLibero
                    if (newRole === 'Libéro') {
                      updatePlayer(index, 'isLibero', true);
                    } else {
                      updatePlayer(index, 'isLibero', false);
                    }
                  }}
                  className="w-full px-2 py-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs"
                >
                  {ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {/* Capitaine */}
              <div className="flex items-center gap-1">
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
                  className="w-4 h-4"
                  id={`captain-${editingTeam}-${index}`}
                />
                <label htmlFor={`captain-${editingTeam}-${index}`} className="text-xs whitespace-nowrap">
                  C
                </label>
              </div>

              {/* Supprimer */}
              <div>
                <button
                  onClick={() => removePlayer(index)}
                  className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-xs"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {currentTeam.players.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              Aucun joueur. Cliquez sur "Ajouter un joueur" pour commencer.
            </div>
          )}
        </div>

        {currentTeam.players.length < 6 && (
          <p className="mt-2 text-sm text-orange-600 dark:text-orange-400">
            ⚠️ Minimum 6 joueurs requis pour démarrer un match
          </p>
        )}
      </div>

      {/* Bouton de validation */}
      <div className="flex justify-end">
        <button
          onClick={() => onComplete(teamA, teamB)}
          disabled={!isValid()}
          className="px-6 py-3 bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuer vers le tirage au sort
        </button>
      </div>
    </div>
  );
};

export default TeamSetup;
