import { useCallback, useReducer } from "react";
import { useAuth } from "../../context/useAuth";
import { reducer } from "../../reducer/reducer";

export function useUserData(propBusinessId, initialState) {
    const authCtx = useAuth();
    const currentUser = authCtx?.currentUser || null;
    const profile = authCtx?.profile ?? currentUser?.profile ?? null;
    const uid = currentUser?.uid || profile?.uid || null;
    const userEmail = (currentUser?.email || profile?.email || '').toLowerCase();

    const [state, dispatch] = useReducer(reducer, {
        ...initialState,
        businessId: propBusinessId || initialState.businessId
    });

    const dispatchSet = useCallback((key, valueOrFn) => {
        dispatch({ type: 'SET_KEY', payload: { key, value: valueOrFn } });
    }, []);

    return { state, dispatchSet, uid, userEmail, profile, currentUser };
}