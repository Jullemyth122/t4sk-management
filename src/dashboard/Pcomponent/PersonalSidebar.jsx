import React from 'react';

const STATIC_BOARDS = [
    { id: '1', name: 'My Tasks', icon: '📋', count: 12 },
    { id: '2', name: 'Side Projects', icon: '🚀', count: 5 },
    { id: '3', name: 'Learning', icon: '📚', count: 8 },
];

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="7" height="7" rx="2" />
            <rect x="10" y="1" width="7" height="4" rx="2" />
            <rect x="1" y="10" width="7" height="4" rx="2" />
            <rect x="10" y="7" width="7" height="7" rx="2" />
        </svg>
    )},
    { id: 'calendar', label: 'Calendar', icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="14" height="13" rx="2" />
            <path d="M2 7h14M6 1v4M12 1v4" />
        </svg>
    )},
    { id: 'stats', label: 'Statistics', icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 16h14M4 12v4M8 8v8M12 5v11M16 2v14" strokeLinecap="round" />
        </svg>
    )},
];

export default function PersonalSidebar({ user, sidebarCollapsed, setSidebarCollapsed, activeTab, setActiveTab }) {

    return (
        <aside className={`pd-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            {/* Logo */}
            <div className="pd-sidebar-header">
                <div className="pd-logo">
                    <span className="pd-logo-mark">T</span>
                    {!sidebarCollapsed && <span className="pd-logo-text">T 4 S K</span>}
                </div>
                <button
                    className="pd-collapse-btn"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    title={sidebarCollapsed ? 'Expand' : 'Collapse'}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        {sidebarCollapsed ? (
                            <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                        ) : (
                            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                    </svg>
                </button>
            </div>

            {/* User Profile */}
            <div className="pd-profile-card">
                <div className="pd-profile-avatar">
                    {user?.photoURL ? (
                        <img src={user.photoURL} alt="" />
                    ) : (
                        <span>{user?.displayName?.[0] || 'U'}</span>
                    )}
                    <div className="pd-online-dot" />
                </div>
                {!sidebarCollapsed && (
                    <div className="pd-profile-info">
                        <span className="pd-profile-name">{user?.displayName || 'User'}</span>
                        <span className="pd-profile-role">Personal Workspace</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="pd-nav">
                {!sidebarCollapsed && <span className="pd-nav-label">MENU</span>}
                {NAV_ITEMS.map(item => (
                    <button
                        key={item.id}
                        className={`pd-nav-item ${item.id === activeTab ? 'active' : ''}`}
                        title={item.label}
                        onClick={() => setActiveTab && setActiveTab(item.id)}
                    >
                        <span className="pd-nav-icon">{item.icon}</span>
                        {!sidebarCollapsed && <span className="pd-nav-text">{item.label}</span>}
                    </button>
                ))}

            </nav>

            {/* Board List */}
            <div className="pd-boards-section">
                {!sidebarCollapsed && (
                    <div className="pd-boards-header">
                        <span className="pd-nav-label">BOARDS</span>
                        <button className="pd-boards-add-btn" title="New Board">+</button>
                    </div>
                )}
                <div className="pd-boards-list">
                    {STATIC_BOARDS.map((board, i) => (
                        <button
                            key={board.id}
                            className={`pd-board-item ${i === 0 ? 'active' : ''}`}
                            title={board.name}
                        >
                            <span className="pd-board-icon">{board.icon}</span>
                            {!sidebarCollapsed && (
                                <>
                                    <span className="pd-board-name">{board.name}</span>
                                    <span className="pd-board-count">{board.count}</span>
                                </>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Spacer */}
            <div className="pd-sidebar-spacer" />

            {/* Footer */}
            <div className="pd-sidebar-footer">
                <button className="pd-nav-item" title="Settings">
                    <span className="pd-nav-icon">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="9" cy="9" r="3" />
                            <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.3 3.3l1.4 1.4M13.3 13.3l1.4 1.4M3.3 14.7l1.4-1.4M13.3 4.7l1.4-1.4" strokeLinecap="round" />
                        </svg>
                    </span>
                    {!sidebarCollapsed && <span className="pd-nav-text">Settings</span>}
                </button>
            </div>
        </aside>
    );
}
