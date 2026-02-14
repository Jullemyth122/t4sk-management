// src/pages/PersonalInfo.jsx
import React, { useEffect, useReducer, useRef, useCallback } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import "../scss/personal-info.scss";

/* ----------------------------- constants --------------------------------- */
const TIMEZONES = [
  "Asia/Manila",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Europe/London",
  "Europe/Paris",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
];

const initialState = {
  form: {
    displayName: "",
    bio: "",
    location: "",
    timezone: "Asia/Manila",
    avatarUrl: "",
    preferences: { theme: "system", emailNotifications: true },
  },
  loading: true,
  saving: false,
  error: "",
  success: "",
  fieldErrors: {},
  profileExists: false,
  isTimezoneOpen: false,
};

/* ----------------------------- reducer ----------------------------------- */
function reducer(state, action) {
  switch (action.type) {
    case "SET_STATE":
      return { ...state, ...action.payload };
    case "SET_FORM":
      return { ...state, form: { ...state.form, ...action.payload } };
    case "SET_FIELD_ERROR":
      return { ...state, fieldErrors: { ...state.fieldErrors, ...action.payload } };
    case "CLEAR_FIELD_ERRORS":
      return { ...state, fieldErrors: {} };
    case "RESET":
      return { ...initialState, loading: false };
    default:
      return state;
  }
}

/* ----------------------------- helpers ----------------------------------- */
function avatarPlaceholder(name) {
  if (!name || name.length === 0) return "PT";
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

/* ---------------------------- component ---------------------------------- */
export default function PersonalInfo({ simulateLoading = false }) {
  const { currentUser, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const uid = currentUser?.uid ?? currentUser?.profile?.uid ?? null;

  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    loading: Boolean(simulateLoading) || initialState.loading,
  });

  const mountedRef = useRef(true);
  const timezoneRef = useRef(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ----------------------- realtime listener ----------------------------- */
  useEffect(() => {
    if (!uid) {
      // nothing to load for anonymous
      dispatch({ type: "SET_STATE", payload: { loading: false, profileExists: false } });
      return;
    }

    dispatch({ type: "SET_STATE", payload: { loading: true } });
    const ref = doc(db, "account", uid, "personalProfile", "info");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!mountedRef.current) return;
        if (snap.exists()) {
          const d = snap.data();
          dispatch({
            type: "SET_STATE",
            payload: {
              form: {
                displayName: d.displayName || "",
                bio: d.bio || "",
                location: d.location || "",
                timezone: d.timezone || "Asia/Manila",
                avatarUrl: d.avatarUrl || "",
                preferences: {
                  theme: d.preferences?.theme || "system",
                  emailNotifications:
                    typeof d.preferences?.emailNotifications === "boolean"
                      ? d.preferences.emailNotifications
                      : true,
                },
              },
              profileExists: true,
              loading: false,
            },
          });
        } else {
          dispatch({
            type: "SET_STATE",
            payload: { profileExists: false, loading: false },
          });
        }
      },
      (err) => {
        console.error("Personal snapshot error:", err);
        if (!mountedRef.current) return;
        dispatch({ type: "SET_STATE", payload: { error: "Failed to load profile.", loading: false } });
      }
    );

    return () => unsub();
  }, [uid]);

  /* ----------------------- auth guard redirect --------------------------- */
  useEffect(() => {
    if (currentUser === null) {
      navigate("/signup", { replace: true });
    }
  }, [currentUser, navigate]);

  /* ----------------------- UI helpers ----------------------------------- */
  const updateField = useCallback((k, v) => {
    if (k.startsWith("preferences.")) {
      const [, prefKey] = k.split(".");
      dispatch({ type: "SET_FORM", payload: { preferences: { ...state.form.preferences, [prefKey]: v } } });
    } else {
      dispatch({ type: "SET_FORM", payload: { [k]: v } });
    }
    dispatch({ type: "SET_FIELD_ERROR", payload: { [k]: undefined } });
  }, [state.form.preferences]);

  const validateDisplayName = (val) => (val && String(val).trim().length >= 2) || "Name must be 2+ characters";
  const validateTimezone = (val) => !!val || "Timezone is required";
  const validateAvatarUrl = (val) => {
    if (!val) return true;
    try {
      // eslint-disable-next-line no-new
      new URL(val);
      return true;
    } catch {
      return "Avatar must be a valid URL";
    }
  };

  const validateAll = useCallback(() => {
    const errors = {};
    const { displayName, timezone, avatarUrl } = state.form;

    const dOk = validateDisplayName(displayName);
    if (dOk !== true) errors.displayName = dOk;
    const tzOk = validateTimezone(timezone);
    if (tzOk !== true) errors.timezone = tzOk;
    const avOk = validateAvatarUrl(avatarUrl);
    if (avOk !== true) errors.avatarUrl = avOk;

    dispatch({ type: "SET_STATE", payload: { fieldErrors: errors } });
    return Object.keys(errors).length === 0;
  }, [state.form]);

  /* ----------------------- save handler --------------------------------- */
  const handleSave = useCallback(
    async (publish = false) => {
      if (!uid) {
        dispatch({ type: "SET_STATE", payload: { error: "Not authenticated." } });
        return;
      }
      dispatch({ type: "SET_STATE", payload: { error: "", success: "" } });
      dispatch({ type: "CLEAR_FIELD_ERRORS" });

      if (!validateAll()) {
        dispatch({ type: "SET_STATE", payload: { error: "Please fix the highlighted fields." } });
        return;
      }

      dispatch({ type: "SET_STATE", payload: { saving: true } });

      try {
        const ref = doc(db, "account", uid, "personalProfile", "info");

        const base = {
          displayName: state.form.displayName || undefined,
          bio: state.form.bio || undefined,
          location: state.form.location || undefined,
          timezone: state.form.timezone || undefined,
          avatarUrl: state.form.avatarUrl || undefined,
          preferences: {
            theme: state.form.preferences?.theme || undefined,
            emailNotifications:
              typeof state.form.preferences?.emailNotifications === "boolean"
                ? state.form.preferences?.emailNotifications
                : undefined,
          },
          published: Boolean(publish),
          updatedAt: serverTimestamp(),
        };

        if (!state.profileExists) base.createdAt = serverTimestamp();

        // strip undefineds
        const cleaned = Object.fromEntries(Object.entries(base).filter(([_, v]) => v !== undefined));
        if (cleaned.preferences) {
          cleaned.preferences = Object.fromEntries(Object.entries(cleaned.preferences).filter(([_, v]) => v !== undefined));
        }

        await setDoc(ref, cleaned, { merge: true });

        // update top-level account updatedAt
        const topAccountRef = doc(db, "account", uid);
        await setDoc(topAccountRef, { updatedAt: serverTimestamp() }, { merge: true });

        // refresh provider
        if (typeof refreshProfile === "function") {
          try {
            await refreshProfile();
          } catch (err) {
            // non-fatal, log
            console.warn("refreshProfile failed:", err);
          }
        }

        if (!mountedRef.current) return;
        dispatch({ type: "SET_STATE", payload: { success: publish ? "Profile published" : "Profile saved" } });
        setTimeout(() => {
          if (!mountedRef.current) return;
          dispatch({ type: "SET_STATE", payload: { success: "" } });
        }, 2500);
      } catch (err) {
        console.error("Personal save error:", err);
        if (!mountedRef.current) return;
        dispatch({ type: "SET_STATE", payload: { error: err?.message || "Save failed. Try again." } });
      } finally {
        if (!mountedRef.current) return;
        dispatch({ type: "SET_STATE", payload: { saving: false } });
      }
    },
    [uid, state.form, state.profileExists, refreshProfile, validateAll]
  );

  const avatarOnError = useCallback((e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = "";
    dispatch({ type: "SET_FIELD_ERROR", payload: { avatarUrl: "Unable to load avatar URL." } });
  }, []);

  /* ----------------------- UI actions ----------------------------------- */
  const handleReset = useCallback(() => {
    dispatch({ type: "SET_STATE", payload: { form: initialState.form, error: "", success: "" } });
    dispatch({ type: "CLEAR_FIELD_ERRORS" });
  }, []);

  const {
    form,
    loading,
    saving,
    error,
    success,
    fieldErrors,
    isTimezoneOpen,
  } = state;

  if (loading) return <div className="pc-loading">Loading…</div>;

  return (
    <main className="personal-page improved">
      <header className="pc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Personal Setup</h1>
          <p className="muted">Manage your personal preferences and profile.</p>
        </div>
        <button className="btn secondary" onClick={() => navigate('/personalDashboard')}>
          Go to Dashboard →
        </button>
      </header>

      <div className="pc-body">
        <section className="pc-form">
          <div className="card">
            <h2 className="card-title">Profile</h2>

            <div className="field-row">
              <label htmlFor="displayName">Display name *</label>
              <div className={`input-wrap ${fieldErrors.displayName ? "invalid" : ""}`}>
                <span className="icon name" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/><path d="M4 20c0-2.21 3.582-4 8-4s8 1.79 8 4v1H4v-1z"/></svg>
                </span>
                <input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) => updateField("displayName", e.target.value)}
                  placeholder="Your name"
                  aria-invalid={!!fieldErrors.displayName}
                />
              </div>
              {fieldErrors.displayName && <div className="field-error">{fieldErrors.displayName}</div>}
            </div>

            <div className="field-row">
              <label htmlFor="bio">Bio</label>
              <div className="textarea-wrap">
                <textarea id="bio" value={form.bio} onChange={(e) => updateField("bio", e.target.value)} placeholder="A short bio — what do you do?" />
              </div>
              <div className="helper">Tell people what you do in 140 characters or less.</div>
            </div>

            <div className="two-col">
              <div className="field-row">
                <label htmlFor="location">Location</label>
                <div className="input-wrap">
                  <span className="icon loc" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                  </span>
                  <input id="location" value={form.location} onChange={(e) => updateField("location", e.target.value)} placeholder="City, Country" />
                </div>
              </div>

              <div className="field-row">
                <label htmlFor="timezone">Timezone</label>
                <div className={`select-wrap ${fieldErrors.timezone ? "invalid" : ""}`} ref={timezoneRef}>
                  <span className="icon tz" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v6l4 2" /></svg>
                  </span>
                  <div
                    className="tz-trigger"
                    onClick={() => dispatch({ type: "SET_STATE", payload: { isTimezoneOpen: !state.isTimezoneOpen } })}
                    tabIndex={0}
                    role="button"
                    aria-expanded={state.isTimezoneOpen}
                    aria-controls="timezone-list"
                  >
                    <span className="tz-current">{form.timezone || "Select timezone"}</span>
                    <span className="tz-arrow">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </span>
                  </div>

                  {state.isTimezoneOpen && (
                    <div className="tz-list" id="timezone-list">
                      {TIMEZONES.map((tz) => (
                        <div
                          key={tz}
                          className={`tz-item ${form.timezone === tz ? "selected" : ""}`}
                          onClick={() => {
                            updateField("timezone", tz);
                            dispatch({ type: "SET_STATE", payload: { isTimezoneOpen: false } });
                          }}
                          role="option"
                          aria-selected={form.timezone === tz}
                        >
                          {tz}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {fieldErrors.timezone && <div className="field-error">{fieldErrors.timezone}</div>}
              </div>
            </div>

            <div className="field-row">
              <label>Avatar</label>
              <div className="avatar-row">
                <div className="avatar-preview">
                  {form.avatarUrl ? <img src={form.avatarUrl} alt="avatar" onError={avatarOnError} /> : <div className="avatar-pill">{avatarPlaceholder(form.displayName)}</div>}
                </div>

                <div className="avatar-actions">
                  <div className="input-wrap" style={{ flex: 1 }}>
                    <input value={form.avatarUrl} onChange={(e) => updateField("avatarUrl", e.target.value)} placeholder="https://example.com/avatar.jpg" />
                  </div>
                  <button type="button" className="btn ghost" onClick={() => { dispatch({ type: "SET_FORM", payload: { avatarUrl: "" } }); dispatch({ type: "SET_FIELD_ERROR", payload: { avatarUrl: undefined } }); }} aria-label="Clear avatar">
                    Clear
                  </button>
                </div>
              </div>
              {fieldErrors.avatarUrl && <div className="field-error">{fieldErrors.avatarUrl}</div>}
              <div className="helper">Paste a direct link to your avatar image (PNG/JPG/WEBP).</div>
            </div>

            <h3 className="mt">Preferences</h3>

            <div className="two-col">
              <div className="field-row">
                <label>Theme</label>
                <div className="inline-row">
                  <button className={`chip ${form.preferences.theme === "system" ? "on" : ""}`} onClick={() => updateField("preferences.theme", "system")}>System</button>
                  <button className={`chip ${form.preferences.theme === "light" ? "on" : ""}`} onClick={() => updateField("preferences.theme", "light")}>Light</button>
                  <button className={`chip ${form.preferences.theme === "dark" ? "on" : ""}`} onClick={() => updateField("preferences.theme", "dark")}>Dark</button>
                </div>
              </div>

              <div className="field-row">
                <label>Email notifications</label>
                <div className="toggle-wrap" role="group" aria-label="Email notifications">
                  <label className={`switch ${form.preferences.emailNotifications ? "on" : ""}`}>
                    <input aria-hidden="true" type="checkbox" checked={form.preferences.emailNotifications} onChange={(e) => updateField("preferences.emailNotifications", e.target.checked)} />
                    <span className="slider" />
                  </label>
                </div>
              </div>
            </div>

            <div className="pc-actions">
              <button className="btn ghost" onClick={handleReset} disabled={saving}>Reset</button>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn ghost" onClick={() => handleSave(false)} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                <button className="btn primary" onClick={() => handleSave(true)} disabled={saving}>{saving ? "Publishing…" : "Publish"}</button>
              </div>
            </div>

            {error && <div className="pc-error">{error}</div>}
            {success && <div className="pc-success">{success}</div>}
          </div>
        </section>

        <aside className="pc-preview">
          <div className="preview-card">
            <div className="preview-header">
              <div className="avatar">
                {form.avatarUrl ? <img src={form.avatarUrl} alt="avatar-preview" onError={avatarOnError} /> : <div className="avatar-pill">{avatarPlaceholder(form.displayName)}</div>}
              </div>

              <div className="title">
                <h3>{form.displayName || "Your name"}</h3>
                <p className="muted">{form.location || "Location"}</p>
              </div>
            </div>

            <div className="preview-body">
              <p className="desc">{form.bio || "Short bio preview."}</p>

              <div className="meta">
                <div><strong>Timezone:</strong> {form.timezone || "—"}</div>
                <div><strong>Notifications:</strong> {form.preferences.emailNotifications ? "On" : "Off"}</div>
                <div><strong>Theme:</strong> {form.preferences.theme}</div>
              </div>

              <div className="preview-actions">
                <button className="btn small">View profile</button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
