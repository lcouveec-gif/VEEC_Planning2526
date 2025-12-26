import React from 'react';
import { useClubByCode } from '../hooks/useClubs';

interface ClubLogoProps {
  codeClub?: string; // Code du club (7 positions, ex: 0775819)
  clubName?: string; // Nom du club (optionnel, fallback si pas de code)
  size?: 'sm' | 'md' | 'lg'; // Taille du logo
  className?: string; // Classes CSS supplémentaires
  showFallback?: boolean; // Afficher une icône par défaut si pas de logo
}

/**
 * Composant pour afficher le logo d'un club basé sur son code
 * Utilise le code club des matchs (EQA_no ou EQB_no) pour charger le logo
 */
const ClubLogo: React.FC<ClubLogoProps> = ({
  codeClub,
  clubName,
  size = 'md',
  className = '',
  showFallback = true,
}) => {
  // Rechercher le club par son code dans la base de données
  const { data: club, isLoading } = useClubByCode(codeClub, !!codeClub);

  // Déterminer la taille en pixels
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const sizeClass = sizeMap[size];

  // Si en cours de chargement
  if (isLoading) {
    return (
      <div className={`${sizeClass} ${className} rounded bg-gray-200 dark:bg-gray-700 animate-pulse`}></div>
    );
  }

  // Si un logo est trouvé
  if (club?.logo_url) {
    return (
      <img
        src={club.logo_url}
        alt={club.nom}
        title={`${club.nom} (${club.code_club})`}
        className={`${sizeClass} ${className} object-contain rounded bg-white p-0.5`}
      />
    );
  }

  // Fallback : afficher une icône par défaut
  if (showFallback) {
    return (
      <div
        className={`${sizeClass} ${className} rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center`}
        title={clubName || codeClub || 'Club'}
      >
        <svg className="w-2/3 h-2/3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
    );
  }

  // Ne rien afficher si pas de fallback
  return null;
};

export default ClubLogo;
