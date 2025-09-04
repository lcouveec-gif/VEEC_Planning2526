
import React from 'react';
import ThemeSwitcher from './ThemeSwitcher';
import { PdfIcon, SpinnerIcon } from './icons/ThemeIcons';
import Logo from './Logo';

interface HeaderProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, onExportPdf, isExporting }) => {
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
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Planning des entraînements Saison 25-26</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
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