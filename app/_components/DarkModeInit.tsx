"use client";
import Script from 'next/script';

const DarkModeInit = () => {
  const scriptContent = `
    (function() {
      try {
        const stored = localStorage.getItem('darkMode');
        console.log('DarkModeInit: stored value:', stored);
        
        // Default to light mode (false) if nothing is stored
        let isDark = false;
        
        if (stored !== null && stored !== undefined) {
          // Handle different storage formats
          if (stored === '1' || stored === 'true') {
            isDark = true;
          } else if (stored === '0' || stored === 'false') {
            isDark = false;
          } else {
            try {
              isDark = JSON.parse(stored) === true;
            } catch (e) {
              isDark = false; // Default to light on parse error
            }
          }
        }
        
        console.log('DarkModeInit: isDark result:', isDark);
        
        // Apply or remove dark mode classes
        if (isDark) {
          document.documentElement.classList.add('dark', 'dark-scrollbars-compat');
        } else {
          document.documentElement.classList.remove('dark', 'dark-scrollbars-compat');
        }
        
        console.log('DarkModeInit: classes applied, dark class present:', document.documentElement.classList.contains('dark'));
      } catch (e) {
        console.error('DarkModeInit error:', e);
        // On error, default to light mode
        document.documentElement.classList.remove('dark', 'dark-scrollbars-compat');
      }
    })();
  `;

  return <Script id="dark-mode-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: scriptContent }} />;
};

export default DarkModeInit;