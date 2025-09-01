'use client'

import { useLocaleContext } from '../../_components/LocaleProvider'
import OnboardingLanguageSelector from './OnboardingLanguageSelector'
import { AnimatePresence, motion } from 'framer-motion'
import { useState, useRef } from 'react'

interface StudentLayoutContentProps {
  children: React.ReactNode
}

export default function StudentLayoutContent({ children }: StudentLayoutContentProps) {
  const { showOnboarding, setShowOnboarding } = useLocaleContext()
  const [isExiting, setIsExiting] = useState(false)
  const isFromOnboarding = useRef(false)

  const handleOnboardingComplete = () => {
    setIsExiting(true)
    isFromOnboarding.current = true
    // Delay the actual completion to allow exit animation
    setTimeout(() => {
      setShowOnboarding(false)
      setIsExiting(false)
    }, 800) // Match the exit animation duration
  }

  return (
    <AnimatePresence mode="wait">
      {showOnboarding ? (
        <motion.div
          key="onboarding"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 0.95,
            transition: { duration: 0.8, ease: "easeInOut" }
          }}
          className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-700 p-4"
        >
          {/* Onboarding Modal */}
          <OnboardingLanguageSelector 
            onComplete={handleOnboardingComplete}
            isExiting={isExiting}
          />
        </motion.div>
      ) : (
        <motion.div
          key="main-content"
          initial={isFromOnboarding.current ? { 
            opacity: 0,
            scale: 1.05,
            y: 20
          } : false}
          animate={isFromOnboarding.current ? { 
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { 
              duration: 0.6, 
              ease: "easeOut",
              delay: 0.2
            }
          } : {}}
          onAnimationComplete={() => {
            // Reset the flag after animation completes
            if (isFromOnboarding.current) {
              isFromOnboarding.current = false
            }
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
