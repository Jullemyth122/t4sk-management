import React, { useState, useRef, useEffect } from 'react';
import MarkdownPreview from './MarkdownPreview';

const PRIORITY_STYLES = {
    high:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'High' },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Medium' },
    low:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',   label: 'Low' },
};

function formatCardDate(d) {
    if (!d) return null;
    try {
        const date = d && typeof d === 'object' && 'seconds' in d
            ? new Date(d.seconds * 1000)
            : new Date(d);
        if (isNaN(date.getTime())) return null;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch { return null; }
}

export default function PersonalCard({ card, listColor, onClick, index, listId, allLists = [], onMoveCard, highlightItemId }) {
    const {
        title,
        description,
        priority,
        dueDate,
        startDate,
        tags = [],
        status,
        progress: cardProgress,
        subtasksCompleted = 0,
        subtasksTotal = 0,
    } = card;

    const [moveMenuOpen, setMoveMenuOpen] = useState(false);
    const moveMenuRef = useRef(null);

    useEffect(() => {
        if (!moveMenuOpen) return;
        const handleClickOutside = (e) => {
            if (moveMenuRef.current && !moveMenuRef.current.contains(e.target)) {
                setMoveMenuOpen(false);
            }
        };
        const handleEsc = (e) => {
            if (e.key === 'Escape') setMoveMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [moveMenuOpen]);

    const otherLists = allLists.filter(l => l.id !== listId);

    const handleMoveToList = (toListId) => {
        if (onMoveCard) {
            onMoveCard(card.id, listId, toListId);
        }
        setMoveMenuOpen(false);
    };

    const ps = priority ? (PRIORITY_STYLES[priority] || null) : null;
    const progress = subtasksTotal > 0 ? Math.round((subtasksCompleted / subtasksTotal) * 100) : (cardProgress || 0);
    const isDone = status === 'done' || (cardProgress != null && cardProgress >= 100) || (subtasksTotal > 0 && subtasksCompleted === subtasksTotal);

    const formattedDue = formatCardDate(dueDate);
    const formattedStart = formatCardDate(startDate);

    // Check if overdue
    const isOverdue = dueDate && (() => {
        if (isDone) return false;
        let cDate = null;
        if (typeof dueDate === 'object' && dueDate.seconds) {
            const dObj = new Date(dueDate.seconds * 1000);
            cDate = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
        } else {
            const dStr = String(dueDate);
            if (dStr.includes('T')) {
                const dObj = new Date(dStr);
                if (!isNaN(dObj.getTime())) {
                    cDate = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
                }
            } else if (dStr.length >= 10) {
                cDate = dStr.slice(0, 10);
            }
        }
        if (!cDate) return false;
        
        const localNow = new Date();
        const todayLocal = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
        return cDate < todayLocal;
    })();

    const isStartToday = startDate && (() => {
        let sDate = null;
        if (typeof startDate === 'object' && startDate.seconds) {
            const dObj = new Date(startDate.seconds * 1000);
            sDate = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
        } else {
            const dStr = String(startDate);
            if (dStr.includes('T')) {
                const dObj = new Date(dStr);
                if (!isNaN(dObj.getTime())) {
                    sDate = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
                }
            } else if (dStr.length >= 10) {
                sDate = dStr.slice(0, 10);
            }
        }
        if (!sDate) return false;
        
        const localNow = new Date();
        const todayLocal = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
        return sDate === todayLocal;
    })();

    const highlightClass = card.id === highlightItemId 
        ? (isOverdue ? 'pd-highlight-pulse--overdue' : (isStartToday ? 'pd-highlight-pulse--start' : 'pd-highlight-pulse'))
        : '';

    // Scroll to element if highlighted
    useEffect(() => {
        if (highlightItemId === card.id) {
            const el = document.getElementById(`card-${card.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightItemId, card.id]);

    // Move menu button + dropdown (shared by both branches)
    const renderMoveMenu = () => {
        if (!listId || otherLists.length === 0) return null;
        return (
            <div className="pd-card-menu-wrapper" ref={moveMenuRef}>
                <button
                    className="pd-card-menu-btn"
                    title="Move card"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMoveMenuOpen(!moveMenuOpen);
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="3" r="1.5" />
                        <circle cx="8" cy="8" r="1.5" />
                        <circle cx="8" cy="13" r="1.5" />
                    </svg>
                </button>
                {moveMenuOpen && (
                    <div className="pd-card-move-menu" onClick={(e) => e.stopPropagation()}>
                        <div className="pd-card-move-menu-header">
                            <span>Move to</span>
                        </div>
                        {otherLists.map(l => (
                            <button
                                key={l.id}
                                className="pd-card-move-item"
                                onClick={() => handleMoveToList(l.id)}
                            >
                                <span className="pd-list-dot pd-list-dot--small" style={{ background: l.color }} />
                                <span>{l.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Always render Draggable, if index is provided (board view)
    if (index === undefined) {
        return (
            <div id={`card-${card.id}`} className={`pd-card ${isDone ? 'pd-card--done' : ''} ${highlightClass}`} onClick={() => onClick && onClick(card)}>
                {renderMoveMenu()}
                {/* ... Fallback for list view where no dnd is needed ... */}
                {tags.length > 0 && (
                    <div className="pd-card-tags">
                        {tags.map(tag => <span key={tag} className="pd-tag">{tag}</span>)}
                    </div>
                )}
                <h4 className="pd-card-title">{title}</h4>
                {description && (
                    <div className="pd-card-desc-preview">
                        <MarkdownPreview text={description} className="pd-card-md" />
                    </div>
                )}
                {/* Progress Bar */}
                {subtasksTotal > 0 && (
                    <div className="pd-card-progress">
                        <div className="pd-progress-track">
                            <div className="pd-progress-fill" style={{ width: `${progress}%`, background: isDone ? '#10b981' : listColor || (ps ? ps.color : '#f59e0b') }} />
                        </div>
                        <span className="pd-progress-label">{subtasksCompleted}/{subtasksTotal}</span>
                    </div>
                )}
                {/* Dates Row */}
                <div className="pd-card-dates">
                    <div className="pd-card-date-item">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <rect x="1.5" y="2" width="9" height="8" rx="1.5" />
                            <path d="M1.5 5h9" />
                            <path d="M4 1v2M8 1v2" strokeLinecap="round" />
                        </svg>
                        <span className="pd-card-date-label">Start:</span>
                        <span className="pd-card-date-value">{formattedStart || 'Not set'}</span>
                    </div>
                    <div className={`pd-card-date-item ${isOverdue ? 'pd-card-date-item--overdue' : ''}`}>
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <circle cx="6" cy="6" r="5" />
                            <path d="M6 3v3.5l2.5 1" strokeLinecap="round" />
                        </svg>
                        <span className="pd-card-date-label">Due:</span>
                        <span className="pd-card-date-value">{formattedDue || 'Not set'}</span>
                    </div>
                </div>
                {/* Footer: Priority */}
                <div className="pd-card-footer">
                    {ps ? (
                        <span className="pd-priority-badge" style={{ color: ps.color, background: ps.bg }}>{ps.label}</span>
                    ) : (
                        <span className="pd-priority-badge pd-priority-badge--none">No priority</span>
                    )}
                    {formattedDue && isOverdue && (
                        <span className="pd-due-badge overdue">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                                <circle cx="6" cy="6" r="5" />
                                <path d="M6 3v3.5l2.5 1" strokeLinecap="round" />
                            </svg>
                            Overdue
                        </span>
                    )}
                    {isDone && (
                        <span className="pd-due-badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                            ✓ Done
                        </span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            id={`card-${card.id}`}
            className={`pd-card ${isDone ? 'pd-card--done' : ''} ${highlightClass}`}
            onClick={() => onClick && onClick(card)}
        >
            {renderMoveMenu()}

            {/* Tags Row */}
            {tags.length > 0 && (
                <div className="pd-card-tags">
                    {tags.map(tag => (
                        <span key={tag} className="pd-tag">{tag}</span>
                    ))}
                </div>
            )}

            <h4 className="pd-card-title">{title}</h4>

            {/* Description preview */}
            {description && (
                <div className="pd-card-desc-preview">
                    <MarkdownPreview text={description} className="pd-card-md" />
                </div>
            )}

            {/* Progress Bar */}
            {subtasksTotal > 0 && (
                <div className="pd-card-progress">
                    <div className="pd-progress-track">
                        <div
                            className="pd-progress-fill"
                            style={{
                                width: `${progress}%`,
                                background: isDone ? '#10b981' : listColor || (ps ? ps.color : '#f59e0b'),
                            }}
                        />
                    </div>
                    <span className="pd-progress-label">{subtasksCompleted}/{subtasksTotal}</span>
                </div>
            )}

            {/* Dates Row */}
            <div className="pd-card-dates">
                <div className="pd-card-date-item">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <rect x="1.5" y="2" width="9" height="8" rx="1.5" />
                        <path d="M1.5 5h9" />
                        <path d="M4 1v2M8 1v2" strokeLinecap="round" />
                    </svg>
                    <span className="pd-card-date-label">Start:</span>
                    <span className="pd-card-date-value">{formattedStart || 'Not set'}</span>
                </div>
                <div className={`pd-card-date-item ${isOverdue ? 'pd-card-date-item--overdue' : ''}`}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <circle cx="6" cy="6" r="5" />
                        <path d="M6 3v3.5l2.5 1" strokeLinecap="round" />
                    </svg>
                    <span className="pd-card-date-label">Due:</span>
                    <span className="pd-card-date-value">{formattedDue || 'Not set'}</span>
                </div>
            </div>

            {/* Footer: Priority */}
            <div className="pd-card-footer">
                {ps ? (
                    <span
                        className="pd-priority-badge"
                        style={{ color: ps.color, background: ps.bg }}
                    >
                        {ps.label}
                    </span>
                ) : (
                    <span className="pd-priority-badge pd-priority-badge--none">No priority</span>
                )}

                {formattedDue && isOverdue && (
                    <span className="pd-due-badge overdue">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <circle cx="6" cy="6" r="5" />
                            <path d="M6 3v3.5l2.5 1" strokeLinecap="round" />
                        </svg>
                        Overdue
                    </span>
                )}
                {isDone && (
                    <span className="pd-due-badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                        ✓ Done
                    </span>
                )}
            </div>
        </div>
    );
}
