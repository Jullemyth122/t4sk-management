import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import SmartTaskInput from './SmartTaskInput';
import PomodoroTimer from './PomodoroTimer';
import MarkdownPreview from './MarkdownPreview';

function getYouTubeVideoId(url) {
    if (!url) return null;
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0];
        if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    } catch { /* ignore */ }
    return null;
}

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low', color: '#10b981' },
    { value: 'medium', label: 'Medium', color: '#f59e0b' },
    { value: 'high', label: 'High', color: '#ef4444' },
];

const PRIORITY_STYLES = {
    high: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'High' },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Medium' },
    low: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Low' },
};

function formatDateForInput(d) {
    if (!d) return '';
    try {
        if (d && typeof d === 'object' && 'seconds' in d) {
            return new Date(d.seconds * 1000).toISOString().slice(0, 10);
        }
        const date = new Date(d);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().slice(0, 10);
    } catch {
        return '';
    }
}

function calculateWeightedProgress(subs) {
    if (!subs || subs.length === 0) return 0;
    const getWeight = (s) => (Number(s.weight) > 0 ? Number(s.weight) : 1);
    const total = subs.reduce((sum, s) => sum + getWeight(s), 0);
    const completed = subs.filter(s => s.completed).reduce((sum, s) => sum + getWeight(s), 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
}

export default function PersonalCardModal({ card, isCreate = false, listId, listName, listColor, allLists = [], onClose, onUpdateCard, onDeleteCard, onMoveCard, onCreateCard }) {
    if (!card) return null;

    // Draft state — initialized from card data
    const [title, setTitle] = useState(card.title || '');
    const [description, setDescription] = useState(card.description || '');
    const [priority, setPriority] = useState(card.priority || 'medium');
    const [startDate, setStartDate] = useState(formatDateForInput(card.startDate));
    const [dueDate, setDueDate] = useState(formatDateForInput(card.dueDate));
    const [recurrence, setRecurrence] = useState(card.recurrence || 'none');
    const [tags, setTags] = useState(card.tags || []);
    const [newTagVal, setNewTagVal] = useState('');
    const [subtasks, setSubtasks] = useState(card.subtasks || []);
    const [timeSpent, setTimeSpent] = useState(card.timeSpent || 0);
    const [youtubeLink, setYoutubeLink] = useState(card.youtubeLink || '');
    const [timerActive, setTimerActive] = useState(false);
    const [selectedMoveList, setSelectedMoveList] = useState('');
    const [descEditMode, setDescEditMode] = useState(isCreate); // start in edit mode only for creation

    // Re-sync draft when card changes
    useEffect(() => {
        if (!isCreate) {
            setTitle(card.title || '');
            setDescription(card.description || '');
            setPriority(card.priority || 'medium');
            setStartDate(formatDateForInput(card.startDate));
            setDueDate(formatDateForInput(card.dueDate));
            setRecurrence(card.recurrence || 'none');
            setTags(card.tags || []);
            setSubtasks(card.subtasks || []);
            setTimeSpent(card.timeSpent || 0);
            setYoutubeLink(card.youtubeLink || '');
            setSelectedMoveList('');
        }
    }, [card.id, isCreate]);

    const progress = useMemo(() => calculateWeightedProgress(subtasks), [subtasks]);

    // Smart Due Date Calculation
    const smartDueDate = useMemo(() => {
        const d = new Date();
        const days = priority === 'high' ? 1 : priority === 'medium' ? 2 : 5;
        d.setDate(d.getDate() + days);
        return d.toISOString().slice(0, 10);
    }, [priority]);

    const handleApplySmartDate = () => setDueDate(smartDueDate);

    // Subtask handlers
    const handleAddSubtask = () => {
        setSubtasks(prev => [...prev, { text: '', completed: false, weight: 1 }]);
    };

    const handleSubtaskChange = (idx, field, value) => {
        setSubtasks(prev => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
    };

    const handleRemoveSubtask = (idx) => {
        setSubtasks(prev => prev.filter((_, i) => i !== idx));
    };

    const handleToggleSubtask = (idx) => {
        setSubtasks(prev => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], completed: !copy[idx].completed };
            return copy;
        });
    };

    // Tag handlers
    const handleAddTag = (e) => {
        if (e.key === 'Enter' && newTagVal.trim()) {
            e.preventDefault();
            const tag = newTagVal.trim();
            if (!tags.includes(tag)) setTags([...tags, tag]);
            setNewTagVal('');
        }
    };
    const handleRemoveTag = (tag) => {
        setTags(tags.filter(t => t !== tag));
    };

    // Save all changes
    const handleSave = async () => {
        if (isCreate) {
            if (!onCreateCard || !title.trim()) return;
            onCreateCard(listId, {
                title: title.trim(),
                description,
                priority,
                recurrence,
                startDate: startDate || null,
                dueDate: dueDate || null,
                subtasks,
                progress: calculateWeightedProgress(subtasks),
                timeSpent,
                tags,
                youtubeLink,
            });
            onClose();
            return;
        }

        if (!onUpdateCard) return;
        await onUpdateCard({
            listId,
            cardId: card.id,
            updates: {
                title,
                description,
                priority,
                recurrence,
                startDate: startDate || null,
                dueDate: dueDate || null,
                subtasks,
                progress: calculateWeightedProgress(subtasks),
                timeSpent,
                tags,
                youtubeLink,
            }
        });

        // Handle move if a new list was selected
        if (selectedMoveList && selectedMoveList !== listId && onMoveCard) {
            await onMoveCard(card.id, listId, selectedMoveList);
        }

        onClose();
    };

    // Delete
    const handleDelete = () => {
        if (!onDeleteCard) return;
        onDeleteCard({ listId, cardId: card.id });
        onClose();
    };

    // Mark Complete and Handle Recurrence
    const handleMarkComplete = async () => {
        if (!onUpdateCard) return;

        // 1. Mark current card as done
        await onUpdateCard({
            listId,
            cardId: card.id,
            updates: {
                title,
                description,
                priority,
                recurrence,
                startDate: startDate || null,
                dueDate: dueDate || null,
                subtasks: subtasks.map(s => ({ ...s, completed: true })),
                progress: 100,
                timeSpent,
                status: 'done',
                tags,
                youtubeLink,
            }
        });

        // 2. Duplicate if recurring
        if (recurrence && recurrence !== 'none' && onCreateCard) {
            let nextDue = null;
            if (dueDate) {
                const d = new Date(dueDate);
                if (recurrence === 'daily') d.setDate(d.getDate() + 1);
                if (recurrence === 'weekly') d.setDate(d.getDate() + 7);
                if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
                nextDue = d.toISOString().slice(0, 10);
            }

            let nextStart = null;
            if (startDate) {
                const s = new Date(startDate);
                if (recurrence === 'daily') s.setDate(s.getDate() + 1);
                if (recurrence === 'weekly') s.setDate(s.getDate() + 7);
                if (recurrence === 'monthly') s.setMonth(s.getMonth() + 1);
                nextStart = s.toISOString().slice(0, 10);
            }

            onCreateCard(listId, {
                title,
                description,
                priority,
                recurrence,
                startDate: nextStart,
                dueDate: nextDue,
                subtasks: subtasks.map(s => ({ ...s, completed: false })),
                progress: 0,
                tags,
                youtubeLink,
            });
        }

        onClose();
    };

    const ps = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;

    return createPortal(
        <div className="pd-modal-overlay" onClick={onClose}>
            <div className="pd-modal pd-modal--edit" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="pd-modal-header">
                    <div className="pd-modal-header-left">
                        <span className="pd-list-dot" style={{ background: listColor }} />
                        <span className="pd-modal-list-label">{isCreate ? `Create Task in ${listName}` : listName}</span>
                    </div>
                    <button className="pd-modal-close" onClick={onClose}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4l10 10M14 4L4 14" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <div className="pd-modal-body-split">
                    {/* LEFT SIDEBAR: Meta */}
                    <aside className="pd-modal-sidebar">
                        {!isCreate && (
                            <PomodoroTimer
                                cardId={card.id}
                                initialTimeSpent={timeSpent}
                                onSessionComplete={(mins) => setTimeSpent(prev => prev + mins)}
                                onTimerStateChange={setTimerActive}
                            />
                        )}
                        <div className="pd-modal-input-group">
                            <label className="pd-modal-label">Start Date</label>
                            <input
                                type="date"
                                className="pd-modal-input"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="pd-modal-input-group">
                            <label className="pd-modal-label">Due Date</label>
                            <input
                                type="date"
                                className="pd-modal-input"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                            />
                            {(!dueDate || dueDate !== smartDueDate) && (
                                <button type="button" className="pd-smart-date-btn" onClick={handleApplySmartDate}>
                                    ✨ Suggestion: {priority === 'high' ? '1 day' : priority === 'medium' ? '2 days' : '5 days'}
                                </button>
                            )}
                        </div>

                        <div className="pd-modal-input-group">
                            <label className="pd-modal-label">Recurrence</label>
                            <select
                                className="pd-modal-select"
                                value={recurrence}
                                onChange={e => setRecurrence(e.target.value)}
                            >
                                <option value="none">None</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>

                        <div className="pd-modal-input-group">
                            <label className="pd-modal-label">Priority</label>
                            <select
                                className="pd-modal-select"
                                value={priority}
                                onChange={e => setPriority(e.target.value)}
                            >
                                {PRIORITY_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {!isCreate && allLists && allLists.length > 0 && (
                            <div className="pd-modal-input-group">
                                <label className="pd-modal-label">Move to List</label>
                                <select
                                    className="pd-modal-select"
                                    value={selectedMoveList || listId}
                                    onChange={e => setSelectedMoveList(e.target.value)}
                                >
                                    {allLists.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="pd-modal-input-group">
                            <label className="pd-modal-label">Tags</label>
                            <div className="pd-modal-tags-wrapper">
                                {tags.map(t => (
                                    <span key={t} className="pd-modal-tag">
                                        {t}
                                        <button type="button" onClick={() => handleRemoveTag(t)}>×</button>
                                    </span>
                                ))}
                                <input
                                    className="pd-modal-tag-input"
                                    placeholder="Add tag..."
                                    value={newTagVal}
                                    onChange={e => setNewTagVal(e.target.value)}
                                    onKeyDown={handleAddTag}
                                />
                            </div>
                        </div>

                        {/* YouTube Link Input */}
                        <div className="pd-modal-input-group">
                            <label className="pd-modal-label">🎵 Background Music</label>
                            <input
                                type="text"
                                className="pd-modal-input"
                                placeholder="Paste YouTube link..."
                                value={youtubeLink}
                                onChange={e => setYoutubeLink(e.target.value)}
                            />
                            {youtubeLink && !getYouTubeVideoId(youtubeLink) && (
                                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                                    Invalid link
                                </span>
                            )}
                        </div>

                        {/* Progress display */}
                        <div className="pd-modal-input-group">
                            <label className="pd-modal-label">Progress</label>
                            <div className="pd-modal-progress-block">
                                <div className="pd-progress-track">
                                    <div
                                        className="pd-progress-fill"
                                        style={{
                                            width: `${progress}%`,
                                            background: progress === 100 ? '#10b981' : listColor || ps.color,
                                        }}
                                    />
                                </div>
                                <span className="pd-progress-pct">{progress}%</span>
                            </div>
                        </div>
                    </aside>

                    {/* RIGHT MAIN CONTENT */}
                    <div className="pd-modal-content">
                        {/* Title — plain input */}
                        <input
                            className="pd-modal-title-input"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Task title"
                            autoFocus={isCreate}
                        />

                        {/* Description — edit/preview toggle */}
                        <div className="pd-modal-section">
                            <div className="pd-modal-section-header">
                                <label className="pd-modal-section-label">DESCRIPTION</label>
                                <div className="pd-modal-desc-toggle">
                                    <button
                                        type="button"
                                        className={`pd-modal-toggle-btn ${descEditMode ? 'active' : ''}`}
                                        onClick={() => setDescEditMode(true)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        className={`pd-modal-toggle-btn ${!descEditMode ? 'active' : ''}`}
                                        onClick={() => setDescEditMode(false)}
                                    >
                                        Preview
                                    </button>
                                </div>
                            </div>
                            {descEditMode ? (
                                <SmartTaskInput
                                    className="pd-modal-textarea-smart"
                                    value={description}
                                    onChange={setDescription}
                                    placeholder="Add details... type '/' for code, tasks, tables"
                                    minRows={4}
                                />
                            ) : (
                                <div className="pd-modal-desc-preview">
                                    {description ? (
                                        <MarkdownPreview text={description} />
                                    ) : (
                                        <span className="pd-modal-empty-text">No description yet. Click Edit to add one.</span>
                                    )}
                                    </div>
                            )}
                        </div>

                        {/* Subtasks */}
                        <div className="pd-modal-section">
                            <div className="pd-modal-section-header">
                                <label className="pd-modal-section-label">SUBTASKS</label>
                                <button
                                    type="button"
                                    className="pd-modal-btn-ghost"
                                    onClick={handleAddSubtask}
                                >
                                    + Add Item
                                </button>
                            </div>

                            <div className="pd-modal-subtask-list">
                                {subtasks.map((st, i) => (
                                    <div key={i} className="pd-modal-subtask-row">
                                        <button
                                            className={`pd-modal-checkbox ${st.completed ? 'checked' : ''}`}
                                            onClick={() => handleToggleSubtask(i)}
                                        >
                                            {st.completed && (
                                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.5">
                                                    <path d="M2 5l2.5 2.5L8 3" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </button>
                                        <input
                                            className="pd-modal-subtask-input"
                                            value={st.text}
                                            onChange={e => handleSubtaskChange(i, 'text', e.target.value)}
                                            placeholder="Subtask..."
                                            style={{
                                                textDecoration: st.completed ? 'line-through' : 'none',
                                                opacity: st.completed ? 0.6 : 1
                                            }}
                                        />
                                        <div className="pd-modal-subtask-weight">
                                            <span className="pd-modal-weight-label">Wt:</span>
                                            <input
                                                type="number"
                                                className="pd-modal-weight-input"
                                                value={st.weight || 1}
                                                onChange={e => handleSubtaskChange(i, 'weight', e.target.value)}
                                                min="1"
                                            />
                                        </div>
                                        <button
                                            className="pd-modal-subtask-remove"
                                            onClick={() => handleRemoveSubtask(i)}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M3 3l8 8M11 3l-8 8" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                {subtasks.length === 0 && (
                                    <div className="pd-modal-empty-text">No subtasks yet</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* YouTube Bottom Music Bar */}
                {youtubeLink && getYouTubeVideoId(youtubeLink) && (
                    <div className="pd-music-bar">
                        <div className="pd-music-bar-inner">
                            <div className="pd-music-bar-label">
                                <span className={`pd-music-bar-dot${timerActive ? '' : ' paused'}`} />
                                <span>{timerActive ? '🎵 Now Playing' : '🎵 Music Ready'}</span>
                            </div>
                            <div className="pd-music-bar-player">
                                <iframe
                                    key={timerActive ? 'playing' : 'paused'}
                                    src={`https://www.youtube.com/embed/${getYouTubeVideoId(youtubeLink)}?autoplay=${timerActive ? 1 : 0}&loop=1&playlist=${getYouTubeVideoId(youtubeLink)}`}
                                    width="100%"
                                    height="52"
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen={false}
                                    title="Background Music"
                                    style={{ display: 'block', borderRadius: '6px' }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="pd-modal-footer">
                    {!isCreate ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="pd-modal-btn-danger" onClick={handleDelete}>
                                Delete Task
                            </button>
                            {progress < 100 && (
                                <button type="button" className="pd-modal-btn-primary" style={{ background: '#10b981', borderColor: '#059669', color: '#fff' }} onClick={handleMarkComplete}>
                                    ✓ Mark Complete
                                </button>
                            )}
                        </div>
                    ) : (
                        <div />
                    )}
                    <div className="pd-modal-footer-right">
                        <button className="pd-modal-btn-ghost" onClick={onClose}>Cancel</button>
                        <button className="pd-modal-btn-primary" onClick={handleSave}>
                            {isCreate ? 'Create Task' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
