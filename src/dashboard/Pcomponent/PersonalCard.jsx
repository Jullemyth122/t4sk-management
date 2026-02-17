import React from 'react';

const PRIORITY_STYLES = {
    high:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'High' },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Medium' },
    low:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',   label: 'Low' },
};

export default function PersonalCard({ card, listColor, onClick }) {
    const {
        title,
        priority,
        dueDate,
        tags = [],
        subtasksCompleted = 0,
        subtasksTotal = 0,
    } = card;

    const ps = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
    const progress = subtasksTotal > 0 ? Math.round((subtasksCompleted / subtasksTotal) * 100) : 0;
    const isDone = subtasksTotal > 0 && subtasksCompleted === subtasksTotal;

    const formattedDate = dueDate
        ? new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : null;

    // Check if overdue
    const isOverdue = dueDate && new Date(dueDate) < new Date() && !isDone;

    return (
        <div
            className={`pd-card ${isDone ? 'pd-card--done' : ''}`}
            onClick={() => onClick && onClick(card)}
        >
            {/* Tags Row */}
            {tags.length > 0 && (
                <div className="pd-card-tags">
                    {tags.map(tag => (
                        <span key={tag} className="pd-tag">{tag}</span>
                    ))}
                </div>
            )}

            {/* Title */}
            <h4 className="pd-card-title">{title}</h4>

            {/* Progress Bar */}
            {subtasksTotal > 0 && (
                <div className="pd-card-progress">
                    <div className="pd-progress-track">
                        <div
                            className="pd-progress-fill"
                            style={{
                                width: `${progress}%`,
                                background: isDone ? '#10b981' : listColor || ps.color,
                            }}
                        />
                    </div>
                    <span className="pd-progress-label">{subtasksCompleted}/{subtasksTotal}</span>
                </div>
            )}

            {/* Footer: Priority + Due Date */}
            <div className="pd-card-footer">
                <span
                    className="pd-priority-badge"
                    style={{ color: ps.color, background: ps.bg }}
                >
                    {ps.label}
                </span>

                {formattedDate && (
                    <span className={`pd-due-badge ${isOverdue ? 'overdue' : ''}`}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <circle cx="6" cy="6" r="5" />
                            <path d="M6 3v3.5l2.5 1" strokeLinecap="round" />
                        </svg>
                        {formattedDate}
                    </span>
                )}
            </div>
        </div>
    );
}
