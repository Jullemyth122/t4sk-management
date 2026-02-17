import React from 'react';
import { createPortal } from 'react-dom';

const PRIORITY_STYLES = {
    high:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'High' },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Medium' },
    low:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',   label: 'Low' },
};

export default function PersonalCardModal({ card, listName, listColor, onClose }) {
    if (!card) return null;

    const {
        title,
        description,
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
        ? new Date(dueDate).toLocaleDateString(undefined, {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        })
        : 'No due date';

    const isOverdue = dueDate && new Date(dueDate) < new Date() && !isDone;

    // Generate static subtask items
    const subtasks = [];
    for (let i = 0; i < subtasksTotal; i++) {
        subtasks.push({
            id: i,
            label: `Subtask ${i + 1}`,
            done: i < subtasksCompleted,
        });
    }

    return createPortal(
        <div className="pd-modal-overlay" onClick={onClose}>
            <div className="pd-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="pd-modal-header">
                    <div className="pd-modal-header-left">
                        <span className="pd-list-dot" style={{ background: listColor }} />
                        <span className="pd-modal-list-label">{listName}</span>
                    </div>
                    <button className="pd-modal-close" onClick={onClose}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4l10 10M14 4L4 14" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Title */}
                <h2 className="pd-modal-title">{title}</h2>

                {/* Tags */}
                {tags.length > 0 && (
                    <div className="pd-modal-tags">
                        {tags.map(tag => (
                            <span key={tag} className="pd-tag">{tag}</span>
                        ))}
                    </div>
                )}

                {/* Meta row */}
                <div className="pd-modal-meta">
                    <div className="pd-modal-meta-item">
                        <span className="pd-modal-meta-label">Priority</span>
                        <span
                            className="pd-priority-badge"
                            style={{ color: ps.color, background: ps.bg }}
                        >
                            {ps.label}
                        </span>
                    </div>
                    <div className="pd-modal-meta-item">
                        <span className="pd-modal-meta-label">Due Date</span>
                        <span className={`pd-modal-due ${isOverdue ? 'overdue' : ''}`}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
                                <circle cx="7" cy="7" r="6" />
                                <path d="M7 3.5v4l2.5 1.2" strokeLinecap="round" />
                            </svg>
                            {formattedDate}
                        </span>
                    </div>
                    <div className="pd-modal-meta-item">
                        <span className="pd-modal-meta-label">Status</span>
                        <span className={`pd-modal-status ${isDone ? 'done' : ''}`}>
                            {isDone ? '✓ Complete' : 'In Progress'}
                        </span>
                    </div>
                </div>

                {/* Description */}
                <div className="pd-modal-section">
                    <h4 className="pd-modal-section-title">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 4h12M2 8h8M2 12h10" strokeLinecap="round" />
                        </svg>
                        Description
                    </h4>
                    <p className="pd-modal-description">
                        {description || 'No description provided.'}
                    </p>
                </div>

                {/* Subtasks */}
                {subtasksTotal > 0 && (
                    <div className="pd-modal-section">
                        <h4 className="pd-modal-section-title">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="2" y="2" width="12" height="12" rx="2" />
                                <path d="M5 8l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Subtasks
                            <span className="pd-modal-subtask-count">
                                {subtasksCompleted}/{subtasksTotal}
                            </span>
                        </h4>

                        {/* Progress bar */}
                        <div className="pd-modal-progress">
                            <div className="pd-progress-track">
                                <div
                                    className="pd-progress-fill"
                                    style={{
                                        width: `${progress}%`,
                                        background: isDone ? '#10b981' : listColor || ps.color,
                                    }}
                                />
                            </div>
                            <span className="pd-progress-label">{progress}%</span>
                        </div>

                        {/* Subtask list */}
                        <div className="pd-modal-subtask-list">
                            {subtasks.map(st => (
                                <label key={st.id} className={`pd-modal-subtask ${st.done ? 'done' : ''}`}>
                                    <span className={`pd-modal-checkbox ${st.done ? 'checked' : ''}`}>
                                        {st.done && (
                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.5">
                                                <path d="M2 5l2.5 2.5L8 3" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </span>
                                    <span className="pd-modal-subtask-text">{st.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Activity placeholder */}
                <div className="pd-modal-section">
                    <h4 className="pd-modal-section-title">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="8" cy="8" r="6" />
                            <path d="M8 5v3h2.5" strokeLinecap="round" />
                        </svg>
                        Activity
                    </h4>
                    <div className="pd-modal-activity-empty">
                        No activity yet
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
