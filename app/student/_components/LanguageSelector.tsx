'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { locales } from '../../../i18n'
import { useState, useTransition } from 'react'

interface LanguageSelectorProps {
  showTitle?: boolean
  className?: string
  compact?: boolean
}

export default function LanguageSelector({ 
  showTitle = false, 
  className = "",
  compact = false
}: LanguageSelectorProps) {
  const t = useTranslations('languageSelector')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return

    startTransition(() => {
      // Update localStorage preference
      localStorage.setItem('preferredLanguage', newLocale)
      
      // Remove the current locale from the pathname
      const pathWithoutLocale = pathname.replace(/^\/[^\/]+/, '') || '/'
      // Create the new path with the selected locale
      const newPath = `/${newLocale}${pathWithoutLocale}`
      router.push(newPath)
      setIsOpen(false)
    })
  }

  const getLanguageDisplayName = (localeCode: string) => {
    switch (localeCode) {
      case 'en':
        return 'EN'
      case 'kh':
        return 'ខ្មែរ'
      default:
        return localeCode
    }
  }

  const getFullLanguageDisplayName = (localeCode: string) => {
    switch (localeCode) {
      case 'en':
        return t('english')
      case 'kh':
        return t('khmer')
      default:
        return localeCode
    }
  }

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isPending}
          className="flex items-center justify-center w-10 h-10 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
          ) : (
            <span className="text-xs">{getLanguageDisplayName(locale)}</span>
          )}
        </button>

        {isOpen && (
          <div className="absolute z-10 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-600 min-w-[120px]">
            {locales.map((localeOption) => (
              <button
                key={localeOption}
                onClick={() => handleLanguageChange(localeOption)}
                disabled={isPending}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  locale === localeOption
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {getFullLanguageDisplayName(localeOption)}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {showTitle && (
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          {t('title')}
        </h3>
      )}
      
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isPending}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="flex items-center">
            <span className="ml-2">{getFullLanguageDisplayName(locale)}</span>
          </span>
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-600">
            {locales.map((localeOption) => (
              <button
                key={localeOption}
                onClick={() => handleLanguageChange(localeOption)}
                disabled={isPending}
                className={`w-full px-4 py-3 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  locale === localeOption
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                <div className="flex items-center">
                  <span className="ml-2">{getFullLanguageDisplayName(localeOption)}</span>
                  {locale === localeOption && (
                    <svg
                      className="w-4 h-4 ml-auto text-blue-600 dark:text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {isPending && (
        <div className="absolute inset-0 bg-white bg-opacity-50 dark:bg-gray-800 dark:bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  )
}