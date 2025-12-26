import React, { useState } from 'react';
import { useClubs } from '../../hooks/useClubs';
import { clubsService } from '../../services/clubsService';
import type { Club } from '../../types';

type ViewMode = 'list' | 'edit' | 'create';

const ClubsManager: React.FC = () => {
  const { clubs, loading, error, createClub, updateClub, deleteClub, refetch } = useClubs();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Formulaire
  const [formData, setFormData] = useState<Partial<Club>>({
    code_club: '',
    nom: '',
    nom_court: '',
    ville: '',
    logo_url: '',
  });

  const filteredClubs = clubs.filter(club =>
    club.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.nom_court?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.ville?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.code_club?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (club: Club) => {
    setEditingClub(club);
    setFormData({
      code_club: club.code_club || '',
      nom: club.nom || '',
      nom_court: club.nom_court || '',
      ville: club.ville || '',
      logo_url: club.logo_url || '',
    });
    setSelectedLogo(null);
    setLogoPreview(club.logo_url || null);
    setViewMode('edit');
  };

  const handleCreate = () => {
    setEditingClub(null);
    setFormData({
      code_club: '',
      nom: '',
      nom_court: '',
      ville: '',
      logo_url: '',
    });
    setSelectedLogo(null);
    setLogoPreview(null);
    setViewMode('create');
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier le type
      if (!file.type.startsWith('image/')) {
        alert('Le fichier doit être une image (PNG, JPG, etc.)');
        return;
      }
      // Vérifier la taille (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('L\'image ne doit pas dépasser 2 MB');
        return;
      }

      setSelectedLogo(file);
      // Créer un aperçu
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = async () => {
    if (formData.logo_url) {
      const confirmDelete = window.confirm('Voulez-vous supprimer le logo actuel ?');
      if (confirmDelete) {
        const success = await clubsService.deleteLogo(formData.logo_url);
        if (success) {
          setFormData({ ...formData, logo_url: '' });
          setLogoPreview(null);
          setSelectedLogo(null);
        }
      }
    } else {
      setSelectedLogo(null);
      setLogoPreview(null);
    }
  };

  const handleSave = async () => {
    if (!formData.code_club?.trim()) {
      alert('Le code club est obligatoire (7 positions)');
      return;
    }
    if (formData.code_club.length !== 7) {
      alert('Le code club doit faire exactement 7 caractères');
      return;
    }
    if (!formData.nom?.trim()) {
      alert('Le nom du club est obligatoire');
      return;
    }

    setSaving(true);
    try {
      let logoUrl = formData.logo_url;

      // Étape 1: Upload du logo si un nouveau fichier a été sélectionné
      if (selectedLogo && formData.code_club) {
        setUploading(true);
        const uploadedUrl = await clubsService.uploadLogo(formData.code_club, selectedLogo);
        setUploading(false);

        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        } else {
          alert('Erreur lors de l\'upload du logo. La sauvegarde continue sans logo.');
        }
      }

      // Étape 2: Nettoyer les données
      const cleanedData: Partial<Club> = {
        code_club: formData.code_club,
        nom: formData.nom,
        nom_court: formData.nom_court || null,
        ville: formData.ville || null,
        logo_url: logoUrl || null,
      };

      // Étape 3: Sauvegarder dans la base de données
      if (viewMode === 'edit' && editingClub) {
        // Ne pas inclure code_club dans les updates (c'est la clé primaire)
        const { code_club, ...updatesWithoutCode } = cleanedData;
        const success = await updateClub(editingClub.code_club, updatesWithoutCode);
        if (success) {
          alert('Club mis à jour avec succès !');
          setViewMode('list');
          setEditingClub(null);
          setSelectedLogo(null);
          setLogoPreview(null);
        } else {
          alert('Erreur lors de la mise à jour du club.');
        }
      } else if (viewMode === 'create') {
        const newClub = await createClub(cleanedData as Omit<Club, 'created_at' | 'updated_at'>);
        if (newClub) {
          alert('Club créé avec succès !');
          setViewMode('list');
          setSelectedLogo(null);
          setLogoPreview(null);
        } else {
          alert('Erreur lors de la création du club.');
        }
      }
    } catch (err) {
      console.error('Error in handleSave:', err);
      alert('Une erreur est survenue lors de la sauvegarde.');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = async (club: Club) => {
    if (window.confirm(`Voulez-vous vraiment supprimer le club "${club.nom}" (${club.code_club}) ?`)) {
      // Supprimer le logo si existant
      if (club.logo_url) {
        await clubsService.deleteLogo(club.logo_url);
      }
      const success = await deleteClub(club.code_club);
      if (success && viewMode === 'edit') {
        setViewMode('list');
        setEditingClub(null);
      }
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingClub(null);
  };

  // Vue Liste
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {/* Barre d'actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Rechercher un club (nom, code, ville)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refetch}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Actualiser
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Nouveau club</span>
            </button>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-light-primary dark:border-dark-primary"></div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filteredClubs.length} club{filteredClubs.length > 1 ? 's' : ''}
              {searchTerm && ` sur ${clubs.length}`}
            </div>

            {/* Grille des clubs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClubs.map((club) => (
                <div
                  key={club.code_club}
                  className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md hover:shadow-lg transition-all p-4 cursor-pointer"
                  onClick={() => handleEdit(club)}
                >
                  <div className="flex items-start gap-3">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                      {club.logo_url ? (
                        <img
                          src={club.logo_url}
                          alt={club.nom}
                          className="w-16 h-16 object-contain rounded-lg bg-white p-1 border border-gray-200 dark:border-gray-600"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-light-onSurface dark:text-dark-onSurface truncate">
                          {club.nom}
                        </h3>
                      </div>
                      <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-1">
                        Code: {club.code_club}
                      </p>
                      {club.nom_court && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {club.nom_court}
                        </p>
                      )}
                      {club.ville && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {club.ville}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredClubs.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-light-surface dark:bg-dark-surface rounded-lg">
                {searchTerm ? 'Aucun club trouvé' : 'Aucun club enregistré. Utilisez le script d\'initialisation SQL pour importer depuis les matchs.'}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Vue Edition / Création
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={handleCancel}
          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-xl font-semibold text-light-onSurface dark:text-dark-onSurface">
          {viewMode === 'create' ? 'Nouveau club' : `Modifier : ${editingClub?.nom}`}
        </h3>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Code club */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Code club <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2">(7 positions)</span>
            </label>
            <input
              type="text"
              value={formData.code_club || ''}
              onChange={(e) => setFormData({ ...formData, code_club: e.target.value })}
              disabled={viewMode === 'edit'}
              maxLength={7}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed font-mono"
              placeholder="Ex: 0775819"
            />
            {viewMode === 'edit' && (
              <p className="text-xs text-gray-500 mt-1">Le code ne peut pas être modifié (clé primaire)</p>
            )}
          </div>

          {/* Nom du club */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom du club <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nom || ''}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              placeholder="Ex: VOLLEY CLUB PARIS"
            />
            <p className="text-xs text-gray-500 mt-1">Sans numéro d'équipe (ex: "PARIS" et non "PARIS 1")</p>
          </div>

          {/* Nom court */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom court / Abréviation
            </label>
            <input
              type="text"
              value={formData.nom_court || ''}
              onChange={(e) => setFormData({ ...formData, nom_court: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              placeholder="Ex: VCP"
            />
          </div>

          {/* Ville */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ville
            </label>
            <input
              type="text"
              value={formData.ville || ''}
              onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              placeholder="Ex: Paris"
            />
          </div>

          {/* Logo */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Logo du club
              {formData.code_club && (
                <span className="text-xs text-gray-500 ml-2">
                  (Le fichier sera enregistré comme: {formData.code_club}.png)
                </span>
              )}
            </label>

            {/* Affichage du logo existant ou du preview */}
            {logoPreview && (
              <div className="mb-3 relative inline-block">
                <img
                  src={logoPreview}
                  alt="Aperçu du logo"
                  className="w-32 h-32 object-contain rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white p-2"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
                  title="Supprimer le logo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Input pour sélectionner un logo */}
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {logoPreview ? 'Changer le logo' : 'Sélectionner un logo'}
                <input
                  type="file"
                  accept="image/png,image/jpg,image/jpeg,image/gif,image/webp"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
              </label>
              {selectedLogo && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedLogo.name} ({(selectedLogo.size / 1024).toFixed(0)} Ko)
                </span>
              )}
            </div>

            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Formats acceptés: PNG, JPG, GIF, WebP. Taille max: 2 MB. Le fichier sera automatiquement nommé avec le code du club.
            </p>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
          <div>
            {viewMode === 'edit' && editingClub && (
              <button
                onClick={() => handleDelete(editingClub)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium"
              >
                Supprimer
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving || uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {uploading ? 'Upload en cours...' : 'Enregistrement...'}
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubsManager;
