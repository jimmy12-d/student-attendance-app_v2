'use client'

import { NextIntlClientProvider } from 'next-intl';
import { createContext, useContext, useEffect, useState } from 'react';

const LocaleContext = createContext<{
  locale: string;
  setLocale: (locale: string) => void;
  messages: any;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
}>({
  locale: 'en',
  setLocale: () => {},
  messages: {},
  showOnboarding: false,
  setShowOnboarding: () => {}
});

export const useLocaleContext = () => useContext(LocaleContext);

interface LocaleProviderProps {
  children: React.ReactNode;
  initialLocale?: string;
}

export default function LocaleProvider({ children, initialLocale = 'en' }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState(initialLocale);
  const [messages, setMessages] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check for saved locale preference and onboarding status
    const savedLocale = localStorage.getItem('preferredLanguage');
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedLanguageOnboarding');
    
    if (savedLocale && ['en', 'kh'].includes(savedLocale)) {
      setLocaleState(savedLocale);
    }
    
    // Show onboarding if user hasn't completed it
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    // Load messages for the current locale
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const messages = await import(`../../locales/${locale}.json`);
        setMessages(messages.default);
      } catch (error) {
        console.error('Failed to load messages for locale:', locale, error);
        // Fallback to English
        const fallbackMessages = await import(`../../locales/en.json`);
        setMessages(fallbackMessages.default);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [locale]);

  const setLocale = (newLocale: string) => {
    setLocaleState(newLocale);
    localStorage.setItem('preferredLanguage', newLocale);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, messages, showOnboarding, setShowOnboarding }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <div className={locale === 'kh' ? 'font-nokora' : 'font-inter'}>
          {children}
        </div>
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
