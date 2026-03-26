import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    loading: true,
    currentUser: null,
    errorMessage: "",
    successMessage: "",
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setCurrentUser: (state, action) => {
            state.currentUser = action.payload;
        },
        setErrorMessage: (state, action) => {
            state.errorMessage = action.payload;
        },
        setSuccessMessage: (state, action) => {
            state.successMessage = action.payload;
        }
    }
});

export const { setLoading, setCurrentUser, setErrorMessage, setSuccessMessage } = authSlice.actions;
export default authSlice.reducer;
