// src/pages/ChooseAccountType.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  updateAccountType,
  acceptInvite as svcAcceptInvite,
  declineInvite as svcDeclineInvite,
  getBusiness,
} 
from "../services/accountService";

import "../scss/choose-account.scss";
import { auth } from "../config/firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export default function ChooseAccountType() {
    
    const { currentUser, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [loadingFor, setLoadingFor] = useState("");
    const [error, setError] = useState("");
    const [loggingOut, setLoggingOut] = useState(false);

    // invites (for topbar)
    const [invites, setInvites] = useState([]);
    const [invitesLoading, setInvitesLoading] = useState(false);
    const [showInvites, setShowInvites] = useState(false);
    const [accepting, setAccepting] = useState(new Set());
    const [declining, setDeclining] = useState(new Set());

    useEffect(() => {
        if (!currentUser) navigate("/signup", { replace: true });
    }, [currentUser, navigate]);

    const uid = currentUser?.uid ?? currentUser?.profile?.uid ?? null;

    // Subscribe to account/{uid} and mirror Navbar behavior
    useEffect(() => {
        if (!currentUser?.uid) {
            setInvites([]);
            return;
        }

        setInvitesLoading(true);
        const acctRef = doc(db, "account", currentUser.uid);

        const unsub = onSnapshot(
        acctRef,
        async (snap) => {
            if (!snap.exists()) {
                setInvites([]);
                setInvitesLoading(false);
                return;
            }

            const data = snap.data();
            const raw = Array.isArray(data.invitesEmail) ? data.invitesEmail : [];

            // Normalize items to a common structure
            const items = raw.map((i) => ({
            inviteId: i.inviteId || i.id || null,
            businessId: i.businessId || null,
            roleId: i.roleId || "member",
            roleName: i.roleName || null,
            message: i.message || "",
            createdAt: i.createdAt || i.createdAtTimestamp || null,
            email: i.email || null,
            businessName: i.businessName || null,
            raw: i,
            }));

            // Build list of business IDs that need a name lookup
            const idsToFetch = Array.from(new Set(items.filter(it => !it.businessName && it.businessId).map(it => it.businessId)));
            const bizMap = {};
            await Promise.all(idsToFetch.map(async (id) => {
            try {
                const b = await getBusiness(id);
                if (b) bizMap[id] = b.name || null;
            } catch (err) {
                // ignore and leave null
            }
            }));

            // Build role lookups per business for items missing roleName
            const roleLookups = {}; // { bizId: Set(roleIds) }
            items.forEach(it => {
            if (!it.roleName && it.businessId && it.roleId) {
                roleLookups[it.businessId] = roleLookups[it.businessId] || new Set();
                roleLookups[it.businessId].add(it.roleId);
            }
            });

            const roleNameMap = {}; // { bizId: { roleId: roleName } }
            await Promise.all(Object.entries(roleLookups).map(async ([bizId, setOfRoleIds]) => {
            roleNameMap[bizId] = {};
            await Promise.all(Array.from(setOfRoleIds).map(async (rid) => {
                try {
                const rSnap = await getDoc(doc(db, "businesses", bizId, "roles", rid));
                if (rSnap.exists()) roleNameMap[bizId][rid] = rSnap.data().name || null;
                } catch (err) {
                // ignore
                }
            }));
            }));

            const enriched = items.map(it => ({
            ...it,
            businessName: it.businessName || bizMap[it.businessId] || null,
            roleName: it.roleName || (roleNameMap[it.businessId] && roleNameMap[it.businessId][it.roleId]) || null,
            }));

            setInvites(enriched);
            setInvitesLoading(false);
        },
        (err) => {
            console.error("account onSnapshot (invites) error:", err);
            setInvites([]);
            setInvitesLoading(false);
        }
        );

        return () => unsub();
    }, [currentUser]);

    const handleChoose = async (type) => {
        if (!uid || loadingFor) return;
        setError("");
        setLoadingFor(type);

        try {
        await updateAccountType(uid, type);
        if (typeof refreshProfile === "function") await refreshProfile();
        navigate(type === "business" ? "/business" : "/personal", { replace: true });
        } catch (err) {
        console.error("Failed to set account type:", err);
        setError("Unable to save selection — please try again.");
        setLoadingFor("");
        }
    };

    const handleLogout = async () => {
        try {
        setLoggingOut(true);
            await auth.signOut();
        navigate("/signup", { replace: true });
        } catch (err) {
        console.error("Logout error", err);
        setError("Logout failed — try again.");
        } finally {
        setLoggingOut(false);
        }
    };

    const shortName = (() => {
        if (!currentUser) return "";
        const n = currentUser.displayName || currentUser?.profile?.username || currentUser?.email || "";
        if (n.length > 18) return n.slice(0, 15) + "...";
        return n;
    })();

    const prettyDate = (ts) => {
        if (!ts) return "";
        try {
        if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
        if (typeof ts.toDate === "function") return ts.toDate().toLocaleString();
        return new Date(ts).toLocaleString();
        } catch {
        return "";
        }
    };

    const handleAcceptInvite = async (inv) => {
        if (!currentUser || !inv) return;
        const id = inv.inviteId;
        setAccepting((s) => new Set(s).add(id));
        setError("");
        try {
        await svcAcceptInvite({
            businessId: inv.businessId,
            inviteId: id,
            uid,
            name: currentUser.displayName || "",
            email: currentUser.email || "",
        });

        // auto-convert to business account (as before)
        try { await updateAccountType(uid, "business"); } catch (uErr) { console.warn(uErr); }

        if (typeof refreshProfile === "function") {
            try { await refreshProfile(); } catch (rErr) { console.warn(rErr); }
        }

        setInvites((prev) => prev.filter((p) => p.inviteId !== id));
        navigate("/business", { replace: true });
        } catch (err) {
        console.error("Accept invite error:", err);
        setError(err?.message || "Failed to accept invite. Try again.");
        } finally {
        setAccepting((s) => { const ns = new Set(s); ns.delete(id); return ns; });
        }
    };

    const handleDeclineInvite = async (inv) => {
        if (!currentUser || !inv) return;
        const id = inv.inviteId;
        setDeclining((s) => new Set(s).add(id));
        setError("");
        try {
        await svcDeclineInvite({ businessId: inv.businessId, inviteId: id, uid });
        setInvites((prev) => prev.filter((p) => p.inviteId !== id));
        } catch (err) {
        console.error("Decline invite error:", err);
        setError(err?.message || "Failed to decline invite. Try again.");
        } finally {
        setDeclining((s) => { const ns = new Set(s); ns.delete(id); return ns; });
        }
    };

    return (
        <main className="choose-page min-h-[calc(100vh-75px)] flex items-center justify-center p-6 relative">
        {/* Top-right small bar with logout */}
        <div className="topbar">
            <div className="topbar-user">
                <div className="topbar-avatar" aria-hidden>
                    {currentUser?.profile?.username
                    ? currentUser.profile.username.slice(0, 2).toUpperCase()
                    : (currentUser?.displayName || currentUser?.email || "U").slice(0, 2).toUpperCase()}
                </div>
                <div className="topbar-name">{shortName}</div>
            </div>
            <div className="topbar-invites" style={{ position: "relative" }}>
                <button
                    className="invite-toggle"
                    onClick={() => setShowInvites((s) => !s)}
                    aria-expanded={showInvites}
                    aria-haspopup="menu"
                    title="Pending invites"
                >
                    Invites {invites.length > 0 ? `(${invites.length})` : ""}
                </button>

                {showInvites && (
                    <div
                    className="invite-dropdown-topbar"
                    onMouseLeave={() => setShowInvites(false)}
                    role="menu"
                    aria-label="Invites"
                    >
                    <div className="invite-header">
                        <div className="title">Pending invites</div>
                        <div className="muted">{invites.length} total</div>
                    </div>

                    {invitesLoading ? (
                        <div className="invite-loading">Loading…</div>
                    ) : invites.length === 0 ? (
                        <div className="no-invites">No pending invites</div>
                    ) : (
                        <div className="invite-list" role="list">
                        {invites.map((inv) => {
                            const id = inv.inviteId;
                            const isAccepting = accepting.has(id);
                            const isDeclining = declining.has(id);
                            return (
                            <div key={id} className="invite-item" role="listitem" aria-label={`Invite from ${inv.businessName || inv.businessId}`}>
                                <div className="invite-left">
                                    <div className="invite-meta">
                                        <div className="invite-title">{inv.businessName || `Business ${inv.businessId}`}</div>
                                        <div className="invite-sub">Role: {inv.roleName || inv.roleId || "member"}</div>
                                    </div>
                                    {inv.message ? <div className="invite-msg">{inv.message}</div> : null}
                                    <div className="invite-time">{prettyDate(inv.createdAt)}</div>
                                </div>

                                <div className="invite-right">
                                <div className="invite-actions">
                                    <button
                                    type="button"
                                    className={`btn accept${isAccepting ? " loading" : ""}`}
                                    onClick={() => handleAcceptInvite(inv)}
                                    disabled={isAccepting || isDeclining}
                                    aria-disabled={isAccepting || isDeclining}
                                    aria-label={`Accept invite from ${inv.businessName || inv.businessId}`}
                                    >
                                    {isAccepting ? "Accepting…" : "Accept"}
                                    </button>

                                    <button
                                    type="button"
                                    className="btn decline"
                                    onClick={() => handleDeclineInvite(inv)}
                                    disabled={isDeclining || isAccepting}
                                    aria-disabled={isDeclining || isAccepting}
                                    aria-label={`Decline invite from ${inv.businessName || inv.businessId}`}
                                    >
                                    {isDeclining ? "Declining…" : "Decline"}
                                    </button>
                                </div>
                                </div>
                            </div>
                            );
                        })}
                        </div>
                    )}
                    </div>
                )}
            </div>

            <button
            type="button"
            className="btn-logout"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Logout"
            >
            {loggingOut ? <span className="logout-spinner" aria-hidden /> : "Logout"}
            </button>
        </div>

        <section className="choose-card max-w-[1100px] w-full grid lg:grid-cols-2 gap-8">
            {/* Left - intro block */}
            <div className="intro-block p-8 rounded-lg">
            <div className="brand">
                <div className="brand-logo">T4SK</div>
                <h3 className="brand-sub">Choose an account type</h3>
            </div>

            <h1 className="intro-title">Get started — pick the setup that fits you.</h1>
            <p className="intro-text">
                Personal is optimized for solo use: private boards, simple flows. Business unlocks
                collaboration: invites, roles, and team boards. You can always change this later in
                Settings → Account.
            </p>

            <dl className="grid grid-cols-2 gap-4 mt-6">
                <div className="feature">
                <dt>Quick setup</dt>
                <dd>Get started in seconds</dd>
                </div>
                <div className="feature">
                <dt>Sync across devices</dt>
                <dd>Cloud-synced boards</dd>
                </div>
                <div className="feature">
                <dt>Secure</dt>
                <dd>Encrypted user data</dd>
                </div>
                <div className="feature">
                <dt>Change anytime</dt>
                <dd>Setup your account type</dd>
                </div>
            </dl>
            </div>

            {/* Right - options */}
            <div className="options-block p-6 rounded-lg">
            <div className="options-grid grid gap-5">
                {/* Personal card */}
                <button
                className={`option-card personal ${loadingFor === "personal" ? "loading" : ""}`}
                onClick={() => handleChoose("personal")}
                disabled={!!loadingFor}
                aria-pressed={loadingFor === "personal"}
                >
                <div className="card-top flex items-center gap-3">
                    <div className="icon-wrap">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
                        <path d="M4 20c0-2.21 3.582-4 8-4s8 1.79 8 4v1H4v-1z" />
                    </svg>
                    </div>
                    <div>
                    <div className="card-title">Personal</div>
                    <div className="card-sub">Best for individual workflows</div>
                    </div>
                    <div className="badge">Free</div>
                </div>

                <ul className="card-features mt-4">
                    <li>Private boards</li>
                    <li>Simple task lists</li>
                    <li>Single-user permissions</li>
                </ul>

                <div className="card-action flex items-center justify-between mt-5">
                    <div className="muted">For individuals</div>
                    <div>
                    {loadingFor === "personal" ? (
                        <span className="spinner" aria-hidden="true" />
                    ) : (
                        <span className="cta">Choose Personal →</span>
                    )}
                    </div>
                </div>
                </button>

                {/* Business card */}
                <button
                className={`option-card business ${loadingFor === "business" ? "loading" : ""}`}
                onClick={() => handleChoose("business")}
                disabled={!!loadingFor}
                aria-pressed={loadingFor === "business"}
                >
                <div className="card-top flex items-center gap-3">
                    <div className="icon-wrap">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M4 4h16v6H4z" />
                        <path d="M4 12h16v8H4z" />
                    </svg>
                    </div>
                    <div>
                    <div className="card-title">Business</div>
                    <div className="card-sub">Team-first collaboration</div>
                    </div>
                    <div className="badge pro">Team</div>
                </div>

                <ul className="card-features mt-4">
                    <li>Invites & roles</li>
                    <li>Shared boards & templates</li>
                    <li>Admin controls</li>
                </ul>

                <div className="card-action flex items-center justify-between mt-5">
                    <div className="muted">Invite teammates</div>
                    <div>
                    {loadingFor === "business" ? (
                        <span className="spinner" aria-hidden="true" />
                    ) : (
                        <span className="cta">Choose Business →</span>
                    )}
                    </div>
                </div>
                </button>
            </div>

            {error && (
                <div className="error-box mt-4" role="alert">
                {error}
                </div>
            )}

            <p className="small-note mt-4 text-sm">You can change this later in Settings → Account.</p>
            </div>
        </section>
        </main>
    );
}
