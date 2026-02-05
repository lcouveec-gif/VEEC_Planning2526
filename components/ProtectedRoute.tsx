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
 * Mode invité : Les utilisateurs non connectés sont traités comme des "invités"
 * avec des droits équivalents au rôle "user" (lecture seule)
 *
 * @param children - Composants enfants à rendre si autorisé
 * @param allowedRoles - Liste des rôles autorisés (par défaut: tous les rôles)
 * @param requireAuth - Si true, nécessite une authentification (par défaut: false pour permettre le mode invité)
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireAuth = false
}) => {
  const { isAuthenticated, hasRole, loading, profile } = useAuthStore();

  // Afficher un loader pendant la vérification de l'authentification
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-background dark:bg-dark-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-veec-blue mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si l'authentification est explicitement requise et l'utilisateur n'est pas connecté
  if (requireAuth && !isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Vérifier les permissions
  if (allowedRoles && allowedRoles.length > 0) {
    // Si l'utilisateur est connecté, vérifier son rôle
    if (isAuthenticated()) {
      if (!hasRole(allowedRoles)) {
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
                  Cette fonctionnalité nécessite des permissions supplémentaires.
                </p>
                <div className="bg-gray-100 dark:bg-gray-700 rounded p-4 mb-6">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Votre rôle :</span> {profile?.role || 'Invité'}
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
    } else {
      // Mode invité : traiter comme un utilisateur "user"
      // Autoriser l'accès uniquement si "user" est dans les rôles autorisés
      if (!allowedRoles.includes('user')) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-light-background dark:bg-dark-background">
            <div className="max-w-md w-full mx-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                <div className="mb-4">
                  <svg className="mx-auto h-16 w-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Connexion requise
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Cette fonctionnalité nécessite une connexion avec un compte autorisé.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-4 mb-6">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Rôles requis :</span> {allowedRoles.join(', ')}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => window.history.back()}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                  >
                    Retour
                  </button>
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="flex-1 bg-veec-blue hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                  >
                    Se connecter
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }
    }
  }

  // L'utilisateur est autorisé (connecté ou invité avec droits suffisants)
  return <>{children}</>;
};

export default ProtectedRoute;
