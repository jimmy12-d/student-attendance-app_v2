'use client'

import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { useLocaleContext } from '../../_components/LocaleProvider'
import { motion } from 'framer-motion'

interface LanguageToggleProps {
  className?: string
}

export default function LanguageToggle({ className = "" }: LanguageToggleProps) {
  const { locale, setLocale } = useLocaleContext()
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    const newLocale = locale === 'en' ? 'kh' : 'en'
    
    startTransition(() => {
      setLocale(newLocale)
    })
  }

  const isEnglish = locale === 'en'

  return (
    <motion.button
      onClick={handleToggle}
      disabled={isPending}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative px-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-company-purple/50 disabled:opacity-50 disabled:cursor-not-allowed min-w-[60px] ${className}`}
      aria-label={`Switch to ${isEnglish ? 'Khmer' : 'English'}`}
    >
      {/* Current language display */}
      <motion.div
        key={locale}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-center ${!isEnglish ? 'khmer-font' : ''}`}
      >
        {isEnglish ? 'En' : 'ខ្មែរ'}
      </motion.div>
      
      {/* Loading spinner */}
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-slate-700 rounded-lg">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </motion.button>
  )
}
