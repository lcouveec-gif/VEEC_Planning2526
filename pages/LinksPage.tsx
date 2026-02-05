import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface ClubLink {
  id: string;
  category: 'site_web' | 'reseaux_sociaux' | 'documents' | 'autres';
  title: string;
  description: string | null;
  url: string;
  icon: string | null;
  display_order: number;
}

const LinksPage: React.FC = () => {
  const [links, setLinks] = useState<ClubLink[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryLabels = {
    site_web: 'Site Web',
    reseaux_sociaux: 'Réseaux Sociaux',
    documents: 'Documents & Ressources',
    autres: 'Autres Liens',
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
        .eq('is_visible', true)
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

  const groupedLinks = links.reduce((acc, link) => {
    if (!acc[link.category]) {
      acc[link.category] = [];
    }
    acc[link.category].push(link);
    return acc;
  }, {} as Record<string, ClubLink[]>);

  // Fonction pour obtenir l'icône SVG selon le titre
  const getSocialIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();

    // Facebook
    if (lowerTitle.includes('facebook')) {
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    }

    // Instagram
    if (lowerTitle.includes('instagram')) {
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      );
    }

    // YouTube
    if (lowerTitle.includes('youtube')) {
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    }

    // Twitter/X
    if (lowerTitle.includes('twitter') || lowerTitle.includes('x.com')) {
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    }

    // LinkedIn
    if (lowerTitle.includes('linkedin')) {
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      );
    }

    // TikTok
    if (lowerTitle.includes('tiktok')) {
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      );
    }

    // Twitch
    if (lowerTitle.includes('twitch')) {
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
        </svg>
      );
    }

    // Site web / Globe
    if (lowerTitle.includes('site') || lowerTitle.includes('web') || lowerTitle.includes('officiel')) {
      return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
        </svg>
      );
    }

    // Email / Contact
    if (lowerTitle.includes('contact') || lowerTitle.includes('email') || lowerTitle.includes('mail')) {
      return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
      );
    }

    // Newsletter / Document
    if (lowerTitle.includes('newsletter') || lowerTitle.includes('document')) {
      return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
        </svg>
      );
    }

    // Default - Link icon
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
      </svg>
    );
  };

  // Couleurs par réseau social
  const getSocialColor = (title: string) => {
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('facebook')) return 'from-blue-600 to-blue-700';
    if (lowerTitle.includes('instagram')) return 'from-pink-500 via-purple-500 to-orange-500';
    if (lowerTitle.includes('youtube')) return 'from-red-600 to-red-700';
    if (lowerTitle.includes('twitter') || lowerTitle.includes('x.com')) return 'from-sky-400 to-sky-600';
    if (lowerTitle.includes('linkedin')) return 'from-blue-700 to-blue-800';
    if (lowerTitle.includes('tiktok')) return 'from-black to-gray-800';
    if (lowerTitle.includes('twitch')) return 'from-purple-600 to-purple-700';
    if (lowerTitle.includes('site') || lowerTitle.includes('officiel')) return 'from-veec-blue to-blue-600';

    return 'from-gray-600 to-gray-700';
  };

  const renderSocialLinks = () => {
    const socialLinks = groupedLinks['reseaux_sociaux'] || [];
    if (socialLinks.length === 0) return null;

    return (
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center text-light-onSurface dark:text-dark-onSurface mb-8">
          Suivez-nous sur les réseaux sociaux
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {socialLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative"
            >
              <div className={`
                relative overflow-hidden rounded-2xl p-6
                bg-gradient-to-br ${getSocialColor(link.title)}
                hover:scale-105 active:scale-95
                transition-all duration-300 ease-out
                shadow-lg hover:shadow-2xl
                flex flex-col items-center justify-center
                min-h-[140px] md:min-h-[160px]
              `}>
                {/* Effet de brillance au survol */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Icône */}
                <div className="relative text-white mb-3 transform group-hover:scale-110 transition-transform duration-300">
                  {getSocialIcon(link.title)}
                </div>

                {/* Titre */}
                <h3 className="relative text-white font-bold text-center text-sm md:text-base">
                  {link.title}
                </h3>

                {/* Badge "Nouveau" si description contient "nouveau" */}
                {link.description?.toLowerCase().includes('nouveau') && (
                  <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                    Nouveau
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  };

  const renderOtherLinks = () => {
    const categories = ['site_web', 'documents', 'autres'] as const;
    const hasLinks = categories.some(cat => (groupedLinks[cat] || []).length > 0);

    if (!hasLinks) return null;

    return (
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-center text-light-onSurface dark:text-dark-onSurface mb-8">
          Ressources & Liens Utiles
        </h2>

        {categories.map(category => {
          const categoryLinks = groupedLinks[category] || [];
          if (categoryLinks.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <h3 className="text-xl font-semibold text-light-onSurface dark:text-dark-onSurface pl-2 border-l-4 border-veec-blue">
                {categoryLabels[category]}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-veec-blue"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icône */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-veec-blue to-blue-600 flex items-center justify-center text-white transform group-hover:rotate-6 transition-transform duration-300">
                        {getSocialIcon(link.title)}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-light-onSurface dark:text-dark-onSurface mb-1 group-hover:text-veec-blue transition-colors">
                          {link.title}
                        </h4>
                        {link.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {link.description}
                          </p>
                        )}
                      </div>

                      {/* Flèche */}
                      <div className="flex-shrink-0 text-gray-400 group-hover:text-veec-blue transform group-hover:translate-x-1 transition-all duration-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                        </svg>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-light-background to-gray-100 dark:from-dark-background dark:to-gray-900">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-veec-blue border-t-transparent"></div>
          </div>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-400">Chargement des liens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-background via-gray-50 to-light-background dark:from-dark-background dark:via-gray-900 dark:to-dark-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-veec-blue via-blue-600 to-blue-700 text-white py-8 md:py-12 mb-8">
        {/* Effet de fond animé */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3">
            Nos Liens & Réseaux
          </h1>
          <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto">
            Restez connectés avec le club ! Retrouvez tous nos liens officiels et suivez notre actualité.
          </p>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {renderSocialLinks()}
        {renderOtherLinks()}

        {/* Message si aucun lien */}
        {links.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-light-onSurface dark:text-dark-onSurface mb-2">
              Aucun lien disponible
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Les liens du club seront bientôt disponibles ici.
            </p>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      {links.length > 0 && (
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h3 className="text-2xl font-bold text-light-onSurface dark:text-dark-onSurface mb-3">
              Rejoignez notre communauté !
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              N'hésitez pas à nous suivre sur les réseaux sociaux pour ne rien manquer de l'actualité du club.
            </p>
            <div className="inline-flex items-center gap-2 text-veec-blue font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              <span>Merci de votre soutien !</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinksPage;
