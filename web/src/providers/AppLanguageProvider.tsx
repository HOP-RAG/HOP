"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  APP_LANGUAGE_STORAGE_KEY,
  AppLanguage,
  TranslateFn,
  TranslationKey,
  TranslationValues,
  detectInitialAppLanguage,
  getTranslation,
} from "@/lib/i18n/app-language";

interface AppLanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: TranslateFn;
}

const AppLanguageContext = createContext<AppLanguageContextValue | undefined>(
  undefined
);

interface AppLanguageProviderProps {
  children: React.ReactNode;
}

export function AppLanguageProvider({ children }: AppLanguageProviderProps) {
  const [language, setLanguageState] = useState<AppLanguage>("en");

  useEffect(() => {
    const nextLanguage = detectInitialAppLanguage(
      navigator.language,
      window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY)
    );

    setLanguageState(nextLanguage);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dataset.appLanguage = language;
  }, [language]);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    startTransition(() => {
      setLanguageState(nextLanguage);
    });
  }, []);

  const t = useMemo<TranslateFn>(() => {
    return (key: TranslationKey, values?: TranslationValues) =>
      getTranslation(language, key, values);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return (
    <AppLanguageContext.Provider value={value}>
      {children}
    </AppLanguageContext.Provider>
  );
}

export function useAppLanguage() {
  const context = useContext(AppLanguageContext);

  if (!context) {
    throw new Error(
      "useAppLanguage must be used within an AppLanguageProvider"
    );
  }

  return context;
}
