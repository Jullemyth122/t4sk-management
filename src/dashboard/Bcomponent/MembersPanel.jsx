import React, { useState, useRef, useEffect } from 'react';

export default function MembersPanel({
    members,
    membersLoading,
    membersError,
    memberQuery,
    setMemberQuery,
    membersPerPage,
    setMembersPerPage,
    visibleMembers,
    memberPage,
    membersTotalPages,
    gotoMemberPage,
    roles,
    copyEmail,
    copiedEmailId,
    canViewMembers = true,
}) {
    // persisted height (px)
    const DEFAULT_HEIGHT = 360;
    const MIN_HEIGHT = 120;
    const MAX_HEIGHT = 900;
    const LS_KEY = 'membersPanelHeight';

    const initialHeight = (() => {
        try {
            const v = Number(localStorage.getItem(LS_KEY));
            return v && !Number.isNaN(v) ? v : DEFAULT_HEIGHT;
        } catch {
            return DEFAULT_HEIGHT;
        }
    })();

    const [panelHeight, setPanelHeight] = useState(initialHeight);
    const [collapsed, setCollapsed] = useState(true);
    const draggingRef = useRef(false);
    const startYRef = useRef(0);
    const startHeightRef = useRef(panelHeight);
    const containerRef = useRef(null);

    useEffect(() => {
        localStorage.setItem(LS_KEY, String(panelHeight));
    }, [panelHeight]);

    useEffect(() => {
        function handleMouseMove(e) {
            if (!draggingRef.current) return;
            const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
            const delta = startYRef.current - clientY; // dragging up increases height
            let newH = Math.round(startHeightRef.current + delta);
            newH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newH));
            setPanelHeight(newH);
        }
        function handleMouseUp() {
            if (draggingRef.current) {
                draggingRef.current = false;
                document.body.style.userSelect = '';
                // store already handled by effect
            }
        }
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchend', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, []);

    function startDrag(e) {
        draggingRef.current = true;
        startYRef.current = e.clientY ?? (e.touches && e.touches[0].clientY);
        startHeightRef.current = panelHeight;
        // prevent text selection while dragging
        document.body.style.userSelect = 'none';
        e.preventDefault?.();
    }

    function toggleCollapse() {
        setCollapsed((c) => {
            const next = !c;
            // if expanding and panelHeight is very small (e.g. 0), restore default
            if (!next && panelHeight < MIN_HEIGHT + 10) {
                setPanelHeight(DEFAULT_HEIGHT);
            }
            return next;
        });
    }

    if (!canViewMembers) {
        return (
            <div className="bd-section members-panel restricted">
                <div className="members-head">
                    <h4>Members</h4>
                    <span className="count">{members.length}</span>
                </div>
                <div className="muted">Members list is restricted for your role.</div>
            </div>
        );
    }

    // helpers
    const headerLabel = `${members.length} members`;

    return (
        <div
            className={`bd-section members-panel ${collapsed ? 'collapsed' : ''}`}
            ref={containerRef}
            aria-expanded={!collapsed}
        >
            <div className="members-head">
                <h4>Members</h4>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="count" title={headerLabel}>{members.length}</span>
                    <button
                        className="bd-btn plain"
                        onClick={toggleCollapse}
                        aria-label={collapsed ? 'Expand members panel' : 'Collapse members panel'}
                        title={collapsed ? 'Expand' : 'Collapse'}
                        style={{ padding: '6px 8px' }}
                    >
                        {collapsed ? '▾' : '▴'}
                    </button>
                </div>
            </div>

            <div className="members-controls">
                <input
                    className="members-search"
                    placeholder="Search members by name, email or role..."
                    value={memberQuery}
                    onChange={(e) => {
                        setMemberQuery(e.target.value);
                    }}
                    aria-label="Search members"
                />
                <div className="members-perpage-below">
                    <label>
                        Per view
                        <select
                        value={membersPerPage}
                        onChange={(e) => {
                            setMembersPerPage(Number(e.target.value));
                        }}
                        >
                            <option value={3}>3</option>
                            <option value={6}>6</option>
                            <option value={9}>9</option>
                        </select>
                    </label>
                </div>
            </div>

            {membersLoading ? (
                <div className="muted">Loading members...</div>
            ) : membersError ? (
                <div className="bd-uierror">{membersError}</div>
            ) : members.length === 0 ? (
                <div className="muted">No members found.</div>
            ) : (
                <>
                {/* members-list: controlled max-height (resizable). If collapsed, we hide by CSS. */}
                <ul
                    className="members-list members-single"
                    style={
                    collapsed
                        ? { maxHeight: 0, overflow: 'hidden', transition: 'max-height .22s ease' }
                        : { maxHeight: `${panelHeight}px`, overflowY: 'auto', transition: 'max-height .16s ease' }
                    }
                    aria-label="Members list"
                >
                    {visibleMembers.map((m) => {
                    const roleFromList = roles.find((r) => r.id === m.roleId);
                    const resolvedRoleName = m.roleName || (roleFromList ? roleFromList.name : m.roleId || 'Member');
                    const joinedDate = m.joinedAt
                        ? m.joinedAt.seconds
                        ? new Date(m.joinedAt.seconds * 1000).toLocaleDateString()
                        : new Date(m.joinedAt).toLocaleDateString()
                        : '—';
                    return (
                        <li key={m.id} className="member-row member-card">
                        <div className="member-avatar" aria-hidden>
                            {(m.name || m.email || 'U')
                            .split(' ')
                            .map((s) => s[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div className="member-content">
                            <div className="member-meta">
                            <div className="member-name">{m.name || '—'}</div>
                            <div className="member-email" title={m.email || m.uid || ''}>
                                <span className="email-text">{m.email || m.uid || '—'}</span>
                            </div>
                            </div>
                            <div className="member-side">
                            <div className="member-role">{resolvedRoleName}</div>
                            <div className="member-joined">Joined: {joinedDate}</div>
                            <button
                                className="member-copy"
                                aria-label={`Copy email of ${m.email || m.uid || m.name}`}
                                onClick={() => copyEmail(m.id, m.email || m.uid || '')}
                            >
                                {copiedEmailId === m.id ? 'Copied' : 'Copy'}
                            </button>
                            </div>
                        </div>
                        </li>
                    );
                    })}
                </ul>

                {/* resizer handle - hidden when collapsed */}
                {!collapsed && (
                    <div
                        className="members-resizer"
                        onMouseDown={startDrag}
                        onTouchStart={(e) => startDrag(e.touches ? e.touches[0] : e)}
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Resize members panel"
                        title="Drag to resize members panel"
                    />
                )}

                <div className="members-pagination" aria-label="Members pagination">
                    <button className="pag-btn" onClick={() => gotoMemberPage(memberPage - 1)} disabled={memberPage === 1}>
                        Prev
                    </button>
                    <div className="pag-info">
                        Page {memberPage} / {membersTotalPages}
                    </div>
                    <button
                        className="pag-btn"
                        onClick={() => gotoMemberPage(memberPage + 1)}
                        disabled={memberPage === membersTotalPages}
                    >
                        Next
                    </button>
                </div>
                </>
            )}
        </div>
    );
}
