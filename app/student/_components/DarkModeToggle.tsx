"use client";

import React, { useEffect, useState } from 'react';
import Icon from '../../_components/Icon';
import { mdiWeatherSunny, mdiWeatherNight } from '@mdi/js';

const DarkModeToggle = () => {
    // We default to 'dark' and let the client-side effect correct it if necessary.
    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect(() => {
        // This effect synchronizes the state with localStorage on mount.
        const stored = localStorage.getItem('darkMode');
        const initialIsDark = stored === null ? true : stored === '1';
        setIsDarkMode(initialIsDark);

        // Apply the class to the documentElement
        document.documentElement.classList.toggle('dark', initialIsDark);
        document.documentElement.classList.toggle('dark-scrollbars-compat', initialIsDark);
    }, []);

    const handleToggle = () => {
        const newIsDarkMode = !isDarkMode;
        setIsDarkMode(newIsDarkMode);
        localStorage.setItem('darkMode', newIsDarkMode ? '1' : '0');
        document.documentElement.classList.toggle('dark', newIsDarkMode);
        document.documentElement.classList.toggle('dark-scrollbars-compat', newIsDarkMode);
    };

    return (
        <button
            onClick={handleToggle}
            className="w-12 h-12 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 focus:outline-none"
            aria-label="Toggle dark mode"
        >
            <Icon path={isDarkMode ? mdiWeatherSunny : mdiWeatherNight} size={24} />
        </button>
    );
};

export default DarkModeToggle; 