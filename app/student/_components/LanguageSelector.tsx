'use client'

import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { useLocaleContext } from '../../_components/LocaleProvider'
import { motion } from 'framer-motion'
import Icon from '@/app/_components/Icon'
import { mdiCheck } from '@mdi/js'

const locales = ['en', 'kh'] as const

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
  const { locale, setLocale } = useLocaleContext()
  const [isPending, startTransition] = useTransition()

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return

    startTransition(() => {
      setLocale(newLocale)
    })
  }

  const getLanguageInfo = (localeCode: string) => {
    switch (localeCode) {
      case 'en':
        return {
          name: t('english'),
          nativeName: 'English',
          flag: '🇺🇸'
        }
      case 'kh':
        return {
          name: t('khmer'),
          nativeName: 'ខ្មែរ',
          flag: '🇰🇭'
        }
      default:
        return {
          name: localeCode,
          nativeName: localeCode,
          flag: '🌐'
        }
    }
  }

  if (compact) {
    return (
      <div className={`flex space-x-2 ${className}`}>
        {locales.map((localeOption) => {
          const langInfo = getLanguageInfo(localeOption)
          const isSelected = locale === localeOption
          
          return (
            <button
              key={localeOption}
              onClick={() => handleLanguageChange(localeOption)}
              disabled={isPending}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all duration-200 ${
                isSelected
                  ? 'bg-company-purple text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed ${localeOption === 'kh' ? 'khmer-font' : ''}`}
            >
              {langInfo.flag} {langInfo.nativeName}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={className}>
      {showTitle && (
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          {t('title')}
        </h3>
      )}
      
      <div className="space-y-3">
        {locales.map((localeOption) => {
          const langInfo = getLanguageInfo(localeOption)
          const isSelected = locale === localeOption
          
          return (
            <motion.button
              key={localeOption}
              onClick={() => handleLanguageChange(localeOption)}
              disabled={isPending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-300 ${
                isSelected
                  ? 'border-company-purple bg-company-purple/10 dark:bg-company-purple/20 dark:border-company-purple shadow-lg'
                  : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 hover:border-company-purple/50 dark:hover:border-company-purple/50 hover:shadow-md'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{langInfo.flag}</span>
                  <div className="text-left">
                    <div className={`font-semibold transition-colors duration-200 ${
                      isSelected 
                        ? 'text-company-purple-dark dark:text-company-purple' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {langInfo.name}
                    </div>
                    <div className={`text-sm transition-colors duration-200 ${
                      isSelected 
                        ? 'text-company-purple dark:text-company-purple/80' 
                        : 'text-gray-500 dark:text-gray-400'
                    } ${localeOption === 'kh' ? 'khmer-font' : ''}`}>
                      {langInfo.nativeName}
                    </div>
                  </div>
                </div>
                
                {isSelected && (
                  <div className="w-8 h-8 bg-company-purple rounded-full flex items-center justify-center shadow-lg">
                    <Icon path={mdiCheck} size={16} className="text-white" />
                  </div>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {isPending && (
        <div className="absolute inset-0 bg-white bg-opacity-50 dark:bg-gray-800 dark:bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-company-purple"></div>
        </div>
      )}
    </div>
  )
}