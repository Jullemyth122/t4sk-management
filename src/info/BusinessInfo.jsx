// src/pages/BusinessInfo.jsx
import React, { useEffect, useRef, useMemo, useCallback, useReducer, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    doc,
    setDoc,
    serverTimestamp,
    collection,
    query,
    orderBy,
    onSnapshot,
    collectionGroup,
    where,
    getDocs,
} from "firebase/firestore";
import { ref, onValue } from "firebase/database"; // RTDB
import { db, dbRealtime } from "../config/firebase";
import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/ThemeContext";
import {
    createBusiness, deleteBusiness, leaveBusiness, searchUsersByEmail, updateMemberRole,
    inviteMember, deleteRole, updateRole, createRole, updateBusinessSettings, updateMemberStatus
} from "../services/accountService";

import "../scss/business-info.scss";
import BusinessSkeleton from "../components/loaders/BusinessSkeleton";
import useDebounce from "../hooks/useDebounce";
import useRealtimeCollection from "../hooks/useRealtimeCollection";
import { PERMISSIONS } from "../config/permissions";
import useHasPerm from "../hooks/useHasPerm";
import CustomSelect from "../dashboard/Bcomponent/CustomSelect";
import AIUsageGraph from "./AIUsageGraph";
import AIInsightsView from "./AIInsightsView";
import OnlineMembersDropdown from "./OnlineMembersDropdown";

// --- Icons ---
const IconSearch = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
const IconDownload = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
const IconFilter = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>;
const IconTrash = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
const IconEdit = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;


/* ----------------------------- memoized rows ------------------------------ */
const MemberRow = React.memo(function MemberRow({ m, stats, onRemove, onUpdateRole, onToggleStatus, canRemove, canUpdateRole, isSelf, isOwner, roles, isOnline }) {
    const showRemove = canRemove && !isSelf && !isOwner;
    const showUpdate = canUpdateRole && !isSelf && !isOwner;

    return (
        <tr className="member-row">
            <td>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong>{m.name || "Unknown"}</strong>
                        {isOnline && (
                            <span className="online-indicator" title="Online now">
                                <span className="pulse"></span>
                                <span className="dot"></span>
                                <span className="text">Online</span>
                            </span>
                        )}
                    </div>
                </div>
            </td>
            <td>
                <span className="muted">{m.email || m.uid}</span>
            </td>
            <td>
                {showUpdate ? (
                    <div style={{ width: 180 }}>
                        <CustomSelect
                            options={useMemo(() => roles.map(r => ({ value: r.id, label: r.name, subtitle: `Level ${r.level ?? 0}` })), [roles])}
                            value={m.roleId}
                            onChange={(val) => onUpdateRole(m.uid, val)}
                            placeholder="Select role"
                            searchable={false}
                            ariaLabel="Change role"
                        />
                    </div>
                ) : (
                        <span className="chip">{m.roleName}</span>
                )}
            </td>
            <td style={{ textAlign: "center" }}>
                <button
                    className={`btn small ${m.status === 'inactive' ? 'ghost' : 'primary'}`}
                    style={{ fontSize: 11, padding: "4px 8px", height: "auto", minHeight: 0, opacity: m.status === 'inactive' ? 0.6 : 1 }}
                    onClick={() => canUpdateRole ? (onToggleStatus && onToggleStatus(m.uid, m.status || 'active')) : null}
                    disabled={!canUpdateRole}
                    title={canUpdateRole ? "Click to toggle status" : "Status"}
                >
                    {m.status === 'inactive' ? "Inactive" : "Active"}
                </button>
            </td>
            <td style={{ textAlign: "center" }}>
                <span className="chip" style={{ background: "rgba(255,255,255,0.1)" }}>{stats || 0}</span>
            </td>
            <td style={{ textAlign: "right" }}>
                {showRemove && (
                    <button
                        className="btn small danger ghost icon-btn"
                        onClick={() => onRemove(m.uid)}
                        title="Remove member"
                    >
                        <IconTrash />
                    </button>
                )}
            </td>
        </tr>
    );
});

const RoleRow = React.memo(function RoleRow({ r, onEdit, onDelete, canEdit }) {
    return (
        <div className="card" style={{ marginBottom: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <strong style={{ fontSize: 16, display: 'block' }}>{r.name}</strong>
                    <span className="muted small">Level {r.level ?? 0} • {r.capacity ? `Max ${r.capacity} users` : "Unlimited"}</span>
                </div>
                <div className="role-actions">
                    <button className="btn small ghost icon-btn" disabled={!canEdit} onClick={() => onEdit(r)} title="Edit Role">
                        <IconEdit />
                    </button>
                    <button className="btn small danger ghost icon-btn" disabled={!canEdit} onClick={() => onDelete(r.id)} title="Delete Role">
                        <IconTrash />
                    </button>
                </div>
            </div>
        </div>
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
    editingRole: { id: null, name: "", level: 0, capacity: null, permissions: {} },

    // owner check
    ownerUid: null,
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
// --- Theme Toggle Icons ---
const IconSun = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>;
const IconMoon = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>;

export default function BusinessInfo({ simulateLoading = false }) {
    const { currentUser, refreshProfile } = useAuth();
    const uid = currentUser?.uid ?? currentUser?.profile?.uid ?? null;
    const mountedRef = useRef(true);
    useEffect(() => () => { mountedRef.current = false; }, []);

    const navigate = useNavigate();

    const [state, dispatch] = useReducer(reducer, { ...initialState, loading: Boolean(simulateLoading) });

    // --- Theme Toggle (Refactored to use Context) ---
    const { theme, toggleTheme } = useTheme();

    // --- Local State for UI Enhancements (Search/Filter) ---
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [taskCounts, setTaskCounts] = useState({});
    const [presenceData, setPresenceData] = useState({});

    // --- Realtime Presence Listener ---
    useEffect(() => {
        if (!dbRealtime) return;
        const statusRef = ref(dbRealtime, 'status');
        const unsub = onValue(statusRef, (snapshot) => {
            const data = snapshot.val() || {};
            setPresenceData(data);
        });
        return () => unsub();
    }, []);

    /* ---------------------------------------------------------------------- */
    /* Workload Analytics (Task Counts)                                       */
    /* ---------------------------------------------------------------------- */
    useEffect(() => {
        if (!state.businessId) return;
        let cancelled = false;

        const loadTaskCounts = async () => {
            try {
                // Query all active cards for this business
                const q = query(
                    collectionGroup(db, 'cards'),
                    where('businessId', '==', state.businessId)
                );
                const snaps = await getDocs(q);

                const counts = {};
                snaps.forEach(doc => {
                    const data = doc.data();
                    if (data.status !== 'done' && data.assignees && Array.isArray(data.assignees)) {
                        data.assignees.forEach(uid => {
                            counts[uid] = (counts[uid] || 0) + 1;
                        });
                    }
                });

                if (!cancelled && mountedRef.current) {
                    setTaskCounts(counts);
                }
            } catch (err) {
                console.warn("Failed to load task analytics", err);
            }
        };

        // 3. Legacy Task Counts (Disabled to prevent Index Error)
        // loadTaskCounts();

        // Refresh every 30s or on businessId change
        const interval = setInterval(loadTaskCounts, 30000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [state.businessId]);

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
        const t = setTimeout(() => { if (mountedRef.current) dispatch({ type: "SET", payload: { loading: false } }); }, 2000);
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
                            updatedAt: d.updatedAt ? d.updatedAt.toMillis() : null,
                            logoUrl: d.logoUrl ?? state.form.logoUrl,
                            published: typeof d.published === "boolean" ? d.published : state.form.published,
                            settings: d.settings ?? state.form.settings ?? {},
                        },
                        profileExists: true,
                        ownerUid: d.ownerUid || null, 
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

    // RBAC Hooks
    const { can } = useHasPerm(roles, state.businessId);

    const canViewRoles = can('roles.read');
    const canManageRoles = can('roles.manage');
    const canViewSettings = can('settings.view');
    const canInvite = can('members.invite');
    const canUpdateProfile = can('business.update');


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

    const filteredMembers = useMemo(() => {
        let res = members;
        const term = searchTerm.toLowerCase();

        // Search
        if (term) {
            res = res.filter(m =>
                (m.name?.toLowerCase().includes(term)) ||
                (m.email?.toLowerCase().includes(term))
            );
        }

        // Filter By Role
        if (roleFilter !== "all") {
            res = res.filter(m => m.roleId === roleFilter);
        }

        return res;
    }, [members, searchTerm, roleFilter]);


    /* ---------------------------------------------------------------------- */
    /* Export Function                                                        */
    /* ---------------------------------------------------------------------- */
    const handleExportCSV = useCallback(() => {
        if (members.length === 0) return;
        const headers = "Name,Email,Role,RoleLevel,JoinedAt\n";
        const rows = members.map(m => {
            const role = roles.find(r => r.id === m.roleId);
            return `"${m.name || ""}","${m.email || ""}","${role?.name || m.roleId}","${role?.level || 0}","${m.joinedAt?.toDate ? m.joinedAt.toDate().toISOString() : ''}"`;
        }).join("\n");

        const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `members_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [members, roles]);


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
        if (aff.roleId === "owner") return true;

        return can('business.update');
    }, [currentUser?.profile, state.profileExists, state.businessId, can]);

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
        if (!canEdit) { dispatch({ type: "SET", payload: { error: "Permission denied." } }); return; }
        if (!validateProfile()) { dispatch({ type: "SET", payload: { error: "Business name required" } }); return; }

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
            dispatch({ type: "SET", payload: { success: "Invite created." } });
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
        if (!state.newRole.name || !state.businessId) { dispatch({ type: "SET", payload: { error: "Role name required" } }); return; }

        const maxAllowed = (state.form?.settings?.maxRoleLevel) ?? 10;
        const level = Number.isFinite(Number(state.newRole.level)) ? Number(state.newRole.level) : 0;
        const capacity = state.newRole.capacity === "" ? null : (state.newRole.capacity === null ? null : Number(state.newRole.capacity));

        if (level > maxAllowed) { dispatch({ type: "SET", payload: { error: `Level capped at ${maxAllowed}` } }); return; }

        if (mountedRef.current) dispatch({ type: "SET", payload: { saving: true } });
        try {
            await createRole(state.businessId, { name: state.newRole.name.trim(), level, capacity, permissions: {} });
            if (!mountedRef.current) return;
            dispatch({ type: "RESET_NEW_ROLE" });
            dispatch({ type: "SET", payload: { success: "Role created" } });
            setTimeout(() => { if (mountedRef.current) dispatch({ type: "SET", payload: { success: "" } }); }, 2000);
        } catch (err) {
            if (mountedRef.current) dispatch({ type: "SET", payload: { error: err?.message || "Failed to create role" } });
        } finally {
            if (mountedRef.current) dispatch({ type: "SET", payload: { saving: false } });
        }
    }, [state.newRole, state.businessId, state.form?.settings]);



    const handleToggleStatus = useCallback(async (uid, currentStatus) => {
        if (!state.businessId || !uid) return;
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            await updateMemberStatus({ businessId: state.businessId, uid, status: newStatus });
            // Optimistic update handled by realtime listener usually, but we could force a refresh or wait
        } catch (err) {
            console.error("Failed to toggle status", err);
            dispatch({ type: "SET", payload: { error: "Failed to update status" } });
        }
    }, [state.businessId]);

    const startEditRole = useCallback((role) => {
        dispatch({
            type: "SET_EDIT_ROLE",
            payload: {
                id: role.id,
                name: role.name || "",
                level: Number(role.level || 0),
                capacity: role.capacity === undefined ? null : role.capacity,
                permissions: role.permissions || {}
            }
        });
    }, []);

    const handleUpdateRole = useCallback(async () => {
        dispatch({ type: "CLEAR_MESSAGES" });
        const { editingRole } = state;
        if (!editingRole.id || !state.businessId) return;

        if (mountedRef.current) dispatch({ type: "SET", payload: { saving: true } });
        try {
            await updateRole(state.businessId, editingRole.id, {
                name: editingRole.name.trim(),
                level: editingRole.level,
                capacity: editingRole.capacity,
                permissions: editingRole.permissions
            });
            if (!mountedRef.current) return;
            dispatch({ type: "RESET_EDIT_ROLE" });
            dispatch({ type: "SET", payload: { success: "Role updated" } });
            setTimeout(() => { if (mountedRef.current) dispatch({ type: "SET", payload: { success: "" } }); }, 2000);
        } catch (err) {
            if (mountedRef.current) dispatch({ type: "SET", payload: { error: err?.message || "Failed to update role" } });
        } finally {
            if (mountedRef.current) dispatch({ type: "SET", payload: { saving: false } });
        }
    }, [state.editingRole, state.businessId]);

    const handleDeleteRole = useCallback(async (roleId) => {
        if (!state.businessId || !roleId) return;
        if (!confirm("Delete this role?")) return;
        try {
            await deleteRole(state.businessId, roleId);
            dispatch({ type: "SET", payload: { success: "Role deleted" } });
        } catch (err) {
            dispatch({ type: "SET", payload: { error: err?.message } });
        }
    }, [state.businessId]);

    /* ---------------------------------------------------------------------- */
    /* Debounced search                                                       */
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

    const handleRemoveMember = useCallback(async (targetUid) => {
        if (!state.businessId || !targetUid) return;
        if (!window.confirm("Remove this member?")) return;
        try {
            await leaveBusiness(state.businessId, targetUid);
            dispatch({ type: "SET", payload: { success: "Member removed." } });
        } catch (err) {
            dispatch({ type: "SET", payload: { error: err.message } });
        }
    }, [state.businessId]);

    const handleUpdateMemberRole = useCallback(async (targetUid, newRoleId) => {
        if (!state.businessId || !targetUid || !newRoleId) return;
        if (!window.confirm("Change member role?")) return;
        try {
            await updateMemberRole({ businessId: state.businessId, uid: targetUid, roleId: newRoleId });
            dispatch({ type: "SET", payload: { success: "Role updated." } });
        } catch (err) {
            dispatch({ type: "SET", payload: { error: err.message } });
        }
    }, [state.businessId]);


    /* ---------------------------------------------------------------------- */
    /* UI helpers                                                             */
    /* ---------------------------------------------------------------------- */
    // Stats calculation
    const stats = useMemo(() => {
        return {
            members: members.length,
            roles: roles.length,
            invites: 0, // Not fetching pending invites count currently, but could be added
        };
    }, [members, roles]);

    /* ---------------------------------------------------------------------- */
    /* Permissions Logic                                                      */
    /* ---------------------------------------------------------------------- */
    const groupedPermissions = useMemo(() => {
        const groups = {};
        PERMISSIONS.forEach(p => {
            const [cat] = p.key.split('.');
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(p);
        });
        return groups;
    }, []);

    const handlePermToggle = useCallback((key) => {
        dispatch({
            type: "SET_EDIT_ROLE",
            payload: {
                permissions: {
                    ...state.editingRole.permissions,
                    [key]: !state.editingRole.permissions[key]
                }
            }
        });
    }, [state.editingRole.permissions]);

    // Owner Check
    const isOwner = useMemo(() => {
        if (!uid) return false;
        if (state.ownerUid && uid === state.ownerUid) return true;
        if (currentUser?.profile?.businessAffiliations) {
            const aff = currentUser.profile.businessAffiliations.find(a => a.businessId === state.businessId);
            if (aff?.roleId === 'owner') return true;
        }
        return false;
    }, [uid, state.ownerUid, currentUser, state.businessId]);

    if (state.loading) return <BusinessSkeleton />;

    const { form, tab, error, success, saving, profileExists } = state;
    const isNewBusinessUser = !profileExists && currentUser?.profile?.accountType === 'business' && !state.businessId;
    const hasAnyAccess = isOwner || canViewRoles || canViewSettings || canUpdateProfile || canInvite || isNewBusinessUser;

    if (!state.loading && profileExists && !hasAnyAccess) {
        return (
            <main className="business-create-page">
                <div className="container" style={{ padding: '50px', textAlign: 'center' }}>
                    <h2>Access Denied</h2>
                    <p className="muted">You do not have permission to view this business profile.</p>
                </div>
            </main>
        );
    }

    return (
        <main className="business-create-page">

            {/* Dashboard Stats */}
            {profileExists && (
                <section className="dashboard-stats">
                    <div className="stat-card">
                        <span className="stat-value">{stats.members}</span>
                        <span className="stat-label">Total Members</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{stats.roles}</span>
                        <span className="stat-label">Active Roles</span>
                    </div>
                    {/* Placeholder for future expansion */}
                    <div className="stat-card">
                        <span className="stat-value">Active</span>
                        <span className="stat-label">Status</span>
                    </div>
                </section>
            )}

            <header className="bc-header">
                <div className="header-top">
                    <div>
                        <h1>Business Settings</h1>
                        <p className="muted">Manage your organization's profile, team, and permissions.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <OnlineMembersDropdown members={members} presenceData={presenceData} />
                        <button
                            className="theme-toggle-btn"
                            onClick={toggleTheme}
                            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <IconSun /> : <IconMoon />}
                        </button>
                    </div>
                </div>

                <nav className="bc-tabs" role="tablist" aria-label="Business tabs">
                    {(canUpdateProfile || isOwner || isNewBusinessUser) && (
                        <button className={`tab ${tab === "profile" ? "active" : ""}`} onClick={() => dispatch({ type: "SET", payload: { tab: "profile" } })}>Profile</button>
                    )}
                    {(canInvite || isOwner) && (
                        <button className={`tab ${tab === "members" ? "active" : ""}`} onClick={() => dispatch({ type: "SET", payload: { tab: "members" } })}>Members</button>
                    )}
                    {(canViewRoles || isOwner) && (
                        <button className={`tab ${tab === "roles" ? "active" : ""}`} onClick={() => dispatch({ type: "SET", payload: { tab: "roles" } })}>Roles</button>
                    )}
                    {(canViewSettings || isOwner) && (
                        <button className={`tab ${tab === "ai" ? "active" : ""}`} onClick={() => dispatch({ type: "SET", payload: { tab: "ai" } })}>AI Insights</button>
                    )}
                </nav>
            </header>

            {(error || success) && (
                <div style={{ marginBottom: 20 }}>
                    {error && <div className="bc-error">{error}</div>}
                    {success && <div className="bc-success">{success}</div>}
                </div>
            )}

            <div className="bc-body">
                <section className="bc-form">

                    {/* --- PROFILE TAB --- */}
                    {tab === "profile" && (canUpdateProfile || isOwner || isNewBusinessUser) && (
                        <>
                            <div className={`card ${!canEdit ? "read-only" : ""}`}>
                                <h2 className="card-title">Company Profile</h2>
                                <label>Business Name</label>
                                <input value={form.businessName} onChange={(e) => updateField("businessName", e.target.value)} placeholder="Acme Inc." disabled={!canEdit} />

                                <label>Tagline</label>
                                <input value={form.tagline} onChange={(e) => updateField("tagline", e.target.value)} placeholder="Building the future" disabled={!canEdit} />

                                <label>Industry</label>
                                <input value={form.industry} onChange={(e) => updateField("industry", e.target.value)} placeholder="Software" disabled={!canEdit} />

                                <label>Description</label>
                                <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="A short description..." disabled={!canEdit} />
                            </div>

                            <div className="card">
                                <h2 className="card-title">Contact</h2>
                                <label>Website</label>
                                <input value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://example.com" disabled={!canEdit} />

                                <label>Location</label>
                                <input value={form.location} onChange={(e) => updateField("location", e.target.value)} placeholder="New York, NY" disabled={!canEdit} />
                            </div>

                            <div className="bc-actions">
                                {canEdit ? (
                                    <>
                                        <button onClick={() => handleSaveProfile(false)} className="btn ghost" disabled={saving}>{saving ? "Saving…" : "Save Draft"}</button>
                                        <button onClick={() => handleSaveProfile(true)} className="btn primary" disabled={saving}>{saving ? "Publishing…" : "Publish Changes"}</button>
                                    </>
                                ) : (
                                        <span className="muted">Read-only view</span>
                                )}
                            </div>
                        </>
                    )}

                    {/* --- AI INSIGHTS TAB --- */}
                    {tab === "ai" && (canViewSettings || isOwner) && (
                        <AIInsightsView
                            businessId={state.businessId}
                            onInsightClick={(insight) => {
                                if (insight.cardIds && insight.cardIds.length > 0) {
                                    let url = `/businessDashboard?highlightCards=${insight.cardIds.join(',')}&highlightColor=${insight.type}`;
                                    if (insight.boardId) {
                                        url += `&boardId=${insight.boardId}`;
                                    }
                                    navigate(url);
                                }
                            }}
                        />
                    )}

                    {/* --- MEMBERS TAB --- */}
                    {tab === "members" && (canInvite || isOwner) && (
                        <>
                            {canEdit && (
                                <div className="card">
                                    <h2 className="card-title">Invite Team Member</h2>
                                    <div className="invite-grid">
                                        <div style={{ position: "relative" }}>
                                            <label>Email Address</label>
                                            <input value={state.invite.email} onChange={handleEmailChange} placeholder="teammate@company.com" />
                                            {state.searchResults.length > 0 && (
                                                <ul style={{ position: "absolute", borderRadius: 8, zIndex: 10, background: "#1a1a1a", border: "1px solid #333", listStyle: "none", padding: 0, margin: "4px 0", width: "100%", boxShadow: "0 10px 20px rgba(0,0,0,0.5)" }}>
                                                    {state.searchResults.map((result) => (
                                                    <li key={result.email} style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid #333" }} onClick={() => handleSelectEmail(result.email)}>
                                                        {result.name} <span className="muted">({result.email})</span>
                                                    </li>
                                                ))}
                                                </ul>
                                            )}
                                        </div>
                                        <div>
                                            <label>Role</label>
                                            <select value={state.invite.roleId} onChange={(e) => dispatch({ type: "SET_INVITE", payload: { roleId: e.target.value } })}>
                                                {roles.length === 0 ? <option value="member">member</option> : roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                                        <button onClick={handleInvite} className="btn primary" disabled={!canEdit}>Send Invite</button>
                                    </div>
                                </div>
                            )}

                            <div className="card">
                                <h2 className="card-title">Team Directory</h2>

                                <div className="toolbar">
                                    <div className="search-box">
                                        <span className="icon"><IconSearch /></span>
                                        <input
                                            placeholder="Search members..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div style={{ width: 150 }}>
                                        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                                            <option value="all">All Roles</option>
                                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    <button className="btn ghost icon-btn" onClick={handleExportCSV} title="Export CSV" style={{ width: 40 }}>
                                        <IconDownload />
                                    </button>
                            </div>

                                <div className="data-table-container">
                                    {filteredMembers.length === 0 ? (
                                        <div className="empty-state">No members found matching your search.</div>
                                    ) : (
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Role</th>
                                                        <th>Role</th>
                                                        <th style={{ textAlign: "center" }}>Account Status</th>
                                                    <th style={{ textAlign: "center" }}>Active Tasks</th>
                                                    <th style={{ textAlign: "right" }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredMembers.map(m => (
                                                    <MemberRow
                                                        key={m.id}
                                                        m={m}
                                                    stats={taskCounts[m.uid] || 0}
                                                    onRemove={handleRemoveMember}
                                                    onToggleStatus={handleToggleStatus}
                                                    onUpdateRole={handleUpdateMemberRole}
                                                    canRemove={can('members.remove')}
                                                    canUpdateRole={canManageRoles}
                                                    isSelf={m.uid === uid}
                                                    isOwner={m.uid === state.ownerUid}
                                                    roles={roles}
                                                        isOnline={presenceData[m.uid]?.state === 'online'}
                                                />
                                            ))}
                                                </tbody>
                                            </table>
                                )}
                            </div>
                            </div>
                        </>
                    )}

                    {/* --- ROLES TAB --- */}
                    {tab === "roles" && (canViewRoles || isOwner) && (
                        <>
                            {canEdit && !state.editingRole.id && (
                                <div className="card">
                                    <h2 className="card-title">Create New Role</h2>
                                    <div className="form-row" style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                                        <div style={{ flex: 2 }}>
                                            <label>Role Name</label>
                                            <input value={state.newRole.name} onChange={(e) => dispatch({ type: "SET_NEW_ROLE", payload: { name: e.target.value } })} placeholder="e.g. Project Manager" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label>Level (0-10)</label>
                                            <input type="number" value={state.newRole.level} onChange={(e) => dispatch({ type: "SET_NEW_ROLE", payload: { level: e.target.value } })} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label>Capacity</label>
                                            <input type="number" placeholder="Unlimited" value={state.newRole.capacity === null ? "" : state.newRole.capacity} onChange={(e) => dispatch({ type: "SET_NEW_ROLE", payload: { capacity: e.target.value === "" ? null : e.target.value } })} />
                                        </div>
                                    </div>
                                    <div className="bc-actions">
                                        <button onClick={handleCreateRole} className="btn primary" disabled={saving}>Create Role</button>
                                    </div>
                                </div>
                            )}

                            {state.editingRole.id && (
                            <div className="card">
                                    <h2 className="card-title">Editing: {state.editingRole.name}</h2>
                                    <div className="edit-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                                        <div className="field">
                                            <label>Role Name</label>
                                            <input value={state.editingRole.name} onChange={(e) => dispatch({ type: "SET_EDIT_ROLE", payload: { name: e.target.value } })} />
                                        </div>
                                        <div className="field">
                                            <label>Level</label>
                                            <input type="number" value={state.editingRole.level} onChange={(e) => dispatch({ type: "SET_EDIT_ROLE", payload: { level: e.target.value } })} />
                                        </div>
                                        <div className="field">
                                            <label>Capacity</label>
                                            <input
                                                type="number"
                                                placeholder="Unlimited"
                                                value={state.editingRole.capacity === null || state.editingRole.capacity === undefined ? "" : state.editingRole.capacity}
                                                onChange={(e) => dispatch({ type: "SET_EDIT_ROLE", payload: { capacity: e.target.value === "" ? null : e.target.value } })}
                                            />
                                        </div>
                                    </div>

                                    {/* Permission UI Grid */}
                                    <div className="permissions-grid">
                                        {Object.entries(groupedPermissions).map(([cat, perms]) => (
                                            <div key={cat} className="perm-category">
                                            <h5>{cat}</h5>
                                            {perms.map(p => (
                                                <label key={p.key} className="perm-item">
                                                    <input
                                                        type="checkbox" 
                                                            checked={!!state.editingRole.permissions[p.key]}
                                                            onChange={() => handlePermToggle(p.key)}
                                                        />
                                                        <div>
                                                            <span>{p.name}</span>
                                                            <small>{p.description}</small>
                                                        </div>
                                                    </label>
                                                ))}
                                        </div>
                                    ))}
                                    </div>

                                    <div className="role-edit-actions">
                                        <button className="btn ghost" onClick={() => dispatch({ type: "RESET_EDIT_ROLE" })}>Cancel</button>
                                        <button className="btn primary" onClick={handleUpdateRole}>Save Changes</button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 style={{ marginBottom: 16, color: "#fff" }}>Existing Roles</h3>
                                <div className="roles-list">
                                    {roles.map(r => (
                                        <RoleRow
                                            key={r.id}
                                            r={r}
                                            onEdit={startEditRole}
                                            onDelete={handleDeleteRole}
                                            canEdit={canManageRoles}
                                        />
                                    ))}
                            </div>
                        </div>
                        </>
                    )}

                </section>

                <aside className="bc-preview">
                    {profileExists && (
                    <div className="preview-card">
                        <div className="preview-header">
                            <div className="logo">
                                    {form.logoUrl ? <img src={form.logoUrl} alt="Logo" /> : (form.businessName || "B").substring(0, 2).toUpperCase()}
                            </div>
                            <div className="title">
                                    <h3>{form.businessName || "Business Application"}</h3>
                                    <span className="muted">{form.industry || "Industry"}</span>
                            </div>
                            </div>
                        <div className="preview-body">
                                <div className="desc">{form.description || "No description provided."}</div>
                            <div className="meta">
                                    <div><strong>Website:</strong> {form.website ? <a href={form.website} target="_blank" rel="noreferrer">Link</a> : "—"}</div>
                                    <div><strong>Location:</strong> {form.location || "—"}</div>
                                    <div><strong>Contact:</strong> {form.contactEmail || "—"}</div>
                            </div>
                        </div>
                    </div>
                    )}
                </aside>
            </div>
        </main>
    );
}
