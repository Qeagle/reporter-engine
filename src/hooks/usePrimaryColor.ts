import { useSettings } from '../contexts/SettingsContext';

export const usePrimaryColor = () => {
  const { settings } = useSettings();
  
  return {
    primaryColor: settings.primaryColor,
    // CSS classes that use the dynamic primary color
    getButtonClasses: (variant: 'primary' | 'secondary' = 'primary') => {
      if (variant === 'primary') {
        return 'bg-[var(--primary-color)] hover:bg-[var(--primary-700)] text-white';
      }
      return 'text-[var(--primary-color)] hover:text-[var(--primary-700)] border-[var(--primary-color)] hover:border-[var(--primary-700)]';
    },
    getIconClasses: () => 'text-[var(--primary-color)]',
    getFocusClasses: () => 'focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)]',
    getActiveClasses: () => 'bg-[var(--primary-100)] text-[var(--primary-700)]',
    getHoverClasses: () => 'hover:bg-[var(--primary-100)] hover:text-[var(--primary-700)]'
  };
};
