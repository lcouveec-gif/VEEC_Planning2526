import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import CollectifsManager from './CollectifsManager';
import TeamsManager from './TeamsManager';
import WebhookManager from './Admin/WebhookManager';
import LLMConfig from './Admin/LLMConfig';
import PermissionsManager from './Admin/PermissionsManager';

type AdminSection = 'menu' | 'teams' | 'collectifs' | 'planning' | 'automation' | 'permissions';

const Admin: React.FC = () => {
  const { section: initialSection, teamId: selectedTeamId } = useParams<{ section?: string; teamId?: string }>();
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = profile?.role === 'admin';
  const [currentSection, setCurrentSection] = useState<AdminSection>(
    (initialSection as AdminSection) || 'menu'
  );

  // Pré-sélectionner la section si initialSection est fourni
  useEffect(() => {
    if (initialSection && initialSection !== currentSection) {
      setCurrentSection(initialSection as AdminSection);
    }
  }, [initialSection, currentSection]);

  const renderMenu = () => (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-light-onSurface dark:text-dark-onSurface mb-8">
        Administration
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Carte Gestion des équipes */}
        <button
          onClick={() => setCurrentSection('teams')}
          className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-light-primary dark:hover:border-dark-primary text-left group"
        >
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 mb-4 group-hover:scale-110 transition-transform">
            <svg
              className="w-8 h-8 text-gray-700 dark:text-gray-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-light-onSurface dark:text-dark-onSurface mb-2">
            Gestion des équipes
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Gérer les équipes du club et leurs informations
          </p>
        </button>

        {/* Carte Gestion des collectifs */}
        <button
          onClick={() => setCurrentSection('collectifs')}
          className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-light-primary dark:hover:border-dark-primary text-left group"
        >
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4 group-hover:scale-110 transition-transform">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-light-onSurface dark:text-dark-onSurface mb-2">
            Gestion des collectifs
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Gérer les collectifs et leurs membres
          </p>
        </button>

        {/* Carte Planning entrainement */}
        <button
          onClick={() => setCurrentSection('planning')}
          className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-light-primary dark:hover:border-dark-primary text-left group"
        >
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4 group-hover:scale-110 transition-transform">
            <svg
              className="w-8 h-8 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-light-onSurface dark:text-dark-onSurface mb-2">
            Planning entrainement
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configurer les plannings d'entraînement
          </p>
        </button>

        {/* Carte IA / Automatisation */}
        <button
          onClick={() => setCurrentSection('automation')}
          className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-light-primary dark:hover:border-dark-primary text-left group"
        >
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4 group-hover:scale-110 transition-transform">
            <svg
              className="w-8 h-8 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-light-onSurface dark:text-dark-onSurface mb-2">
            IA / Automatisation
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Webhooks et configuration LLM
          </p>
        </button>

        {/* Carte Autorisations (Admin uniquement) */}
        {isAdmin && (
          <button
            onClick={() => setCurrentSection('permissions')}
            className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-red-500 dark:hover:border-red-400 text-left group"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4 group-hover:scale-110 transition-transform">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-light-onSurface dark:text-dark-onSurface mb-2">
              Autorisations
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gérer les rôles utilisateurs (Admin uniquement)
            </p>
          </button>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentSection) {
      case 'teams':
        return (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setCurrentSection('menu')}
                className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                ← Retour
              </button>
              <h2 className="text-2xl font-bold text-light-onSurface dark:text-dark-onSurface">
                Gestion des équipes
              </h2>
            </div>
            <TeamsManager />
          </div>
        );

      case 'collectifs':
        return (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setCurrentSection('menu')}
                className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                ← Retour
              </button>
              <h2 className="text-2xl font-bold text-light-onSurface dark:text-dark-onSurface">
                Gestion des collectifs
              </h2>
            </div>
            <CollectifsManager selectedTeamId={selectedTeamId} />
          </div>
        );

      case 'planning':
        return (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setCurrentSection('menu')}
                className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                ← Retour
              </button>
              <h2 className="text-2xl font-bold text-light-onSurface dark:text-dark-onSurface">
                Planning entrainement
              </h2>
            </div>
            <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 shadow-md">
              <p className="text-gray-600 dark:text-gray-400">
                Fonctionnalité en cours de développement...
              </p>
            </div>
          </div>
        );

      case 'automation':
        return (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setCurrentSection('menu')}
                className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                ← Retour
              </button>
              <h2 className="text-2xl font-bold text-light-onSurface dark:text-dark-onSurface">
                IA / Automatisation
              </h2>
            </div>
            <div className="space-y-6">
              <WebhookManager />
              <LLMConfig />
            </div>
          </div>
        );

      case 'permissions':
        return (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setCurrentSection('menu')}
                className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                ← Retour
              </button>
              <h2 className="text-2xl font-bold text-light-onSurface dark:text-dark-onSurface">
                Gestion des autorisations
              </h2>
            </div>
            <PermissionsManager />
          </div>
        );

      default:
        return renderMenu();
    }
  };

  return (
    <main className="p-2 sm:p-4 lg:p-6">
      {renderContent()}
    </main>
  );
};

export default Admin;
