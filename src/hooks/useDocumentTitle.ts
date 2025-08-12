import { useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { updateFavicon } from '../utils/favicon';

export const useDocumentTitle = (suffix?: string) => {
  const { settings } = useSettings();
  
  useEffect(() => {
    const title = suffix ? `${suffix} - ${settings.brandName}` : `${settings.brandName} Analytics - 360° Test Execution Dashboard`;
    document.title = title;
    
    // Update favicon with current primary color
    updateFavicon(settings.primaryColor);
    
    return () => {
      document.title = `${settings.brandName} Analytics - 360° Test Execution Dashboard`;
    };
  }, [settings.brandName, settings.primaryColor, suffix]);
};
