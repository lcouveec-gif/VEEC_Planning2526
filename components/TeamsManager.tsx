import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTeams } from '../hooks/useTeams';
import { useTeamImage } from '../hooks/useTeamImage';
import type { Team } from '../types';

type ViewMode = 'list' | 'edit' | 'create';

const TeamsManager: React.FC = () => {
  const { teams, loading, error, createTeam, updateTeam, deleteTeam, refetch } = useTeams();
  const { uploading, error: imageError, uploadTeamImage, deleteTeamImage } = useTeamImage();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Formulaire
  const [formData, setFormData] = useState<Partial<Team>>({
    IDEQUIPE: '',
    NOM_FFVB: '',
    NOM_CAL: '',
    POULE_TEAM: '',
    POULE_NOM: '',
    URL_FFVB: '',
    CURL_TEAM: '',
    CALDAV_URL: '',
    QRCODE_URL: '',
    image_url: '',
  });
  const [showQRCode, setShowQRCode] = useState<string | null>(null);

  const filteredTeams = teams
    .filter(team =>
      team.NOM_FFVB?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.NOM_CAL?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.POULE_NOM?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (a.IDEQUIPE || '').localeCompare(b.IDEQUIPE || ''));

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      IDEQUIPE: team.IDEQUIPE || '',
      NOM_FFVB: team.NOM_FFVB || '',
      NOM_CAL: team.NOM_CAL || '',
      POULE_TEAM: team.POULE_TEAM || '',
      POULE_NOM: team.POULE_NOM || '',
      URL_FFVB: team.URL_FFVB || '',
      CURL_TEAM: team.CURL_TEAM || '',
      CALDAV_URL: team.CALDAV_URL || '',
      QRCODE_URL: team.QRCODE_URL || '',
      image_url: team.image_url || '',
    });
    setSelectedImage(null);
    setImagePreview(team.image_url || null);
    setViewMode('edit');
  };

  const handleCreate = () => {
    setEditingTeam(null);
    setFormData({
      IDEQUIPE: '',
      NOM_FFVB: '',
      NOM_CAL: '',
      POULE_TEAM: '',
      POULE_NOM: '',
      URL_FFVB: '',
      CURL_TEAM: '',
      CALDAV_URL: '',
      QRCODE_URL: '',
      image_url: '',
    });
    setSelectedImage(null);
    setImagePreview(null);
    setViewMode('create');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      // Créer un aperçu
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = async () => {
    if (formData.image_url) {
      const confirmDelete = window.confirm('Voulez-vous supprimer l\'image actuelle ?');
      if (confirmDelete) {
        const success = await deleteTeamImage(formData.image_url);
        if (success) {
          setFormData({ ...formData, image_url: '' });
          setImagePreview(null);
          setSelectedImage(null);
        }
      }
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleSave = async () => {
    if (!formData.IDEQUIPE?.trim()) {
      alert('L\'ID équipe est obligatoire');
      return;
    }
    if (!formData.NOM_FFVB?.trim()) {
      alert('Le nom FFVB est obligatoire');
      return;
    }

    setSaving(true);
    try {
      // Étape 1: Upload de l'image si une nouvelle image a été sélectionnée
      let imageUrl = formData.image_url;
      if (selectedImage && formData.IDEQUIPE) {
        const uploadedUrl = await uploadTeamImage(formData.IDEQUIPE, selectedImage);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          alert('Erreur lors de l\'upload de l\'image. La sauvegarde continue sans image.');
        }
      }

      // Étape 2: Nettoyer les données : ne garder que les champs avec des valeurs réelles
      const cleanedData: Partial<Team> = {};
      Object.keys(formData).forEach((key) => {
        const value = formData[key as keyof Team];
        // Ne garder que les valeurs non vides (ou null si valeur initiale était null)
        if (value !== '' && value !== undefined) {
          cleanedData[key as keyof Team] = value as any;
        } else if (value === '') {
          // Mettre null seulement pour les champs optionnels
          cleanedData[key as keyof Team] = null as any;
        }
      });

      // Ajouter l'URL de l'image
      if (imageUrl) {
        cleanedData.image_url = imageUrl;
      }

      // Étape 3: Sauvegarder dans la base de données
      if (viewMode === 'edit' && editingTeam) {
        // Ne PAS inclure IDEQUIPE dans les updates (c'est la clé primaire)
        const { IDEQUIPE, ...updatesWithoutId } = cleanedData;
        const success = await updateTeam(editingTeam.IDEQUIPE, updatesWithoutId);
        if (success) {
          alert('Équipe mise à jour avec succès !');
          setViewMode('list');
          setEditingTeam(null);
          setSelectedImage(null);
          setImagePreview(null);
        } else {
          alert('Erreur lors de la mise à jour de l\'équipe.');
        }
      } else if (viewMode === 'create') {
        const newTeam = await createTeam(cleanedData as Team);
        if (newTeam) {
          alert('Équipe créée avec succès !');
          setViewMode('list');
          setSelectedImage(null);
          setImagePreview(null);
        } else {
          alert('Erreur lors de la création de l\'équipe.');
        }
      }
    } catch (err) {
      console.error('Error in handleSave:', err);
      alert('Une erreur est survenue lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (team: Team) => {
    if (window.confirm(`Voulez-vous vraiment supprimer l'équipe "${team.NOM_FFVB}" ?`)) {
      const success = await deleteTeam(team.IDEQUIPE);
      if (success && viewMode === 'edit') {
        setViewMode('list');
        setEditingTeam(null);
      }
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingTeam(null);
  };

  const handleCalendarClick = (url: string | null) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handlePouleClick = (url: string | null) => {
    if (url) {
      window.open(url, '_blank');
    }
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
              placeholder="Rechercher une équipe..."
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
              <span className="hidden sm:inline">Nouvelle équipe</span>
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
              {filteredTeams.length} équipe{filteredTeams.length > 1 ? 's' : ''}
              {searchTerm && ` sur ${teams.length}`}
            </div>

            {/* Liste - Desktop */}
            <div className="hidden md:block bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nom FFVB</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nom Calendrier</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Championnat</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Poule</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTeams.map((team) => (
                    <tr key={team.IDEQUIPE} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-lg text-light-onSurface dark:text-dark-onSurface">{team.IDEQUIPE}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{team.NOM_FFVB}</div>
                      </td>
                      <td className="px-4 py-3">
                        {team.NOM_CAL ? (
                          <button
                            onClick={() => handleCalendarClick(team.QRCODE_URL)}
                            disabled={!team.QRCODE_URL}
                            className={`text-sm text-left ${
                              team.QRCODE_URL
                                ? 'text-gray-800 dark:text-gray-100 hover:underline cursor-pointer'
                                : 'text-gray-600 dark:text-gray-400 cursor-default'
                            }`}
                          >
                            {team.NOM_CAL}
                          </button>
                        ) : (
                          <span className="text-sm text-gray-600 dark:text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{team.POULE_NOM || '-'}</td>
                      <td className="px-4 py-3">
                        {team.POULE_TEAM ? (
                          <button
                            onClick={() => handlePouleClick(team.URL_FFVB)}
                            disabled={!team.URL_FFVB}
                            className={`text-sm text-left ${
                              team.URL_FFVB
                                ? 'text-gray-800 dark:text-gray-100 hover:underline cursor-pointer'
                                : 'text-gray-600 dark:text-gray-400 cursor-default'
                            }`}
                          >
                            {team.POULE_TEAM}
                          </button>
                        ) : (
                          <span className="text-sm text-gray-600 dark:text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {team.QRCODE_URL && (
                            <button
                              onClick={() => setShowQRCode(team.QRCODE_URL!)}
                              className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                              title="Voir QR Code"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(team)}
                            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            title="Modifier"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(team)}
                            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            title="Supprimer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTeams.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'Aucune équipe trouvée' : 'Aucune équipe'}
                </div>
              )}
            </div>

            {/* Liste - Mobile */}
            <div className="md:hidden space-y-3">
              {filteredTeams.map((team) => (
                <div
                  key={team.IDEQUIPE}
                  className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-4"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-light-onSurface dark:text-dark-onSurface truncate">
                        {team.IDEQUIPE}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{team.NOM_FFVB}</p>
                      {team.NOM_CAL && (
                        <button
                          onClick={() => handleCalendarClick(team.QRCODE_URL)}
                          disabled={!team.QRCODE_URL}
                          className={`text-xs truncate block text-left ${
                            team.QRCODE_URL
                              ? 'text-gray-800 dark:text-gray-100 hover:underline'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {team.NOM_CAL}
                        </button>
                      )}
                      {team.POULE_NOM && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{team.POULE_NOM}</p>
                      )}
                      {team.POULE_TEAM && (
                        <button
                          onClick={() => handlePouleClick(team.URL_FFVB)}
                          disabled={!team.URL_FFVB}
                          className={`inline-block mt-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs ${
                            team.URL_FFVB
                              ? 'text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          Poule {team.POULE_TEAM}
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {team.QRCODE_URL && (
                        <button
                          onClick={() => setShowQRCode(team.QRCODE_URL!)}
                          className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(team)}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(team)}
                        className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredTeams.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-light-surface dark:bg-dark-surface rounded-lg">
                  {searchTerm ? 'Aucune équipe trouvée' : 'Aucune équipe'}
                </div>
              )}
            </div>
          </>
        )}

        {/* Modale QR Code */}
        {showQRCode && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowQRCode(null)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-light-onSurface dark:text-dark-onSurface">QR Code</h3>
                <button
                  onClick={() => setShowQRCode(null)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col items-center">
                <div className="p-4 bg-white rounded-lg">
                  <QRCodeSVG value={showQRCode} size={200} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center break-all">{showQRCode}</p>
              </div>
            </div>
          </div>
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
          {viewMode === 'create' ? 'Nouvelle équipe' : `Modifier : ${editingTeam?.NOM_FFVB}`}
        </h3>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* ID Équipe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ID Équipe <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.IDEQUIPE || ''}
              onChange={(e) => setFormData({ ...formData, IDEQUIPE: e.target.value })}
              disabled={viewMode === 'edit'}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              placeholder="Ex: 0775819"
            />
            {viewMode === 'edit' && (
              <p className="text-xs text-gray-500 mt-1">L'ID ne peut pas être modifié</p>
            )}
          </div>

          {/* Nom FFVB */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom FFVB <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.NOM_FFVB || ''}
              onChange={(e) => setFormData({ ...formData, NOM_FFVB: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              placeholder="Ex: VOLLEY CLUB PARIS 1"
            />
          </div>

          {/* Nom Calendrier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom Calendrier
            </label>
            <input
              type="text"
              value={formData.NOM_CAL || ''}
              onChange={(e) => setFormData({ ...formData, NOM_CAL: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              placeholder="Nom court pour le calendrier"
            />
          </div>

          {/* Championnat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Championnat / Poule (nom)
            </label>
            <input
              type="text"
              value={formData.POULE_NOM || ''}
              onChange={(e) => setFormData({ ...formData, POULE_NOM: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              placeholder="Ex: Championnat Régional M15"
            />
          </div>

          {/* Poule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Poule (code)
            </label>
            <input
              type="text"
              value={formData.POULE_TEAM || ''}
              onChange={(e) => setFormData({ ...formData, POULE_TEAM: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              placeholder="Ex: A, B, C..."
            />
          </div>

          {/* URL FFVB */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL FFVB
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.URL_FFVB || ''}
                onChange={(e) => setFormData({ ...formData, URL_FFVB: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
                placeholder="https://..."
              />
              {formData.URL_FFVB && (
                <button
                  type="button"
                  onClick={() => handlePouleClick(formData.URL_FFVB)}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Ouvrir
                </button>
              )}
            </div>
          </div>

          {/* CURL Team */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL Équipe (CURL)
            </label>
            <input
              type="url"
              value={formData.CURL_TEAM || ''}
              onChange={(e) => setFormData({ ...formData, CURL_TEAM: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              placeholder="https://..."
            />
          </div>

          {/* CalDAV URL */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL CalDAV
            </label>
            <input
              type="url"
              value={formData.CALDAV_URL || ''}
              onChange={(e) => setFormData({ ...formData, CALDAV_URL: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              placeholder="https://..."
            />
          </div>

          {/* QR Code URL */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL QR Code
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.QRCODE_URL || ''}
                onChange={(e) => setFormData({ ...formData, QRCODE_URL: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
                placeholder="https://..."
              />
              {formData.QRCODE_URL && (
                <button
                  type="button"
                  onClick={() => handleCalendarClick(formData.QRCODE_URL)}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Ouvrir
                </button>
              )}
            </div>
            {formData.QRCODE_URL && (
              <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200 dark:border-gray-600 inline-block">
                <QRCodeSVG value={formData.QRCODE_URL} size={128} />
                <p className="text-xs text-gray-500 mt-2 text-center">Aperçu du QR Code</p>
              </div>
            )}
          </div>

          {/* Image d'équipe */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Image de l'équipe
            </label>

            {/* Affichage de l'image existante ou du preview */}
            {imagePreview && (
              <div className="mb-3 relative inline-block">
                <img
                  src={imagePreview}
                  alt="Aperçu de l'équipe"
                  className="w-48 h-48 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
                  title="Supprimer l'image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Input pour sélectionner une image */}
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {imagePreview ? 'Changer l\'image' : 'Sélectionner une image'}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
              {selectedImage && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedImage.name} ({(selectedImage.size / 1024).toFixed(0)} Ko)
                </span>
              )}
            </div>

            {imageError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{imageError}</p>
            )}

            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Formats acceptés: JPG, PNG, GIF, WebP. Taille max: 5 MB
            </p>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
          <div>
            {viewMode === 'edit' && editingTeam && (
              <button
                onClick={() => handleDelete(editingTeam)}
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
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Enregistrement...
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

export default TeamsManager;
