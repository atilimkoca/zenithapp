import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import tr from '../locales/tr';
import en from '../locales/en';

const translations = {
  tr,
  en,
};

const I18nContext = createContext();

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

const LANGUAGE_STORAGE_KEY = '@zenith_app_language';

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState('tr'); // Default to Turkish
  const [isLoading, setIsLoading] = useState(true);

  // Initialize language from storage or device locale
  useEffect(() => {
    initializeLanguage();
  }, []);

  const initializeLanguage = async () => {
    try {
      // First check if user has already selected a language
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      
      if (savedLanguage && translations[savedLanguage]) {
        setLanguage(savedLanguage);
      } else {
        // Get device locale and determine language
        const deviceLocale = Localization.locale || 'tr-TR'; // Fallback if undefined
        const deviceLanguage = deviceLocale.includes('-') ? deviceLocale.split('-')[0] : deviceLocale;
        
        
        // Use device language if we support it, otherwise fallback to Turkish
        const selectedLanguage = translations[deviceLanguage] ? deviceLanguage : 'tr';
        setLanguage(selectedLanguage);
        
        // Save the determined language
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, selectedLanguage);
        
      }
    } catch (error) {
      console.error('Error initializing language:', error);
      setLanguage('tr'); // Fallback to Turkish
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
      try {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
      } catch (error) {
        console.error('Error saving language:', error);
      }
    }
  };

  // Helper function to get nested translation
  const getNestedTranslation = (obj, path) => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  };

  // Translation function
  const t = (key, fallback = key) => {
    const currentTranslations = translations[language] || translations.tr;
    
    // Handle nested keys like "profile.title"
    if (key.includes('.')) {
      const nestedValue = getNestedTranslation(currentTranslations, key);
      return nestedValue !== null ? nestedValue : (fallback || key);
    }
    
    return currentTranslations[key] || fallback || key;
  };

  // Get available languages
  const getAvailableLanguages = () => {
    return [
      { code: 'tr', name: 'TÃ¼rkÃ§e', nativeName: 'TÃ¼rkÃ§e' },
      { code: 'en', name: 'English', nativeName: 'English' },
    ];
  };

  const value = {
    language,
    locale: language,
    changeLanguage,
    t,
    isLoading,
    getAvailableLanguages,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};
