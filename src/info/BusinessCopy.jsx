// src/pages/BusinessInfo.jsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
    doc,
    setDoc,
    serverTimestamp,
    collection,
    query,
    orderBy,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/useAuth";
import {
    createBusiness,
    getBusinessMembers,
    addMemberToBusiness,
    createRole,
    inviteMember,
    updateBusinessSettings,
    deleteRole,
    updateRole,
    searchUsersByEmail,
} from "../services/account";
import "../scss/business-info.scss";
import BusinessSkeleton from "../components/loaders/BusinessSkeleton";
import useDebounce from "../hooks/useDebounce";
import useRealtimeCollection from "../hooks/useRealtimeCollection";

/* -------------------------------------------------------------------------- */
/* Memoized row components (prevents unnecessary re-renders on list updates)   */
/* -------------------------------------------------------------------------- */
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
                <button
                    className="btn small ghost"
                    disabled={!canEdit}
                    onClick={() => onEdit(r)}
                >
                    Edit
                </button>
                <button
                    className="btn small"
                    disabled={!canEdit}
                    onClick={() => onDelete(r.id)}
                >
                    Delete
                </button>
            </div>
        </li>
    );
});

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
export default function BusinessInfo({ simulateLoading = false }) {
    const { currentUser, refreshProfile } = useAuth();
    const uid = currentUser?.uid ?? currentUser?.profile?.uid ?? null;
    const mountedRef = useRef(true);
    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Basic UI state
    const [businessId, setBusinessId] = useState(null);
    const [usingTopLevelBusiness, setUsingTopLevelBusiness] = useState(false);
    const [tab, setTab] = useState("profile");
    const [form, setForm] = useState({
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
    });

    // roles/rawMembers are provided by realtime hook (no manual onSnapshot)
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("");
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleLevel, setNewRoleLevel] = useState(1);
    const [newRoleCapacity, setNewRoleCapacity] = useState(null);

    const [loading, setLoading] = useState(Boolean(simulateLoading));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [profileExists, setProfileExists] = useState(false);
    const [searchResults, setSearchResults] = useState([]);

    // editing existing role
    const [editingRoleId, setEditingRoleId] = useState(null);
    const [editRoleName, setEditRoleName] = useState("");
    const [editRoleLevel, setEditRoleLevel] = useState(0);
    const [editRoleCapacity, setEditRoleCapacity] = useState(null);

    /* ---------------------------------------------------------------------- */
    /* derive business affiliation from auth profile                          */
    /* ---------------------------------------------------------------------- */
    useEffect(() => {
        if (!currentUser?.profile) return;
        const aff = currentUser.profile.businessAffiliations;
        if (Array.isArray(aff) && aff.length > 0 && aff[0].businessId) {
            setBusinessId(aff[0].businessId);
            setUsingTopLevelBusiness(true);
        } else {
            setBusinessId(null);
            setUsingTopLevelBusiness(false);
        }
    }, [currentUser]);

    /* ---------------------------------------------------------------------- */
    /* simulate loading demo                                                  */
    /* ---------------------------------------------------------------------- */
    useEffect(() => {
        if (!simulateLoading) return;
        const t = setTimeout(() => setLoading(false), 5000);
        return () => clearTimeout(t);
    }, [simulateLoading]);

    /* ---------------------------------------------------------------------- */
    /* subscribe to the top-level business doc (profileExists/form updates)   */
    /* ---------------------------------------------------------------------- */
    useEffect(() => {
        if (!uid) return;
        if (!usingTopLevelBusiness || !businessId) {
            setProfileExists(false);
            return;
        }

        const ref = doc(db, "businesses", businessId);
        let unsub = null;

        try {
            // dynamic require to avoid duplicate top-level imports (keeps your original pattern)
            const { onSnapshot } = require("firebase/firestore");
            unsub = onSnapshot(
                ref,
                (snap) => {
                    if (snap.exists()) {
                        const d = snap.data();
                        setForm((prev) => ({
                            ...prev,
                            businessName: d.name ?? prev.businessName,
                            tagline: d.tagline ?? prev.tagline,
                            industry: d.industry ?? prev.industry,
                            description: d.description ?? prev.description,
                            contactName: d.contactName ?? prev.contactName,
                            contactEmail: d.contactEmail ?? prev.contactEmail,
                            contactPhone: d.contactPhone ?? prev.contactPhone,
                            website: d.website ?? prev.website,
                            location: d.location ?? prev.location,
                            logoUrl: d.logoUrl ?? prev.logoUrl,
                            published:
                                typeof d.published === "boolean" ? d.published : prev.published,
                            settings: d.settings ?? prev.settings ?? {},
                        }));
                        setProfileExists(true);
                    } else {
                        setProfileExists(false);
                    }
                },
                (err) => {
                    console.error("business doc snapshot error:", err);
                    setError("Failed to load business profile.");
                }
            );
        } catch (err) {
            console.error("failed to attach snapshot:", err);
        }

        return () => {
            try {
                if (unsub) unsub();
            } catch (e) {
                /* noop */
            }
        };
    }, [uid, usingTopLevelBusiness, businessId]);

    /* ---------------------------------------------------------------------- */
    /* Realtime queries for roles & members (use hook)                        */
    /* ---------------------------------------------------------------------- */
    const rolesQuery = useMemo(
        () =>
            businessId
                ? query(collection(db, "businesses", businessId, "roles"), orderBy("level", "desc"))
                : null,
        [businessId]
    );

    const membersQuery = useMemo(
        () =>
            businessId
                ? query(collection(db, "businesses", businessId, "members"), orderBy("joinedAt", "asc"))
                : null,
        [businessId]
    );

    const roles = useRealtimeCollection(rolesQuery, [businessId]);
    const rawMembers = useRealtimeCollection(membersQuery, [businessId]);

    /* ---------------------------------------------------------------------- */
    /* derive members (add roleName) using useMemo (no setState)              */
    /* ---------------------------------------------------------------------- */
    const members = useMemo(() => {
        if (!rawMembers || rawMembers.length === 0) return [];
        const r = roles || [];
        const roleById = {};
        r.forEach((rr) => {
            if (rr && rr.id) roleById[rr.id] = rr.name;
        });

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
        if (!currentUser?.profile) return false;
        if (!profileExists) return true;
        if (!businessId) return false;

        const aff = Array.isArray(currentUser.profile.businessAffiliations)
            ? currentUser.profile.businessAffiliations.find((a) => a.businessId === businessId)
            : null;
        if (!aff) return false;
        const affRoleId = aff.roleId;
        if (affRoleId === "owner") return true;
        const matchedRole = (roles || []).find((r) => r.id === affRoleId);
        if (matchedRole && String(matchedRole.name || "").toLowerCase() === "owner") return true;
        return false;
    }, [currentUser?.profile, businessId, roles, profileExists]);

    /* ---------------------------------------------------------------------- */
    /* invite role default                                                     */
    /* ---------------------------------------------------------------------- */
    useEffect(() => {
        if (Array.isArray(roles) && roles.length > 0 && !inviteRole) {
            setInviteRole(roles[0].id);
        }
    }, [roles, inviteRole]);

    /* ---------------------------------------------------------------------- */
    /* Helpers                                                                */
    /* ---------------------------------------------------------------------- */
    const updateField = useCallback((k, v) => {
        setForm((prev) => ({ ...prev, [k]: v }));
    }, []);

    const validateProfile = useCallback(() => {
        return (form.businessName || "").trim().length >= 2;
    }, [form.businessName]);

    /* ---------------------------------------------------------------------- */
    /* Save profile (memoized)                                                */
    /* ---------------------------------------------------------------------- */
    const handleSaveProfile = useCallback(
        async (publish = false) => {
            if (!uid) {
                setError("Not authenticated");
                return;
            }
            if (!canEdit) {
                setError("You are not allowed to edit this company.");
                setTimeout(() => setError(""), 2500);
                return;
            }

            if (!validateProfile()) {
                setError("Business name required");
                setTimeout(() => setError(""), 2500);
                return;
            }

            setError("");
            setSuccess("");
            setSaving(true);

            try {
                const payload = {
                    name: form.businessName,
                    tagline: form.tagline || undefined,
                    industry: form.industry || undefined,
                    description: form.description || undefined,
                    contactName: form.contactName || undefined,
                    contactEmail: form.contactEmail || undefined,
                    contactPhone: form.contactPhone || undefined,
                    website: form.website || undefined,
                    location: form.location || undefined,
                    logoUrl: form.logoUrl || undefined,
                    published: Boolean(publish),
                    updatedAt: serverTimestamp(),
                };

                if (!profileExists) payload.createdAt = serverTimestamp();
                const cleanedPayload = Object.fromEntries(
                    Object.entries(payload).filter(([_, v]) => v !== undefined)
                );

                if (usingTopLevelBusiness && businessId) {
                    await setDoc(doc(db, "businesses", businessId), cleanedPayload, { merge: true });
                } else {
                    const res = await createBusiness({
                        ownerUid: uid,
                        businessName: form.businessName,
                        payload: cleanedPayload,
                    });
                    if (!res?.businessId) throw new Error("Failed to create business");
                    setBusinessId(res.businessId);
                    setUsingTopLevelBusiness(true);
                    await setDoc(doc(db, "businesses", res.businessId), cleanedPayload, { merge: true });
                }

                await setDoc(doc(db, "account", uid), { updatedAt: serverTimestamp() }, { merge: true });

                if (typeof refreshProfile === "function") {
                    try {
                        await refreshProfile();
                    } catch (e) {
                        /* ignore */
                    }
                }

                setSuccess(publish ? "Published" : "Saved");
                setTimeout(() => setSuccess(""), 2000);
            } catch (err) {
                console.error("save profile err", err);
                setError(err?.message || "Unable to save");
            } finally {
                if (mountedRef.current) setSaving(false);
            }
        },
        [
            uid,
            canEdit,
            validateProfile,
            form,
            profileExists,
            usingTopLevelBusiness,
            businessId,
            refreshProfile,
        ]
    );

    /* ---------------------------------------------------------------------- */
    /* Invite flow (memoized)                                                  */
    /* ---------------------------------------------------------------------- */
    const handleInvite = useCallback(async () => {
        setError("");
        setSuccess("");
        if (!inviteEmail || !businessId) {
            setError("Email & business required");
            return;
        }
        try {
            await inviteMember({
                businessId,
                email: inviteEmail.trim(),
                invitedByUid: uid,
                roleId: inviteRole,
            });
            setInviteEmail("");
            setSearchResults([]);
            setSuccess("Invite created (not emailed).");
            setTimeout(() => setSuccess(""), 2500);
        } catch (err) {
            console.error("invite err", err);
            setError(err?.message || "Failed to create invite");
        }
    }, [inviteEmail, inviteRole, businessId, uid]);

    /* ---------------------------------------------------------------------- */
    /* Role create/update/delete (memoized)                                    */
    /* Note: roles update via realtime subscription; we don't manually setRoles */
    /* ---------------------------------------------------------------------- */
    const handleCreateRole = useCallback(async () => {
        setError("");
        setSuccess("");
        if (!newRoleName || !businessId) {
            setError("Role name & business required");
            return;
        }

        const maxAllowed = form?.settings?.maxRoleLevel ?? 10;
        const level = Number.isFinite(Number(newRoleLevel)) ? Number(newRoleLevel) : 0;
        const capacity = newRoleCapacity === "" ? null : (newRoleCapacity === null ? null : Number(newRoleCapacity));

        if (!Number.isInteger(level) || level < 0) {
            setError("Level must be a non-negative integer");
            return;
        }
        if (level > maxAllowed) {
            setError(`Level cannot be higher than ${maxAllowed}`);
            return;
        }

        setSaving(true);
        try {
            await createRole(businessId, { name: newRoleName.trim(), level, capacity, permissions: {} });
            setNewRoleName("");
            setNewRoleLevel(1);
            setNewRoleCapacity(null);
            setSuccess("Role created");
            setTimeout(() => setSuccess(""), 2000);
        } catch (err) {
            console.error("create role err", err);
            setError(err?.message || "Failed to create role");
        } finally {
            if (mountedRef.current) setSaving(false);
        }
    }, [newRoleName, newRoleLevel, newRoleCapacity, businessId, form?.settings]);

    const startEditRole = useCallback((role) => {
        setEditingRoleId(role.id);
        setEditRoleName(role.name || "");
        setEditRoleLevel(Number(role.level || 0));
        setEditRoleCapacity(role.capacity === undefined ? null : role.capacity);
    }, []);

    const handleUpdateRole = useCallback(async () => {
        setError("");
        setSuccess("");
        if (!editingRoleId || !businessId) {
            setError("No role selected");
            return;
        }
        const maxAllowed = form?.settings?.maxRoleLevel ?? 10;
        const level = Number.isFinite(Number(editRoleLevel)) ? Number(editRoleLevel) : 0;
        const capacity = editRoleCapacity === "" ? null : (editRoleCapacity === null ? null : Number(editRoleCapacity));
        if (!Number.isInteger(level) || level < 0) {
            setError("Level must be a non-negative integer");
            return;
        }
        if (level > maxAllowed) {
            setError(`Level cannot be higher than ${maxAllowed}`);
            return;
        }

        setSaving(true);
        try {
            await updateRole(businessId, editingRoleId, {
                name: editRoleName.trim(),
                level,
                capacity,
            });
            setEditingRoleId(null);
            setEditRoleName("");
            setEditRoleLevel(0);
            setEditRoleCapacity(null);
            setSuccess("Role updated");
            setTimeout(() => setSuccess(""), 2000);
        } catch (err) {
            console.error("update role err", err);
            setError(err?.message || "Failed to update role");
        } finally {
            if (mountedRef.current) setSaving(false);
        }
    }, [editingRoleId, editRoleName, editRoleLevel, editRoleCapacity, businessId, form?.settings]);

    const handleDeleteRole = useCallback(
        async (roleId) => {
            if (!businessId || !roleId) return;
            if (!confirm("Delete this role? This will not remove existing members automatically.")) return;
            setSaving(true);
            try {
                await deleteRole(businessId, roleId);
                setSuccess("Role deleted");
                setTimeout(() => setSuccess(""), 2000);
            } catch (err) {
                console.error("delete role err", err);
                setError(err?.message || "Failed to delete role");
            } finally {
                if (mountedRef.current) setSaving(false);
            }
        },
        [businessId]
    );

    /* ---------------------------------------------------------------------- */
    /* Debounced search for invites (useDebounce)                              */
    /* ---------------------------------------------------------------------- */
    const debouncedInviteEmail = useDebounce(inviteEmail, 400);

    const handleEmailChange = useCallback((e) => {
        setInviteEmail(e.target.value);
    }, []);

    useEffect(() => {
        if (!debouncedInviteEmail || debouncedInviteEmail.trim().length < 3) {
            setSearchResults([]);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const results = await searchUsersByEmail(debouncedInviteEmail.trim());
                if (!cancelled) setSearchResults(results);
            } catch (err) {
                console.error("Search error:", err);
                if (!cancelled) setSearchResults([]);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [debouncedInviteEmail]);

    const handleSelectEmail = useCallback((email) => {
        setInviteEmail(email);
        setSearchResults([]);
    }, []);

    /* ---------------------------------------------------------------------- */
    /* Settings                                                               */
    /* ---------------------------------------------------------------------- */
    const handleSaveSettings = useCallback(
        async (settings = {}) => {
            if (!businessId) {
                setError("No business");
                return;
            }
            try {
                await updateBusinessSettings(businessId, settings);
                setSuccess("Settings updated");
                setTimeout(() => setSuccess(""), 2000);
            } catch (err) {
                console.error("update settings err", err);
                setError(err?.message || "Failed to update settings");
            }
        },
        [businessId]
    );

    const logoPlaceholder = useCallback((name) => {
        if (!name) return "BK";
        const words = name.split(" ").filter(Boolean);
        if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
        return (words[0][0] + words[1][0]).toUpperCase();
    }, []);

    if (loading) return <BusinessSkeleton />;

    /* ---------------------------------------------------------------------- */
    /* Render                                                                 */
    /* ---------------------------------------------------------------------- */
    return (
        <main className="business-create-page">
            <header className="bc-header">
                <div>
                    <h1>Business Setup</h1>
                    <p className="muted">Create and manage your business: profile, members, roles and settings.</p>
                </div>

                <nav className="bc-tabs" role="tablist" aria-label="Business tabs">
                    <button className={`tab ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}>Profile</button>
                    <button className={`tab ${tab === "members" ? "active" : ""}`} onClick={() => setTab("members")}>Members</button>
                    <button className={`tab ${tab === "roles" ? "active" : ""}`} onClick={() => setTab("roles")}>Roles</button>
                    <button className={`tab ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>Settings</button>
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
                                <input
                                    value={form.businessName}
                                    onChange={(e) => updateField("businessName", e.target.value)}
                                    placeholder="Acme Co."
                                    disabled={!canEdit}
                                />

                                <label>Tagline</label>
                                <input
                                    value={form.tagline}
                                    onChange={(e) => updateField("tagline", e.target.value)}
                                    placeholder="We build delightful products"
                                    disabled={!canEdit}
                                />

                                <label>Industry</label>
                                <input
                                    value={form.industry}
                                    onChange={(e) => updateField("industry", e.target.value)}
                                    placeholder="Software / Retail"
                                    disabled={!canEdit}
                                />

                                <label>Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => updateField("description", e.target.value)}
                                    placeholder="Short description"
                                    disabled={!canEdit}
                                />

                                <hr style={{ margin: "12px 0" }} />

                                <h3 className="card-subtitle">Contact company</h3>

                                <label>Company contact name</label>
                                <input
                                    value={form.contactName}
                                    onChange={(e) => updateField("contactName", e.target.value)}
                                    placeholder="Jane Doe"
                                    disabled={!canEdit}
                                />

                                <label>Company contact email</label>
                                <input
                                    value={form.contactEmail}
                                    onChange={(e) => updateField("contactEmail", e.target.value)}
                                    placeholder="contact@acme.com"
                                    disabled={!canEdit}
                                />

                                <label>Company contact phone</label>
                                <input
                                    value={form.contactPhone}
                                    onChange={(e) => updateField("contactPhone", e.target.value)}
                                    placeholder="+1 (555) 555-5555"
                                    disabled={!canEdit}
                                />

                                <label>Company Website</label>
                                <input
                                    value={form.website}
                                    onChange={(e) => updateField("website", e.target.value)}
                                    placeholder="https://example.com"
                                    disabled={!canEdit}
                                />

                                <label>Company Location</label>
                                <input
                                    value={form.location}
                                    onChange={(e) => updateField("location", e.target.value)}
                                    placeholder="City, Country"
                                    disabled={!canEdit}
                                />

                                <label>Logo image URL</label>
                                <input
                                    value={form.logoUrl}
                                    onChange={(e) => updateField("logoUrl", e.target.value)}
                                    placeholder="https://example.com/logo.png"
                                    disabled={!canEdit}
                                />
                            </div>

                            <div className="bc-actions">
                                {canEdit ? (
                                    <div>
                                        <button onClick={() => handleSaveProfile(false)} className="btn ghost" disabled={saving}>
                                            {saving ? "Saving…" : "Save"}
                                        </button>
                                        <button onClick={() => handleSaveProfile(true)} className="btn primary" disabled={saving}>
                                            {saving ? "Publishing…" : "Publish"}
                                        </button>
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
                                    <input value={inviteEmail} onChange={handleEmailChange} placeholder="teammate@email.com" />
                                    {searchResults.length > 0 && (
                                        <ul style={{ position: "absolute", zIndex: 1, background: "white", border: "1px solid #ccc", listStyle: "none", padding: 0, margin: 0, width: "100%" }}>
                                            {searchResults.map((result) => (
                                                <li
                                                    key={result.email}
                                                    style={{ padding: "8px", cursor: "pointer", color: "#000" }}
                                                    onClick={() => handleSelectEmail(result.email)}
                                                >
                                                    {result.name} ({result.email})
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <label>Role</label>
                                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
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
                                    <button
                                        onClick={handleInvite}
                                        className="btn primary cursor-pointer bg-gray-700 p-2 rounded-xl"
                                        disabled={!canEdit}
                                        title={!canEdit ? "You don't have permission to invite members" : "Create Invite"}
                                    >
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
                                <input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Manager" />

                                <label>Level (0 = base, higher = more authority)</label>
                                <input type="number" value={newRoleLevel} onChange={(e) => setNewRoleLevel(Number(e.target.value))} min="0" />

                                <label>Capacity (optional)</label>
                                <input type="number" value={newRoleCapacity ?? ""} onChange={(e) => setNewRoleCapacity(e.target.value === "" ? null : Number(e.target.value))} placeholder="e.g. 10" />

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

                            {editingRoleId && canEdit && (
                                <div className="card">
                                    <h2 className="card-title">Edit role</h2>

                                    <div className="edit-grid">
                                        <div className="field">
                                            <label>Role name</label>
                                            <input value={editRoleName} onChange={(e) => setEditRoleName(e.target.value)} placeholder="Role name" />
                                        </div>

                                        <div className="field">
                                            <label>Level</label>
                                            <input
                                                type="number"
                                                value={editRoleLevel}
                                                onChange={(e) => setEditRoleLevel(Number(e.target.value))}
                                                min="0"
                                                className="small-input"
                                                placeholder="Level"
                                            />
                                        </div>

                                        <div className="field">
                                            <label>Capacity (optional)</label>
                                            <input
                                                type="number"
                                                value={editRoleCapacity ?? ""}
                                                onChange={(e) => setEditRoleCapacity(e.target.value === "" ? null : Number(e.target.value))}
                                                className="small-input"
                                                placeholder="Capacity"
                                            />
                                        </div>
                                    </div>

                                    <div className="role-edit-actions">
                                        <button onClick={handleUpdateRole} className="btn primary" disabled={saving}>
                                            {saving ? "Saving…" : "Save"}
                                        </button>

                                        <button onClick={() => setEditingRoleId(null)} className="btn ghost" aria-label="Cancel editing role">
                                            Cancel
                                        </button>
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
                                {form.logoUrl ? (
                                    <img
                                        src={form.logoUrl}
                                        alt="logo"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = "";
                                        }}
                                    />
                                ) : (
                                    <div className="logo-pill">{logoPlaceholder(form.businessName)}</div>
                                )}
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
