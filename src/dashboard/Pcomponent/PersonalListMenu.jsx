import React, { useState, useEffect, useRef } from 'react';

const COLOR_PRESETS = [
    '#f59e0b', '#ef4444', '#10b981', '#6366f1',
    '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6',
    '#f97316', '#84cc16', '#06b6d4', '#a855f7',
];

const SORT_OPTIONS = [
    { value: 'priority', label: 'By Priority' },
    { value: 'date', label: 'By Due Date' },
    { value: 'title', label: 'By Title (A-Z)' },
];

const MENU_ITEMS = [
    { id: 'rename', label: 'Rename List', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M10.5 2.5l2 2L5 12H3v-2l7.5-7.5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )},
    { id: 'color', label: 'Change Color', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="7.5" cy="7.5" r="5.5" />
            <path d="M7.5 2v11" />
            <path d="M2 7.5h11" />
        </svg>
    )},
    { id: 'duplicate', label: 'Duplicate List', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="4" y="4" width="9" height="9" rx="2" />
            <path d="M2 11V3a2 2 0 012-2h8" strokeLinecap="round" />
        </svg>
    )},
    { id: 'sort', label: 'Sort Cards', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M2 4h11M2 7.5h7M2 11h4" strokeLinecap="round" />
        </svg>
    )},
    { id: 'move', label: 'Move All Cards', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M7.5 2v11M2 7.5l5.5 5.5 5.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )},
    { id: 'divider' },
    { id: 'archive', label: 'Archive List', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="1" y="2" width="13" height="3" rx="1" />
            <path d="M2 5v7a1 1 0 001 1h9a1 1 0 001-1V5" />
            <path d="M6 8h3" strokeLinecap="round" />
        </svg>
    )},
    { id: 'delete', label: 'Delete List', danger: true, icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M3 4h9M5.5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M6 7v4M9 7v4" strokeLinecap="round" />
            <path d="M3.5 4l.5 9a1 1 0 001 1h5a1 1 0 001-1l.5-9" />
        </svg>
    )},
];

export default function PersonalListMenu({
    anchorRef,
    onClose,
    listId,
    listName,
    allLists,
    onRename,
    onChangeColor,
    onDuplicate,
    onSort,
    onMoveAll,
    onArchive,
    onDelete,
}) {
    const menuRef = useRef(null);
    const [subView, setSubView] = useState(null); // 'color' | 'sort' | 'move' | null

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                if (subView) {
                    setSubView(null);
                } else {
                    onClose();
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [onClose, subView]);

    const handleItemClick = (itemId) => {
        switch (itemId) {
            case 'rename':
                onRename && onRename();
                break;
            case 'color':
                setSubView('color');
                break;
            case 'duplicate':
                onDuplicate && onDuplicate();
                break;
            case 'sort':
                setSubView('sort');
                break;
            case 'move':
                setSubView('move');
                break;
            case 'archive':
                onArchive && onArchive();
                break;
            case 'delete':
                onDelete && onDelete();
                break;
            default:
                onClose();
        }
    };

    // Sub-view: Color Picker
    if (subView === 'color') {
        return (
            <div className="pd-list-menu" ref={menuRef}>
                <div className="pd-list-menu-header">
                    <button className="pd-list-menu-back" onClick={() => setSubView(null)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 3L5 7l4 4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <span className="pd-list-menu-title">Choose Color</span>
                    <button className="pd-list-menu-close" onClick={onClose}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 3l8 8M11 3L3 11" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
                <div className="pd-color-picker-grid">
                    {COLOR_PRESETS.map(clr => (
                        <button
                            key={clr}
                            className="pd-color-swatch"
                            style={{ background: clr }}
                            onClick={() => onChangeColor && onChangeColor(clr)}
                            title={clr}
                        />
                    ))}
                </div>
                <div style={{ marginTop: '12px', padding: '0 12px 12px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>Custom Hex</div>
                    <input 
                        type="text" 
                        placeholder="#FFFFFF"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #374151', background: '#111827', color: '#f3f4f6', fontSize: '0.8rem' }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const val = e.target.value.trim();
                                if (/^#[0-9A-F]{6}$/i.test(val) || /^#[0-9A-F]{3}$/i.test(val)) {
                                    onChangeColor && onChangeColor(val);
                                } else {
                                    alert('Please enter a valid hex color code (e.g. #ff0000)');
                                }
                            }
                        }}
                    />
                </div>
            </div>
        );
    }

    // Sub-view: Sort Options
    if (subView === 'sort') {
        return (
            <div className="pd-list-menu" ref={menuRef}>
                <div className="pd-list-menu-header">
                    <button className="pd-list-menu-back" onClick={() => setSubView(null)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 3L5 7l4 4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <span className="pd-list-menu-title">Sort Cards</span>
                    <button className="pd-list-menu-close" onClick={onClose}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 3l8 8M11 3L3 11" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
                <div className="pd-list-menu-items">
                    {SORT_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            className="pd-list-menu-item"
                            onClick={() => onSort && onSort(opt.value)}
                        >
                            <span>{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Sub-view: Move to list
    if (subView === 'move') {
        const otherLists = (allLists || []).filter(l => l.id !== listId);
        return (
            <div className="pd-list-menu" ref={menuRef}>
                <div className="pd-list-menu-header">
                    <button className="pd-list-menu-back" onClick={() => setSubView(null)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 3L5 7l4 4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <span className="pd-list-menu-title">Move To</span>
                    <button className="pd-list-menu-close" onClick={onClose}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 3l8 8M11 3L3 11" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
                <div className="pd-list-menu-items">
                    {otherLists.length === 0 ? (
                        <div className="pd-list-menu-empty">No other lists</div>
                    ) : (
                        otherLists.map(l => (
                            <button
                                key={l.id}
                                className="pd-list-menu-item"
                                onClick={() => onMoveAll && onMoveAll(l.id)}
                            >
                                <span className="pd-list-dot pd-list-dot--small" style={{ background: l.color }} />
                                <span>{l.name}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // Main menu
    return (
        <div className="pd-list-menu" ref={menuRef}>
            <div className="pd-list-menu-header">
                <span className="pd-list-menu-title">{listName}</span>
                <button className="pd-list-menu-close" onClick={onClose}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3l8 8M11 3L3 11" strokeLinecap="round" />
                    </svg>
                </button>
            </div>

            <div className="pd-list-menu-items">
                {MENU_ITEMS.map(item => {
                    if (item.id === 'divider') {
                        return <div key={item.id} className="pd-list-menu-divider" />;
                    }
                    return (
                        <button
                            key={item.id}
                            className={`pd-list-menu-item ${item.danger ? 'danger' : ''}`}
                            onClick={() => handleItemClick(item.id)}
                        >
                            <span className="pd-list-menu-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
