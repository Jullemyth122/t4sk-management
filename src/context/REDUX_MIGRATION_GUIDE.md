# Redux Migration Guide

Since we are replacing React Context with Redux for our global state, components that were originally using the contexts need slightly updated imports. To make this as painless as possible without breaking your existing components, I have created **Drop-in Replacement Hooks**.

## 1. Updating `main.jsx`
You can now replace your existing `main.jsx` logic with the code inside `main-redux.jsx`. 
It ensures that the Redux `<Provider store={store}>` wraps the app, and also uses the new `ReduxAuthProvider` and `ReduxThemeProvider` to listen to Firebase and apply CSS themes!

## 2. Components Using Theme
Instead of importing `useTheme` from `ThemeContext.jsx`, import `useReduxTheme` from `ReduxThemeContext.jsx`.

**Old Code:**
```jsx
import { useTheme } from '../context/ThemeContext';

const { theme, toggleTheme } = useTheme();
```

**New Code:**
```jsx
import { useReduxTheme } from '../context/ReduxThemeContext';

const { theme, toggleTheme } = useReduxTheme();
```
*(Everything else stays exactly the same!)*

## 3. Components Using Auth
Instead of importing `useAuth` from `useAuth.jsx`, import `useReduxAuth` from `ReduxAuthContext.jsx`.

**Old Code:**
```jsx
import { useAuth } from '../context/useAuth';

const { currentUser, handleLogin } = useAuth();
```

**New Code:**
```jsx
import { useReduxAuth } from '../context/ReduxAuthContext';

const { currentUser, handleLogin } = useReduxAuth();
```

By doing this, you don't need to rewrite the complex inner logic of your components (like form states and dispatches). The new custom hooks will seamlessly talk to Redux under the hood!
