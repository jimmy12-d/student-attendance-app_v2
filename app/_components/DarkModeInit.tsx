"use client";
import Script from 'next/script';

const DarkModeInit = () => {
  const scriptContent = `
    (function() {
      try {
        const stored = localStorage.getItem('darkMode');
        // Default to dark mode if nothing is stored
        const isDark = stored === null ? true : stored === 'true' || stored === '1';
        if (isDark) {
          document.documentElement.classList.add('dark', 'dark-scrollbars-compat');
        } else {
          document.documentElement.classList.remove('dark', 'dark-scrollbars-compat');
        }
      } catch (e) {
        // In case of any error (e.g., localStorage not available), do nothing.
      }
    })();
  `;

  return <Script id="dark-mode-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: scriptContent }} />;
};

export default DarkModeInit;