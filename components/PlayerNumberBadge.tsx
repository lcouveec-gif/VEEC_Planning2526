import React from 'react';

interface PlayerNumberBadgeProps {
  numero: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Composant pour afficher le numéro d'un joueur du club VEEC
 * Style: Blanc sur fond noir (mode sombre) / Noir sur fond gris clair (mode clair)
 */
const PlayerNumberBadge: React.FC<PlayerNumberBadgeProps> = ({
  numero,
  size = 'md',
  className = ''
}) => {
  // Définir les tailles
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-16 h-16 text-2xl'
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-full
        flex items-center justify-center
        font-bold
        bg-gray-300 dark:bg-black
        text-black dark:text-white
        ${className}
      `}
    >
      {numero}
    </div>
  );
};

export default PlayerNumberBadge;
