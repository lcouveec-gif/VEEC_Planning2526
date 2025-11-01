

import React from 'react';
import ThemeSwitcher from './ThemeSwitcher';
import { PdfIcon, SpinnerIcon, BellIcon } from './icons/ThemeIcons';
import Logo from './Logo';

type PageType = 'training' | 'matches';

interface HeaderProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
  onSubscribeToNotifications: () => void;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, onExportPdf, isExporting, onSubscribeToNotifications, currentPage, onPageChange }) => {
  return (
    <header className="bg-light-surface dark:bg-dark-surface shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <Logo />
            <div className="flex flex-col">
                <h1 className="text-base sm:text-lg md:text-xl font-bold">
                FS VAL D'EUROPE ESBLY COUPVRAY VOLLEYBALL
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {currentPage === 'training' ? 'Planning des entraînements Saison 25-26' : 'Planning des matchs Saison 25-26'}
                </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 mr-2">
              <button
                onClick={() => onPageChange('training')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === 'training'
                    ? 'bg-black dark:bg-gray-300 text-white dark:text-black'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Entraînements
              </button>
              <button
                onClick={() => onPageChange('matches')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === 'matches'
                    ? 'bg-black dark:bg-gray-300 text-white dark:text-black'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Matchs
              </button>
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
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;