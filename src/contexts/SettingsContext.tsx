import React, { createContext, useContext, useState, useEffect } from 'react';
import { updateFavicon } from '../utils/favicon';

interface Settings {
  brandName: string;
  primaryColor: string;
  logo: string;
  footer: string;
  webhooks: any[];
  notifications: {
    email: boolean;
    slack: boolean;
    teams: boolean;
  };
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  saveSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  brandName: 'QReport',
  primaryColor: '#6D2366',
  logo: '',
  footer: 'Powered by Qeagle',
  webhooks: [],
  notifications: {
    email: true,
    slack: false,
    teams: false
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // Apply CSS custom properties when primary color changes
  useEffect(() => {
    const root = document.documentElement;
    const primaryColor = settings.primaryColor;
    
    // Convert hex to RGB for opacity variations
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    // Generate darker variant
    const darken = (r: number, g: number, b: number, amount: number) => {
      return {
        r: Math.round(r * (1 - amount)),
        g: Math.round(g * (1 - amount)),
        b: Math.round(b * (1 - amount))
      };
    };

    const rgb = hexToRgb(primaryColor);
    if (rgb) {
      const darkerRgb = darken(rgb.r, rgb.g, rgb.b, 0.2);
      const darkestRgb = darken(rgb.r, rgb.g, rgb.b, 0.7);
      
      root.style.setProperty('--primary-color', primaryColor);
      root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      root.style.setProperty('--primary-50', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`);
      root.style.setProperty('--primary-100', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
      root.style.setProperty('--primary-200', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
      root.style.setProperty('--primary-500', primaryColor);
      root.style.setProperty('--primary-600', primaryColor);
      root.style.setProperty('--primary-700', `rgb(${darkerRgb.r}, ${darkerRgb.g}, ${darkerRgb.b})`);
      root.style.setProperty('--primary-900', `rgb(${darkestRgb.r}, ${darkestRgb.g}, ${darkestRgb.b})`);
      
      // Update favicon with the new primary color
      updateFavicon(primaryColor);
    }
  }, [settings.primaryColor]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('testReportSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const saveSettings = async () => {
    try {
      localStorage.setItem('testReportSettings', JSON.stringify(settings));
      
      // In a real app, you might want to save to a backend
      // await fetch('/api/settings', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings)
      // });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to save settings:', error);
      return Promise.reject(error);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
