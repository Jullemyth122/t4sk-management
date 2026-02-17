import React, { useEffect, useRef } from 'react';

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

export default function PersonalListMenu({ anchorRef, onClose, listName }) {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

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
                            onClick={() => {
                                // Static — just close
                                onClose();
                            }}
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
