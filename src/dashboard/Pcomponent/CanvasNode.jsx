import React, { useRef, useCallback } from 'react';

const PRIORITY_STYLES = {
    high:   { color: '#ef4444', bg: 'rgba(239,68,68,0.18)', label: 'High' },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.18)', label: 'Medium' },
    low:    { color: '#10b981', bg: 'rgba(16,185,129,0.18)', label: 'Low' },
};

function formatNodeDate(d) {
    if (!d) return null;
    try {
        const date = d && typeof d === 'object' && 'seconds' in d
            ? new Date(d.seconds * 1000)
            : new Date(d);
        if (isNaN(date.getTime())) return null;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch { return null; }
}

export default function CanvasNode({
    node,
    zoom,
    onDragStart,
    onNodeClick,
    onAddTask,
    onRenameList,
    onDeleteList,
    onUpdateListColor,
    requestPrompt,
}) {
    const nodeRef = useRef(null);
    const clickStartRef = useRef(null);

    const handleMouseDown = useCallback((e) => {
        if (e.target.closest('button')) return; // ignore clicks on buttons
        if (e.button !== 0) return;
        e.stopPropagation();
        clickStartRef.current = { x: e.clientX, y: e.clientY };
        onDragStart && onDragStart(node.id, e);
    }, [node.id, onDragStart]);

    const handleClick = useCallback((e) => {
        if (e.target.closest('button')) return; // ignore clicks on buttons
        e.stopPropagation();

        if (clickStartRef.current) {
            const dx = e.clientX - clickStartRef.current.x;
            const dy = e.clientY - clickStartRef.current.y;
            if (Math.hypot(dx, dy) > 5) return; // Prevent click if dragged
        }

        onNodeClick && onNodeClick(node);
    }, [node, onNodeClick]);

    const style = {
        transform: `translate(${node.x}px, ${node.y}px)`,
        width: node.width || (node.type === 'list' ? 220 : 260),
        zIndex: node.type === 'list' ? 2 : 1,
    };

    // ── List Node ──
    if (node.type === 'list') {
        return (
            <div
                ref={nodeRef}
                className="pc-node pc-node--list"
                style={style}
                onMouseDown={handleMouseDown}
            >
                <div className="pc-node-accent" style={{ background: node.color || '#6366f1' }} />
                <div className="pc-node-body">
                    <div className="pc-node-list-header">
                        <span className="pc-node-list-dot" style={{ background: node.color || '#6366f1' }} />
                        <span className="pc-node-list-name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                                title="Add Task"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (requestPrompt) {
                                        requestPrompt({
                                            title: `Add new task to ${node.name}`,
                                            fields: [{ id: 'title', label: 'Task Title' }],
                                            submitText: 'Add Task',
                                            onConfirm: (vals) => {
                                                if (vals.title && vals.title.trim()) onAddTask && onAddTask(node.listId, vals.title.trim());
                                            }
                                        });
                                    }
                                }}
                                style={{ background: 'transparent', border: 'none', color: 'var(--pd-text-muted)', cursor: 'pointer', padding: '2px', opacity: 0.7, transition: 'opacity 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                            >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                                </svg>
                            </button>
                            <button
                                title="Rename List"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (requestPrompt) {
                                        requestPrompt({
                                            title: 'Rename List',
                                            fields: [{ id: 'name', label: 'List Name', defaultValue: node.name }],
                                            submitText: 'Save',
                                            onConfirm: (vals) => {
                                                if (vals.name && vals.name.trim()) onRenameList && onRenameList(node.listId, vals.name.trim());
                                            }
                                        });
                                    }
                                }}
                                style={{ background: 'transparent', border: 'none', color: 'var(--pd-text-muted)', cursor: 'pointer', padding: '2px', opacity: 0.7, transition: 'opacity 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                            >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M12 2l2 2-9 9H3v-2l9-9zM3 13h10" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button
                                title="Change Color"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (requestPrompt) {
                                        requestPrompt({
                                            title: 'Change List Color',
                                            fields: [{ id: 'color', type: 'color', label: 'Pick a color', defaultValue: node.color || '#6366f1' }],
                                            submitText: 'Save Color',
                                            onConfirm: (vals) => {
                                                if (vals.color) onUpdateListColor && onUpdateListColor(node.listId, vals.color);
                                            }
                                        });
                                    }
                                }}
                                style={{ background: 'transparent', border: 'none', color: 'var(--pd-text-muted)', cursor: 'pointer', padding: '2px', opacity: 0.7, transition: 'opacity 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                            >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 2c-3.3 0-6 2.7-6 6 0 1.7.7 3.2 1.8 4.2C3 13.8 2 15 2 15h3c1.3 1.3 3 2 5 2 4.4 0 8-3.6 8-8s-3.6-8-8-8zm-2 6c-.8 0-1.5-.7-1.5-1.5S5.2 5 6 5s1.5.7 1.5 1.5S6.8 8 6 8zm1.5-4C8.3 4 9 3.3 9 2.5S8.3 1 7.5 1 6 1.7 6 2.5 6.7 4 7.5 4zm4.5 4c-.8 0-1.5-.7-1.5-1.5S11.2 5 12 5s1.5.7 1.5 1.5S12.8 8 12 8z" />
                                </svg>
                            </button>
                            <button
                                title="Delete List"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (requestPrompt) {
                                        requestPrompt({
                                            title: `Delete list "${node.name}"?`,
                                            description: 'This action cannot be undone and will delete all tasks inside this list.',
                                            submitText: 'Delete List',
                                            danger: true,
                                            onConfirm: () => {
                                                onDeleteList && onDeleteList(node.listId);
                                            }
                                        });
                                    }
                                }}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', opacity: 0.7, transition: 'opacity 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                            >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M12 4v9a2 2 0 01-2 2H6a2 2 0 01-2-2V4M2 4h12M6 4V2a1 1 0 011-1h2a1 1 0 011 1v2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="pc-node-list-meta">
                        {node.cardCount} {node.cardCount === 1 ? 'task' : 'tasks'}
                    </div>
                </div>
            </div>
        );
    }

    // ── Card Node ──
    const card = node.card || {};
    const ps = card.priority ? PRIORITY_STYLES[card.priority] : null;
    const subtasks = card.subtasks || [];
    const completed = subtasks.filter(s => s.completed).length;
    const total = subtasks.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : (card.progress || 0);
    const isDone = card.status === 'done' || progress >= 100;
    const formattedDue = formatNodeDate(card.dueDate);
    const tags = card.tags || [];

    return (
        <div
            ref={nodeRef}
            className={`pc-node pc-node--card ${isDone ? 'pc-node--done' : ''}`}
            style={style}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
        >
            <div className="pc-node-accent" style={{ background: node.listColor || '#6366f1' }} />
            <div className="pc-node-body">
                {/* Tags */}
                {tags.length > 0 && (
                    <div className="pc-node-tags">
                        {tags.slice(0, 3).map(t => (
                            <span key={t} className="pc-node-tag">{t}</span>
                        ))}
                        {tags.length > 3 && <span className="pc-node-tag pc-node-tag--more">+{tags.length - 3}</span>}
                    </div>
                )}

                {/* Title */}
                <div className="pc-node-title">{card.title}</div>

                {/* Progress */}
                {total > 0 && (
                    <div className="pc-node-progress">
                        <div className="pc-node-progress-track">
                            <div
                                className="pc-node-progress-fill"
                                style={{
                                    width: `${progress}%`,
                                    background: isDone ? '#10b981' : (node.listColor || '#6366f1'),
                                }}
                            />
                        </div>
                        <span className="pc-node-progress-label">{completed}/{total}</span>
                    </div>
                )}

                {/* Footer: priority + date */}
                <div className="pc-node-footer">
                    {ps && (
                        <span className="pc-node-priority" style={{ color: ps.color, background: ps.bg }}>
                            {ps.label}
                        </span>
                    )}
                    {formattedDue && (
                        <span className="pc-node-date">
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                                <circle cx="6" cy="6" r="5" />
                                <path d="M6 3v3.5l2.5 1" strokeLinecap="round" />
                            </svg>
                            {formattedDue}
                        </span>
                    )}
                    {isDone && (
                        <span className="pc-node-done-badge">✓</span>
                    )}
                </div>
            </div>
        </div>
    );
}
