// hooks/personal/useProfileForm.js
import { useState, useEffect, useCallback, useMemo } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { COLLECTIONS } from "../../services/accountService";

const EMPTY_FORM = {
    displayName: "",
    bio: "",
    avatarUrl: "",
    location: "",
    timezone: "",
    preferences: {
        theme: "system",
        emailNotifications: true,
    },
};

/**
 * Manages Personal profile form state, validation, dirty-tracking,
 * completeness calculation, and save/reset actions.
 */
export function useProfileForm(profile, profileExists, uid, refreshProfile) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [savedSnapshot, setSavedSnapshot] = useState(EMPTY_FORM);
    const [fieldErrors, setFieldErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isTimezoneOpen, setIsTimezoneOpen] = useState(false);

    // Hydrate form from profile when it loads
    useEffect(() => {
        if (!profile) return;
        const hydrated = {
            displayName: profile.displayName ?? profile.username ?? "",
            bio: profile.bio ?? "",
            avatarUrl: profile.avatarUrl ?? "",
            location: profile.location ?? "",
            timezone: profile.timezone ?? "",
            preferences: {
                theme: profile.preferences?.theme ?? "system",
                emailNotifications: profile.preferences?.emailNotifications ?? true,
            },
        };
        setForm(hydrated);
        setSavedSnapshot(hydrated);
        setFieldErrors({});
        setError(null);
        setSuccess(null);
    }, [profile]);

    // --- Field update (supports nested paths like "preferences.theme") ---
    const updateField = useCallback((path, value) => {
        setForm((prev) => {
            const parts = path.split(".");
            if (parts.length === 1) {
                return { ...prev, [path]: value };
            }
            // Nested: e.g. "preferences.theme"
            const [root, key] = parts;
            return {
                ...prev,
                [root]: { ...prev[root], [key]: value },
            };
        });
        // Clear field error on change
        setFieldErrors((prev) => {
            const copy = { ...prev };
            delete copy[path];
            return copy;
        });
        setSuccess(null);
    }, []);

    // --- Dirty check ---
    const isDirty = useMemo(
        () => JSON.stringify(form) !== JSON.stringify(savedSnapshot),
        [form, savedSnapshot]
    );

    // --- Completeness ---
    const completeness = useMemo(() => {
        const fields = [
            form.displayName,
            form.bio,
            form.avatarUrl,
            form.location,
            form.timezone,
        ];
        const filled = fields.filter((f) => f && f.trim().length > 0).length;
        return Math.round((filled / fields.length) * 100);
    }, [form]);

    // --- Validation ---
    const validate = useCallback(() => {
        const errs = {};
        if (!form.displayName || form.displayName.trim().length < 2) {
            errs.displayName = "Display name must be at least 2 characters.";
        }
        if (!form.timezone) {
            errs.timezone = "Please select a timezone.";
        }
        if (form.avatarUrl && !/^https?:\/\/.+/.test(form.avatarUrl.trim())) {
            errs.avatarUrl = "Must be a valid URL (https://…).";
        }
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    }, [form]);

    // --- Save ---
    const handleSave = useCallback(
        async (publish = false) => {
            if (!uid) return;
            if (!validate()) return;

            setSaving(true);
            setError(null);
            setSuccess(null);

            try {
                const ref = doc(db, COLLECTIONS.ACCOUNT, uid);
                const payload = {
                    displayName: form.displayName.trim(),
                    bio: form.bio.trim(),
                    avatarUrl: form.avatarUrl.trim(),
                    location: form.location.trim(),
                    timezone: form.timezone,
                    preferences: { ...form.preferences },
                    profilePublished: publish,
                    updatedAt: serverTimestamp(),
                };
                await setDoc(ref, payload, { merge: true });
                setSavedSnapshot({ ...form });
                setSuccess(publish ? "Profile published!" : "Draft saved.");
                if (refreshProfile) refreshProfile();
            } catch (err) {
                console.error("useProfileForm: save failed", err);
                setError(err.message || "Failed to save profile.");
            } finally {
                setSaving(false);
            }
        },
        [uid, form, validate, refreshProfile]
    );

    // --- Reset ---
    const handleReset = useCallback(() => {
        setForm(savedSnapshot);
        setFieldErrors({});
        setError(null);
        setSuccess(null);
    }, [savedSnapshot]);

    return {
        form,
        fieldErrors,
        saving,
        error,
        success,
        isDirty,
        completeness,
        isTimezoneOpen,
        setIsTimezoneOpen,
        updateField,
        handleSave,
        handleReset,
    };
}
