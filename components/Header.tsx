

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeSwitcher from './ThemeSwitcher';
import { PdfIcon, SpinnerIcon, BellIcon } from './icons/ThemeIcons';
import Logo from './Logo';
import UserMenu from './UserMenu';

interface HeaderProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
  onSubscribeToNotifications: () => void;
  // onOpenAuth: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, onExportPdf, isExporting, onSubscribeToNotifications }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Déterminer la page actuelle depuis l'URL
  const getCurrentPage = () => {
    const path = location.pathname.split('/')[1] || 'team';
    return path;
  };

  const currentPage = getCurrentPage();

  // Fermer le menu quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handlePageChange = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-light-surface dark:bg-dark-surface shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <Logo />
            <div className="flex flex-col">
                {/* Version mobile : VEEC, Version desktop : nom complet */}
                <h1 className="text-xl sm:text-lg md:text-xl font-bold">
                  <span className="sm:hidden">VEEC</span>
                  <span className="hidden sm:inline">FS VAL D'EUROPE ESBLY COUPVRAY VOLLEYBALL</span>
                </h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Menu déroulant pour navigation */}
            <div className="relative mr-2" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary hover:opacity-90 transition-all"
              >
                <span>
                  {currentPage === 'training' ? 'Entraînements' :
                   currentPage === 'matches' ? 'Matchs' :
                   currentPage === 'position' ? 'Position' :
                   currentPage === 'team' ? 'Équipes' :
                   currentPage === 'links' ? 'Liens' :
                   currentPage === 'referee' ? 'Arbitre' :
                   currentPage === 'ai' ? 'IA' :
                   'Admin'}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Menu déroulant */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-20">
                  <button
                    onClick={() => handlePageChange('/training')}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      currentPage === 'training'
                        ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Entraînements
                  </button>
                  <button
                    onClick={() => handlePageChange('/matches')}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      currentPage === 'matches'
                        ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Matchs
                  </button>
                  <button
                    onClick={() => handlePageChange('/position')}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      currentPage === 'position'
                        ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Position
                  </button>
                  <button
                    onClick={() => handlePageChange('/team')}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      currentPage === 'team'
                        ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Équipes
                  </button>
                  <button
                    onClick={() => handlePageChange('/links')}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      currentPage === 'links'
                        ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Liens
                  </button>
                  <button
                    onClick={() => handlePageChange('/referee')}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      currentPage === 'referee'
                        ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Arbitre
                  </button>
                  <button
                    onClick={() => handlePageChange('/ai')}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      currentPage === 'ai'
                        ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    🤖 IA
                  </button>
                  <button
                    onClick={() => handlePageChange('/admin')}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      currentPage === 'admin'
                        ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onSubscribeToNotifications}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-light-surface dark:focus:ring-offset-dark-surface focus:ring-light-primary dark:focus:ring-dark-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Subscribe to notifications"
            >
              <BellIcon className="w-6 h-6" />
            </button>
            <button
              onClick={onExportPdf}
              disabled={isExporting}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-light-surface dark:focus:ring-offset-dark-surface focus:ring-light-primary dark:focus:ring-dark-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Export to PDF"
            >
              {isExporting ? <SpinnerIcon className="w-6 h-6" /> : <PdfIcon className="w-6 h-6" />}
            </button>
            <ThemeSwitcher theme={theme} toggleTheme={toggleTheme} />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;