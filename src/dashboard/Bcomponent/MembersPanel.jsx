import React from 'react';

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
    workloadMap = {},
    canViewMembers = true,
    memberRoleFilter = 'all',
    setMemberRoleFilter,
}) {
    // Determine status color/text helper
    const getStatus = (uid) => {
        const count = workloadMap[String(uid)] || 0;
        if (count > 0) return { label: 'Active', className: 'status-active', count };
        return { label: 'Idle', className: 'status-idle', count: 0 };
    };

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

    return (
        <div className="bd-section members-panel-full">
            <div className="members-controls">
                <input
                    className="members-search"
                    placeholder="Search members..."
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    aria-label="Search members"
                />
            </div>

            <div className="members-filters">
                <select
                    className="filter-select"
                    value={memberRoleFilter}
                    onChange={(e) => {
                        setMemberRoleFilter(e.target.value);
                        gotoMemberPage(1);
                    }}
                    aria-label="Filter members by role"
                >
                    <option value="all">All Roles</option>
                    <option value="active">Status: Active</option>
                    <option value="idle">Status: Idle</option>
                    <option disabled>──────────</option>
                    {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>

                <select
                    className="filter-select mini"
                    value={membersPerPage}
                    onChange={(e) => {
                        setMembersPerPage(Number(e.target.value));
                        gotoMemberPage(1);
                    }}
                    title="Items per page"
                >
                    <option value={6}>6</option>
                    <option value={12}>12</option>
                    <option value={20}>20</option>
                </select>
            </div>

            {membersLoading ? (
                <div className="muted" style={{ padding: '0 10px' }}>Loading...</div>
            ) : membersError ? (
                <div className="bd-uierror">{membersError}</div>
            ) : members.length === 0 ? (
                        <div className="muted" style={{ padding: '0 10px' }}>No members found.</div>
            ) : (
                <>
                                <ul className="members-list-full">
                                    {visibleMembers.map((m) => {
                                        const uid = String(m.uid || m.id);
                                        const { label, className, count } = getStatus(uid);
                                        const roleName = m.roleName || (roles.find((r) => r.id === m.roleId)?.name || 'Member');

                                        return (
                                <li key={m.id || uid} className="member-row-full">
                                    <div className="m-left">
                                        <div className="member-avatar-medium">
                                            {(m.name || m.email || 'U').substring(0, 2).toUpperCase()}
                                            {count > 0 && <span className="active-badge-dot" />}
                                        </div>
                                    </div>
                                    <div className="m-right">
                                        <div className="m-head">
                                            <span className="m-name">{m.name || m.email?.split('@')[0]}</span>
                                            <span className={`m-status ${className}`}>{label}</span>
                                        </div>
                                                    <div className="m-sub">
                                                        {roleName} • {count > 0 ? `Workload: ${count}` : 'No active tasks'}
                                                    </div>
                                                    <div className="m-actions">
                                                        <div className="m-email" title={m.email}>{m.email}</div>
                                                        <button className="m-copy-btn" onClick={() => copyEmail(m.id, m.email || m.uid)}>
                                                            {copiedEmailId === m.id ? 'Copied' : 'Copy Email'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>

                                <div className="members-pagination">
                                    <div className="pagination-controls">
                                        <button
                                            className="pag-icon-btn"
                                            onClick={() => gotoMemberPage(memberPage - 1)}
                                            disabled={memberPage === 1}
                                            title="Previous Page"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>

                                        <span className="pag-info">
                                            <span className="current">{memberPage}</span>
                                            <span className="sep">/</span>
                                            <span className="total">{membersTotalPages}</span>
                                        </span>

                                        <button 
                                            className="pag-icon-btn"
                                            onClick={() => gotoMemberPage(memberPage + 1)}
                                            disabled={memberPage === membersTotalPages}
                                            title="Next Page"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                </>
            )}
        </div>
    );
}
