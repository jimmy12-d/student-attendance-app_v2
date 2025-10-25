'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { locales, defaultLocale } from '../../i18n'

export default function LanguageOnboarding() {
  const router = useRouter()
  const [selectedLocale, setSelectedLocale] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const getLanguageDisplayName = (localeCode: string) => {
    switch (localeCode) {
      case 'en':
        return 'English'
      case 'kh':
        return 'ខ្មែរ (Khmer)'
      default:
        return localeCode
    }
  }

  const getLanguageNativeName = (localeCode: string) => {
    switch (localeCode) {
      case 'en':
        return 'English'
      case 'kh':
        return 'ភាសាខ្មែរ'
      default:
        return localeCode
    }
  }

  const handleLanguageSelect = (locale: string) => {
    setSelectedLocale(locale)
  }

  const handleContinue = () => {
    if (!selectedLocale) return

    setIsLoading(true)
    
    // Store the language preference in localStorage
    localStorage.setItem('preferredLanguage', selectedLocale)
    
    // Redirect to the student home page with the selected language
    router.push(`/${selectedLocale}/student/home`)
  }

  const handleSkip = () => {
    setIsLoading(true)
    // Use default locale if user skips
    localStorage.setItem('preferredLanguage', defaultLocale)
    router.push(`/${defaultLocale}/student/home`)
  }

  return (
    <div className="z-4000 min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* App Logo/Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Student Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            សូមស្វាគមន៍ | Welcome
          </p>
        </div>

        {/* Language Selection Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Choose Your Language
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              ជ្រើសរើសភាសារបស់អ្នក
            </p>
          </div>

          {/* Language Options */}
          <div className="space-y-3 mb-6">
            {locales.map((locale) => (
              <button
                key={locale}
                onClick={() => handleLanguageSelect(locale)}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  selectedLocale === locale
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {getLanguageDisplayName(locale)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {getLanguageNativeName(locale)}
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedLocale === locale
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedLocale === locale && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleContinue}
              disabled={!selectedLocale || isLoading}
              className="w-full bg-gradient-to-r from-blue-500/80 to-indigo-600/80 backdrop-blur-sm hover:from-blue-600/90 hover:to-indigo-700/90 disabled:from-gray-400/50 disabled:to-gray-500/50 disabled:backdrop-blur-none disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl border border-white/20 hover:border-white/30"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Loading...
                </>
              ) : (
                'Continue | បន្ត'
              )}
            </button>
            
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-2 px-4 rounded-xl transition-colors duration-200"
            >
              Skip (Use English) | រំលង
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You can change your language preference later in settings
          </p>
        </div>
      </div>
    </div>
  )
}
