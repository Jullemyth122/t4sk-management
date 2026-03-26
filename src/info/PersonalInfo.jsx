// src/info/PersonalInfo.jsx
import React, { useEffect, useCallback, useRef } from "react";
import { useReduxAuth } from "../context/ReduxAuthContext";
import { useNavigate } from "react-router-dom";
import { usePersonalProfile } from "../hooks/personal/usePersonalProfile";
import { useProfileForm } from "../hooks/personal/useProfileForm";
import { useReduxTheme } from "../context/ReduxThemeContext";
import "../scss/personal-info.scss";

/* ----------------------------- constants --------------------------------- */
const TIMEZONES = [
    "Asia/Manila", "Asia/Singapore", "Asia/Tokyo", "Asia/Shanghai",
    "Europe/London", "Europe/Paris", "UTC",
    "America/New_York", "America/Los_Angeles",
];

function avatarPlaceholder(name) {
    if (!name || name.length === 0) return "PT";
    return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

/* ----------------------------- icons ------------------------------------- */
const IconUser = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" /><path d="M4 20c0-2.21 3.582-4 8-4s8 1.79 8 4v1H4v-1z" /></svg>
);
const IconLocation = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg>
);
const IconClock = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
);
const IconChevron = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
);

/* ========================== component ==================================== */
export default function PersonalInfo({ simulateLoading = false }) {
    const { currentUser, refreshProfile } = useReduxAuth();
    const navigate = useNavigate();
    const uid = currentUser?.uid ?? currentUser?.profile?.uid ?? null;
    const timezoneRef = useRef(null);
    const { setTheme } = useReduxTheme();

    // --- Hooks ---
    const { profile, loading: profileLoading, error: loadError, profileExists } = usePersonalProfile(uid);
    const {
        form, fieldErrors, saving, error, success,
        isDirty, completeness, isTimezoneOpen, setIsTimezoneOpen,
        updateField, handleSave, handleReset,
    } = useProfileForm(profile, profileExists, uid, refreshProfile);

    // Simulated loading timer (mirrors BusinessInfo pattern)
    const [simLoading, setSimLoading] = React.useState(Boolean(simulateLoading));
    React.useEffect(() => {
        if (!simulateLoading) return;
        const t = setTimeout(() => setSimLoading(false), 1500);
        return () => clearTimeout(t);
    }, [simulateLoading]);

    const loading = simLoading || profileLoading;

    // Auth guard
    useEffect(() => {
        if (currentUser === null) navigate("/signup", { replace: true });
    }, [currentUser, navigate]);

    // Close timezone dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (timezoneRef.current && !timezoneRef.current.contains(e.target)) {
                setIsTimezoneOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [setIsTimezoneOpen]);

    const avatarOnError = useCallback((e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "";
    }, []);

    if (loading) return <div className="pc-loading">Loading…</div>;

    /* ========================== render ==================================== */
    return (
        <main className="personal-page improved">
            {/* ─── Header ────────────────────────────────────── */}
            <header className="pc-header">
                <div className="pc-header-left">
                    <h1>Personal Setup</h1>
                    <p className="muted">Manage your personal preferences and profile.</p>
                </div>
                <button className="btn secondary" onClick={() => navigate('/personalDashboard')}>
                    Go to Dashboard →
                </button>
            </header>

            {/* ─── Completeness Indicator ────────────────────── */}
            <div className="pc-completeness">
                <div className="completeness-label">
                    <span>Profile Completeness</span>
                    <span className="completeness-pct">{completeness}%</span>
                </div>
                <div className="completeness-bar">
                    <div
                        className="completeness-fill"
                        style={{ width: `${completeness}%` }}
                    />
                </div>
                {completeness < 100 && (
                    <p className="completeness-hint">
                        {completeness < 40
                            ? "Fill in more fields to complete your profile."
                            : completeness < 80
                                ? "Almost there — just a few more fields."
                                : "Just one more field to go!"}
                    </p>
                )}
            </div>

            {/* ─── Body: Form + Preview ──────────────────────── */}
            <div className="pc-body">
                <section className="pc-form">
                    <div className="card">
                        {/* ── Section: Identity ── */}
                        <div className="section-heading">
                            <h2 className="card-title">Identity</h2>
                            <p className="section-desc">How others see you across the platform.</p>
                        </div>

                        {/* Display Name */}
                        <div className="field-row">
                            <label htmlFor="displayName">Display name *</label>
                            <div className={`input-wrap ${fieldErrors.displayName ? "invalid" : ""}`}>
                                <span className="icon" aria-hidden="true"><IconUser /></span>
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

                        {/* Bio */}
                        <div className="field-row">
                            <label htmlFor="bio">Bio</label>
                            <div className="textarea-wrap">
                                <textarea
                                    id="bio"
                                    value={form.bio}
                                    onChange={(e) => updateField("bio", e.target.value)}
                                    placeholder="A short bio — what do you do?"
                                    maxLength={140}
                                />
                            </div>
                            <div className="helper">
                                <span>{form.bio.length}/140</span> — Tell people what you do.
                            </div>
                        </div>

                        {/* Avatar */}
                        <div className="field-row">
                            <label>Avatar</label>
                            <div className="avatar-row">
                                <div className="avatar-preview">
                                    {form.avatarUrl ? (
                                        <img src={form.avatarUrl} alt="avatar" onError={avatarOnError} />
                                    ) : (
                                        <div className="avatar-pill">{avatarPlaceholder(form.displayName)}</div>
                                    )}
                                </div>
                                <div className="avatar-actions">
                                    <div className="input-wrap" style={{ flex: 1 }}>
                                        <input
                                            value={form.avatarUrl}
                                            onChange={(e) => updateField("avatarUrl", e.target.value)}
                                            placeholder="https://example.com/avatar.jpg"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="btn ghost"
                                        onClick={() => updateField("avatarUrl", "")}
                                        aria-label="Clear avatar"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                            {fieldErrors.avatarUrl && <div className="field-error">{fieldErrors.avatarUrl}</div>}
                            <div className="helper">Paste a direct link to your avatar image (PNG/JPG/WEBP).</div>
                        </div>

                        {/* ── Section: Location & Timezone ── */}
                        <div className="section-heading mt">
                            <h2 className="card-title">Location & Time</h2>
                            <p className="section-desc">Help teammates know your working hours.</p>
                        </div>

                        <div className="two-col">
                            <div className="field-row">
                                <label htmlFor="location">Location</label>
                                <div className="input-wrap">
                                    <span className="icon" aria-hidden="true"><IconLocation /></span>
                                    <input
                                        id="location"
                                        value={form.location}
                                        onChange={(e) => updateField("location", e.target.value)}
                                        placeholder="City, Country"
                                    />
                                </div>
                            </div>

                            <div className="field-row">
                                <label htmlFor="timezone">Timezone *</label>
                                <div className={`select-wrap ${fieldErrors.timezone ? "invalid" : ""}`} ref={timezoneRef}>
                                    <span className="icon" aria-hidden="true"><IconClock /></span>
                                    <div
                                        className="tz-trigger"
                                        onClick={() => setIsTimezoneOpen(!isTimezoneOpen)}
                                        tabIndex={0}
                                        role="button"
                                        aria-expanded={isTimezoneOpen}
                                        aria-controls="timezone-list"
                                    >
                                        <span className="tz-current">{form.timezone || "Select timezone"}</span>
                                        <span className="tz-arrow"><IconChevron /></span>
                                    </div>

                                    {isTimezoneOpen && (
                                        <div className="tz-list" id="timezone-list">
                                            {TIMEZONES.map((tz) => (
                                                <div
                                                    key={tz}
                                                    className={`tz-item ${form.timezone === tz ? "selected" : ""}`}
                                                    onClick={() => {
                                                        updateField("timezone", tz);
                                                        setIsTimezoneOpen(false);
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

                        {/* ── Section: Preferences ── */}
                        <div className="section-heading mt">
                            <h2 className="card-title">Preferences</h2>
                            <p className="section-desc">Customize your experience.</p>
                        </div>

                        <div className="two-col">
                            <div className="field-row">
                                <label>Theme</label>
                                <div className="inline-row">
                                    {["system", "light", "dark"].map((t) => (
                                        <button
                                            key={t}
                                            className={`chip ${form.preferences.theme === t ? "on" : ""}`}
                                            onClick={() => {
                                                updateField("preferences.theme", t);
                                                if (t !== "system") setTheme(t);
                                            }}
                                        >
                                            {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="field-row">
                                <label>Email notifications</label>
                                <div className="toggle-wrap" role="group" aria-label="Email notifications">
                                    <label className={`switch ${form.preferences.emailNotifications ? "on" : ""}`}>
                                        <input
                                            aria-hidden="true"
                                            type="checkbox"
                                            checked={form.preferences.emailNotifications}
                                            onChange={(e) => updateField("preferences.emailNotifications", e.target.checked)}
                                        />
                                        <span className="slider" />
                                    </label>
                                    <span className="toggle-label">
                                        {form.preferences.emailNotifications ? "On" : "Off"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ── Actions ── */}
                        <div className="pc-actions">
                            <button className="btn ghost" onClick={handleReset} disabled={saving || !isDirty}>Reset</button>
                            <div className="actions-right">
                                {isDirty && <span className="unsaved-badge">Unsaved changes</span>}
                                <button className="btn ghost" onClick={() => handleSave(false)} disabled={saving}>
                                    {saving ? "Saving…" : "Save Draft"}
                                </button>
                                <button className="btn primary" onClick={() => handleSave(true)} disabled={saving}>
                                    {saving ? "Publishing…" : "Publish"}
                                </button>
                            </div>
                        </div>

                        {(error || loadError) && <div className="pc-error">{error || loadError}</div>}
                        {success && <div className="pc-success">{success}</div>}
                    </div>
                </section>

                {/* ─── Live Preview ───────────────────────────────── */}
                <aside className="pc-preview">
                    <div className="preview-label">Live Preview</div>
                    <div className="preview-card">
                        <div className="preview-header">
                            <div className="avatar">
                                {form.avatarUrl ? (
                                    <img src={form.avatarUrl} alt="avatar-preview" onError={avatarOnError} />
                                ) : (
                                    <div className="avatar-pill">{avatarPlaceholder(form.displayName)}</div>
                                )}
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
                                <button className="btn small" onClick={() => navigate('/personalDashboard')}>
                                    View Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </main>
    );
}
