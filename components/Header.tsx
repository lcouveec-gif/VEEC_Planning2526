import React from 'react';
import ThemeSwitcher from './ThemeSwitcher';

interface HeaderProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme }) => {
  return (
    <header className="bg-light-surface dark:bg-dark-surface shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4">
            <div className="flex flex-col">
                <h1 className="text-base sm:text-lg md:text-xl font-bold">
                FS VAL D'EUROPE ESBLY COUPVRAY VOLLEYBALL
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Planning des entraînements Saison 25-26</p>
            </div>
          </div>
          <ThemeSwitcher theme={theme} toggleTheme={toggleTheme} />
        </div>
      </div>
    </header>
  );
};

export default Header;