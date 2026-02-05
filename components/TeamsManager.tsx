import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTeams } from '../hooks/useTeams';
import { useTeamImage } from '../hooks/useTeamImage';
import { useChampionnats } from '../hooks/useChampionnats';
import type { Team, TeamFFVB, TeamWithChampionships, Championnat } from '../types';

type ViewMode = 'list' | 'edit' | 'create';
type TabMode = 'equipes' | 'championnats';

const emptyTeamForm: Partial<Team> = {
  IDEQUIPE: '',
  NOM_EQUIPE: '',
  image_url: '',
  scorenco_url: '',
};

const emptyChampForm: Partial<TeamFFVB> = {
  IDEQUIPE: '',
  POULE_TEAM: '',
  NOM_FFVB: '',
  NOM_CAL: '',
  POULE_NOM: '',
  URL_FFVB: '',
  CURL_TEAM: '',
  CALDAV_URL: '',
  QRCODE_URL: '',
    scorenco_url: '',
};

const TeamsManager: React.FC = () => {
  const {
    teams, loading, error,
    createTeam, updateTeam, deleteTeam,
    createChampionship, updateChampionship, deleteChampionship,
    refetch,
  } = useTeams();
  const { uploading, error: imageError, uploadTeamImage, deleteTeamImage } = useTeamImage();
  const {
    championnats,
    loading: loadingChampionnats,
    error: errorChampionnats,
    createChampionnat,
    updateChampionnat,
    deleteChampionnat,
    refetch: refetchChampionnats,
  } = useChampionnats();

  const [tabMode, setTabMode] = useState<TabMode>('equipes');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingTeam, setEditingTeam] = useState<TeamWithChampionships | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);

  // Formulaire équipe parent
  const [formData, setFormData] = useState<Partial<Team>>(emptyTeamForm);

  // Formulaire championnat
  const [editingChampionship, setEditingChampionship] = useState<TeamFFVB | null>(null);
  const [showChampionshipForm, setShowChampionshipForm] = useState(false);
  const [champFormData, setChampFormData] = useState<Partial<TeamFFVB>>(emptyChampForm);
  const [savingChampionship, setSavingChampionship] = useState(false);

  // --- Referentiel Championnats ---
  const [champRefSearch, setChampRefSearch] = useState('');
  const [editingChampRef, setEditingChampRef] = useState<Championnat | null>(null);
  const [champRefFormData, setChampRefFormData] = useState<Partial<Championnat>>({ code_championnat: '', nom_championnat: '', url_championnat: '' });
  const [showChampRefForm, setShowChampRefForm] = useState(false);
  const [savingChampRef, setSavingChampRef] = useState(false);

  const filteredChampionnats = championnats
    .filter(c => {
      const term = champRefSearch.toLowerCase();
      return (
        c.code_championnat?.toLowerCase().includes(term) ||
        c.nom_championnat?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => (a.code_championnat || '').localeCompare(b.code_championnat || ''));

  const handleCreateChampRef = () => {
    setEditingChampRef(null);
    setChampRefFormData({ code_championnat: '', nom_championnat: '', url_championnat: '' });
    setShowChampRefForm(true);
  };

  const handleEditChampRef = (champ: Championnat) => {
    setEditingChampRef(champ);
    setChampRefFormData({
      code_championnat: champ.code_championnat || '',
      nom_championnat: champ.nom_championnat || '',
      url_championnat: champ.url_championnat || '',
    });
    setShowChampRefForm(true);
  };

  const handleSaveChampRef = async () => {
    if (!champRefFormData.code_championnat?.trim()) {
      alert('Le code championnat est obligatoire');
      return;
    }

    setSavingChampRef(true);
    try {
      if (editingChampRef) {
        const success = await updateChampionnat(editingChampRef.id, {
          code_championnat: champRefFormData.code_championnat,
          nom_championnat: champRefFormData.nom_championnat || null as any,
          url_championnat: champRefFormData.url_championnat || null as any,
        });
        if (success) {
          setShowChampRefForm(false);
          setEditingChampRef(null);
        } else {
          alert('Erreur lors de la mise a jour.');
        }
      } else {
        const result = await createChampionnat({
          code_championnat: champRefFormData.code_championnat!,
          nom_championnat: champRefFormData.nom_championnat || undefined,
          url_championnat: champRefFormData.url_championnat || undefined,
        });
        if (result) {
          setShowChampRefForm(false);
        } else {
          alert('Erreur lors de la creation.');
        }
      }
    } catch (err) {
      console.error('Error saving championnat ref:', err);
      alert('Une erreur est survenue.');
    } finally {
      setSavingChampRef(false);
    }
  };

  const handleDeleteChampRef = async (champ: Championnat) => {
    if (window.confirm(`Supprimer le championnat "${champ.nom_championnat || champ.code_championnat}" ?`)) {
      await deleteChampionnat(champ.id);
    }
  };

  const handleCancelChampRef = () => {
    setShowChampRefForm(false);
    setEditingChampRef(null);
  };

  // --- Filtrage ---
  const filteredTeams = teams
    .filter(team => {
      const term = searchTerm.toLowerCase();
      return (
        team.IDEQUIPE?.toLowerCase().includes(term) ||
        team.NOM_EQUIPE?.toLowerCase().includes(term) ||
        team.championships?.some(c =>
          c.NOM_FFVB?.toLowerCase().includes(term) ||
          c.POULE_NOM?.toLowerCase().includes(term) ||
          c.POULE_TEAM?.toLowerCase().includes(term)
        )
      );
    })
    .sort((a, b) => (a.IDEQUIPE || '').localeCompare(b.IDEQUIPE || ''));

  // --- Handlers équipe parent ---

  const handleEdit = (team: TeamWithChampionships) => {
    setEditingTeam(team);
    setFormData({
      IDEQUIPE: team.IDEQUIPE || '',
      NOM_EQUIPE: team.NOM_EQUIPE || '',
      image_url: team.image_url || '',
      scorenco_url: team.scorenco_url || '',
    });
    setSelectedImage(null);
    setImagePreview(team.image_url || null);
    setShowChampionshipForm(false);
    setEditingChampionship(null);
    setViewMode('edit');
  };

  const handleCreate = () => {
    setEditingTeam(null);
    setFormData({ ...emptyTeamForm });
    setSelectedImage(null);
    setImagePreview(null);
    setShowChampionshipForm(false);
    setEditingChampionship(null);
    setViewMode('create');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
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

    setSaving(true);
    try {
      let imageUrl = formData.image_url;
      if (selectedImage && formData.IDEQUIPE) {
        const uploadedUrl = await uploadTeamImage(formData.IDEQUIPE, selectedImage);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          alert('Erreur lors de l\'upload de l\'image. La sauvegarde continue sans image.');
        }
      }

      const dataToSave: Partial<Team> = {
        IDEQUIPE: formData.IDEQUIPE,
        NOM_EQUIPE: formData.NOM_EQUIPE || null as any,
        image_url: imageUrl || null as any,
        scorenco_url: formData.scorenco_url || null as any,
      };

      if (viewMode === 'edit' && editingTeam) {
        const { IDEQUIPE, ...updatesWithoutId } = dataToSave;
        const success = await updateTeam(editingTeam.IDEQUIPE, updatesWithoutId);
        if (success) {
          alert('Equipe mise a jour avec succes !');
          setViewMode('list');
          setEditingTeam(null);
          setSelectedImage(null);
          setImagePreview(null);
        } else {
          alert('Erreur lors de la mise a jour de l\'equipe.');
        }
      } else if (viewMode === 'create') {
        const newTeam = await createTeam(dataToSave as Team);
        if (newTeam) {
          alert('Equipe creee avec succes !');
          setViewMode('list');
          setSelectedImage(null);
          setImagePreview(null);
        } else {
          alert('Erreur lors de la creation de l\'equipe.');
        }
      }
    } catch (err) {
      console.error('Error in handleSave:', err);
      alert('Une erreur est survenue lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (team: TeamWithChampionships) => {
    const champCount = team.championships?.length || 0;
    const msg = champCount > 0
      ? `Voulez-vous vraiment supprimer l'equipe "${team.NOM_EQUIPE || team.IDEQUIPE}" et ses ${champCount} championnat(s) ?`
      : `Voulez-vous vraiment supprimer l'equipe "${team.NOM_EQUIPE || team.IDEQUIPE}" ?`;

    if (window.confirm(msg)) {
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
    setShowChampionshipForm(false);
    setEditingChampionship(null);
  };

  // --- Handlers championnat ---

  const handleAddChampionship = () => {
    if (!editingTeam) return;
    setEditingChampionship(null);
    setChampFormData({
      ...emptyChampForm,
      IDEQUIPE: editingTeam.IDEQUIPE,
    });
    setShowChampionshipForm(true);
  };

  const handleEditChampionship = (champ: TeamFFVB) => {
    setEditingChampionship(champ);
    setChampFormData({
      IDEQUIPE: champ.IDEQUIPE,
      POULE_TEAM: champ.POULE_TEAM || '',
      NOM_FFVB: champ.NOM_FFVB || '',
      NOM_CAL: champ.NOM_CAL || '',
      POULE_NOM: champ.POULE_NOM || '',
      URL_FFVB: champ.URL_FFVB || '',
      CURL_TEAM: champ.CURL_TEAM || '',
      CALDAV_URL: champ.CALDAV_URL || '',
      QRCODE_URL: champ.QRCODE_URL || '',
    });
    setShowChampionshipForm(true);
  };

  const handleSaveChampionship = async () => {
    if (!champFormData.POULE_TEAM?.trim()) {
      alert('Le code poule (POULE_TEAM) est obligatoire');
      return;
    }
    if (!champFormData.NOM_FFVB?.trim()) {
      alert('Le nom FFVB est obligatoire');
      return;
    }

    setSavingChampionship(true);
    try {
      // Nettoyer les champs vides en null
      const cleanedData: Partial<TeamFFVB> = {};
      Object.keys(champFormData).forEach((key) => {
        const value = champFormData[key as keyof TeamFFVB];
        if (value !== '' && value !== undefined) {
          cleanedData[key as keyof TeamFFVB] = value as any;
        } else if (value === '') {
          cleanedData[key as keyof TeamFFVB] = null as any;
        }
      });

      if (editingChampionship) {
        // Mise a jour
        const { IDEQUIPE, POULE_TEAM, ...updates } = cleanedData;
        const success = await updateChampionship(
          editingChampionship.IDEQUIPE,
          editingChampionship.POULE_TEAM,
          updates
        );
        if (success) {
          // Refresh editingTeam
          const updated = teams.find(t => t.IDEQUIPE === editingTeam?.IDEQUIPE);
          if (updated) setEditingTeam(updated);
          setShowChampionshipForm(false);
          setEditingChampionship(null);
        } else {
          alert('Erreur lors de la mise a jour du championnat.');
        }
      } else {
        // Creation
        const newChamp = await createChampionship(cleanedData as TeamFFVB);
        if (newChamp) {
          const updated = teams.find(t => t.IDEQUIPE === editingTeam?.IDEQUIPE);
          if (updated) setEditingTeam(updated);
          setShowChampionshipForm(false);
        } else {
          alert('Erreur lors de la creation du championnat.');
        }
      }
    } catch (err) {
      console.error('Error saving championship:', err);
      alert('Une erreur est survenue.');
    } finally {
      setSavingChampionship(false);
    }
  };

  const handleDeleteChampionship = async (champ: TeamFFVB) => {
    if (window.confirm(`Supprimer le championnat "${champ.NOM_FFVB || champ.POULE_TEAM}" ?`)) {
      const success = await deleteChampionship(champ.IDEQUIPE, champ.POULE_TEAM);
      if (success) {
        const updated = teams.find(t => t.IDEQUIPE === editingTeam?.IDEQUIPE);
        if (updated) setEditingTeam(updated);
      }
    }
  };

  const handleCancelChampionship = () => {
    setShowChampionshipForm(false);
    setEditingChampionship(null);
  };

  // Rafraichir editingTeam quand teams change
  React.useEffect(() => {
    if (editingTeam && viewMode === 'edit') {
      const updated = teams.find(t => t.IDEQUIPE === editingTeam.IDEQUIPE);
      if (updated) setEditingTeam(updated);
    }
  }, [teams]);

  // ==================== VUE LISTE ====================
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {/* Onglets */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setTabMode('equipes')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tabMode === 'equipes'
                ? 'border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Equipes
          </button>
          <button
            onClick={() => setTabMode('championnats')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tabMode === 'championnats'
                ? 'border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Championnats
          </button>
        </div>

        {/* ===== ONGLET CHAMPIONNATS ===== */}
        {tabMode === 'championnats' && (
          <div className="space-y-4">
            {/* Barre d'actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Rechercher un championnat..."
                  value={champRefSearch}
                  onChange={(e) => setChampRefSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={refetchChampionnats}
                  disabled={loadingChampionnats}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Actualiser
                </button>
                <button
                  onClick={handleCreateChampRef}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Nouveau</span>
                </button>
              </div>
            </div>

            {errorChampionnats && (
              <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
                {errorChampionnats}
              </div>
            )}

            {/* Formulaire inline */}
            {showChampRefForm && (
              <div className="border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/10">
                <h5 className="text-sm font-semibold mb-3 text-blue-800 dark:text-blue-300">
                  {editingChampRef ? `Modifier : ${editingChampRef.nom_championnat || editingChampRef.code_championnat}` : 'Nouveau championnat'}
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={champRefFormData.code_championnat || ''}
                      onChange={(e) => setChampRefFormData({ ...champRefFormData, code_championnat: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: 1MB"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={champRefFormData.nom_championnat || ''}
                      onChange={(e) => setChampRefFormData({ ...champRefFormData, nom_championnat: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: CHAMPIONNAT REGIONAL 1 SENIOR MASCULIN"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL
                    </label>
                    <input
                      type="url"
                      value={champRefFormData.url_championnat || ''}
                      onChange={(e) => setChampRefFormData({ ...champRefFormData, url_championnat: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-3 justify-end">
                  <button
                    onClick={handleCancelChampRef}
                    className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveChampRef}
                    disabled={savingChampRef}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {savingChampRef ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Enregistrement...
                      </>
                    ) : editingChampRef ? 'Mettre a jour' : 'Creer'}
                  </button>
                </div>
              </div>
            )}

            {loadingChampionnats ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-light-primary dark:border-dark-primary"></div>
              </div>
            ) : (
              <>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredChampionnats.length} championnat{filteredChampionnats.length > 1 ? 's' : ''}
                </div>

                <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Code</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nom</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell">URL</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredChampionnats.map((champ) => (
                        <tr key={champ.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-bold text-light-onSurface dark:text-dark-onSurface">{champ.code_championnat}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {champ.nom_championnat || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm hidden sm:table-cell">
                            {champ.url_championnat ? (
                              <a href={champ.url_championnat} target="_blank" rel="noopener noreferrer" className="text-light-primary dark:text-dark-primary hover:underline truncate block max-w-xs">
                                {champ.url_championnat}
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEditChampRef(champ)}
                                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                title="Modifier"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteChampRef(champ)}
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
                  {filteredChampionnats.length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      {champRefSearch ? 'Aucun championnat trouve' : 'Aucun championnat'}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== ONGLET EQUIPES ===== */}
        {tabMode === 'equipes' && (<>
        {/* Barre d'actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Rechercher une equipe..."
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
              <span className="hidden sm:inline">Nouvelle equipe</span>
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
              {filteredTeams.length} equipe{filteredTeams.length > 1 ? 's' : ''}
              {searchTerm && ` sur ${teams.length}`}
            </div>

            {/* Liste - Desktop */}
            <div className="hidden md:block bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nom equipe</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Championnats</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTeams.map((team) => (
                    <tr key={team.IDEQUIPE} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {team.image_url && (
                            <img
                              src={team.image_url}
                              alt={team.NOM_EQUIPE || team.IDEQUIPE}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          )}
                          <span className="font-bold text-light-onSurface dark:text-dark-onSurface">{team.IDEQUIPE}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {team.NOM_EQUIPE || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {team.championships && team.championships.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {team.championships.map((c) => (
                              <span
                                key={c.POULE_TEAM}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                                title={`${c.NOM_FFVB} - ${c.POULE_NOM || ''}`}
                              >
                                {c.POULE_TEAM}
                                {c.NOM_FFVB && <span className="ml-1 text-blue-600 dark:text-blue-400">({c.NOM_FFVB})</span>}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Aucun</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
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
                  {searchTerm ? 'Aucune equipe trouvee' : 'Aucune equipe'}
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
                      <div className="flex items-center gap-2">
                        {team.image_url && (
                          <img
                            src={team.image_url}
                            alt={team.NOM_EQUIPE || team.IDEQUIPE}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                        <h3 className="font-bold text-lg text-light-onSurface dark:text-dark-onSurface truncate">
                          {team.IDEQUIPE}
                        </h3>
                      </div>
                      {team.NOM_EQUIPE && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{team.NOM_EQUIPE}</p>
                      )}
                      {team.championships && team.championships.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {team.championships.map((c) => (
                            <span
                              key={c.POULE_TEAM}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                            >
                              {c.POULE_TEAM}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
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
                  {searchTerm ? 'Aucune equipe trouvee' : 'Aucune equipe'}
                </div>
              )}
            </div>
          </>
        )}

        </>)}

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

  // ==================== VUE EDITION / CREATION ====================
  return (
    <div className="space-y-6">
      {/* Header */}
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
          {viewMode === 'create' ? 'Nouvelle equipe' : `Modifier : ${editingTeam?.NOM_EQUIPE || editingTeam?.IDEQUIPE}`}
        </h3>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ===== SECTION 1 : Equipe parent ===== */}
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-4 sm:p-6">
        <h4 className="text-lg font-semibold mb-4 text-light-onSurface dark:text-dark-onSurface">
          Informations de l'equipe
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* ID Equipe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ID Equipe <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.IDEQUIPE || ''}
              onChange={(e) => setFormData({ ...formData, IDEQUIPE: e.target.value })}
              disabled={viewMode === 'edit'}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              placeholder="Ex: SM1"
            />
            {viewMode === 'edit' && (
              <p className="text-xs text-gray-500 mt-1">L'ID ne peut pas etre modifie</p>
            )}
          </div>

          {/* Nom equipe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom de l'equipe
            </label>
            <input
              type="text"
              value={formData.NOM_EQUIPE || ''}
              onChange={(e) => setFormData({ ...formData, NOM_EQUIPE: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              placeholder="Ex: Seniors Masculins 1"
            />
          </div>

          {/* Scorenco URL */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL Scorenco
            </label>
            <input
              type="url"
              value={formData.scorenco_url || ''}
              onChange={(e) => setFormData({ ...formData, scorenco_url: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              placeholder="https://www.scorenco.com/..."
            />
          </div>

          {/* Image */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Image de l'equipe
            </label>

            {imagePreview && (
              <div className="mb-3 relative inline-block">
                <img
                  src={imagePreview}
                  alt="Apercu de l'equipe"
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

            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {imagePreview ? 'Changer l\'image' : 'Selectionner une image'}
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
              Formats acceptes: JPG, PNG, GIF, WebP. Taille max: 5 MB
            </p>
          </div>
        </div>

        {/* Boutons equipe parent */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
          <div>
            {viewMode === 'edit' && editingTeam && (
              <button
                onClick={() => handleDelete(editingTeam)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium"
              >
                Supprimer l'equipe
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
                'Enregistrer l\'equipe'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ===== SECTION 2 : Championnats (uniquement en mode edit) ===== */}
      {viewMode === 'edit' && editingTeam && (
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-light-onSurface dark:text-dark-onSurface">
              Championnats ({editingTeam.championships?.length || 0})
            </h4>
            {!showChampionshipForm && (
              <button
                onClick={handleAddChampionship}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter
              </button>
            )}
          </div>

          {/* Liste des championnats existants */}
          {editingTeam.championships && editingTeam.championships.length > 0 ? (
            <div className="space-y-3 mb-4">
              {editingTeam.championships.map((champ) => (
                <div
                  key={champ.POULE_TEAM}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          {champ.POULE_TEAM}
                        </span>
                        <span className="font-semibold text-light-onSurface dark:text-dark-onSurface">
                          {champ.NOM_FFVB || 'Sans nom'}
                        </span>
                      </div>
                      {champ.POULE_NOM && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{champ.POULE_NOM}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {champ.NOM_CAL && <span>Cal: {champ.NOM_CAL}</span>}
                        {champ.URL_FFVB && (
                          <a href={champ.URL_FFVB} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                            FFVB
                          </a>
                        )}
                        {champ.CALDAV_URL && (
                          <a href={champ.CALDAV_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                            CalDAV
                          </a>
                        )}
                        {champ.QRCODE_URL && (
                          <button
                            onClick={() => setShowQRCode(champ.QRCODE_URL!)}
                            className="text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            QR Code
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEditChampionship(champ)}
                        className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        title="Modifier"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteChampionship(champ)}
                        className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        title="Supprimer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !showChampionshipForm && (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-4">
                Aucun championnat. Cliquez sur "Ajouter" pour en creer un.
              </div>
            )
          )}

          {/* Formulaire championnat (inline) */}
          {showChampionshipForm && (
            <div className="border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/10">
              <h5 className="text-sm font-semibold mb-3 text-blue-800 dark:text-blue-300">
                {editingChampionship ? `Modifier : ${editingChampionship.NOM_FFVB || editingChampionship.POULE_TEAM}` : 'Nouveau championnat'}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* POULE_TEAM (select depuis referentiel championnat) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Championnat (POULE_TEAM) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={champFormData.POULE_TEAM || ''}
                    onChange={(e) => setChampFormData({ ...champFormData, POULE_TEAM: e.target.value })}
                    disabled={!!editingChampionship}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Selectionner un championnat --</option>
                    {championnats.map(c => (
                      <option key={c.id} value={c.code_championnat}>
                        {c.code_championnat} - {c.nom_championnat || '(sans nom)'}
                      </option>
                    ))}
                  </select>
                  {editingChampionship && (
                    <p className="text-xs text-gray-500 mt-1">Le championnat ne peut pas etre modifie (cle primaire)</p>
                  )}
                </div>

                {/* NOM_FFVB */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom FFVB <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={champFormData.NOM_FFVB || ''}
                    onChange={(e) => setChampFormData({ ...champFormData, NOM_FFVB: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: VEEC 1"
                  />
                </div>

                {/* NOM_CAL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom Calendrier
                  </label>
                  <input
                    type="text"
                    value={champFormData.NOM_CAL || ''}
                    onChange={(e) => setChampFormData({ ...champFormData, NOM_CAL: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nom court pour le calendrier"
                  />
                </div>

                {/* POULE_NOM */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Championnat / Poule (nom)
                  </label>
                  <input
                    type="text"
                    value={champFormData.POULE_NOM || ''}
                    onChange={(e) => setChampFormData({ ...champFormData, POULE_NOM: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Championnat Regional M15"
                  />
                </div>

                {/* URL_FFVB */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL FFVB
                  </label>
                  <input
                    type="url"
                    value={champFormData.URL_FFVB || ''}
                    onChange={(e) => setChampFormData({ ...champFormData, URL_FFVB: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>

                {/* CURL_TEAM */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL Equipe (CURL)
                  </label>
                  <input
                    type="url"
                    value={champFormData.CURL_TEAM || ''}
                    onChange={(e) => setChampFormData({ ...champFormData, CURL_TEAM: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>

                {/* CALDAV_URL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL CalDAV
                  </label>
                  <input
                    type="url"
                    value={champFormData.CALDAV_URL || ''}
                    onChange={(e) => setChampFormData({ ...champFormData, CALDAV_URL: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>

                {/* QRCODE_URL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL QR Code
                  </label>
                  <input
                    type="url"
                    value={champFormData.QRCODE_URL || ''}
                    onChange={(e) => setChampFormData({ ...champFormData, QRCODE_URL: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                  {champFormData.QRCODE_URL && (
                    <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200 dark:border-gray-600 inline-block">
                      <QRCodeSVG value={champFormData.QRCODE_URL} size={128} />
                      <p className="text-xs text-gray-500 mt-2 text-center">Apercu du QR Code</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Boutons championnat */}
              <div className="mt-4 flex gap-3 justify-end">
                <button
                  onClick={handleCancelChampionship}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveChampionship}
                  disabled={savingChampionship}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingChampionship ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Enregistrement...
                    </>
                  ) : editingChampionship ? (
                    'Mettre a jour'
                  ) : (
                    'Creer le championnat'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
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
};

export default TeamsManager;
