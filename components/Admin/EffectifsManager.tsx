import React, { useState } from 'react';
import LicenciesManager from './LicenciesManager';
import CollectifsManager from '../CollectifsManager';

type Tab = 'licencies' | 'collectifs';

interface EffectifsManagerProps {
  initialTab?: Tab;
  selectedTeamId?: string;
}

const EffectifsManager: React.FC<EffectifsManagerProps> = ({ initialTab = 'licencies', selectedTeamId }) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  return (
    <div className="space-y-4">
      {/* Onglets */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('licencies')}
          className={`px-6 py-3 text-sm font-semibold transition-colors relative ${
            activeTab === 'licencies'
              ? 'text-light-primary dark:text-dark-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Licenciés
          {activeTab === 'licencies' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-light-primary dark:bg-dark-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('collectifs')}
          className={`px-6 py-3 text-sm font-semibold transition-colors relative ${
            activeTab === 'collectifs'
              ? 'text-light-primary dark:text-dark-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Collectifs
          {activeTab === 'collectifs' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-light-primary dark:bg-dark-primary" />
          )}
        </button>
      </div>

      {/* Contenu */}
      {activeTab === 'licencies' && <LicenciesManager />}
      {activeTab === 'collectifs' && <CollectifsManager selectedTeamId={selectedTeamId} />}
    </div>
  );
};

export default EffectifsManager;
