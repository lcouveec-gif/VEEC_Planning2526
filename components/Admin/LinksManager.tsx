import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface ClubLink {
  id: string;
  category: 'site_web' | 'reseaux_sociaux' | 'documents' | 'autres';
  title: string;
  description: string | null;
  url: string;
  icon: string | null;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

const LinksManager: React.FC = () => {
  const [links, setLinks] = useState<ClubLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLink, setEditingLink] = useState<ClubLink | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    category: 'site_web' as const,
    title: '',
    description: '',
    url: '',
    icon: '',
    display_order: 0,
    is_visible: true,
  });

  const categoryLabels = {
    site_web: 'Site Web',
    reseaux_sociaux: 'Réseaux Sociaux',
    documents: 'Documents',
    autres: 'Autres',
  };

  const categoryColors = {
    site_web: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    reseaux_sociaux: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    documents: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    autres: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('club_links')
        .select('*')
        .order('category')
        .order('display_order');

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Erreur chargement liens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingLink) {
        const { error } = await supabase
          .from('club_links')
          .update(formData)
          .eq('id', editingLink.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('club_links')
          .insert([formData]);

        if (error) throw error;
      }

      resetForm();
      loadLinks();
    } catch (error) {
      console.error('Erreur sauvegarde lien:', error);
      alert('Erreur lors de la sauvegarde du lien');
    }
  };

  const handleEdit = (link: ClubLink) => {
    setEditingLink(link);
    setFormData({
      category: link.category,
      title: link.title,
      description: link.description || '',
      url: link.url,
      icon: link.icon || '',
      display_order: link.display_order,
      is_visible: link.is_visible,
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce lien ?')) return;

    try {
      const { error } = await supabase
        .from('club_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadLinks();
    } catch (error) {
      console.error('Erreur suppression lien:', error);
      alert('Erreur lors de la suppression du lien');
    }
  };

  const resetForm = () => {
    setEditingLink(null);
    setIsAdding(false);
    setFormData({
      category: 'site_web',
      title: '',
      description: '',
      url: '',
      icon: '',
      display_order: 0,
      is_visible: true,
    });
  };

  const groupedLinks = links.reduce((acc, link) => {
    if (!acc[link.category]) {
      acc[link.category] = [];
    }
    acc[link.category].push(link);
    return acc;
  }, {} as Record<string, ClubLink[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-veec-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-light-onSurface dark:text-dark-onSurface">
          Gestion des Liens
        </h2>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-veec-blue hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un lien
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-light-onSurface dark:text-dark-onSurface">
            {editingLink ? 'Modifier le lien' : 'Nouveau lien'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-light-onSurface dark:text-dark-onSurface">
                  Catégorie *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-light-onSurface dark:text-dark-onSurface"
                  required
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-light-onSurface dark:text-dark-onSurface">
                  Titre *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-light-onSurface dark:text-dark-onSurface"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-light-onSurface dark:text-dark-onSurface">
                  URL *
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-light-onSurface dark:text-dark-onSurface"
                  required
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-light-onSurface dark:text-dark-onSurface">
                  Icône (emoji)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-light-onSurface dark:text-dark-onSurface"
                  placeholder="🏐"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-light-onSurface dark:text-dark-onSurface">
                  Ordre d'affichage
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-light-onSurface dark:text-dark-onSurface"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_visible}
                    onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-light-onSurface dark:text-dark-onSurface">
                    Visible publiquement
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-light-onSurface dark:text-dark-onSurface">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-light-onSurface dark:text-dark-onSurface"
                rows={3}
                placeholder="Description optionnelle..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-light-onSurface dark:text-dark-onSurface"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-veec-blue hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                {editingLink ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(categoryLabels).map(([category, label]) => {
          const categoryLinks = groupedLinks[category as keyof typeof categoryLabels] || [];
          if (categoryLinks.length === 0) return null;

          return (
            <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-light-onSurface dark:text-dark-onSurface flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm ${categoryColors[category as keyof typeof categoryColors]}`}>
                  {label}
                </span>
              </h3>
              <div className="space-y-3">
                {categoryLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {link.icon && <span className="text-2xl">{link.icon}</span>}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-light-onSurface dark:text-dark-onSurface">
                            {link.title}
                          </h4>
                          {!link.is_visible && (
                            <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                              Masqué
                            </span>
                          )}
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:underline"
                        >
                          {link.url}
                        </a>
                        {link.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {link.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(link)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="Modifier"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Supprimer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {links.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Aucun lien configuré. Cliquez sur "Ajouter un lien" pour commencer.
        </div>
      )}
    </div>
  );
};

export default LinksManager;
