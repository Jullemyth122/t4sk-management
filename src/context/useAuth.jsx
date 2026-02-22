// src/context/useAuth.jsx
import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { auth, googleProvider } from "../config/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile as fbUpdateProfile,
  signOut as firebaseSignOut,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { fetchAccountProfile, saveUserData } from "../services/accountService";
import { usePresence } from "../hooks/usePresence";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // Rate limiting: max 5 auth attempts per 60 seconds
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

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      // cleanup previous profile listener
      if (typeof unsubscribeProfile === "function") {
        try {
          unsubscribeProfile();
        } catch (e) {}
        unsubscribeProfile = null;
      }

      if (!user) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const accountRef = doc(db, "account", user.uid);

      unsubscribeProfile = onSnapshot(
        accountRef,
        (snap) => {
          const profile = snap.exists() ? snap.data() : null;
          if (profile && (profile.accountType === "" || profile.accountType == null)) {
            profile.accountType = profile.accountType || null;
          }
          setCurrentUser({ ...user, profile });
          setLoading(false);
        },
        (err) => {
          console.error("account doc snapshot error:", err);
          setCurrentUser({ ...user, profile: null });
          setLoading(false);
        }
      );
    });

    return () => {
      try { unsubscribeAuth(); } catch (e) {}
      if (typeof unsubscribeProfile === "function") {
        try { unsubscribeProfile(); } catch (e) {}
      }
    };
  }, []);

  // Track presence for the current user
  usePresence(currentUser?.uid);

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

  const handleLogin = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setErrorMessage("");
    try {
      checkRateLimit();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setEmail(""); setPassword(""); setUsername("");
      return cred.user;
    } catch (err) {
      console.error("Login error:", err);
      setErrorMessage(err?.message || "Login failed");
      throw err;
    }
  };

  const handleGoogleLogin = async(e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setErrorMessage("");
    try {
      checkRateLimit();
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Validate email
      if (!user.email || !/\S+@\S+\.\S+/.test(user.email)) {
          setErrorMessage("Google sign-in failed: Invalid or missing email.");
          return;
      }

      const accountRef = doc(db, "account", user.uid);
      const accountSnapshot = await getDoc(accountRef);
      if (!accountSnapshot.exists()) {
          await saveUserData(user, username);
      }

      setEmail("");
      setPassword("");
      setUsername("");
      setErrorMessage("");
      setSuccessMessage("");
    } catch (error) {
        setErrorMessage(error.message);
        setSuccessMessage("");
    }
  }

  const handleFacebookLogin = (e) => {

  }

  const handleSignup = async (e, acceptedTerms = false) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!acceptedTerms) {
      setErrorMessage("You must accept the Terms of Service and Privacy Policy to create an account.");
      return;
    }

    try {
      checkRateLimit();

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await fbUpdateProfile(user, { displayName: username });

      // ←←← THIS IS THE KEY CHANGE ←←←
      await saveUserData(user, username, email, {
        termsAccepted: true,
        privacyAccepted: true,
        acceptedVersion: "1.0",           // increase when you update legal docs
        termsAcceptedAt: new Date().toISOString(),
      });

      setSuccessMessage("Account created successfully! Redirecting...");

      // Auto redirect (best UX)
      setTimeout(() => {
        window.location.href = "/choose-account";
      }, 1200);

      return user;
    } catch (err) {
      console.error("Signup error:", err);
      const friendlyMsg = err.code === 'auth/email-already-in-use'
        ? "This email is already registered."
        : err.code === 'auth/weak-password'
          ? "Password should be at least 6 characters."
          : err.message || "Signup failed";
      setErrorMessage(friendlyMsg);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      // DO NOT call Navigate here — let caller navigate
      return { ok: true };
    } catch (err) {
      console.error("Sign out error:", err);
      setErrorMessage(err?.message || "Sign-out failed");
      return { ok: false, error: err };
    }
  };

  const value = {
    loading,
    setLoading,
    currentUser,
    handleLogin,
    handleSignup,
    signOut,
    handleGoogleLogin,
    handleFacebookLogin: async () => {},
    handleResetPassword: async () => {},
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
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
