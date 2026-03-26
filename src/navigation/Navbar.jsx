// Navbar.jsx
import { useEffect, useState, useCallback } from "react";
import "../scss/navbar.scss";
import { Link, useNavigate } from "react-router-dom";
import { useReduxAuth } from "../context/ReduxAuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import {
  acceptInvite as svcAcceptInvite,
  declineInvite as svcDeclineInvite,
  getBusiness,
} from "../services/accountService";

import NavbarSkeleton from "../components/loaders/NavbarSkeleton";
import NotificationDropdown from "../components/NotificationDropdown";
import { useReduxTheme } from "../context/ReduxThemeContext";

const Navbar = ({ simulateLoading = true }) => {
    const { currentUser, signOut, refreshProfile } = useReduxAuth();
    const { theme, setTheme, themes } = useReduxTheme();
    const [notifications, setNotifications] = useState([]);
    const [rawInvites, setRawInvites] = useState([]); // as stored in account.invitesEmail
    const [invites, setInvites] = useState([]); // enriched invites with businessName + friendly fields
    const [showNotifs, setShowNotifs] = useState(false);
    const [showInvites, setShowInvites] = useState(false);
    const [showThemes, setShowThemes] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // per-invite loading flags
    const [accepting, setAccepting] = useState(new Set());
    const [declining, setDeclining] = useState(new Set());

    const navigate = useNavigate();

    // Subscribe to account doc for notifications + invitesEmail
    useEffect(() => {
        if (!currentUser) return;
        const docRef = doc(db, "account", currentUser.uid);
        const unsub = onSnapshot(
        docRef,
        (snap) => {
            if (snap.exists()) {
            const data = snap.data();
            setNotifications(data.notifications || []);
            setRawInvites(Array.isArray(data.invitesEmail) ? data.invitesEmail : []);
            } else {
            setNotifications([]);
            setRawInvites([]);
            }
        },
        (err) => console.error("onSnapshot error:", err)
        );
        return () => unsub();
    }, [currentUser]);

    // Helper: format timestamp-ish
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

    // Enrich rawInvites with business name (non-blocking)
    useEffect(() => {
        let mounted = true;
        const enrich = async () => {
            if (!rawInvites || rawInvites.length === 0) {
                if (mounted) setInvites([]);
                return;
            }

            // normalize items
            const items = rawInvites.map((i) => ({
                inviteId: i.inviteId || i.id || null,
                businessId: i.businessId || null,
                roleId: i.roleId || "member",
                roleName: i.roleName || null, // might already exist
                message: i.message || "",
                createdAt: i.createdAt || i.createdAtTimestamp || null,
                email: i.email || null,
                businessName: i.businessName || null,
                raw: i,
            }));

            // collect role lookups per business for items missing roleName
            const toFetch = {};
            items.forEach(it => {
                if (!it.roleName && it.businessId && it.roleId) {
                    toFetch[it.businessId] = toFetch[it.businessId] || new Set();
                    toFetch[it.businessId].add(it.roleId);
                }
            });

            const roleNameMap = {}; // { businessId: { roleId: roleName } }
            await Promise.all(Object.entries(toFetch).map(async ([bizId, roleSet]) => {
                roleNameMap[bizId] = roleNameMap[bizId] || {};
                await Promise.all(Array.from(roleSet).map(async (rid) => {
                    try {
                        const rSnap = await getDoc(doc(db, "businesses", bizId, "roles", rid));
                        if (rSnap.exists()) roleNameMap[bizId][rid] = rSnap.data().name || null;
                    } catch (err) {
                    // ignore; may be that stored roleId is actually a name
                    }
                }));
            }));

            // Fetch missing business names
            const idsToFetch = Array.from(new Set(items.filter(it => !it.businessName && it.businessId).map(it=>it.businessId)));
            const bizMap = {};
            await Promise.all(idsToFetch.map(async id => {
                try {
                    const b = await getBusiness(id);
                    if (b) bizMap[id] = b.name || null;
                } catch (err) {}
            }));

            const enriched = items.map(it => ({
                ...it,
                businessName: it.businessName || bizMap[it.businessId] || null,
                roleName: it.roleName || (roleNameMap[it.businessId] && roleNameMap[it.businessId][it.roleId]) || null,
            }));

            if (mounted) setInvites(enriched);
        };

        enrich();
        return () => { mounted = false; };
    }, [rawInvites]);


    // Accept invite
    const handleAccept = useCallback(
        async (invite) => {
        if (!currentUser) return;
        const id = invite.inviteId;
        setAccepting((s) => new Set(s).add(id));
        try {
            await svcAcceptInvite({
            businessId: invite.businessId,
            inviteId: id,
            uid: currentUser.uid,
            name: currentUser.displayName || "",
            email: currentUser.email || "",
            });

            // optimistic: remove from local list immediately
            setInvites((prev) => prev.filter((p) => p.inviteId !== id));
            // ideally account doc will be updated by backend / invite flows; refresh profile to sync
            if (typeof refreshProfile === "function") await refreshProfile();
        } catch (err) {
            console.error("Accept invite error", err);
            // optionally notify user or rethrow to UI
        } finally {
            setAccepting((s) => {
            const ns = new Set(s);
            ns.delete(id);
            return ns;
            });
        }
        },
        [currentUser, refreshProfile]
    );

    // Decline invite
    const handleDecline = useCallback(
        async (invite) => {
        if (!currentUser) return;
        const id = invite.inviteId;
        setDeclining((s) => new Set(s).add(id));
        try {
            await svcDeclineInvite({
            businessId: invite.businessId,
            inviteId: id,
            uid: currentUser.uid,
            });

            // optimistic removal
            setInvites((prev) => prev.filter((p) => p.inviteId !== id));
            if (typeof refreshProfile === "function") await refreshProfile();
        } catch (err) {
            console.error("Decline invite error", err);
        } finally {
            setDeclining((s) => {
            const ns = new Set(s);
            ns.delete(id);
            return ns;
            });
        }
        },
        [currentUser, refreshProfile]
    );



    // UI: small badge with invites count; dropdown with accept/decline
    const inviteCount = invites.length;

    
    const handleLogout = async () => {
        try {
            const res = await signOut();
            if (res.ok) {
                navigate('/signup', { replace: true });
            } else {
                console.error('Logout failed', res.error);
                // optionally show a toast
            }
        } catch (err) {
            console.error('Logout error', err);
        }
    };

  
    const getColor = (status) => {
        switch (status) {
            case 'red':
            return '#ff4d4d';
            case 'orange':
            return '#ffa500';
            case 'green':
            return '#28a745';
            default:
            return '#888';
        }
    };

    // safe resolution of account type
    const accountType = currentUser?.profile?.accountType ?? null;
    const hasAffiliations = Array.isArray(currentUser?.profile?.businessAffiliations) && currentUser.profile.businessAffiliations.length > 0;

    // SHOW invites UI only if user hasn't chosen accountType AND has no affiliations
    const showInvitesUI = !accountType && !hasAffiliations;    
        
    
    const infoPath = accountType === 'business' ? '/business' : (accountType === 'personal' ? '/personal' : `/${accountType}`);
    const dashboardPath = accountType === 'business' ? '/businessDashboard' : (accountType === 'personal' ? '/personalDashboard' : `/${accountType}Dashboard`);
    const dashboardLabel = accountType ? (accountType === "business" ? "Business" : "Personal") : null;

    const [loading, setLoading] = useState(Boolean(simulateLoading));

    // NEW: Check if current user is the owner of the associated business
    const [isBusinessOwner, setIsBusinessOwner] = useState(false);

    useEffect(() => {
        if (!currentUser || accountType !== 'business' || !hasAffiliations) {
            setIsBusinessOwner(false);
            return;
        }

        // Optimisation: Check local profile data instead of fetching business doc
        // This handles cases where user has multiple affiliations and ensuring we check all of them
        // The creator of a business is always assigned roleId: 'owner'
        const aff = currentUser.profile.businessAffiliations;
        const isOwner = Array.isArray(aff) && aff.some(a => a.roleId === 'owner');
        setIsBusinessOwner(isOwner);

    }, [currentUser, accountType, hasAffiliations]);

    useEffect(() => {
        if (!simulateLoading) return;
        const t = setTimeout(() => setLoading(false), 2000); // demo 1s
        return () => clearTimeout(t);
    }, [simulateLoading]);

    if (loading) return <NavbarSkeleton/>;

    return (
        <div className='navigator-comp w-full'>
            <ul className='gap-3 h-full'>
                <div className="nav-side">
                    <h3 className='txt1'> T 4 S K </h3>
                    <h3 className='absolute txt2'> T 4 S K </h3>
                </div>

                <div className="grp-1">
                    <div className={`nav-side-links ${showMenu ? 'open' : ''} items-center justify-evenly gap-5 px-5 m-0`}>
                        <Link className='nav-link' to={'/'}>
                            <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6.5 19.0002H10.192V13.9232C10.192 13.6946 10.2697 13.5029 10.425 13.3482C10.5797 13.1929 10.7713 13.1152 11 13.1152H14C14.2287 13.1152 14.4207 13.1929 14.576 13.3482C14.7307 13.5029 14.808 13.6946 14.808 13.9232V19.0002H18.5V10.3082C18.5 10.2056 18.4777 10.1122 18.433 10.0282C18.3883 9.94423 18.3273 9.8709 18.25 9.80823L12.866 5.75023C12.7633 5.6609 12.6413 5.61623 12.5 5.61623C12.3587 5.61623 12.237 5.6609 12.135 5.75023L6.75 9.80823C6.67333 9.87223 6.61233 9.94557 6.567 10.0282C6.52167 10.1109 6.49933 10.2042 6.5 10.3082V19.0002ZM5.5 19.0002V10.3082C5.5 10.0522 5.55733 9.8099 5.672 9.58123C5.78667 9.35257 5.94467 9.16423 6.146 9.01623L11.531 4.93823C11.813 4.7229 12.135 4.61523 12.497 4.61523C12.859 4.61523 13.183 4.7229 13.469 4.93823L18.854 9.01523C19.056 9.16323 19.214 9.3519 19.328 9.58123C19.4427 9.8099 19.5 10.0522 19.5 10.3082V19.0002C19.5 19.2682 19.4003 19.5019 19.201 19.7012C19.0017 19.9006 18.768 20.0002 18.5 20.0002H14.616C14.3867 20.0002 14.1947 19.9229 14.04 19.7682C13.8853 19.6129 13.808 19.4209 13.808 19.1922V14.1162H11.192V19.1922C11.192 19.4216 11.1147 19.6136 10.96 19.7682C10.8053 19.9229 10.6137 20.0002 10.385 20.0002H6.5C6.232 20.0002 5.99833 19.9006 5.799 19.7012C5.59967 19.5019 5.5 19.2682 5.5 19.0002Z"/>
                            </svg>
                            <h5 className='text_nav'> Home </h5>
                        </Link>
                        {currentUser && dashboardPath ? (
                            <>
                                {/* Only show Business Info link if user is owner of the business (for business accounts) */}
                                {/* Also show if account is business but has NO affiliations yet (new created account needs to setup) */}
                                {(accountType !== 'business' || isBusinessOwner || !hasAffiliations) && (
                                    <Link className='nav-link' to={infoPath}>
                                        <svg width="21" height="22" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M10.5008 0.5C13.2857 0.5 15.9566 1.60633 17.9259 3.5756C19.8952 5.54487 21.0015 8.21578 21.0015 11.0007C21.0015 13.7857 19.8952 16.4566 17.9259 18.4259C15.9566 20.3952 13.2857 21.5015 10.5008 21.5015C7.71578 21.5015 5.04487 20.3952 3.0756 18.4259C1.10633 16.4566 0 13.7857 0 11.0007C0 8.21578 1.10633 5.54487 3.0756 3.5756C5.04487 1.60633 7.71578 0.5 10.5008 0.5ZM12.0758 6.947C12.8558 6.947 13.4887 6.4055 13.4887 5.603C13.4887 4.8005 12.8543 4.259 12.0758 4.259C11.2958 4.259 10.6657 4.8005 10.6657 5.603C10.6657 6.4055 11.2958 6.947 12.0758 6.947ZM12.3502 15.3875C12.3502 15.227 12.4057 14.81 12.3742 14.573L11.1413 15.992C10.8863 16.2605 10.5667 16.4465 10.4167 16.397C10.3487 16.372 10.2918 16.3235 10.2563 16.2602C10.2209 16.197 10.2091 16.1231 10.2233 16.052L12.2782 9.56C12.4462 8.7365 11.9843 7.985 11.0048 7.889C9.97125 7.889 8.45025 8.9375 7.52475 10.268C7.52475 10.427 7.49475 10.823 7.52625 11.06L8.75775 9.6395C9.01275 9.374 9.30975 9.1865 9.45975 9.2375C9.53365 9.26402 9.59421 9.31847 9.62842 9.38914C9.66264 9.45981 9.66778 9.54108 9.64275 9.6155L7.60575 16.076C7.37025 16.832 7.81575 17.573 8.89575 17.741C10.4857 17.741 11.4247 16.718 12.3517 15.3875H12.3502Z" />
                                        </svg>

                                        <h5 className='text_nav'> {dashboardLabel} </h5>
                                    </Link>
                                )}

                                <Link className="nav-link" to={dashboardPath}>
                                    <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10 4.183V0.817C10 0.579 10.078 0.383333 10.234 0.23C10.39 0.0766667 10.5833 0 10.814 0H15.694C15.9253 0 16.1173 0.0766667 16.27 0.23C16.4227 0.383333 16.4993 0.579 16.5 0.817V4.183C16.5 4.42167 16.422 4.61733 16.266 4.77C16.11 4.92333 15.9167 5 15.686 5H10.806C10.5753 5 10.3833 4.92333 10.23 4.77C10.0767 4.61667 10 4.421 10 4.183ZM0.5 7.2V0.8C0.5 0.573334 0.578 0.383333 0.734 0.23C0.89 0.0766667 1.08333 0 1.314 0H6.194C6.42533 0 6.61733 0.0766667 6.77 0.23C6.92267 0.383333 6.99933 0.573334 7 0.8V7.2C7 7.42667 6.922 7.61667 6.766 7.77C6.61 7.92333 6.41667 8 6.186 8H1.306C1.07533 8 0.883333 7.92333 0.73 7.77C0.576667 7.61667 0.5 7.42667 0.5 7.2ZM10 15.2V8.8C10 8.57333 10.078 8.38333 10.234 8.23C10.39 8.07667 10.5833 8 10.814 8H15.694C15.9253 8 16.1173 8.07667 16.27 8.23C16.4227 8.38333 16.4993 8.57333 16.5 8.8V15.2C16.5 15.4267 16.422 15.6167 16.266 15.77C16.11 15.9233 15.9167 16 15.686 16H10.806C10.5753 16 10.3833 15.9233 10.23 15.77C10.0767 15.6167 10 15.4267 10 15.2ZM0.5 15.183V11.817C0.5 11.579 0.578 11.3833 0.734 11.23C0.89 11.0767 1.08333 11 1.314 11H6.194C6.42533 11 6.61733 11.0767 6.77 11.23C6.92267 11.3833 6.99933 11.579 7 11.817V15.183C7 15.4217 6.922 15.6173 6.766 15.77C6.61 15.9233 6.41667 16 6.186 16H1.306C1.07533 16 0.883333 15.9233 0.73 15.77C0.576667 15.6167 0.5 15.421 0.5 15.183ZM1.5 7H6V1H1.5V7ZM11 15H15.5V9H11V15ZM11 4H15.5V1H11V4ZM1.5 15H6V12H1.5V15Z"/>
                                    </svg>
                                    <h5 className='text_nav'> Dashboard </h5>
                                </Link>

                                {accountType === 'business' && isBusinessOwner && (
                                    <Link className="nav-link" to="/pricing" title="Upgrade Plan">
                                        <svg width="17" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                        </svg>
                                        <h5 className='text_nav' style={{ color: '#f59e0b' }}> Upgrade </h5>
                                    </Link>
                                )}
                            </>
                        ) : <></>}
                        {currentUser ? 
                            <>
                                <button onClick={handleLogout} className="nav-link btn_logout" style={{ background: 'transparent', border: 'none', padding: '10px' }}>
                                    <svg width="20" height="20" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
                                    </svg>
                                    <h5 className='normal text_nav'> Logout </h5>
                                </button>
                            </>
                        : 
                            <Link className='nav-link' to={'/signup'}>
                                <svg width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 9C12.14 9 15.5 10.57 15.5 12.5V15H0.5V12.5C0.5 10.57 3.86 9 8 9ZM14.5 12.5C14.5 11.12 11.59 10 8 10C4.41 10 1.5 11.12 1.5 12.5V14H14.5V12.5ZM8 0C8.92826 0 9.8185 0.368749 10.4749 1.02513C11.1313 1.6815 11.5 2.57174 11.5 3.5C11.5 4.42826 11.1313 5.3185 10.4749 5.97487C9.8185 6.63125 8.92826 7 8 7C7.07174 7 6.1815 6.63125 5.52513 5.97487C4.86875 5.3185 4.5 4.42826 4.5 3.5C4.5 2.57174 4.86875 1.6815 5.52513 1.02513C6.1815 0.368749 7.07174 0 8 0ZM8 1C7.33696 1 6.70107 1.26339 6.23223 1.73223C5.76339 2.20107 5.5 2.83696 5.5 3.5C5.5 4.16304 5.76339 4.79893 6.23223 5.26777C6.70107 5.73661 7.33696 6 8 6C8.66304 6 9.29893 5.73661 9.76777 5.26777C10.2366 4.79893 10.5 4.16304 10.5 3.5C10.5 2.83696 10.2366 2.20107 9.76777 1.73223C9.29893 1.26339 8.66304 1 8 1Z"/>
                                </svg>
                                <h5 className='normal text_nav'> 
                                    Signup 
                                </h5>
                            </Link>
                        }
                    </div>
                    {currentUser &&
                        <h5 className='text-white acc_name'>
                            {currentUser.displayName && currentUser.displayName.length > 15 
                                ? `${currentUser.displayName.substring(0, 15)}...` 
                                : currentUser.displayName || currentUser.email}
                        </h5>
                    }
                    {currentUser && (
                        <div className="nav-link notification-button">
                            <NotificationDropdown
                                notifications={notifications}
                                uid={currentUser.uid}
                            />
                        </div>
                    )}
                    {currentUser && showInvitesUI && (
                        <div
                        className="nav-link invites-button"
                        onClick={() => {
                            setShowInvites((s) => !s);
                            setShowNotifs(false);
                        }}
                        >
                        <svg className="cursor-pointer" width="26" height="24" viewBox="0 0 26 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        </svg>

                        {inviteCount > 0 && <span className="badge">{inviteCount}</span>}

                        {showInvites && (
                            <div className="invite-dropdown" onMouseLeave={() => setShowInvites(false)} role="menu" aria-label="Invites dropdown">
                            {inviteCount === 0 ? (
                                <div className="no-invites">No invites</div>
                            ) : (
                                invites.map((inv, idx) => {
                                const id = inv.inviteId || `idx-${idx}`;
                                const isAccepting = accepting.has(id);
                                const isDeclining = declining.has(id);
                                return (
                                    <div key={id} className="invite-item" role="menuitem">
                                    <div className="invite-meta">
                                        <div className="invite-title">{inv.businessName || `Business ${inv.businessId || ""}`}</div>
                                        <div className="invite-sub">Role: {inv.roleName || inv.roleId || "member"}</div>
                                        {inv.message ? <div className="invite-msg">{inv.message}</div> : null}
                                        <div className="invite-time">{prettyDate(inv.createdAt)}</div>
                                    </div>

                                    <div className="invite-actions">
                                        <button
                                        className="btn small"
                                        onClick={() => handleAccept(inv)}
                                        disabled={isAccepting || isDeclining}
                                        aria-label={`Accept invite from ${inv.businessName || inv.businessId}`}
                                        >
                                        {isAccepting ? "Accepting…" : "Accept"}
                                        </button>

                                        <button
                                        className="btn small ghost"
                                        onClick={() => handleDecline(inv)}
                                        disabled={isDeclining || isAccepting}
                                        aria-label={`Decline invite from ${inv.businessName || inv.businessId}`}
                                        >
                                        {isDeclining ? "Declining…" : "Decline"}
                                        </button>
                                    </div>
                                    </div>
                                );
                                })
                            )}
                        </div>
                        )}
                        </div>
                    )}
                    {/* --- THEME SWITCHER --- */}
                    <div
                        className="nav-link theme-toggle-btn"
                        onClick={() => {
                            setShowThemes((s) => !s);
                            setShowInvites(false);
                            setShowNotifs(false);
                        }}
                    >
                        {/* Paint Palette Icon */}
                        <svg className="cursor-pointer" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.06 0 2-.94 2-2 0-.46-.18-.9-.5-1.26-.3-.34-.48-.77-.48-1.24 0-1.06.94-2 2-2h1.59c2.97 0 5.39-2.42 5.39-5.39C22 7.03 17.52 2 12 2zm-4.5 9c-.83 0-1.5-.67-1.5-1.5S6.67 8 7.5 8 9 8.67 9 9.5 8.33 11 7.5 11zm3-3c-.83 0-1.5-.67-1.5-1.5S9.67 5 10.5 5 12 5.67 12 6.5 11.33 8 10.5 8zm4.5 0c-.83 0-1.5-.67-1.5-1.5S14.17 5 15 5s1.5.67 1.5 1.5S15.83 8 15 8zm3 3c-.83 0-1.5-.67-1.5-1.5S17.67 8 18.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                        </svg>

                        {showThemes && (
                            <div
                                className="theme-dropdown-panel"
                                onMouseLeave={() => setShowThemes(false)}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="theme-dd-header">
                                    <span className="theme-dd-title">Customize theme</span>
                                    <span className="theme-dd-sub">Choose your workspace palette</span>
                                </div>

                                <div className="theme-dd-list">
                                    {themes.map((t) => (
                                        <button
                                            key={t.id}
                                            className={`theme-dd-item${theme === t.id ? ' active' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTheme(t.id);
                                                setShowThemes(false);
                                            }}
                                        >
                                            <span
                                                className="theme-dd-swatch"
                                                style={{
                                                    backgroundColor: t.hex,
                                                    boxShadow: theme === t.id ? `0 0 10px ${t.hex}` : 'none'
                                                }}
                                            />
                                            <span className="theme-dd-label">{t.name}</span>
                                            <span className="theme-dd-badge">{t.type}</span>

                                            {theme === t.id && (
                                                <svg className="theme-dd-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.hex} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        className="mobile-menu-button md:hidden p-4"
                        aria-label="Toggle menu"
                        onClick={() => setShowMenu(prev => !prev)}

                    >
                        {/* simple 3-bar icon */}
                        <div className="w-6 h-0.5 bg-white mb-1"></div>
                        <div className="w-6 h-0.5 bg-white mb-1"></div>
                        <div className="w-6 h-0.5 bg-white"></div>
                    </button>
                </div>
            </ul>
        </div>
    );
}

export default Navbar