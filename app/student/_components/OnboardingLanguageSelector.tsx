'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { useLocaleContext } from '../../_components/LocaleProvider'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '@/app/_components/Icon'
import { mdiCheck } from '@mdi/js'

const locales = ['en', 'kh'] as const

interface OnboardingLanguageSelectorProps {
  onComplete: () => void
  className?: string
  isExiting?: boolean
}

export default function OnboardingLanguageSelector({ 
  onComplete,
  className = "",
  isExiting = false
}: OnboardingLanguageSelectorProps) {
  const t = useTranslations('onboarding')
  const tLang = useTranslations('languageSelector')
  const { locale, setLocale } = useLocaleContext()
  const [isPending, startTransition] = useTransition()
  const [selectedLocale, setSelectedLocale] = useState<string>(locale)

  const handleLanguageSelect = (newLocale: string) => {
    setSelectedLocale(newLocale)
  }

  const handleContinue = () => {
    if (selectedLocale && selectedLocale !== locale) {
      startTransition(() => {
        setLocale(selectedLocale)
        // Mark onboarding as complete
        localStorage.setItem('hasCompletedLanguageOnboarding', 'true')
        onComplete()
      })
    } else {
      // Mark onboarding as complete even if no change
      localStorage.setItem('hasCompletedLanguageOnboarding', 'true')
      onComplete()
    }
  }

  const getLanguageInfo = (localeCode: string) => {
    switch (localeCode) {
      case 'en':
        return {
          name: tLang('english'),
          nativeName: 'English',
          flag: '🇺🇸'
        }
      case 'kh':
        return {
          name: tLang('khmer'),
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ 
        opacity: isExiting ? 0 : 1, 
        y: isExiting ? -30 : 0, 
        scale: isExiting ? 0.8 : 1,
        transition: { 
          duration: isExiting ? 0.6 : 0.6, 
          ease: isExiting ? "easeIn" : "easeOut" 
        }
      }}
      className={`w-full max-w-md mx-auto ${className}`}
    >
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 p-8">
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 bg-gradient-to-r from-company-purple-dark to-company-purple rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <span className="text-2xl">🌐</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className={`text-2xl font-bold text-gray-900 dark:text-white mb-2 ${selectedLocale === 'kh' ? 'khmer-font' : ''}`}
            >
              {selectedLocale === 'kh' ? 'ស្វាគមន៍មកកាន់ព័ត៌មានសិស្ស' : 'Welcome to Student Portal'}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className={`text-gray-600 dark:text-gray-300 text-sm ${selectedLocale === 'kh' ? 'khmer-font' : ''}`}
            >
              {selectedLocale === 'kh' ? 'ជ្រើសរើសភាសាដែលអ្នកចង់បាន ដើម្បីចាប់ផ្តើមប្រើប្រាស់ព័ត៌មានសិស្ស។' : 'Select your preferred language to get started with the student portal.'}
            </motion.p>
          </div>

          {/* Language Options */}
          <div className="space-y-3 mb-8">
            <motion.h3 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className={`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 ${selectedLocale === 'kh' ? 'khmer-font' : ''}`}
            >
              {selectedLocale === 'kh' ? 'ជ្រើសរើសភាសារបស់អ្នក' : 'Choose your language'}
            </motion.h3>
            
            {locales.map((localeOption, index) => {
              const langInfo = getLanguageInfo(localeOption)
              const isSelected = selectedLocale === localeOption
              
              return (
                <motion.button
                  key={localeOption}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 + (index * 0.1), duration: 0.5 }}
                  onClick={() => handleLanguageSelect(localeOption)}
                  disabled={isPending}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 ${
                    isSelected
                      ? 'border-company-purple bg-company-purple/10 dark:bg-company-purple/20 dark:border-company-purple shadow-lg'
                      : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 hover:border-company-purple/50 dark:hover:border-company-purple/50 hover:shadow-md'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <motion.span 
                        className="text-2xl"
                        whileHover={{ scale: 1.2, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {langInfo.flag}
                      </motion.span>
                      <div className="text-left">
                        <motion.div 
                          className={`font-semibold transition-colors duration-200 ${
                            isSelected 
                              ? 'text-company-purple-dark dark:text-company-purple' 
                              : 'text-gray-900 dark:text-white'
                          }`}
                          layout
                        >
                          {langInfo.name}
                        </motion.div>
                        <motion.div 
                          className={`text-sm transition-colors duration-200 ${
                            isSelected 
                              ? 'text-company-purple dark:text-company-purple/80' 
                              : 'text-gray-500 dark:text-gray-400'
                          } ${localeOption === 'kh' ? 'khmer-font' : ''}`}
                          layout
                        >
                          {langInfo.nativeName}
                        </motion.div>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 90 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="w-8 h-8 bg-company-purple rounded-full flex items-center justify-center shadow-lg"
                        >
                          <Icon path={mdiCheck} size={16} className="text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Continue Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            onClick={handleContinue}
            disabled={isPending || !selectedLocale}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-company-purple-dark to-company-purple hover:from-company-purple-dark hover:to-company-purple-dark text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {isPending ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{selectedLocale === 'kh' ? 'កំពុងផ្ទុក...' : 'Loading...'}</span>
              </div>
            ) : (
              <span>{selectedLocale === 'kh' ? 'ចាប់ផ្តើម' : 'Get Started'}</span>
            )}
          </motion.button>

          {/* Skip Option */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.7, duration: 0.5 }}
            onClick={onComplete}
            disabled={isPending}
            className="w-full mt-4 text-gray-500 dark:text-gray-400 hover:text-company-purple dark:hover:text-company-purple font-medium text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedLocale === 'kh' ? 'រំលងឥឡូវនេះ' : 'Skip for now'}
          </motion.button>
        </div>
    </motion.div>
  )
}
