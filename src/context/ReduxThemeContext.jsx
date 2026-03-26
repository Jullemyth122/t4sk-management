import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setTheme, toggleTheme, themes } from '../store/themeSlice';

// A compatible hook for components to use if they don't want to use useSelector/useDispatch directly
// This acts as a drop-in replacement for the useTheme hook.
export const useReduxTheme = () => {
    const theme = useSelector((state) => state.theme.theme);
    const dispatch = useDispatch();

    return {
        theme,
        themes,
        setTheme: (newTheme) => dispatch(setTheme(newTheme)),
        toggleTheme: () => dispatch(toggleTheme()),
    };
};

export const ReduxThemeProvider = ({ children }) => {
    const theme = useSelector((state) => state.theme.theme);

    // Apply the theme to the document just like the original context did
    useEffect(() => {
        if (!theme) return;
        const root = document.documentElement;
        // Apply theme to HTML tag for CSS variables
        root.setAttribute('data-theme', theme);

        // Remove old classes, add the new theme class
        document.body.className = '';
        document.body.classList.add(theme);
    }, [theme]);

    return <>{children}</>;
};
