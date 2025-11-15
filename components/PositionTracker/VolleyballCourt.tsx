import React, { useState, useRef, useEffect } from 'react';
import type { Player, CourtPlayer, CourtPosition, PlayerPosition } from '../../types';
import PlayerNumberBadge from '../PlayerNumberBadge';

interface VolleyballCourtProps {
  players: Player[];
  currentLineup: CourtPlayer[];
  onLineupChange: (lineup: CourtPlayer[]) => void;
}

const VolleyballCourt: React.FC<VolleyballCourtProps> = ({ players, currentLineup, onLineupChange }) => {
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const draggedPlayerRef = useRef<Player | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    position: CourtPosition;
    x: number;
    y: number;
    player?: Player; // Joueur actuellement placé (pour changer son poste)
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Support tactile pour iOS
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);

  // Rotation visuelle du terrain (0 = normal, 90 = quart de tour droite, 180 = demi-tour, 270 = quart de tour gauche)
  const [visualRotation, setVisualRotation] = useState<0 | 90 | 180 | 270>(0);

  const rotateVisualRight = () => {
    setVisualRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
  };

  const rotateVisualLeft = () => {
    setVisualRotation((prev) => ((prev + 270) % 360) as 0 | 90 | 180 | 270);
  };

  // Rotation des joueurs selon les règles du volley
  const rotatePlayersClockwise = () => {
    // +1: P2->P1, P1->P6, P6->P5, P5->P4, P4->P3, P3->P2
    const rotationMap: { [key: number]: number } = {
      2: 1,
      1: 6,
      6: 5,
      5: 4,
      4: 3,
      3: 2
    };

    const newLineup = currentLineup.map(cp => {
      if (typeof cp.position === 'number') {
        const newPosition = rotationMap[cp.position];
        return { ...cp, position: newPosition as CourtPosition };
      }
      return cp;
    });

    onLineupChange(newLineup);
  };

  const rotatePlayersCounterClockwise = () => {
    // -1: P1->P2, P2->P3, P3->P4, P4->P5, P5->P6, P6->P1
    const rotationMap: { [key: number]: number } = {
      1: 2,
      2: 3,
      3: 4,
      4: 5,
      5: 6,
      6: 1
    };

    const newLineup = currentLineup.map(cp => {
      if (typeof cp.position === 'number') {
        const newPosition = rotationMap[cp.position];
        return { ...cp, position: newPosition as CourtPosition };
      }
      return cp;
    });

    onLineupChange(newLineup);
  };

  // Obtenir le joueur à une position donnée
  const getPlayerAtPosition = (position: CourtPosition): Player | undefined => {
    const courtPlayer = currentLineup.find(cp => cp.position === position);
    return courtPlayer?.player;
  };

  // Obtenir tous les joueurs sur le banc
  const getBenchPlayers = (): Player[] => {
    const playersOnCourt = currentLineup.filter(cp => cp.position !== 'Bench').map(cp => cp.player);
    return players.filter(p => !playersOnCourt.some(poc => isSamePlayer(p, poc)));
  };

  // Fonction pour comparer deux joueurs (par prénom/nom ou licencieId)
  const isSamePlayer = (p1: Player, p2: Player): boolean => {
    // Si les deux ont un licencieId, comparer par licencieId
    if (p1.licencieId && p2.licencieId) {
      return p1.licencieId === p2.licencieId;
    }
    // Sinon comparer par prénom + nom
    return p1.prenom === p2.prenom && p1.nom === p2.nom;
  };

  // Gestion du drag
  const handleDragStart = (e: React.DragEvent, player: Player) => {
    console.log('🎯 DEBUG - Drag started for player:', player);
    // Utiliser ref pour stocker le joueur - plus fiable que state ou dataTransfer
    draggedPlayerRef.current = player;
    setDraggedPlayer(player);

    // Essayer aussi dataTransfer pour compatibilité
    try {
      e.dataTransfer.setData('text/plain', player.prenom); // Fallback simple
      e.dataTransfer.effectAllowed = 'move';
    } catch (err) {
      console.warn('⚠️ dataTransfer not supported:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, position: CourtPosition) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('📍 DEBUG - Drop at position:', position);
    console.log('📍 DEBUG - draggedPlayerRef.current:', draggedPlayerRef.current);

    // Utiliser ref qui est plus fiable
    const draggedPlayer = draggedPlayerRef.current;

    if (!draggedPlayer) {
      console.warn('⚠️ DEBUG - No dragged player in ref!');
      return;
    }

    console.log('📍 DEBUG - Dragged player:', draggedPlayer);

    // Créer une nouvelle composition
    let newLineup = [...currentLineup];
    console.log('📋 DEBUG - Current lineup before changes:', newLineup);

    // Trouver la position actuelle du joueur déplacé
    const draggedPlayerPosition = currentLineup.find(cp => isSamePlayer(cp.player, draggedPlayer))?.position;

    // Vérifier s'il y a déjà un joueur à la position cible
    const existingPlayerAtTarget = newLineup.find(cp => cp.position === position);

    if (existingPlayerAtTarget && draggedPlayerPosition) {
      // ÉCHANGE : Les deux joueurs échangent leurs positions
      console.log('🔄 DEBUG - Swapping positions between players');
      newLineup = newLineup.map(cp => {
        if (isSamePlayer(cp.player, draggedPlayer)) {
          // Le joueur déplacé prend la position cible
          return { ...cp, position };
        } else if (isSamePlayer(cp.player, existingPlayerAtTarget.player)) {
          // Le joueur à la position cible prend l'ancienne position du joueur déplacé
          return { ...cp, position: draggedPlayerPosition };
        }
        return cp;
      });
    } else {
      // Comportement normal : retirer le joueur de sa position actuelle
      newLineup = newLineup.filter(cp => !isSamePlayer(cp.player, draggedPlayer));

      // Si la position Libéro est occupée et on essaie de placer quelqu'un d'autre
      if (position === 'Libéro') {
        const existingLibero = newLineup.find(cp => cp.position === 'Libéro');
        if (existingLibero) {
          // Retirer l'ancien libéro (il retournera au banc)
          newLineup = newLineup.filter(cp => cp.position !== 'Libéro');
        }
      }

      // Si on place sur le terrain (positions 1-6) et qu'il y a déjà un joueur
      if (typeof position === 'number') {
        const existingPlayer = newLineup.find(cp => cp.position === position);
        if (existingPlayer) {
          // Retirer le joueur existant (il retournera au banc)
          newLineup = newLineup.filter(cp => cp.position !== position);
        }
      }

      // Ajouter le joueur à la nouvelle position
      newLineup.push({ player: draggedPlayer, position });
    }

    console.log('✅ DEBUG - New lineup after changes:', newLineup);

    onLineupChange(newLineup);

    // Nettoyer
    setDraggedPlayer(null);
    draggedPlayerRef.current = null;
  };

  const handleRemovePlayer = (player: Player) => {
    const newLineup = currentLineup.filter(cp => !isSamePlayer(cp.player, player));
    onLineupChange(newLineup);
  };

  // Gestion du menu contextuel
  const handleContextMenu = (e: React.MouseEvent, position: CourtPosition, player?: Player) => {
    e.preventDefault();
    setContextMenu({ position, x: e.clientX, y: e.clientY, player });
  };

  const handleSelectFromMenu = (player: Player, position: CourtPosition) => {
    let newLineup = [...currentLineup];

    // Retirer le joueur de sa position actuelle
    newLineup = newLineup.filter(cp => !isSamePlayer(cp.player, player));

    // Si la position Libéro est occupée et on essaie de placer quelqu'un d'autre
    if (position === 'Libéro') {
      const existingLibero = newLineup.find(cp => cp.position === 'Libéro');
      if (existingLibero) {
        // Retirer l'ancien libéro
        newLineup = newLineup.filter(cp => cp.position !== 'Libéro');
      }
    }

    // Si on place sur le terrain (positions 1-6), vérifier qu'il n'y a pas déjà 6 joueurs
    if (typeof position === 'number') {
      const existingPlayer = newLineup.find(cp => cp.position === position);
      if (existingPlayer) {
        // Retirer le joueur existant (il retournera au banc)
        newLineup = newLineup.filter(cp => cp.position !== position);
      }
    }

    // Ajouter le joueur à la nouvelle position
    newLineup.push({ player, position });
    onLineupChange(newLineup);

    // Fermer le menu
    setContextMenu(null);
  };

  const handleChangePlayerPosition = (player: Player, newPosition: PlayerPosition) => {
    // Créer un nouveau joueur avec le poste modifié
    const updatedPlayer: Player = {
      ...player,
      defaultPosition: newPosition,
    };

    // Mettre à jour dans la composition
    const newLineup = currentLineup.map(cp => {
      if (isSamePlayer(cp.player, player)) {
        return { ...cp, player: updatedPlayer };
      }
      return cp;
    });

    onLineupChange(newLineup);

    // Fermer le menu
    setContextMenu(null);
  };

  // Fermer le menu contextuel en cliquant ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [contextMenu]);

  // Gestionnaires tactiles pour iOS
  const handleTouchStart = (e: React.TouchEvent, player: Player, position?: CourtPosition) => {
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });

    // Si un joueur est déjà sélectionné et qu'on tape sur une position
    if (selectedPlayer && !isSamePlayer(selectedPlayer, player) && position !== undefined) {
      // C'est un tap pour placer, pas besoin d'appui long
      return;
    }

    // Appui long de 500ms pour sélectionner un nouveau joueur
    touchTimerRef.current = setTimeout(() => {
      setSelectedPlayer(player);
      // Vibration tactile si supportée
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Annuler la sélection si l'utilisateur bouge son doigt
    if (touchTimerRef.current && touchStartPos) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);

      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, player?: Player, position?: CourtPosition) => {
    // Nettoyer le timer d'appui long
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }

    // Si un joueur est sélectionné et qu'on tape sur une position différente
    if (selectedPlayer && player && !isSamePlayer(selectedPlayer, player) && position !== undefined && touchStartPos) {
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);

      // Si le doigt n'a pas bougé (tap simple)
      if (deltaX < 10 && deltaY < 10) {
        e.preventDefault();
        e.stopPropagation();
        handlePlaceSelectedPlayer(position);
      }
    }

    setTouchStartPos(null);
  };

  const handleTouchCancel = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    setTouchStartPos(null);
  };

  // Placer le joueur sélectionné à une position
  const handlePlaceSelectedPlayer = (position: CourtPosition) => {
    if (!selectedPlayer) return;

    // Créer une nouvelle composition
    let newLineup = [...currentLineup];

    // Trouver la position actuelle du joueur sélectionné
    const selectedPlayerPosition = currentLineup.find(cp => isSamePlayer(cp.player, selectedPlayer))?.position;

    // Vérifier s'il y a déjà un joueur à la position cible
    const existingPlayerAtTarget = newLineup.find(cp => cp.position === position);

    if (existingPlayerAtTarget && selectedPlayerPosition) {
      // ÉCHANGE : Les deux joueurs échangent leurs positions
      newLineup = newLineup.map(cp => {
        if (isSamePlayer(cp.player, selectedPlayer)) {
          return { ...cp, position };
        } else if (isSamePlayer(cp.player, existingPlayerAtTarget.player)) {
          return { ...cp, position: selectedPlayerPosition };
        }
        return cp;
      });
    } else if (existingPlayerAtTarget) {
      // Il y a un joueur à la position cible mais le joueur sélectionné vient du banc
      newLineup = newLineup.filter(cp => !isSamePlayer(cp.player, existingPlayerAtTarget.player));
      newLineup.push({ player: selectedPlayer, position });
    } else if (selectedPlayerPosition) {
      // Déplacer le joueur de son ancienne position vers la nouvelle
      newLineup = newLineup.map(cp =>
        isSamePlayer(cp.player, selectedPlayer) ? { ...cp, position } : cp
      );
    } else {
      // Ajouter le joueur du banc
      newLineup.push({ player: selectedPlayer, position });
    }

    onLineupChange(newLineup);
    setSelectedPlayer(null);
  };

  // Tap sur une position vide pour ouvrir le menu
  const handleTapEmptyPosition = (e: React.TouchEvent | React.MouseEvent, position: CourtPosition) => {
    e.preventDefault();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setContextMenu({
      position,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    });
  };

  // Fonction pour formater l'affichage : Prénom + 3 premières lettres du nom
  const formatPlayerDisplay = (player: Player): string => {
    if (!player.prenom.trim()) return '';
    const nomAbrege = player.nom && player.nom.trim() ? player.nom.trim().substring(0, 3).toUpperCase() : '';
    return nomAbrege ? `${player.prenom} ${nomAbrege}` : player.prenom;
  };

  // Composant pour afficher un joueur
  const PlayerCard: React.FC<{ player: Player; canRemove?: boolean; position?: CourtPosition }> = ({
    player,
    canRemove = false,
    position
  }) => {
    const isSelected = selectedPlayer && isSamePlayer(selectedPlayer, player);
    const canReceivePlayer = selectedPlayer && !isSamePlayer(selectedPlayer, player) && position !== undefined;

    const handleCardClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Si un joueur est sélectionné et qu'on clique sur une autre position
      if (canReceivePlayer) {
        handlePlaceSelectedPlayer(position!);
      } else if (!isSelected) {
        // Si aucun joueur sélectionné ou si on clique sur un autre joueur, sélectionner celui-ci
        setSelectedPlayer(player);
      } else if (isSelected) {
        // Si on reclique sur le joueur déjà sélectionné, le désélectionner
        setSelectedPlayer(null);
      }
    };

    const handleCardTouchEnd = (e: React.TouchEvent) => {
      // Gérer le touchEnd de la carte elle-même pour les échanges
      if (canReceivePlayer && touchStartPos) {
        const touch = e.changedTouches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPos.x);
        const deltaY = Math.abs(touch.clientY - touchStartPos.y);

        // Si le doigt n'a pas bougé (tap simple)
        if (deltaX < 10 && deltaY < 10) {
          e.preventDefault();
          e.stopPropagation();
          handlePlaceSelectedPlayer(position!);
          return;
        }
      }

      // Sinon, appeler le handleTouchEnd normal
      handleTouchEnd(e, player, position);
    };

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, player)}
        onDragOver={position !== undefined ? handleDragOver : undefined}
        onDrop={position !== undefined ? (e) => handleDrop(e, position) : undefined}
        onContextMenu={position !== undefined ? (e) => handleContextMenu(e, position, player) : undefined}
        onTouchStart={(e) => handleTouchStart(e, player, position)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleCardTouchEnd}
        onTouchCancel={handleTouchCancel}
        onClick={handleCardClick}
        className={`relative group bg-white dark:bg-gray-700 border-2 rounded-lg p-3 cursor-move hover:shadow-lg transition-all flex flex-col items-center justify-center min-h-[80px] ${
          isSelected
            ? 'border-blue-500 dark:border-blue-400 shadow-lg ring-2 ring-blue-300 dark:ring-blue-600'
            : canReceivePlayer
            ? 'border-green-400 dark:border-green-500 animate-pulse cursor-pointer'
            : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {canRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemovePlayer(player);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleRemovePlayer(player);
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            ×
          </button>
        )}
        {isSelected && position !== undefined && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePlaceSelectedPlayer('Bench');
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handlePlaceSelectedPlayer('Bench');
            }}
            className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold z-10 shadow-lg"
            title="Remettre sur le banc"
          >
            🔄
          </button>
        )}
        {canReceivePlayer && (
          <div className="absolute -top-2 -left-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-10">
            ↓
          </div>
        )}
        <PlayerNumberBadge numero={player.numero_maillot} size="xl" position={player.defaultPosition} />
        <div className="text-sm font-medium text-center mt-1 line-clamp-2">
          {formatPlayerDisplay(player)}
        </div>
        <div className="text-base font-semibold text-gray-600 dark:text-gray-300 mt-1">
          {player.defaultPosition}
        </div>
      </div>
    );
  };

  // Composant pour une position vide
  const EmptyPosition: React.FC<{ position: CourtPosition; label: string }> = ({ position, label }) => {
    const canReceivePlayer = selectedPlayer !== null;

    return (
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, position)}
        onContextMenu={(e) => handleContextMenu(e, position)}
        onClick={canReceivePlayer ? () => handlePlaceSelectedPlayer(position) : (e) => handleTapEmptyPosition(e, position)}
        onTouchEnd={canReceivePlayer ? () => handlePlaceSelectedPlayer(position) : undefined}
        className={`relative border-2 border-dashed rounded-lg p-3 flex flex-col items-center justify-center min-h-[80px] transition-all cursor-pointer ${
          canReceivePlayer
            ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20 animate-pulse'
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-light-primary dark:hover:border-dark-primary hover:bg-gray-100 dark:hover:bg-gray-750'
        }`}
      >
        {canReceivePlayer && (
          <div className="absolute -top-2 -left-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-10">
            ↓
          </div>
        )}
        <div className="text-lg font-bold text-gray-400 dark:text-gray-500">{label}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {canReceivePlayer ? 'Cliquez pour placer' : 'Clic ou clic droit'}
        </div>
      </div>
    );
  };

  // Statistiques
  const courtPlayersCount = currentLineup.filter(cp => typeof cp.position === 'number').length;
  const liberoPlayer = getPlayerAtPosition('Libéro');
  const benchPlayers = getBenchPlayers();

  return (
    <div className="space-y-6">
      {/* Indicateur de joueur sélectionné */}
      {selectedPlayer && (
        <div className="bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <PlayerNumberBadge numero={selectedPlayer.numero_maillot} size="md" position={selectedPlayer.defaultPosition} />
              <div>
                <div className="font-bold text-blue-900 dark:text-blue-100">
                  {formatPlayerDisplay(selectedPlayer)}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Cliquez sur une position pour placer ou échanger
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Vérifier si le joueur est sur le terrain */}
              {currentLineup.find(cp => isSamePlayer(cp.player, selectedPlayer) && cp.position !== 'Bench') && (
                <button
                  onClick={() => {
                    handlePlaceSelectedPlayer('Bench');
                  }}
                  className="px-3 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors font-medium text-sm"
                  title="Remettre sur le banc"
                >
                  🔄 Banc
                </button>
              )}
              <button
                onClick={() => setSelectedPlayer(null)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistiques */}
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-4 shadow-md">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-medium">Joueurs sur le terrain : </span>
            <span className={`font-bold ${courtPlayersCount === 6 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {courtPlayersCount}/6
            </span>
          </div>
          <div>
            <span className="font-medium">Libéro : </span>
            <span className={`font-bold ${liberoPlayer ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
              {liberoPlayer ? '✓' : '✗'}
            </span>
          </div>
          <div>
            <span className="font-medium">Banc : </span>
            <span className="font-bold">{benchPlayers.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Terrain de volley */}
        <div className="lg:col-span-2">
          <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="text-lg font-semibold">Terrain</h3>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Rotation visuelle du terrain */}
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-md">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Vue:</span>
                  <button
                    onClick={rotateVisualLeft}
                    className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-lg"
                    title="Tourner la vue à gauche"
                  >
                    ↶
                  </button>
                  <button
                    onClick={rotateVisualRight}
                    className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-lg"
                    title="Tourner la vue à droite"
                  >
                    ↷
                  </button>
                </div>

                {/* Rotation des joueurs */}
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-md">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Rotation:</span>
                  <button
                    onClick={rotatePlayersCounterClockwise}
                    className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors text-sm font-bold"
                    title="Rotation -1 (sens anti-horaire)"
                  >
                    -1
                  </button>
                  <button
                    onClick={rotatePlayersClockwise}
                    className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors text-sm font-bold"
                    title="Rotation +1 (sens horaire)"
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>

            {/* Affichage du terrain en fonction de la rotation */}
            {visualRotation === 0 ? (
              // Rotation 0° : Filet en haut, Avant en haut, Arrière en bas
              <>
                {/* Filet horizontal en haut */}
                <div className="mb-4">
                  <div className="h-2 bg-gray-800 dark:bg-gray-300 rounded-full relative">
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-gray-300 px-2 py-0.5 rounded text-xs text-white dark:text-gray-800 font-bold">
                      FILET
                    </div>
                  </div>
                </div>

                {/* AVANT en haut (P4, P3, P2) */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">AVANT</div>
                  <div className="grid grid-cols-3 gap-4">
                    {getPlayerAtPosition(4) ? <PlayerCard player={getPlayerAtPosition(4)!} canRemove position={4} /> : <EmptyPosition position={4} label="P4" />}
                    {getPlayerAtPosition(3) ? <PlayerCard player={getPlayerAtPosition(3)!} canRemove position={3} /> : <EmptyPosition position={3} label="P3" />}
                    {getPlayerAtPosition(2) ? <PlayerCard player={getPlayerAtPosition(2)!} canRemove position={2} /> : <EmptyPosition position={2} label="P2" />}
                  </div>
                </div>

                {/* ARRIÈRE en bas (P5, P6, P1) */}
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">ARRIÈRE</div>
                  <div className="grid grid-cols-3 gap-4">
                    {getPlayerAtPosition(5) ? <PlayerCard player={getPlayerAtPosition(5)!} canRemove position={5} /> : <EmptyPosition position={5} label="P5" />}
                    {getPlayerAtPosition(6) ? <PlayerCard player={getPlayerAtPosition(6)!} canRemove position={6} /> : <EmptyPosition position={6} label="P6" />}
                    {getPlayerAtPosition(1) ? <PlayerCard player={getPlayerAtPosition(1)!} canRemove position={1} /> : <EmptyPosition position={1} label="P1" />}
                  </div>
                </div>
              </>
            ) : visualRotation === 90 ? (
              // Rotation 90° : Filet vertical à gauche, Avant à gauche, Arrière à droite
              <div className="flex gap-4">
                {/* Filet vertical à gauche */}
                <div className="flex flex-col items-center justify-center px-2">
                  <div className="h-full w-2 bg-gray-800 dark:bg-gray-300 rounded-full relative flex items-center justify-center">
                    <div className="absolute transform -rotate-90 bg-gray-800 dark:bg-gray-300 px-2 py-0.5 rounded text-xs text-white dark:text-gray-800 font-bold whitespace-nowrap">
                      FILET
                    </div>
                  </div>
                </div>

                {/* AVANT à gauche */}
                <div className="flex-1 space-y-4">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">AVANT</div>
                  {getPlayerAtPosition(4) ? <PlayerCard player={getPlayerAtPosition(4)!} canRemove position={4} /> : <EmptyPosition position={4} label="P4" />}
                  {getPlayerAtPosition(3) ? <PlayerCard player={getPlayerAtPosition(3)!} canRemove position={3} /> : <EmptyPosition position={3} label="P3" />}
                  {getPlayerAtPosition(2) ? <PlayerCard player={getPlayerAtPosition(2)!} canRemove position={2} /> : <EmptyPosition position={2} label="P2" />}
                </div>

                {/* ARRIÈRE à droite */}
                <div className="flex-1 space-y-4">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">ARRIÈRE</div>
                  {getPlayerAtPosition(5) ? <PlayerCard player={getPlayerAtPosition(5)!} canRemove position={5} /> : <EmptyPosition position={5} label="P5" />}
                  {getPlayerAtPosition(6) ? <PlayerCard player={getPlayerAtPosition(6)!} canRemove position={6} /> : <EmptyPosition position={6} label="P6" />}
                  {getPlayerAtPosition(1) ? <PlayerCard player={getPlayerAtPosition(1)!} canRemove position={1} /> : <EmptyPosition position={1} label="P1" />}
                </div>
              </div>
            ) : visualRotation === 180 ? (
              // Rotation 180° : Arrière en haut, Avant en bas, Filet en bas
              <>
                {/* ARRIÈRE en haut (P5, P6, P1) */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">ARRIÈRE</div>
                  <div className="grid grid-cols-3 gap-4">
                    {getPlayerAtPosition(5) ? <PlayerCard player={getPlayerAtPosition(5)!} canRemove position={5} /> : <EmptyPosition position={5} label="P5" />}
                    {getPlayerAtPosition(6) ? <PlayerCard player={getPlayerAtPosition(6)!} canRemove position={6} /> : <EmptyPosition position={6} label="P6" />}
                    {getPlayerAtPosition(1) ? <PlayerCard player={getPlayerAtPosition(1)!} canRemove position={1} /> : <EmptyPosition position={1} label="P1" />}
                  </div>
                </div>

                {/* AVANT en bas (P4, P3, P2) */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">AVANT</div>
                  <div className="grid grid-cols-3 gap-4">
                    {getPlayerAtPosition(4) ? <PlayerCard player={getPlayerAtPosition(4)!} canRemove position={4} /> : <EmptyPosition position={4} label="P4" />}
                    {getPlayerAtPosition(3) ? <PlayerCard player={getPlayerAtPosition(3)!} canRemove position={3} /> : <EmptyPosition position={3} label="P3" />}
                    {getPlayerAtPosition(2) ? <PlayerCard player={getPlayerAtPosition(2)!} canRemove position={2} /> : <EmptyPosition position={2} label="P2" />}
                  </div>
                </div>

                {/* Filet horizontal en bas */}
                <div>
                  <div className="h-2 bg-gray-800 dark:bg-gray-300 rounded-full relative">
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-gray-300 px-2 py-0.5 rounded text-xs text-white dark:text-gray-800 font-bold">
                      FILET
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Rotation 270° : Arrière à gauche, Avant à droite, Filet vertical à droite
              <div className="flex gap-4">
                {/* ARRIÈRE à gauche */}
                <div className="flex-1 space-y-4">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">ARRIÈRE</div>
                  {getPlayerAtPosition(5) ? <PlayerCard player={getPlayerAtPosition(5)!} canRemove position={5} /> : <EmptyPosition position={5} label="P5" />}
                  {getPlayerAtPosition(6) ? <PlayerCard player={getPlayerAtPosition(6)!} canRemove position={6} /> : <EmptyPosition position={6} label="P6" />}
                  {getPlayerAtPosition(1) ? <PlayerCard player={getPlayerAtPosition(1)!} canRemove position={1} /> : <EmptyPosition position={1} label="P1" />}
                </div>

                {/* AVANT à droite */}
                <div className="flex-1 space-y-4">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">AVANT</div>
                  {getPlayerAtPosition(4) ? <PlayerCard player={getPlayerAtPosition(4)!} canRemove position={4} /> : <EmptyPosition position={4} label="P4" />}
                  {getPlayerAtPosition(3) ? <PlayerCard player={getPlayerAtPosition(3)!} canRemove position={3} /> : <EmptyPosition position={3} label="P3" />}
                  {getPlayerAtPosition(2) ? <PlayerCard player={getPlayerAtPosition(2)!} canRemove position={2} /> : <EmptyPosition position={2} label="P2" />}
                </div>

                {/* Filet vertical à droite */}
                <div className="flex flex-col items-center justify-center px-2">
                  <div className="h-full w-2 bg-gray-800 dark:bg-gray-300 rounded-full relative flex items-center justify-center">
                    <div className="absolute transform -rotate-90 bg-gray-800 dark:bg-gray-300 px-2 py-0.5 rounded text-xs text-white dark:text-gray-800 font-bold whitespace-nowrap">
                      FILET
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Libéro et Banc */}
        <div className="space-y-6">
          {/* Libéro */}
          <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-4 shadow-md">
            <h3 className="text-lg font-semibold mb-3">Libéro</h3>
            {liberoPlayer ? (
              <PlayerCard player={liberoPlayer} canRemove position="Libéro" />
            ) : (
              <EmptyPosition position="Libéro" label="Libéro" />
            )}
          </div>

          {/* Banc */}
          <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-4 shadow-md">
            <h3 className="text-lg font-semibold mb-3">Banc ({benchPlayers.length})</h3>
            <div className="max-h-[500px] overflow-y-auto">
              {benchPlayers.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {benchPlayers.map((player, index) => (
                    <PlayerCard key={player.licencieId || `${player.prenom}-${player.nom}-${index}`} player={player} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                  Tous les joueurs sont sur le terrain
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu contextuel */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            top: Math.min(contextMenu.y, window.innerHeight - 300), // Limiter la position pour éviter de sortir de l'écran
            left: contextMenu.x,
            zIndex: 1000,
            maxHeight: '300px', // Hauteur maximale fixe
          }}
          className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden flex flex-col"
        >
          {contextMenu.player ? (
            // Menu pour changer le poste d'un joueur placé
            <>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                Changer le poste de {contextMenu.player.prenom}
              </div>
              <div className="overflow-y-auto flex-1">
                {(['Passeur', 'Libéro', 'R4', 'Pointu', 'Central'] as PlayerPosition[]).map((poste) => (
                  <button
                    key={poste}
                    onClick={() => handleChangePlayerPosition(contextMenu.player!, poste)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                      contextMenu.player!.defaultPosition === poste
                        ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {contextMenu.player!.defaultPosition === poste && (
                        <span className="text-blue-600 dark:text-blue-400">✓</span>
                      )}
                      <span className="text-sm">{poste}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            // Menu pour placer un joueur du banc
            <>
              {benchPlayers.length > 0 ? (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    Sélectionner un joueur
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {benchPlayers.map((player, index) => (
                      <button
                        key={player.licencieId || `${player.prenom}-${player.nom}-${index}`}
                        onClick={() => handleSelectFromMenu(player, contextMenu.position)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      >
                        <div className="flex-shrink-0">
                          <PlayerNumberBadge numero={player.numero_maillot} size="md" position={player.defaultPosition} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                            {formatPlayerDisplay(player)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {player.defaultPosition}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  Aucun joueur disponible
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VolleyballCourt;
