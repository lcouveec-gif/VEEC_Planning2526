import React, { useState } from 'react';
import { useGymnases, useSearchGymnases } from '../../hooks/useGymnases';
import { useClubs } from '../../hooks/useClubs';
import { gymnasesService } from '../../services/gymnasesService';
import type { Gymnase } from '../../types';

type ViewMode = 'list' | 'create' | 'edit';

const GymnasesManager: React.FC = () => {
  const { gymnases, loading, refetch, createGymnase, updateGymnase, deleteGymnase } = useGymnases();
  const { clubs } = useClubs();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedGymnase, setSelectedGymnase] = useState<Gymnase | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClubCode, setFilterClubCode] = useState<string>('');
  const [formData, setFormData] = useState<Partial<Gymnase>>({});
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Recherche de gymnases
  const { data: searchResults = [] } = useSearchGymnases(searchTerm, searchTerm.length >= 2);

  // Appliquer les filtres
  let displayedGymnases = searchTerm.length >= 2 ? searchResults : gymnases;

  // Filtre par club
  if (filterClubCode) {
    if (filterClubCode === '__no_club__') {
      // Filtrer les gymnases sans club
      displayedGymnases = displayedGymnases.filter(g => !g.code_club);
    } else {
      // Filtrer par code club spécifique
      displayedGymnases = displayedGymnases.filter(g => g.code_club === filterClubCode);
    }
  }

  const handleCreate = () => {
    setFormData({});
    setSelectedGymnase(null);
    setViewMode('create');
  };

  const handleEdit = (gymnase: Gymnase) => {
    setSelectedGymnase(gymnase);
    setFormData(gymnase);
    setViewMode('edit');
  };

  const handleCancel = () => {
    setFormData({});
    setSelectedGymnase(null);
    setViewMode('list');
  };

  const handleSave = async () => {
    try {
      console.log('💾 handleSave appelé', { viewMode, formData, selectedGymnase });

      if (!formData.nom?.trim()) {
        alert('Le nom du gymnase est obligatoire');
        return;
      }

      // Nettoyer les données avant sauvegarde (retirer les champs read-only et relations)
      const { id, created_at, updated_at, club, ...cleanData } = formData;
      console.log('🧹 Données nettoyées:', cleanData);

      if (viewMode === 'create') {
        console.log('➕ Mode création');
        await createGymnase(cleanData as Omit<Gymnase, 'id' | 'created_at' | 'updated_at'>);
        alert('Gymnase créé avec succès');
      } else if (viewMode === 'edit' && selectedGymnase) {
        console.log('✏️ Mode édition, ID:', selectedGymnase.id);
        const success = await updateGymnase(selectedGymnase.id, cleanData);
        console.log('📝 Résultat update:', success);
        if (success) {
          alert('Gymnase mis à jour avec succès');
        } else {
          alert('Erreur lors de la mise à jour du gymnase');
          return;
        }
      }

      console.log('🔄 Fermeture du formulaire et rechargement');
      handleCancel();
      // Petit délai pour laisser l'invalidation se propager
      setTimeout(() => refetch(), 100);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du gymnase');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce gymnase ?')) {
      return;
    }

    const success = await deleteGymnase(id);
    if (success) {
      alert('Gymnase supprimé avec succès');
      refetch();
    } else {
      alert('Erreur lors de la suppression');
    }
  };

  const handleGeocode = async () => {
    if (!formData.adresse) {
      alert('Veuillez entrer une adresse avant de géocoder');
      return;
    }

    setIsGeocoding(true);
    try {
      const coords = await gymnasesService.geocodeAddress(
        formData.adresse,
        formData.ville,
        formData.code_postal
      );

      if (coords) {
        setFormData({
          ...formData,
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        alert('Coordonnées GPS obtenues avec succès');
      } else {
        alert('Impossible de géocoder cette adresse');
      }
    } catch (error) {
      console.error('Erreur géocodage:', error);
      alert('Erreur lors du géocodage');
    } finally {
      setIsGeocoding(false);
    }
  };

  if (loading) {
    return <div className="p-4">Chargement des gymnases...</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-light-primary dark:text-dark-primary mb-4">
          Gestion des Gymnases
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Gérez les gymnases et leurs adresses pour l'affichage sur Google Maps
        </p>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Barre de recherche, filtre et bouton nouveau */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              placeholder="Rechercher un gymnase..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-light-primary dark:text-dark-primary"
            />
            <select
              value={filterClubCode}
              onChange={(e) => setFilterClubCode(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-light-primary dark:text-dark-primary min-w-[200px]"
            >
              <option value="">Tous les clubs</option>
              <option value="__no_club__">Sans club</option>
              {clubs.map((club) => (
                <option key={club.code_club} value={club.code_club}>
                  {club.nom_court || club.nom}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-veec-green text-white rounded hover:bg-veec-green/90 whitespace-nowrap"
            >
              + Nouveau Gymnase
            </button>
          </div>

          {/* Liste des gymnases */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Club
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Adresse
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ville
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      GPS
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {displayedGymnases.map((gymnase) => (
                    <tr key={gymnase.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm font-medium text-light-primary dark:text-dark-primary">
                        {gymnase.nom}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {gymnase.club?.nom || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {gymnase.adresse || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {gymnase.ville || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {gymnase.latitude && gymnase.longitude ? (
                          <span className="text-veec-green">✓</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right space-x-2">
                        <button
                          onClick={() => handleEdit(gymnase)}
                          className="text-veec-green hover:text-veec-green/80"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(gymnase.id)}
                          className="text-veec-red hover:text-veec-red/80"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {displayedGymnases.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Aucun gymnase trouvé' : 'Aucun gymnase enregistré'}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Formulaire Création/Édition */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-light-primary dark:text-dark-primary mb-4">
              {viewMode === 'create' ? 'Nouveau Gymnase' : 'Modifier le Gymnase'}
            </h3>

            <div className="space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom du gymnase <span className="text-veec-red">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nom || ''}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-light-primary dark:text-dark-primary"
                  placeholder="Gymnase Jean Moulin"
                />
              </div>

              {/* Club propriétaire */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Club propriétaire (optionnel)
                </label>
                <select
                  value={formData.code_club || ''}
                  onChange={(e) => setFormData({ ...formData, code_club: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-light-primary dark:text-dark-primary"
                >
                  <option value="">Aucun club</option>
                  {clubs.map((club) => (
                    <option key={club.code_club} value={club.code_club}>
                      {club.nom} ({club.code_club})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Identifie le club qui utilise ce gymnase (excluant les plateaux)
                </p>
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Adresse complète
                </label>
                <input
                  type="text"
                  value={formData.adresse || ''}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-light-primary dark:text-dark-primary"
                  placeholder="12 Rue du Sport"
                />
              </div>

              {/* Ville et Code postal */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={formData.code_postal || ''}
                    onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-light-primary dark:text-dark-primary"
                    placeholder="75000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={formData.ville || ''}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-light-primary dark:text-dark-primary"
                    placeholder="Paris"
                  />
                </div>
              </div>

              {/* GPS Coordinates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Coordonnées GPS
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude || ''}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-light-primary dark:text-dark-primary"
                    placeholder="Latitude"
                  />
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude || ''}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-light-primary dark:text-dark-primary"
                    placeholder="Longitude"
                  />
                </div>
                <button
                  onClick={handleGeocode}
                  disabled={isGeocoding || !formData.adresse}
                  className="mt-2 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {isGeocoding ? 'Géocodage...' : '📍 Obtenir les coordonnées GPS'}
                </button>

                {/* Carte Google Maps si coordonnées disponibles */}
                {formData.latitude && formData.longitude && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      📍 Aperçu de la localisation
                    </p>
                    <div className="rounded-lg overflow-hidden shadow-lg border-2 border-gray-200 dark:border-gray-700">
                      <iframe
                        width="100%"
                        height="300"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${formData.latitude},${formData.longitude}&zoom=15`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-light-primary dark:text-dark-primary"
                  placeholder="Informations supplémentaires..."
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-veec-green text-white rounded hover:bg-veec-green/90"
                >
                  Enregistrer
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GymnasesManager;
