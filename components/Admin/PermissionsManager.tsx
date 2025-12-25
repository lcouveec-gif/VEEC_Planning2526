import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../stores/useAuthStore';
import type { VEECProfile, UserRole } from '../../stores/useAuthStore';

const PermissionsManager: React.FC = () => {
  const currentUserProfile = useAuthStore((state) => state.profile);
  const [profiles, setProfiles] = useState<VEECProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('user');

  // Vérifier que l'utilisateur est admin
  const isAdmin = currentUserProfile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadProfiles();
    }
  }, [isAdmin]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('veec_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setProfiles(data || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des profils');
      console.error('Error loading profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (profileId: string, userId: string, newRole: UserRole) => {
    try {
      setError(null);

      // Ne pas permettre de modifier son propre rôle
      if (userId === currentUserProfile?.user_id) {
        setError('Vous ne pouvez pas modifier votre propre rôle');
        return;
      }

      const { error: updateError } = await supabase
        .from('veec_profiles')
        .update({ role: newRole })
        .eq('id', profileId);

      if (updateError) {
        throw updateError;
      }

      // Recharger les profils
      await loadProfiles();
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification du rôle');
      console.error('Error updating role:', err);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'entraineur':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'user':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'entraineur':
        return 'Entraîneur';
      case 'user':
        return 'Utilisateur';
      default:
        return role;
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
          Accès refusé
        </h3>
        <p className="text-red-700 dark:text-red-400">
          Seuls les administrateurs peuvent gérer les autorisations.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-8 shadow-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-veec-blue mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Chargement des utilisateurs...</p>
      </div>
    );
  }

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 shadow-md">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-light-onSurface dark:text-dark-onSurface mb-2">
          Gestion des autorisations
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Modifier les rôles des utilisateurs de l'application
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Légende des rôles */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Rôles disponibles :</h4>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <div className="flex items-start">
            <span className="font-semibold mr-2">Admin :</span>
            <span>Accès complet à toutes les fonctionnalités incluant la gestion des autorisations</span>
          </div>
          <div className="flex items-start">
            <span className="font-semibold mr-2">Entraîneur :</span>
            <span>Accès complet sauf gestion des autorisations (équipes, collectifs, position, referee, IA, admin)</span>
          </div>
          <div className="flex items-start">
            <span className="font-semibold mr-2">User :</span>
            <span>Accès en lecture seule aux entraînements, matchs et équipes</span>
          </div>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                Utilisateur
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                Email
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                Rôle
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {profiles.map((profile) => {
              const isCurrentUser = profile.user_id === currentUserProfile?.user_id;
              const isEditing = editingId === profile.id;

              return (
                <tr
                  key={profile.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                    isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {profile.prenom} {profile.nom}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Vous)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{profile.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                      >
                        <option value="user">Utilisateur</option>
                        <option value="entraineur">Entraîneur</option>
                        <option value="admin">Administrateur</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                          profile.role
                        )}`}
                      >
                        {getRoleLabel(profile.role)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRoleChange(profile.id, profile.user_id, newRole)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (isCurrentUser) {
                            setError('Vous ne pouvez pas modifier votre propre rôle');
                            return;
                          }
                          setEditingId(profile.id);
                          setNewRole(profile.role);
                          setError(null);
                        }}
                        disabled={isCurrentUser}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          isCurrentUser
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        Modifier
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {profiles.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">Aucun utilisateur trouvé</p>
        </div>
      )}
    </div>
  );
};

export default PermissionsManager;
