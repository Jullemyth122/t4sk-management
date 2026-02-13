import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    // Initialize state from localStorage or default 'dark'
    const [theme, setTheme] = useState(() => {
        // Check localStorage first
        const saved = localStorage.getItem('app-theme');
        if (saved) return saved;
        
        // If not saved, check system preference or default to dark
        // The user seems to prefer dark as default
        return 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;
        // Apply theme to html tag
        root.setAttribute('data-theme', theme);
        
        // Also apply a class to body for broader compatibility
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(theme);

        // Save to localStorage
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
