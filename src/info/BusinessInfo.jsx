// src/pages/BusinessInfo.jsx
import React, { useEffect, useRef, useMemo, useCallback, useReducer } from "react";
import {
    doc,
    setDoc,
    serverTimestamp,
    collection,
    query,
    orderBy,
    onSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/useAuth";
import {
    createBusiness,
    createRole,
    inviteMember,
    updateBusinessSettings,
    deleteRole,
    updateRole,
    searchUsersByEmail,
} from "../services/accountService";

import "../scss/business-info.scss";
import BusinessSkeleton from "../components/loaders/BusinessSkeleton";
import useDebounce from "../hooks/useDebounce";
import useRealtimeCollection from "../hooks/useRealtimeCollection";

/* ----------------------------- memoized rows ------------------------------ */
const MemberRow = React.memo(function MemberRow({ m }) {
    return (
        <li className="member-row">
            <div>
                <strong>{m.name || m.email || "—"}</strong>
                <div className="muted small">{m.email || m.uid}</div>
            </div>
            <div className="muted">{m.roleName}</div>
        </li>
    );
});

const RoleRow = React.memo(function RoleRow({ r, onEdit, onDelete, canEdit }) {
    return (
        <li className="role-row">
            <div>
                <strong>{r.name}</strong>
                <div className="muted small">
                    level {r.level ?? 0} {r.capacity ? `• capacity ${r.capacity}` : ""}
                </div>
            </div>

            <div className="role-actions">
                <button className="btn small ghost" disabled={!canEdit} onClick={() => onEdit(r)}>
                    Edit
                </button>
                <button className="btn small" disabled={!canEdit} onClick={() => onDelete(r.id)}>
                    Delete
                </button>
            </div>
        </li>
    );
});

/* ---------------------------- reducer & state ----------------------------- */
const initialState = {
    // profile form
    form: {
        businessName: "",
        tagline: "",
        industry: "",
        description: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        website: "",
        location: "",
        logoUrl: "",
        published: false,
        settings: {},
    },

    // UI
    tab: "profile",
    loading: false,
    saving: false,
    error: "",
    success: "",
    profileExists: false,

    // business identification
    businessId: null,
    usingTopLevelBusiness: false,

    // invite state
    invite: { email: "", roleId: "" },
    searchResults: [],

    // new role creation
    newRole: { name: "", level: 1, capacity: null },

    // editing role
    editingRole: { id: null, name: "", level: 0, capacity: null },
};

function reducer(state, action) {
    switch (action.type) {
        case "SET":
            return { ...state, ...action.payload };
        case "SET_FORM":
            return { ...state, form: { ...state.form, ...action.payload } };
        case "SET_INVITE":
            return { ...state, invite: { ...state.invite, ...action.payload } };
        case "SET_SEARCH_RESULTS":
            return { ...state, searchResults: action.payload || [] };
        case "SET_NEW_ROLE":
            return { ...state, newRole: { ...state.newRole, ...action.payload } };
        case "SET_EDIT_ROLE":
            return { ...state, editingRole: { ...state.editingRole, ...action.payload } };
        case "RESET_EDIT_ROLE":
            return { ...state, editingRole: initialState.editingRole };
        case "RESET_NEW_ROLE":
            return { ...state, newRole: initialState.newRole };
        case "CLEAR_MESSAGES":
            return { ...state, error: "", success: "" };
        default:
            return state;
    }
}

/* ---------------------------- component --------------------------------- */
export default function BusinessInfo({ simulateLoading = false }) {
    const { currentUser, refreshProfile } = useAuth();
    const uid = currentUser?.uid ?? currentUser?.profile?.uid ?? null;
    const mountedRef = useRef(true);
    useEffect(() => () => { mountedRef.current = false; }, []);

    const [state, dispatch] = useReducer(reducer, { ...initialState, loading: Boolean(simulateLoading) });

    /* ---------------------------------------------------------------------- */
    /* derive business affiliation from auth profile (keep behavior)         */
    /* ---------------------------------------------------------------------- */
    useEffect(() => {
        if (!currentUser?.profile) return;
        const aff = currentUser.profile.businessAffiliations;
        if (Array.isArray(aff) && aff.length > 0 && aff[0].businessId) {
            dispatch({ type: "SET", payload: { businessId: aff[0].businessId, usingTopLevelBusiness: true } });
        } else {
            dispatch({ type: "SET", payload: { businessId: null, usingTopLevelBusiness: false } });
        }
    }, [currentUser]);

    /* ---------------------------------------------------------------------- */
    /* simulate loading demo                                                  */
    /* ---------------------------------------------------------------------- */
    useEffect(() => {
        if (!simulateLoading) return;
        const t = setTimeout(() => { if (mountedRef.current) dispatch({ type: "SET", payload: { loading: false } }); }, 5000);
        return () => clearTimeout(t);
    }, [simulateLoading]);

    /* ---------------------------------------------------------------------- */
    /* subscribe to the top-level business doc (profileExists/form updates)   */
    /* ---------------------------------------------------------------------- */
    useEffect(() => {
        const { businessId, usingTopLevelBusiness } = state;
        if (!uid) return;
        if (!usingTopLevelBusiness || !businessId) { dispatch({ type: "SET", payload: { profileExists: false } }); return; }

        const ref = doc(db, "businesses", businessId);
        const unsub = onSnapshot(ref, (snap) => {
            if (!mountedRef.current) return;
            if (snap.exists()) {
                const d = snap.data();
                dispatch({
                    type: "SET",
                    payload: {
                        form: {
                            ...state.form,
                            businessName: d.name ?? state.form.businessName,
                            tagline: d.tagline ?? state.form.tagline,
                            industry: d.industry ?? state.form.industry,
                            description: d.description ?? state.form.description,
                            contactName: d.contactName ?? state.form.contactName,
                            contactEmail: d.contactEmail ?? state.form.contactEmail,
                            contactPhone: d.contactPhone ?? state.form.contactPhone,
                            website: d.website ?? state.form.website,
                            location: d.location ?? state.form.location,
                            logoUrl: d.logoUrl ?? state.form.logoUrl,
                            published: typeof d.published === "boolean" ? d.published : state.form.published,
                            settings: d.settings ?? state.form.settings ?? {},
                        },
                        profileExists: true,
                    },
                });
            } else {
                dispatch({ type: "SET", payload: { profileExists: false } });
            }
        }, (err) => {
            console.error("business doc snapshot error:", err);
            dispatch({ type: "SET", payload: { error: "Failed to load business profile." } });
        });

        return () => { try { unsub && unsub(); } catch (e) { /* noop */ } };
        // we only want this effect to re-run when businessId/usingTopLevelBusiness/uid change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.businessId, state.usingTopLevelBusiness, uid]);

    /* ---------------------------------------------------------------------- */
    /* Realtime queries for roles & members (use hook - unchanged)            */
    /* ---------------------------------------------------------------------- */
    const rolesQuery = useMemo(() => (
        state.businessId ? query(collection(db, "businesses", state.businessId, "roles"), orderBy("level", "desc")) : null
    ), [state.businessId]);

    const membersQuery = useMemo(() => (
        state.businessId ? query(collection(db, "businesses", state.businessId, "members"), orderBy("joinedAt", "asc")) : null
    ), [state.businessId]);

    const roles = useRealtimeCollection(rolesQuery, [state.businessId]) || [];
    const rawMembers = useRealtimeCollection(membersQuery, [state.businessId]) || [];

    /* ---------------------------------------------------------------------- */
    /* derive members (add roleName) using useMemo (no setState)              */
    /* ---------------------------------------------------------------------- */
    const members = useMemo(() => {
        if (!rawMembers || rawMembers.length === 0) return [];
        const r = roles || [];
        const roleById = {};
        r.forEach((rr) => { if (rr && rr.id) roleById[rr.id] = rr.name; });

        return rawMembers.map((m) => {
            let roleName = null;
            if (m.roleId && roleById[m.roleId]) roleName = roleById[m.roleId];
            else if (m.roleId) {
                const byName = r.find((rr) => rr.name === m.roleId);
                if (byName) roleName = byName.name;
            }
            return { ...m, roleName: roleName || m.roleId || "member" };
        });
    }, [roles, rawMembers]);

    /* ---------------------------------------------------------------------- */
    /* canEdit computed via useMemo (no setState)                             */
    /* ---------------------------------------------------------------------- */
    const canEdit = useMemo(() => {
        const { profileExists, businessId: bid } = state;
        if (!currentUser?.profile) return false;
        if (!profileExists) return true;
        if (!bid) return false;

        const aff = Array.isArray(currentUser.profile.businessAffiliations)
            ? currentUser.profile.businessAffiliations.find((a) => a.businessId === bid)
            : null;
        if (!aff) return false;
        const affRoleId = aff.roleId;
        if (affRoleId === "owner") return true;
        const matchedRole = (roles || []).find((r) => r.id === affRoleId);
        if (matchedRole && String(matchedRole.name || "").toLowerCase() === "owner") return true;
        return false;
    }, [currentUser?.profile, roles, state.profileExists, state.businessId]);

    /* ---------------------------------------------------------------------- */
    /* invite role default                                                     */
    /* ---------------------------------------------------------------------- */
    useEffect(() => {
        if (Array.isArray(roles) && roles.length > 0 && !state.invite.roleId) {
            dispatch({ type: "SET_INVITE", payload: { roleId: roles[0].id } });
        }
    }, [roles, state.invite.roleId]);

    /* ---------------------------------------------------------------------- */
    /* Helpers                                                                */
    /* ---------------------------------------------------------------------- */
    const updateField = useCallback((k, v) => {
        dispatch({ type: "SET_FORM", payload: { [k]: v } });
    }, []);

    const validateProfile = useCallback(() => {
        return (state.form.businessName || "").trim().length >= 2;
    }, [state.form.businessName]);

    /* ---------------------------------------------------------------------- */
    /* Save profile                                                            */
    /* ---------------------------------------------------------------------- */
    const handleSaveProfile = useCallback(async (publish = false) => {
        if (!uid) { dispatch({ type: "SET", payload: { error: "Not authenticated" } }); return; }
        if (!canEdit) { dispatch({ type: "SET", payload: { error: "You are not allowed to edit this company." } }); setTimeout(() => { if (mountedRef.current) dispatch({ type: "SET", payload: { error: "" } }); }, 2500); return; }
        if (!validateProfile()) { dispatch({ type: "SET", payload: { error: "Business name required" } }); setTimeout(() => { if (mountedRef.current) dispatch({ type: "SET", payload: { error: "" } }); }, 2500); return; }

        dispatch({ type: "CLEAR_MESSAGES" });
        dispatch({ type: "SET", payload: { saving: true } });

        try {
            const payload = {
                name: state.form.businessName,
                tagline: state.form.tagline || undefined,
                industry: state.form.industry || undefined,
                description: state.form.description || undefined,
                contactName: state.form.contactName || undefined,
                contactEmail: state.form.contactEmail || undefined,
                contactPhone: state.form.contactPhone || undefined,
                website: state.form.website || undefined,
                location: state.form.location || undefined,
                logoUrl: state.form.logoUrl || undefined,
                published: Boolean(publish),
                updatedAt: serverTimestamp(),
            };

            if (!state.profileExists) payload.createdAt = serverTimestamp();
            const cleanedPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));

            if (state.usingTopLevelBusiness && state.businessId) {
                await setDoc(doc(db, "businesses", state.businessId), cleanedPayload, { merge: true });
            } else {
                const res = await createBusiness({
                    ownerUid: uid,
                    businessName: state.form.businessName,
                    payload: cleanedPayload,
                });
                if (!res?.businessId) throw new Error("Failed to create business");
                // update local state to now use top-level business
                if (mountedRef.current) {
                    dispatch({ type: "SET", payload: { businessId: res.businessId, usingTopLevelBusiness: true } });
                }
                await setDoc(doc(db, "businesses", res.businessId), cleanedPayload, { merge: true });
            }

            await setDoc(doc(db, "account", uid), { updatedAt: serverTimestamp() }, { merge: true });

            if (typeof refreshProfile === "function") {
                try { await refreshProfile(); } catch (e) { /* ignore */ }
            }

            if (mountedRef.current) {
                dispatch({ type: "SET", payload: { success: publish ? "Published" : "Saved" } });
                setTimeout(() => { if (mountedRef.current) dispatch({ type: "SET", payload: { success: "" } }); }, 2000);
            }
        } catch (err) {
            console.error("save profile err", err);
            if (mountedRef.current) dispatch({ type: "SET", payload: { error: err?.message || "Unable to save" } });
        } finally {
            if (mountedRef.current) dispatch({ type: "SET", payload: { saving: false } });
        }
    }, [uid, canEdit, validateProfile, state.form, state.profileExists, state.usingTopLevelBusiness, state.businessId, refreshProfile]);

    /* ---------------------------------------------------------------------- */
    /* Invite flow                                                             */
    /* ---------------------------------------------------------------------- */
    const handleInvite = useCallback(async () => {
        dispatch({ type: "CLEAR_MESSAGES" });
        if (!state.invite.email || !state.businessId) { dispatch({ type: "SET", payload: { error: "Email & business required" } }); return; }
        try {
            await inviteMember({ businessId: state.businessId, email: state.invite.email.trim(), invitedByUid: uid, roleId: state.invite.roleId });
            if (!mountedRef.current) return;
            dispatch({ type: "SET_INVITE", payload: { email: "" } });
            dispatch({ type: "SET_SEARCH_RESULTS", payload: [] });
            dispatch({ type: "SET", payload: { success: "Invite created (not emailed)." } });
            setTimeout(() => { if (mountedRef.current) dispatch({ type: "SET", payload: { success: "" } }); }, 2500);
        } catch (err) {
            console.error("invite err", err);
            if (mountedRef.current) dispatch({ type: "SET", payload: { error: err?.message || "Failed to create invite" } });
        }
    }, [state.invite.email, state.invite.roleId, state.businessId, uid]);

    /* ---------------------------------------------------------------------- */
    /* Role create/update/delete                                               */
    /* ---------------------------------------------------------------------- */
    const handleCreateRole = useCallback(async () => {
        dispatch({ type: "CLEAR_MESSAGES" });
        if (!state.newRole.name || !state.businessId) { dispatch({ type: "SET", payload: { error: "Role name & business required" } }); return; }

        const maxAllowed = (state.form?.settings?.maxRoleLevel) ?? 10;
        const level = Number.isFinite(Number(state.newRole.level)) ? Number(state.newRole.level) : 0;
        const capacity = state.newRole.capacity === "" ? null : (state.newRole.capacity === null ? null : Number(state.newRole.capacity));

        if (!Number.isInteger(level) || level < 0) { dispatch({ type: "SET", payload: { error: "Level must be a non-negative integer" } }); return; }
        if (level > maxAllowed) { dispatch({ type: "SET", payload: { error: `Level cannot be higher than ${maxAllowed}` } }); return; }

        if (mountedRef.current) dispatch({ type: "SET", payload: { saving: true } });
        try {
            await createRole(state.businessId, { name: state.newRole.name.trim(), level, capacity, permissions: {} });
            if (!mountedRef.current) return;
            dispatch({ type: "RESET_NEW_ROLE" });
            dispatch({ type: "SET", payload: { success: "Role created" } });
            setTimeout(() => { if (mountedRef.current) dispatch({ type: "SET", payload: { success: "" } }); }, 2000);
        } catch (err) {
            console.error("create role err", err);
            if (mountedRef.current) dispatch({ type: "SET", payload: { error: err?.message || "Failed to create role" } });
        } finally {
            if (mountedRef.current) dispatch({ type: "SET", payload: { saving: false } });
        }
    }, [state.newRole, state.businessId, state.form?.settings]);

    const startEditRole = useCallback((role) => {
        dispatch({ type: "SET_EDIT_ROLE", payload: { id: role.id, name: role.name || "", level: Number(role.level || 0), capacity: role.capacity === undefined ? null : role.capacity } });
    }, []);

    const handleUpdateRole = useCallback(async () => {
        dispatch({ type: "CLEAR_MESSAGES" });
        const { editingRole, form } = state;
        if (!editingRole.id || !state.businessId) { dispatch({ type: "SET", payload: { error: "No role selected" } }); return; }
        const maxAllowed = (form?.settings?.maxRoleLevel) ?? 10;
        const level = Number.isFinite(Number(editingRole.level)) ? editingRole.level : 0;
        const capacity = editingRole.capacity === "" ? null : (editingRole.capacity === null ? null : Number(editingRole.capacity));
        if (!Number.isInteger(level) || level < 0) { dispatch({ type: "SET", payload: { error: "Level must be a non-negative integer" } }); return; }
        if (level > maxAllowed) { dispatch({ type: "SET", payload: { error: `Level cannot be higher than ${maxAllowed}` } }); return; }

        if (mountedRef.current) dispatch({ type: "SET", payload: { saving: true } });
        try {
            await updateRole(state.businessId, editingRole.id, { name: editingRole.name.trim(), level, capacity });
            if (!mountedRef.current) return;
            dispatch({ type: "RESET_EDIT_ROLE" });
            dispatch({ type: "SET", payload: { success: "Role updated" } });
            setTimeout(() => { if (mountedRef.current) dispatch({ type: "SET", payload: { success: "" } }); }, 2000);
        } catch (err) {
            console.error("update role err", err);
            if (mountedRef.current) dispatch({ type: "SET", payload: { error: err?.message || "Failed to update role" } });
        } finally {
            if (mountedRef.current) dispatch({ type: "SET", payload: { saving: false } });
        }
    }, [state.editingRole, state.businessId, state.form]);

    const handleDeleteRole = useCallback(async (roleId) => {
        if (!state.businessId || !roleId) return;
        if (!confirm("Delete this role? This will not remove existing members automatically.")) return;
        if (mountedRef.current) dispatch({ type: "SET", payload: { saving: true } });
        try {
            await deleteRole(state.businessId, roleId);
            if (!mountedRef.current) return;
            dispatch({ type: "SET", payload: { success: "Role deleted" } });
            setTimeout(() => { if (mountedRef.current) dispatch({ type: "SET", payload: { success: "" } }); }, 2000);
        } catch (err) {
            console.error("delete role err", err);
            if (mountedRef.current) dispatch({ type: "SET", payload: { error: err?.message || "Failed to delete role" } });
        } finally {
            if (mountedRef.current) dispatch({ type: "SET", payload: { saving: false } });
        }
    }, [state.businessId]);

    /* ---------------------------------------------------------------------- */
    /* Debounced search for invite email                                       */
    /* ---------------------------------------------------------------------- */
    const debouncedInviteEmail = useDebounce(state.invite.email, 400);

    useEffect(() => {
        if (!debouncedInviteEmail || debouncedInviteEmail.trim().length < 3) {
            dispatch({ type: "SET_SEARCH_RESULTS", payload: [] });
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const results = await searchUsersByEmail(debouncedInviteEmail.trim());
                if (!cancelled && mountedRef.current) dispatch({ type: "SET_SEARCH_RESULTS", payload: results });
            } catch (err) {
                console.error("Search error:", err);
                if (!cancelled && mountedRef.current) dispatch({ type: "SET_SEARCH_RESULTS", payload: [] });
            }
        })();
        return () => { cancelled = true; };
    }, [debouncedInviteEmail]);

    const handleEmailChange = useCallback((e) => {
        dispatch({ type: "SET_INVITE", payload: { email: e.target.value } });
    }, []);

    const handleSelectEmail = useCallback((email) => {
        dispatch({ type: "SET_INVITE", payload: { email } });
        dispatch({ type: "SET_SEARCH_RESULTS", payload: [] });
    }, []);

    /* ---------------------------------------------------------------------- */
    /* Settings                                                               */
    /* ---------------------------------------------------------------------- */
    const handleSaveSettings = useCallback(async (settings = {}) => {
        if (!state.businessId) { dispatch({ type: "SET", payload: { error: "No business" } }); return; }
        try {
            await updateBusinessSettings(state.businessId, settings);
            if (!mountedRef.current) return;
            dispatch({ type: "SET", payload: { success: "Settings updated" } });
            setTimeout(() => { if (mountedRef.current) dispatch({ type: "SET", payload: { success: "" } }); }, 2000);
        } catch (err) {
            console.error("update settings err", err);
            if (mountedRef.current) dispatch({ type: "SET", payload: { error: err?.message || "Failed to update settings" } });
        }
    }, [state.businessId]);

    /* ---------------------------------------------------------------------- */
    /* UI helpers                                                              */
    /* ---------------------------------------------------------------------- */
    const logoPlaceholder = useCallback((name) => {
        if (!name) return "BK";
        const words = name.split(" ").filter(Boolean);
        if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
        return (words[0][0] + words[1][0]).toUpperCase();
    }, []);

    /* ---------------------------------------------------------------------- */
    /* Render                                                                */
    /* ---------------------------------------------------------------------- */
    if (state.loading) return <BusinessSkeleton />;

    const { form, tab, error, success, saving, profileExists } = state;

    return (
        <main className="business-create-page">
            <header className="bc-header">
                <div>
                    <h1>Business Setup</h1>
                    <p className="muted">Create and manage your business: profile, members, roles and settings.</p>
                </div>

                <nav className="bc-tabs" role="tablist" aria-label="Business tabs">
                    <button className={`tab ${tab === "profile" ? "active" : ""}`} onClick={() => dispatch({ type: "SET", payload: { tab: "profile" } })}>Profile</button>
                    <button className={`tab ${tab === "members" ? "active" : ""}`} onClick={() => dispatch({ type: "SET", payload: { tab: "members" } })}>Members</button>
                    <button className={`tab ${tab === "roles" ? "active" : ""}`} onClick={() => dispatch({ type: "SET", payload: { tab: "roles" } })}>Roles</button>
                    <button className={`tab ${tab === "settings" ? "active" : ""}`} onClick={() => dispatch({ type: "SET", payload: { tab: "settings" } })}>Settings</button>
                </nav>
            </header>

            {!canEdit && profileExists && (
                <div className="readonly-banner card">
                    <strong>Read-only view</strong>
                    <span className="muted">You don't have permission to edit this company.</span>
                </div>
            )}

            <div className="bc-body">
                <section className="bc-form">
                    {tab === "profile" && (
                        <>
                            <div className={`card ${!canEdit ? "read-only" : ""}`}>
                                <h2 className="card-title">Company information</h2>

                                <label>Business name *</label>
                                <input value={form.businessName} onChange={(e) => updateField("businessName", e.target.value)} placeholder="Acme Co." disabled={!canEdit} />

                                <label>Tagline</label>
                                <input value={form.tagline} onChange={(e) => updateField("tagline", e.target.value)} placeholder="We build delightful products" disabled={!canEdit} />

                                <label>Industry</label>
                                <input value={form.industry} onChange={(e) => updateField("industry", e.target.value)} placeholder="Software / Retail" disabled={!canEdit} />

                                <label>Description</label>
                                <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Short description" disabled={!canEdit} />

                                <hr style={{ margin: "12px 0" }} />

                                <h3 className="card-subtitle">Contact company</h3>

                                <label>Company contact name</label>
                                <input value={form.contactName} onChange={(e) => updateField("contactName", e.target.value)} placeholder="Jane Doe" disabled={!canEdit} />

                                <label>Company contact email</label>
                                <input value={form.contactEmail} onChange={(e) => updateField("contactEmail", e.target.value)} placeholder="contact@acme.com" disabled={!canEdit} />

                                <label>Company contact phone</label>
                                <input value={form.contactPhone} onChange={(e) => updateField("contactPhone", e.target.value)} placeholder="+1 (555) 555-5555" disabled={!canEdit} />

                                <label>Company Website</label>
                                <input value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://example.com" disabled={!canEdit} />

                                <label>Company Location</label>
                                <input value={form.location} onChange={(e) => updateField("location", e.target.value)} placeholder="City, Country" disabled={!canEdit} />

                                <label>Logo image URL</label>
                                <input value={form.logoUrl} onChange={(e) => updateField("logoUrl", e.target.value)} placeholder="https://example.com/logo.png" disabled={!canEdit} />
                            </div>

                            <div className="bc-actions">
                                {canEdit ? (
                                    <div>
                                        <button onClick={() => handleSaveProfile(false)} className="btn ghost" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                                        <button onClick={() => handleSaveProfile(true)} className="btn primary" disabled={saving}>{saving ? "Publishing…" : "Publish"}</button>
                                    </div>
                                ) : (
                                    <div className="muted small">You do not have permission to edit this company’s information.</div>
                                )}
                            </div>
                        </>
                    )}

                    {tab === "members" && (
                        <>
                            <div className={`card ${!canEdit ? "read-only" : ""}`}>
                                <h2 className="card-title">Invite member</h2>
                                <div style={{ position: "relative" }}>
                                    <label>Email</label>
                                    <input value={state.invite.email} onChange={handleEmailChange} placeholder="teammate@email.com" />
                                    {state.searchResults.length > 0 && (
                                        <ul style={{ position: "absolute", zIndex: 1, background: "white", border: "1px solid #ccc", listStyle: "none", padding: 0, margin: 0, width: "100%" }}>
                                            {state.searchResults.map((result) => (
                                                <li key={result.email} style={{ padding: "8px", cursor: "pointer", color: "#000" }} onClick={() => handleSelectEmail(result.email)}>
                                                    {result.name} ({result.email})
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <label>Role</label>
                                <select value={state.invite.roleId} onChange={(e) => dispatch({ type: "SET_INVITE", payload: { roleId: e.target.value } })}>
                                    {roles.length === 0 ? (
                                        <option value="member">member</option>
                                    ) : (
                                        <>
                                            <option value="" disabled>{`Select role (default: ${roles[0].name})`}</option>
                                            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </>
                                    )}
                                </select>

                                <div className="mt">
                                    <button onClick={handleInvite} className="btn primary cursor-pointer bg-gray-700 p-2 rounded-xl" disabled={!canEdit} title={!canEdit ? "You don't have permission to invite members" : "Create Invite"}>
                                        Create Invite
                                    </button>
                                </div>
                            </div>

                            <div className="card">
                                <h2 className="card-title">Members</h2>
                                {members.length === 0 ? <p className="muted">No members yet.</p> : (
                                    <ul className="members-list">
                                        {members.map(m => <MemberRow key={m.id} m={m} />)}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}

                    {tab === "roles" && (
                        <>
                            <div className={`card ${!canEdit ? "read-only" : ""}`}>
                                <h2 className="card-title">Create role</h2>
                                <label>Role name</label>
                                <input value={state.newRole.name} onChange={(e) => dispatch({ type: "SET_NEW_ROLE", payload: { name: e.target.value } })} placeholder="Manager" />

                                <label>Level (0 = base, higher = more authority)</label>
                                <input type="number" value={state.newRole.level} onChange={(e) => dispatch({ type: "SET_NEW_ROLE", payload: { level: Number(e.target.value) } })} min="0" />

                                <label>Capacity (optional)</label>
                                <input type="number" value={state.newRole.capacity ?? ""} onChange={(e) => dispatch({ type: "SET_NEW_ROLE", payload: { capacity: e.target.value === "" ? null : Number(e.target.value) } })} placeholder="e.g. 10" />

                                <p className="muted small">Max level allowed for this business: {(form?.settings?.maxRoleLevel) ?? 10}</p>
                                <div className="mt">
                                    <button onClick={handleCreateRole} className="btn primary" disabled={saving || !canEdit}>{saving ? "Working…" : "Create Role"}</button>
                                </div>
                            </div>

                            <div className="card">
                                <h2 className="card-title">Existing Roles</h2>
                                {roles.length === 0 ? <p className="muted">No roles yet.</p> : (
                                    <ul className="roles-list">
                                        {roles.map(r => <RoleRow key={r.id} r={r} onEdit={startEditRole} onDelete={handleDeleteRole} canEdit={canEdit} />)}
                                    </ul>
                                )}
                            </div>

                            {state.editingRole.id && canEdit && (
                                <div className="card">
                                    <h2 className="card-title">Edit role</h2>

                                    <div className="edit-grid">
                                        <div className="field">
                                            <label>Role name</label>
                                            <input value={state.editingRole.name} onChange={(e) => dispatch({ type: "SET_EDIT_ROLE", payload: { name: e.target.value } })} placeholder="Role name" />
                                        </div>

                                        <div className="field">
                                            <label>Level</label>
                                            <input type="number" value={state.editingRole.level} onChange={(e) => dispatch({ type: "SET_EDIT_ROLE", payload: { level: Number(e.target.value) } })} min="0" className="small-input" placeholder="Level" />
                                        </div>

                                        <div className="field">
                                            <label>Capacity (optional)</label>
                                            <input type="number" value={state.editingRole.capacity ?? ""} onChange={(e) => dispatch({ type: "SET_EDIT_ROLE", payload: { capacity: e.target.value === "" ? null : Number(e.target.value) } })} className="small-input" placeholder="Capacity" />
                                        </div>
                                    </div>

                                    <div className="role-edit-actions">
                                        <button onClick={handleUpdateRole} className="btn primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                                        <button onClick={() => dispatch({ type: "RESET_EDIT_ROLE" })} className="btn ghost" aria-label="Cancel editing role">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {tab === "settings" && (
                        <div className={`card ${!canEdit ? "read-only" : ""}`}>
                            <h2 className="card-title">Business settings</h2>

                            <label>Max team members (example setting)</label>
                            <input placeholder="e.g., 50" onBlur={(e) => handleSaveSettings({ maxMembers: Number(e.target.value) || null })} />
                            <p className="muted small">Other global settings for the business can be added here.</p>
                        </div>
                    )}

                    {error && <div className="bc-error" role="alert">{error}</div>}
                    {success && <div className="bc-success">{success}</div>}
                </section>

                <aside className="bc-preview">
                    <div className="preview-card">
                        <div className="preview-header">
                            <div className="logo">
                                {form.logoUrl ? <img src={form.logoUrl} alt="logo" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ""; }} /> : <div className="logo-pill">{logoPlaceholder(form.businessName)}</div>}
                            </div>
                            <div className="title">
                                <h3>{form.businessName || "Your Business Name"}</h3>
                                <p className="muted">{form.tagline}</p>
                            </div>
                        </div>

                        <div className="preview-body">
                            <p className="muted">{form.industry || "Industry"}</p>
                            <p className="desc">{form.description || "Short description shows here."}</p>

                            <div className="meta">
                                <div><strong>Contact:</strong> {form.contactEmail || "—"}</div>
                                <div><strong>Location:</strong> {form.location || "—"}</div>
                                <div><strong>Website:</strong> {form.website ? <a href={form.website} target="_blank" rel="noreferrer">{form.website}</a> : "—"}</div>
                            </div>

                            <div className="preview-actions">
                                <button className="btn small">View as guest</button>
                                <button className="btn small ghost">Share</button>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </main>
    );
}
