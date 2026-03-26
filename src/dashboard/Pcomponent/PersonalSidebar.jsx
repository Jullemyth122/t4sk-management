import React, { useState, useEffect, useCallback } from 'react';
import PcPromptModal from './PcPromptModal';

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="7" height="7" rx="2" />
            <rect x="10" y="1" width="7" height="4" rx="2" />
            <rect x="1" y="10" width="7" height="4" rx="2" />
            <rect x="10" y="7" width="7" height="7" rx="2" />
        </svg>
    )},
    {
        id: 'today', label: 'Today', icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="9" r="6" />
                <path d="M9 5v4l2.5 2.5" strokeLinecap="round" />
            </svg>
        )
    },
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
    { id: 'canvas', label: 'Canvas', icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h10v10H4zM4 9h10M9 4v10" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="9" r="2" fill="currentColor" />
        </svg>
    )},
];

export default function PersonalSidebar({
    user,
    sidebarCollapsed,
    setSidebarCollapsed,
    activeTab,
    setActiveTab,
    boards = [],
    selectedBoardId,
    setSelectedBoardId,
    onCreateBoard,
    onRenameBoard,
    onDeleteBoard,
    lists = [],
    highlightItemId,
    aiGenerating,
    genProgressText,
    handleGenerateBoard,
}) {
    const [isCreatingBoard, setIsCreatingBoard] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [genPrompt, setGenPrompt] = useState('');

    useEffect(() => {
        if (highlightItemId) {
            const el = document.getElementById(`board-${highlightItemId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightItemId]);

    const handleSubmitBoard = () => {
        const name = newBoardName.trim();
        if (!name) return;
        onCreateBoard && onCreateBoard(name);
        setNewBoardName('');
        setIsCreatingBoard(false);
    };

    const [promptOpts, setPromptOpts] = useState(null);
    const requestPrompt = useCallback((opts) => {
        setPromptOpts({ ...opts, onCancel: () => setPromptOpts(null) });
    }, []);

    // Calculate task count per board — for the selected board, use lists prop
    const getBoardTaskCount = (boardId) => {
        if (boardId === selectedBoardId) {
            return lists.reduce((sum, l) => sum + (l.cards?.length || 0), 0);
        }
        return null; // We don't have counts for non-selected boards
    };

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

            {/* Board List — Dynamic */}
            <div className="pd-boards-section">
                {!sidebarCollapsed && (
                    <div className="pd-boards-header">
                        <span className="pd-nav-label">BOARDS</span>
                        <button
                            className="pd-boards-add-btn"
                            title="New Board"
                            onClick={() => setIsCreatingBoard(!isCreatingBoard)}
                        >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M6 2v8M2 6h8" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Inline board creation */}
                {isCreatingBoard && !sidebarCollapsed && (
                    <div className="pd-create-board-form">
                        <input
                            autoFocus
                            type="text"
                            className="pd-create-board-input"
                            placeholder="Board name..."
                            value={newBoardName}
                            onChange={e => setNewBoardName(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSubmitBoard();
                                if (e.key === 'Escape') { setIsCreatingBoard(false); setNewBoardName(''); }
                            }}
                        />
                        <div className="pd-create-board-actions">
                            <button className="pd-create-board-submit" onClick={handleSubmitBoard}>
                                Create
                            </button>
                            <button className="pd-create-board-cancel" onClick={() => { setIsCreatingBoard(false); setNewBoardName(''); }}>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M3 3l8 8M11 3l-8 8" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                <div className="pd-boards-list">
                    {boards.map((board) => {
                        const count = getBoardTaskCount(board.id);
                        return (
                            <div
                                key={board.id}
                                id={`board-${board.id}`}
                                className={`pd-board-item ${board.id === selectedBoardId ? 'active' : ''} ${board.id === highlightItemId ? 'pd-highlight-pulse' : ''}`}
                                title={board.name}
                                onClick={() => setSelectedBoardId && setSelectedBoardId(board.id)}
                                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', textAlign: 'left', width: '100%', background: 'none', border: 'none' }}
                            >
                                <span className="pd-board-icon">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M4 5h8M4 8h8M4 11h5" strokeLinecap="round" />
                                    </svg>
                                </span>
                                {!sidebarCollapsed && (
                                    <>
                                        <span className="pd-board-name">{board.name}</span>
                                        {count != null && <span className="pd-board-count">{count}</span>}
                                        {board.id === selectedBoardId && (
                                            <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                                                <button
                                                    className="pd-board-options-btn"
                                                    title="Rename Board"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        requestPrompt({
                                                            title: 'Rename Board',
                                                            fields: [{ id: 'name', label: 'Board Name', defaultValue: board.name }],
                                                            submitText: 'Save',
                                                            onConfirm: (vals) => {
                                                                if (vals.name && vals.name.trim() && vals.name !== board.name) {
                                                                    onRenameBoard && onRenameBoard(board.id, vals.name.trim());
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    style={{ background: 'transparent', border: 'none', color: 'inherit', opacity: 0.6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }}
                                                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                    onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path d="M12 2l2 2-9 9H3v-2l9-9zM3 13h10" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </button>
                                                <button
                                                    className="pd-board-options-btn"
                                                    title="Delete Board"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        requestPrompt({
                                                            title: `Delete Board "${board.name}"?`,
                                                            description: 'Are you sure you want to delete this board and all its contents? This cannot be undone.',
                                                            submitText: 'Delete Board',
                                                            danger: true,
                                                            onConfirm: () => {
                                                                onDeleteBoard && onDeleteBoard(board.id);
                                                            }
                                                        });
                                                    }}
                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', opacity: 0.6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }}
                                                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                    onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path d="M12 4v9a2 2 0 01-2 2H6a2 2 0 01-2-2V4M2 4h12M6 4V2a1 1 0 011-1h2a1 1 0 011 1v2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                    {boards.length === 0 && !sidebarCollapsed && (
                        <div style={{ padding: '8px 12px', fontSize: '0.8rem', opacity: 0.5, fontStyle: 'italic' }}>
                            No boards yet
                        </div>
                    )}
                </div>
            </div>

            {/* AI Generative Board */}
            {!sidebarCollapsed && handleGenerateBoard && (
                <div className="pd-boards-section" style={{ marginTop: '0', borderTop: '1px solid var(--pd-border-subtle, rgba(255,255,255,0.1))', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pd-text-muted, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 1rem', marginBottom: '0.5rem' }}>Generative Task</div>
                    <div style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <textarea
                            className="pd-create-board-input"
                            placeholder="e.g. Setup marketing campaign for new shoes"
                            value={genPrompt}
                            onChange={e => setGenPrompt(e.target.value)}
                            disabled={aiGenerating}
                            rows={3}
                            style={{ width: '100%', resize: 'none', fontFamily: 'inherit', padding: '0.5rem', borderRadius: '4px', background: 'var(--pd-surface, rgba(255,255,255,0.05))', color: 'inherit', border: '1px solid var(--pd-border, rgba(255,255,255,0.1))' }}
                        />
                        <button
                            className="pd-create-board-submit"
                            onClick={() => { handleGenerateBoard(genPrompt); setGenPrompt(''); }}
                            disabled={aiGenerating || !genPrompt.trim()}
                            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '0.5rem', borderRadius: '4px', background: 'var(--pd-primary, #6366f1)', color: '#fff', border: 'none', cursor: 'pointer', opacity: (aiGenerating || !genPrompt.trim()) ? 0.6 : 1 }}
                        >
                            {aiGenerating ? (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                                        <circle cx="12" cy="12" r="10" strokeDasharray="32"></circle>
                                    </svg>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                        <path d="M2 17l10 5 10-5" />
                                        <path d="M2 12l10 5 10-5" />
                                    </svg>
                                    Generate Board
                                </>
                            )}
                        </button>
                        {aiGenerating && genProgressText && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--pd-primary, #6366f1)', textAlign: 'center', animation: 'pulse-op 1.5s infinite', marginTop: '2px' }}>
                                {genProgressText}
                            </div>
                        )}
                    </div>
                </div>
            )}

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
            
            {/* Custom Prompt Modal */}
            <PcPromptModal opts={promptOpts} />
        </aside>
    );
}
