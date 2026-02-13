// src/context/useAuth.jsx
import { createContext, useContext, useEffect, useState } from "react";
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
// import { fetchAccountProfile, saveUserData } from "../utilities/accountService";
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
      localStorage.setItem("user", JSON.stringify(user));
    } catch (error) {
        setErrorMessage(error.message);
        setSuccessMessage("");
    }
  }

  const handleFacebookLogin = (e) => {

  }

  const handleSignup = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setErrorMessage("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await fbUpdateProfile(user, { displayName: username });
      await saveUserData(user, username, email);
      setEmail(""); setPassword(""); setUsername("");
      setSuccessMessage("Account created!");
      // DO NOT call Navigate() here — return user and let the component navigate
      return user;
    } catch (err) {
      console.error("Signup error:", err);
      setErrorMessage(err?.message || "Signup failed");
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
