// src/context/useAuth.j 
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../config/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile as fbUpdateProfile,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { fetchAccountProfile, saveUserData } from "../utilities/accountService";
import { Navigate } from "react-router-dom";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

/**
 * AuthProvider
 * - subscribes to Firebase auth state
 * - subscribes in realtime to account/{uid} doc (so currentUser.profile stays up-to-date)
 * - provides signUp/login/signOut + refreshProfile helper
 *
 * NOTE: AuthProvider must be rendered inside a Router so useNavigate() works.
 */
export const AuthProvider = ({ children }) => {

    // UI / form state (shared helpers)
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // runtime auth state
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        let unsubscribeProfile = null;

        // subscribe to auth changes
        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            // clean up previous profile listener when auth state changes
            if (typeof unsubscribeProfile === "function") {
                try {
                    unsubscribeProfile();
                } catch (e) {
                /* ignore */
                }
                unsubscribeProfile = null;
            }

            if (!user) {
                // user signed out
                setCurrentUser(null);
                setLoading(false);
                return;
            }

            // user signed in — attach realtime listener to account/{uid}
            setLoading(true);
            const accountRef = doc(db, "account", user.uid);

            unsubscribeProfile = onSnapshot(
                accountRef,
                (snap) => {
                    const profile = snap.exists() ? snap.data() : null;

                    // normalize accountType to null when missing/empty
                    if (profile && (profile.accountType === "" || profile.accountType == null)) {
                        profile.accountType = profile.accountType || null;
                    }

                    setCurrentUser({ ...user, profile });
                    setLoading(false);
                },
                (err) => {
                    console.error("account doc snapshot error:", err);
                    // fallback: set user with null profile so the app still has an auth user object
                    setCurrentUser({ ...user, profile: null });
                    setLoading(false);
                }
            );
        });

        return () => {
            // cleanup both auth & profile listeners
            try {
                unsubscribeAuth();
            } catch (e) {}
            if (typeof unsubscribeProfile === "function") {
                try {
                unsubscribeProfile();
                } catch (e) {}
            }
        };
    }, []);

    /**
     * Manual refresh helper (keeps compatibility)
     */
    const refreshProfile = async () => {
        const uid = currentUser?.uid;
        if (!uid) return null;

        try {
            const profile = await fetchAccountProfile(uid);
            if (profile && profile.accountType === "") profile.accountType = null;
            setCurrentUser((prev) => ({ ...(prev || {}), profile }));
            return profile;
        } catch (err) {
            console.error("refreshProfile error:", err);
            return null;
        }
    };

    /**
     * Sign-in
     */
    const handleLogin = async (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        setErrorMessage("");
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            // let onAuthStateChanged and snapshot handler update currentUser/profile
            setEmail("");
            setPassword("");
            setUsername("");
            return cred.user;
        } catch (err) {
            console.error("Login error:", err);
            setErrorMessage(err?.message || "Login failed");
            throw err;
        }
    };

    /**
     * Signup -> save user doc and navigate to choose-account
     */
    const handleSignup = async (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        setErrorMessage("");
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // set displayName in Firebase auth profile
            await fbUpdateProfile(user, { displayName: username });

            // write minimal account doc (no accountType yet)
            await saveUserData(user, username);

            setEmail("");
            setPassword("");
            setUsername("");
            setSuccessMessage("Account created!");

            // send to choose-account page so they pick personal / business
            // Navigate("/choose-account", { replace: true });

            return user;
        } catch (err) {
            console.error("Signup error:", err);
            setErrorMessage(err?.message || "Signup failed");
            throw err;
        }
    };

    /**
     * Sign out
     */
    const signOut = async () => {
        try {
            await auth.signOut();
            setCurrentUser(null);
            // Navigate("/signup", { replace: true });
        } catch (err) {
            console.error("Sign out error:", err);
            setErrorMessage(err?.message || "Sign-out failed");
        }
    };

    const value = {
        loading,
        setLoading,
        currentUser,
        handleLogin,
        handleSignup,
        signOut,
        handleGoogleLogin: async () => {},
        handleFacebookLogin: async () => {},
        handleResetPassword: async () => {},
        // form helpers (shared UI state)
        username,
        email,
        password,
        setUsername,
        setEmail,
        setPassword,
        errorMessage,
        setErrorMessage,
        successMessage,
        setSuccessMessage,
        // profile helper
        refreshProfile,
    };

    // only render children once we've resolved initial loading so guards don't flash
    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
