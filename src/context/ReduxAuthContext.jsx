import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { auth, googleProvider, db } from "../config/firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile as fbUpdateProfile,
    signOut as firebaseSignOut,
    signInWithPopup,
    sendEmailVerification
} from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { fetchAccountProfile, saveUserData } from "../services/accountService";
import { usePresence } from "../hooks/usePresence";
import { setLoading, setCurrentUser, setErrorMessage, setSuccessMessage } from "../store/authSlice";

// A compatible hook to replace useAuth but backed by Redux
export const useReduxAuth = () => {
    const dispatch = useDispatch();
    const { loading, currentUser, errorMessage, successMessage } = useSelector(state => state.auth);

    // Local state for forms, keeping form state out of Global Redux unless needed globally
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");

    // Rate limiting
    const authAttemptsRef = useRef([]);
    const AUTH_RATE_LIMIT = 5;
    const AUTH_RATE_WINDOW_MS = 60000;

    const checkRateLimit = useCallback(() => {
        const now = Date.now();
        authAttemptsRef.current = authAttemptsRef.current.filter(t => now - t < AUTH_RATE_WINDOW_MS);
        if (authAttemptsRef.current.length >= AUTH_RATE_LIMIT) {
            throw new Error("Too many attempts. Please wait a moment before trying again.");
        }
        authAttemptsRef.current.push(now);
    }, []);

    const refreshProfile = async () => {
        const uid = currentUser?.uid;
        if (!uid) return null;
        try {
            const profile = await fetchAccountProfile(uid);
            if (profile && profile.accountType === "") profile.accountType = null;
            dispatch(setCurrentUser({ ...currentUser, profile }));
            return profile;
        } catch (err) {
            console.error("refreshProfile error:", err);
            return null;
        }
    };

    const handleLogin = async (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        dispatch(setErrorMessage(""));
        try {
            checkRateLimit();
            const cred = await signInWithEmailAndPassword(auth, email, password);
            setEmail(""); setPassword(""); setUsername("");
            // We do not set Redux directly here because the onAuthStateChanged listener handles it
            return cred.user;
        } catch (err) {
            console.error("Login error:", err);
            dispatch(setErrorMessage(err?.message || "Login failed"));
            throw err;
        }
    };

    const handleGoogleLogin = async (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        dispatch(setErrorMessage(""));
        try {
            checkRateLimit();
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            if (!user.email || !/\S+@\S+\.\S+/.test(user.email)) {
                dispatch(setErrorMessage("Google sign-in failed: Invalid or missing email."));
                return;
            }

            const accountRef = doc(db, "account", user.uid);
            const accountSnapshot = await getDoc(accountRef);
            if (!accountSnapshot.exists()) {
                await saveUserData(user, username || user.displayName || "User");
            }

            setEmail(""); setPassword(""); setUsername("");
            dispatch(setErrorMessage(""));
            dispatch(setSuccessMessage(""));
        } catch (error) {
            dispatch(setErrorMessage(error.message));
            dispatch(setSuccessMessage(""));
        }
    }

    const handleFacebookLogin = (e) => { }

    const handleSignup = async (e, acceptedTerms = false) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        dispatch(setErrorMessage(""));
        dispatch(setSuccessMessage(""));

        if (!acceptedTerms) {
            dispatch(setErrorMessage("You must accept the Terms of Service and Privacy Policy to create an account."));
            return;
        }

        try {
            checkRateLimit();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await fbUpdateProfile(user, { displayName: username });

            await saveUserData(user, username, email, {
                termsAccepted: true,
                privacyAccepted: true,
                acceptedVersion: "1.0",
                termsAcceptedAt: new Date().toISOString(),
            });

            try {
                await sendEmailVerification(user);
            } catch (verifyErr) {
                console.warn("Could not send verification email immediately:", verifyErr);
            }

            dispatch(setSuccessMessage("Account created successfully! Redirecting..."));
            setTimeout(() => {
                window.location.href = "/verify-email";
            }, 1200);

            return user;
        } catch (err) {
            console.error("Signup error:", err);
            const friendlyMsg = err.code === 'auth/email-already-in-use'
                ? "This email is already registered."
                : err.code === 'auth/weak-password'
                    ? "Password should be at least 6 characters."
                    : err.message || "Signup failed";
            dispatch(setErrorMessage(friendlyMsg));
            throw err;
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            dispatch(setCurrentUser(null));
            return { ok: true };
        } catch (err) {
            console.error("Sign out error:", err);
            dispatch(setErrorMessage(err?.message || "Sign-out failed"));
            return { ok: false, error: err };
        }
    };

    return {
        loading,
        setLoading: (l) => dispatch(setLoading(l)),
        currentUser,
        handleLogin,
        handleSignup,
        signOut,
        handleGoogleLogin,
        handleFacebookLogin,
        handleResetPassword: async () => { },
        username,
        email,
        password,
        setUsername,
        setEmail,
        setPassword,
        errorMessage,
        setErrorMessage: (m) => dispatch(setErrorMessage(m)),
        successMessage,
        setSuccessMessage: (m) => dispatch(setSuccessMessage(m)),
        refreshProfile,
    };
};

// This listener component keeps Redux synced with Firebase Authentication
export const ReduxAuthProvider = ({ children }) => {
    const dispatch = useDispatch();
    const loading = useSelector(state => state.auth.loading);
    const currentUser = useSelector(state => state.auth.currentUser);

    useEffect(() => {
        let unsubscribeProfile = null;

        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (typeof unsubscribeProfile === "function") {
                try { unsubscribeProfile(); } catch (e) { }
                unsubscribeProfile = null;
            }

            if (!user) {
                dispatch(setCurrentUser(null));
                dispatch(setLoading(false));
                return;
            }

            dispatch(setLoading(true));
            const accountRef = doc(db, "account", user.uid);

            unsubscribeProfile = onSnapshot(
                accountRef,
                (snap) => {
                    const profile = snap.exists() ? snap.data() : null;
                    if (profile && (profile.accountType === "" || profile.accountType == null)) {
                        profile.accountType = profile.accountType || null;
                    }

                    // We can safely store the full user object now that Redux serializableCheck is off
                    dispatch(setCurrentUser({ ...user, profile }));
                    dispatch(setLoading(false));
                },
                (err) => {
                    console.error("account doc snapshot error:", err);
                    dispatch(setCurrentUser({ uid: user.uid, email: user.email, profile: null }));
                    dispatch(setLoading(false));
                }
            );
        });

        return () => {
            try { unsubscribeAuth(); } catch (e) { }
            if (typeof unsubscribeProfile === "function") {
                try { unsubscribeProfile(); } catch (e) { }
            }
        };
    }, [dispatch]);

    usePresence(currentUser?.uid);

    return <>{!loading && children}</>;
};
