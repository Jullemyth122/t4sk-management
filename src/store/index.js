import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './themeSlice';
import authReducer from './authSlice';

// This is a basic Redux store setup.
// You can import and add your slices/reducers in the 'reducer' object below.
export const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

