import { createSlice } from '@reduxjs/toolkit';

export const themes = [
    { id: 'dark', name: 'Olive Dark', type: 'dark', hex: '#b1b689' },
    { id: 'light', name: 'Olive Light', type: 'light', hex: '#8a8750' },
    { id: 'barbie', name: 'Barbie Dream', type: 'light', hex: '#ff69b4' },
    { id: 'lavender', name: 'Lavender Light', type: 'light', hex: '#9370db' },
    { id: 'mint', name: 'Mint Light', type: 'light', hex: '#98ff98' },
    { id: 'skylight', name: 'Sky Light', type: 'light', hex: '#87ceeb' },
    { id: 'sunlight', name: 'Sunlight', type: 'light', hex: '#ffb300' },
    { id: 'ben10', name: 'Ben 10', type: 'dark', hex: '#39ff14' },
    { id: 'ocean', name: 'Deep Ocean', type: 'dark', hex: '#00ced1' },
    { id: 'sunset', name: 'Sunset Vibe', type: 'dark', hex: '#ff8c00' },
    { id: 'cyberpunk', name: 'Cyberpunk', type: 'dark', hex: '#ff00ff' },
    { id: 'dracula', name: 'Dracula', type: 'dark', hex: '#bd93f9' },
    { id: 'forest', name: 'Enchanted', type: 'dark', hex: '#228b22' },
    { id: 'aurora', name: 'Aurora Gradient', type: 'dark', hex: '#00ffcc' },
    { id: 'monochrome', name: 'Monochrome', type: 'dark', hex: '#ffffff' },
    { id: 'peach', name: 'Peach Light', type: 'light', hex: 'hsl(25, 90%, 60%)' },
    { id: 'coral', name: 'Coral Light', type: 'light', hex: 'hsl(10, 80%, 65%)' },
    { id: 'ice', name: 'Ice Blue', type: 'light', hex: 'hsl(195, 90%, 60%)' },
    { id: 'matcha', name: 'Matcha', type: 'light', hex: 'hsl(100, 50%, 50%)' },
    { id: 'sand', name: 'Sand Light', type: 'light', hex: 'hsl(35, 40%, 65%)' },
    { id: 'morning', name: 'Morning Sunrise', type: 'light', hex: 'hsl(45, 90%, 55%)' },
    { id: 'cotton', name: 'Cotton Candy', type: 'light', hex: 'hsl(340, 80%, 65%)' },
    { id: 'mintwave', name: 'Minty Wave', type: 'light', hex: 'hsl(160, 80%, 50%)' },
    { id: 'golden', name: 'Golden Hour', type: 'light', hex: 'hsl(35, 95%, 55%)' },
    { id: 'berry', name: 'Berry Smoothie', type: 'light', hex: 'hsl(290, 70%, 60%)' },
    { id: 'midnight', name: 'Midnight', type: 'dark', hex: 'hsl(220, 80%, 60%)' },
    { id: 'crimson', name: 'Crimson Night', type: 'dark', hex: 'hsl(350, 80%, 55%)' },
    { id: 'slate', name: 'Slate Dark', type: 'dark', hex: 'hsl(200, 20%, 50%)' },
    { id: 'espresso', name: 'Espresso', type: 'dark', hex: 'hsl(25, 30%, 50%)' },
    { id: 'matrix', name: 'Matrix', type: 'dark', hex: 'hsl(140, 100%, 45%)' },
    { id: 'nebula', name: 'Nebula Gradient', type: 'dark', hex: 'hsl(270, 80%, 55%)' },
    { id: 'bloodmoon', name: 'Blood Moon', type: 'dark', hex: 'hsl(0, 90%, 50%)' },
    { id: 'cosmic', name: 'Cosmic Ocean', type: 'dark', hex: 'hsl(200, 90%, 50%)' },
    { id: 'toxic', name: 'Toxic Fade', type: 'dark', hex: 'hsl(120, 80%, 45%)' },
    { id: 'neon', name: 'Neon Arcade', type: 'dark', hex: 'hsl(300, 90%, 55%)' }
];

// Initialize theme checking local storage safely
const getInitialTheme = () => {
    try {
        const saved = localStorage.getItem('app-theme');
        if (saved && themes.find(t => t.id === saved)) return saved;
    } catch (e) {
        console.warn("Storage access denied");
    }
    return 'dark';
};

const initialState = {
    theme: getInitialTheme(),
    themes: themes
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        setTheme: (state, action) => {
            state.theme = action.payload;
            try {
                localStorage.setItem('app-theme', action.payload);
            } catch (e) {}
        },
        toggleTheme: (state) => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            try {
                localStorage.setItem('app-theme', state.theme);
            } catch (e) {}
        }
    }
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
