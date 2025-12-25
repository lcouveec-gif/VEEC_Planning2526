import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, type UserRole } from '../stores/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

/**
 * Composant pour protéger les routes selon les rôles utilisateurs
 *
 * @param children - Composants enfants à rendre si autorisé
 * @param allowedRoles - Liste des rôles autorisés (par défaut: tous les rôles authentifiés)
 * @param requireAuth - Si true, nécessite une authentification (par défaut: true)
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireAuth = true
}) => {
  const { isAuthenticated, hasRole, loading, profile } = useAuthStore();

  // Afficher un loader pendant la vérification de l'authentification
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-background dark:bg-dark-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-veec-blue mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Rediriger vers la page de connexion si l'authentification est requise et l'utilisateur n'est pas connecté
  if (requireAuth && !isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Vérifier si l'utilisateur a le rôle requis
  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-background dark:bg-dark-background">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Accès refusé
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <div className="bg-gray-100 dark:bg-gray-700 rounded p-4 mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">Votre rôle :</span> {profile?.role || 'Non défini'}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                <span className="font-semibold">Rôles requis :</span> {allowedRoles.join(', ')}
              </p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="bg-veec-blue hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  // L'utilisateur est autorisé, rendre les composants enfants
  return <>{children}</>;
};

export default ProtectedRoute;
