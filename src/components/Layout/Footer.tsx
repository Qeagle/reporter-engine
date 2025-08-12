import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';

const Footer: React.FC = () => {
  const { settings } = useSettings();

  if (!settings.footer) {
    return null;
  }

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        {settings.footer}
      </div>
    </footer>
  );
};

export default Footer;
