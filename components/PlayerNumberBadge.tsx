import React from 'react';
import type { PlayerPosition } from '../types';

interface PlayerNumberBadgeProps {
  numero: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  position?: PlayerPosition;
}

/**
 * Composant pour afficher le numéro d'un joueur du club VEEC
 * Style standard: Noir sur fond gris clair (mode clair) / Blanc sur fond noir (mode sombre)
 * Style libéro: Blanc sur fond noir (mode clair) / Noir sur fond blanc (mode sombre)
 */
const PlayerNumberBadge: React.FC<PlayerNumberBadgeProps> = ({
  numero,
  size = 'md',
  className = '',
  position
}) => {
  // Définir les tailles
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-16 h-16 text-2xl'
  };

  const isLibero = position === 'Libéro';

  // Couleurs inversées pour les libéros
  const colorClasses = isLibero
    ? 'bg-black dark:bg-white text-white dark:text-black'
    : 'bg-gray-300 dark:bg-black text-black dark:text-white';

  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-full
        flex items-center justify-center
        font-bold
        ${colorClasses}
        ${className}
      `}
    >
      {numero}
    </div>
  );
};

export default PlayerNumberBadge;
