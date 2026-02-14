import React, { useState, useRef } from 'react';
import { useLicencies } from '../../hooks/useLicencies';
import type { ImportResult } from '../../hooks/useLicencies';
import { useAllCollectifs, useCollectifs } from '../../hooks/useCollectifs';
import { useTeams } from '../../hooks/useTeams';
import type { Licencie, PlayerPosition } from '../../types';

type ViewMode = 'list' | 'edit' | 'create';

const POSITIONS: PlayerPosition[] = ['Passeur', 'Libéro', 'R4', 'Pointu', 'Central'];

const LicenciesManager: React.FC = () => {
  const { licencies, loading, error, refetch, createLicencie, updateLicencie, deleteLicencie, importLicencies } = useLicencies();
  const { data: allCollectifs = [] } = useAllCollectifs();
  const { addPlayerToTeam, removePlayerFromTeam } = useCollectifs();
  const { teams } = useTeams();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingLicencie, setEditingLicencie] = useState<Licencie | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // État pour le modal d'association collectif
  const [assigningLicencie, setAssigningLicencie] = useState<Licencie | null>(null);
  const [assignTeamId, setAssignTeamId] = useState('');
  const [assignMaillot, setAssignMaillot] = useState('');
  const [assignPoste, setAssignPoste] = useState<PlayerPosition | ''>('');
  const [assignSaving, setAssignSaving] = useState(false);

  // Map licencie_id → liste d'equipe_id
  const collectifsByPlayer = allCollectifs.reduce<Record<string, string[]>>((acc, c) => {
    if (!acc[c.licencie_id]) acc[c.licencie_id] = [];
    acc[c.licencie_id].push(c.equipe_id);
    return acc;
  }, {});

  // Trouver le nom d'une équipe
  const getTeamName = (equipeId: string) => {
    const team = teams.find(t => t.IDEQUIPE === equipeId);
    return team?.NOM_EQUIPE || equipeId;
  };

  // Ouvrir le modal d'association
  const openAssignModal = (licencie: Licencie) => {
    setAssigningLicencie(licencie);
    setAssignTeamId('');
    setAssignMaillot('');
    setAssignPoste('');
  };

  // Confirmer l'association
  const handleAssign = async () => {
    if (!assigningLicencie || !assignTeamId) return;
    setAssignSaving(true);
    try {
      const success = await addPlayerToTeam(
        assignTeamId,
        assigningLicencie.id,
        assignMaillot ? parseInt(assignMaillot) : null,
        assignPoste || null,
      );
      if (success) {
        setAssigningLicencie(null);
      } else {
        alert('Erreur : ce joueur est peut-être déjà dans cette équipe.');
      }
    } catch {
      alert('Erreur lors de l\'association.');
    } finally {
      setAssignSaving(false);
    }
  };

  // Retirer d'une équipe
  const handleRemoveFromTeam = async (licencieId: string, equipeId: string) => {
    if (!window.confirm(`Retirer de ${getTeamName(equipeId)} ?`)) return;
    await removePlayerFromTeam(equipeId, licencieId);
  };

  const [formData, setFormData] = useState<Partial<Licencie>>({
    Nom_Licencie: '',
    Prenom_Licencie: '',
    Num_Licencie: '',
    Date_Naissance_licencie: '',
    Categorie_licencie: '',
  });

  // Catégories uniques pour le filtre
  const categories = Array.from(
    new Set(licencies.map(l => l.Categorie_licencie).filter(Boolean))
  ).sort() as string[];

  const filteredLicencies = licencies.filter(l => {
    const matchSearch = !searchTerm ||
      l.Nom_Licencie?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.Prenom_Licencie?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(l.Num_Licencie || '').includes(searchTerm);
    const matchCategorie = !filterCategorie || l.Categorie_licencie === filterCategorie;
    return matchSearch && matchCategorie;
  });

  // Télécharger un fichier CSV modèle avec 3 exemples
  const handleDownloadTemplate = () => {
    const header = 'Num_Licencie;Nom;Prenom;Date_Naissance;Categorie';
    const examples = [
      '2412345;DUPONT;Jean;2000-03-15;Senior',
      '2412346;MARTIN;Marie;2005-07-22;U20',
      '2412347;DURAND;Lucas;2008-11-03;U17',
    ];
    const csv = [header, ...examples].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele_licencies.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Parser et importer un fichier CSV
  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim());

      if (lines.length < 2) {
        alert('Le fichier est vide ou ne contient que l\'en-tête.');
        return;
      }

      // Détecter le séparateur (point-virgule ou virgule)
      const header = lines[0];
      const separator = header.includes(';') ? ';' : ',';
      const columns = header.split(separator).map(c => c.trim().toLowerCase());

      // Mapper les colonnes
      const colIndex = {
        num: columns.findIndex(c => c.includes('num') || c.includes('licence')),
        nom: columns.findIndex(c => c.includes('nom') && !c.includes('prenom')),
        prenom: columns.findIndex(c => c.includes('prenom')),
        dateNaissance: columns.findIndex(c => c.includes('date') || c.includes('naissance')),
        categorie: columns.findIndex(c => c.includes('categorie') || c.includes('catégorie')),
      };

      // Convertir une date DD/MM/YYYY ou DD-MM-YYYY en YYYY-MM-DD
      const parseDate = (dateStr: string): string => {
        if (!dateStr) return '';
        // Déjà au format YYYY-MM-DD ?
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        // Format DD/MM/YYYY ou DD-MM-YYYY
        const match = dateStr.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
        if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        return dateStr;
      };

      if (colIndex.prenom === -1) {
        alert('Colonne "Prenom" introuvable dans le fichier CSV. Colonnes détectées : ' + columns.join(', '));
        return;
      }

      const entries: Omit<Licencie, 'id' | 'created_at'>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map(v => v.trim());
        const prenom = colIndex.prenom >= 0 ? values[colIndex.prenom] : '';
        if (!prenom) continue; // Skip lignes vides

        entries.push({
          Num_Licencie: colIndex.num >= 0 ? values[colIndex.num] || undefined : undefined,
          Nom_Licencie: colIndex.nom >= 0 ? values[colIndex.nom] || undefined : undefined,
          Prenom_Licencie: prenom,
          Date_Naissance_licencie: colIndex.dateNaissance >= 0 ? parseDate(values[colIndex.dateNaissance] || '') || undefined : undefined,
          Categorie_licencie: colIndex.categorie >= 0 ? values[colIndex.categorie] || undefined : undefined,
        });
      }

      if (entries.length === 0) {
        alert('Aucun licencié valide trouvé dans le fichier.');
        return;
      }

      const result = await importLicencies(entries);
      setImportResult(result);
    } catch (err) {
      console.error('Error importing CSV:', err);
      alert('Erreur lors de la lecture du fichier CSV.');
    } finally {
      setImporting(false);
      // Reset le file input pour permettre de re-sélectionner le même fichier
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEdit = (licencie: Licencie) => {
    setEditingLicencie(licencie);
    setFormData({
      Nom_Licencie: licencie.Nom_Licencie || '',
      Prenom_Licencie: licencie.Prenom_Licencie || '',
      Num_Licencie: licencie.Num_Licencie || '',
      Date_Naissance_licencie: licencie.Date_Naissance_licencie || '',
      Categorie_licencie: licencie.Categorie_licencie || '',
    });
    setViewMode('edit');
  };

  const handleCreate = () => {
    setEditingLicencie(null);
    setFormData({
      Nom_Licencie: '',
      Prenom_Licencie: '',
      Num_Licencie: '',
      Date_Naissance_licencie: '',
      Categorie_licencie: '',
    });
    setViewMode('create');
  };

  const handleSave = async () => {
    if (!formData.Prenom_Licencie?.trim()) {
      alert('Le prénom est obligatoire');
      return;
    }

    setSaving(true);
    try {
      const cleanedData = {
        Nom_Licencie: formData.Nom_Licencie?.trim() || null,
        Prenom_Licencie: formData.Prenom_Licencie!.trim(),
        Num_Licencie: formData.Num_Licencie || null,
        Date_Naissance_licencie: formData.Date_Naissance_licencie || null,
        Categorie_licencie: formData.Categorie_licencie?.trim() || null,
      };

      if (viewMode === 'edit' && editingLicencie) {
        const success = await updateLicencie(editingLicencie.id, cleanedData);
        if (success) {
          setViewMode('list');
          setEditingLicencie(null);
        } else {
          alert('Erreur lors de la mise à jour.');
        }
      } else if (viewMode === 'create') {
        const result = await createLicencie(cleanedData as Omit<Licencie, 'id' | 'created_at'>);
        if (result) {
          setViewMode('list');
        } else {
          alert('Erreur lors de la création.');
        }
      }
    } catch (err) {
      console.error('Error in handleSave:', err);
      alert('Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (licencie: Licencie) => {
    if (window.confirm(`Supprimer ${licencie.Prenom_Licencie} ${licencie.Nom_Licencie || ''} ?`)) {
      const success = await deleteLicencie(licencie.id);
      if (success && viewMode === 'edit') {
        setViewMode('list');
        setEditingLicencie(null);
      }
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingLicencie(null);
  };

  // Vue Liste
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {/* Barre d'actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Rechercher (nom, prénom, n° licence)..."
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
            {categories.length > 0 && (
              <select
                value={filterCategorie}
                onChange={(e) => setFilterCategorie(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              >
                <option value="">Toutes catégories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={refetch}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Actualiser
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              title="Télécharger un fichier CSV modèle"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Modèle CSV</span>
            </button>
            <label
              className={`px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors font-medium flex items-center gap-2 cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}
              title="Importer des licenciés depuis un fichier CSV"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="hidden sm:inline">{importing ? 'Import...' : 'Import CSV'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleImportCsv}
                className="hidden"
                disabled={importing}
              />
            </label>
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Nouveau</span>
            </button>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Résultat import CSV */}
        {importResult && (
          <div className={`p-4 rounded-lg border ${importResult.errors.length > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'}`}>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-semibold">Import terminé :</span>{' '}
                {importResult.created > 0 && <span className="text-green-700 dark:text-green-400">{importResult.created} créé{importResult.created > 1 ? 's' : ''}</span>}
                {importResult.created > 0 && importResult.updated > 0 && ', '}
                {importResult.updated > 0 && <span className="text-blue-700 dark:text-blue-400">{importResult.updated} mis à jour</span>}
                {importResult.errors.length > 0 && (
                  <span className="text-red-600 dark:text-red-400">, {importResult.errors.length} erreur{importResult.errors.length > 1 ? 's' : ''}</span>
                )}
              </div>
              <button onClick={() => setImportResult(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {importResult.errors.length > 0 && (
              <ul className="mt-2 text-xs text-red-600 dark:text-red-400 space-y-1">
                {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            )}
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
              {filteredLicencies.length} licencié{filteredLicencies.length > 1 ? 's' : ''}
              {(searchTerm || filterCategorie) && ` sur ${licencies.length}`}
            </div>

            {/* Tableau des licenciés */}
            <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800 text-left">
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Nom</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Prénom</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell">N° Licence</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">Catégorie</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">Date naissance</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Équipes</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredLicencies.map((licencie) => (
                      <tr
                        key={licencie.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                        onClick={() => handleEdit(licencie)}
                      >
                        <td className="px-4 py-3 font-medium text-light-onSurface dark:text-dark-onSurface">
                          {licencie.Nom_Licencie || '-'}
                        </td>
                        <td className="px-4 py-3 text-light-onSurface dark:text-dark-onSurface">
                          {licencie.Prenom_Licencie}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                          {licencie.Num_Licencie || '-'}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {licencie.Categorie_licencie ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-light-primary/15 dark:bg-dark-primary/15 text-light-primary dark:text-dark-primary">
                              {licencie.Categorie_licencie}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                          {licencie.Date_Naissance_licencie
                            ? new Date(licencie.Date_Naissance_licencie).toLocaleDateString('fr-FR')
                            : '-'}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 flex-wrap">
                            {(collectifsByPlayer[licencie.id] || []).map(eqId => (
                              <span
                                key={eqId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              >
                                {getTeamName(eqId)}
                                <button
                                  onClick={() => handleRemoveFromTeam(licencie.id, eqId)}
                                  className="hover:text-red-500 transition-colors"
                                  title="Retirer de cette équipe"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </span>
                            ))}
                            <button
                              onClick={() => openAssignModal(licencie)}
                              className="p-1 rounded-full text-light-primary dark:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 transition-colors"
                              title="Ajouter à une équipe"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(licencie); }}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            title="Supprimer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredLicencies.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  {searchTerm || filterCategorie ? 'Aucun licencié trouvé' : 'Aucun licencié enregistré'}
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal d'association à une équipe */}
        {assigningLicencie && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAssigningLicencie(null)}>
            <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-light-onSurface dark:text-dark-onSurface mb-4">
                Ajouter {assigningLicencie.Prenom_Licencie} {assigningLicencie.Nom_Licencie || ''} à une équipe
              </h3>

              <div className="space-y-4">
                {/* Équipe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Équipe <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignTeamId}
                    onChange={(e) => setAssignTeamId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
                  >
                    <option value="">Sélectionner une équipe</option>
                    {teams
                      .filter(t => !(collectifsByPlayer[assigningLicencie.id] || []).includes(t.IDEQUIPE))
                      .map(t => (
                        <option key={t.IDEQUIPE} value={t.IDEQUIPE}>{t.NOM_EQUIPE || t.IDEQUIPE}</option>
                      ))
                    }
                  </select>
                </div>

                {/* N° Maillot */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    N° Maillot
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={assignMaillot}
                    onChange={(e) => setAssignMaillot(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
                    placeholder="Optionnel"
                  />
                </div>

                {/* Poste */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Poste
                  </label>
                  <select
                    value={assignPoste}
                    onChange={(e) => setAssignPoste(e.target.value as PlayerPosition | '')}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
                  >
                    <option value="">Optionnel</option>
                    {POSITIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Boutons */}
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => setAssigningLicencie(null)}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!assignTeamId || assignSaving}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {assignSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Ajout...
                    </>
                  ) : 'Ajouter'}
                </button>
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
          {viewMode === 'create' ? 'Nouveau licencié' : `Modifier : ${editingLicencie?.Prenom_Licencie} ${editingLicencie?.Nom_Licencie || ''}`}
        </h3>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom
            </label>
            <input
              type="text"
              value={formData.Nom_Licencie || ''}
              onChange={(e) => setFormData({ ...formData, Nom_Licencie: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              placeholder="DUPONT"
            />
          </div>

          {/* Prénom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prénom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.Prenom_Licencie || ''}
              onChange={(e) => setFormData({ ...formData, Prenom_Licencie: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              placeholder="Jean"
            />
          </div>

          {/* Numéro de licence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              N° Licence
            </label>
            <input
              type="text"
              value={formData.Num_Licencie || ''}
              onChange={(e) => setFormData({ ...formData, Num_Licencie: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent font-mono"
              placeholder="2412345"
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Catégorie
            </label>
            <input
              type="text"
              value={formData.Categorie_licencie || ''}
              onChange={(e) => setFormData({ ...formData, Categorie_licencie: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
              placeholder="Senior"
            />
          </div>

          {/* Date de naissance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date de naissance
            </label>
            <input
              type="date"
              value={formData.Date_Naissance_licencie || ''}
              onChange={(e) => setFormData({ ...formData, Date_Naissance_licencie: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-light-onSurface dark:text-dark-onSurface focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
          <div>
            {viewMode === 'edit' && editingLicencie && (
              <button
                onClick={() => handleDelete(editingLicencie)}
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

export default LicenciesManager;
