// hooks/personal/usePersonalProfile.js
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import { COLLECTIONS } from "../../services/accountService";

/**
 * Subscribe to the personal profile document at `account/{uid}`.
 * Returns the live profile, loading state, error, and whether the doc exists.
 */
export function usePersonalProfile(uid) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profileExists, setProfileExists] = useState(false);

    useEffect(() => {
        if (!uid) {
            setProfile(null);
            setLoading(false);
            setProfileExists(false);
            return;
        }

        setLoading(true);
        setError(null);

        const ref = doc(db, COLLECTIONS.ACCOUNT, uid);
        const unsub = onSnapshot(
            ref,
            (snap) => {
                if (snap.exists()) {
                    setProfile({ id: snap.id, ...snap.data() });
                    setProfileExists(true);
                } else {
                    setProfile(null);
                    setProfileExists(false);
                }
                setLoading(false);
            },
            (err) => {
                console.warn("usePersonalProfile: snapshot error", err);
                setError(err.message || "Failed to load profile");
                setLoading(false);
            }
        );

        return () => unsub();
    }, [uid]);

    return { profile, loading, error, profileExists };
}
