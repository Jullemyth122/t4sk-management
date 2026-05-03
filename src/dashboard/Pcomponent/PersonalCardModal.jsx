import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import SmartTaskInput from './SmartTaskInput';
import PomodoroTimer from './PomodoroTimer';
import MarkdownPreview from './MarkdownPreview';
import {
    isSubtaskLinked,
    linkSubtaskToDescription,
    unlinkSubtaskFromDescription,
    syncSubtaskToggleToDescription,
    syncSubtaskTextToDescription,
    syncDescriptionToggleToSubtask,
    syncDescriptionTextToSubtasks,
    reindexMarkersAfterDelete
} from './subtaskDescSync';

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

    const [isSuggestingDate, setIsSuggestingDate] = useState(false);

    const handleApplySmartDate = async () => {
        if (isSuggestingDate) return;
        setIsSuggestingDate(true);
        try {
            const { suggestTaskDates } = await import('../../config/ocr.jsx');
            const dates = await suggestTaskDates(title, description, priority);
            if (dates.startDate) setStartDate(dates.startDate);
            if (dates.dueDate) setDueDate(dates.dueDate);
        } catch (e) {
            console.error('Failed to suggest dates', e);
            alert('AI failed to suggest dates. Please try again.');
        } finally {
            setIsSuggestingDate(false);
        }
    };

    // Subtask handlers (with bidirectional sync)
    const handleAddSubtask = () => {
        setSubtasks(prev => [...prev, { text: '', completed: false, weight: 1 }]);
    };

    const handleSubtaskChange = (idx, field, value) => {
        setSubtasks(prev => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
        // If text changed and subtask is linked, sync to description
        if (field === 'text' && isSubtaskLinked(description, idx)) {
            setDescription(prev => syncSubtaskTextToDescription(prev, idx, value));
        }
    };

    const handleRemoveSubtask = (idx) => {
        // If linked, remove the marker line from description, then re-index remaining
        let newDesc = description;
        if (isSubtaskLinked(newDesc, idx)) {
            newDesc = unlinkSubtaskFromDescription(newDesc, idx);
        }
        newDesc = reindexMarkersAfterDelete(newDesc, idx);
        setDescription(newDesc);
        setSubtasks(prev => prev.filter((_, i) => i !== idx));
    };

    const handleToggleSubtask = (idx) => {
        setSubtasks(prev => {
            const copy = [...prev];
            const newChecked = !copy[idx].completed;
            copy[idx] = { ...copy[idx], completed: newChecked };
            // Sync to description if linked
            if (isSubtaskLinked(description, idx)) {
                setDescription(prev => syncSubtaskToggleToDescription(prev, idx, newChecked));
            }
            return copy;
        });
    };

    // Link / Unlink subtask to description
    const handleLinkSubtask = (idx) => {
        const st = subtasks[idx];
        if (isSubtaskLinked(description, idx)) {
            // Unlink
            setDescription(prev => unlinkSubtaskFromDescription(prev, idx));
        } else {
            // Link
            setDescription(prev => linkSubtaskToDescription(prev, idx, st.text, st.completed));
        }
    };

    // Description toggle handler with bidirectional sync
    const handleDescriptionToggle = useCallback((lineIndex, newChecked) => {
        const result = syncDescriptionToggleToSubtask(description, lineIndex, newChecked);
        setDescription(result.description);
        if (result.subtaskUpdates.length > 0) {
            setSubtasks(prev => {
                const copy = [...prev];
                for (const upd of result.subtaskUpdates) {
                    if (upd.index >= 0 && upd.index < copy.length) {
                        copy[upd.index] = { ...copy[upd.index], [upd.field]: upd.value };
                    }
                }
                return copy;
            });
        }
    }, [description]);

    // When description text changes in edit mode, sync linked text back to subtasks
    const handleDescriptionChange = useCallback((newDesc) => {
        setDescription(newDesc);
        const textUpdates = syncDescriptionTextToSubtasks(newDesc, subtasks);
        if (textUpdates.length > 0) {
            setSubtasks(prev => {
                const copy = [...prev];
                for (const upd of textUpdates) {
                    if (upd.index >= 0 && upd.index < copy.length) {
                        copy[upd.index] = { ...copy[upd.index], [upd.field]: upd.value };
                    }
                }
                return copy;
            });
        }
    }, [subtasks]);

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
                            <button type="button" className="pd-smart-date-btn" onClick={handleApplySmartDate} disabled={isSuggestingDate}>
                                {isSuggestingDate ? '✨ Thinking...' : '✨ AI Suggestion'}
                            </button>
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
                                    onChange={handleDescriptionChange}
                                    placeholder="Add details... type '/' for code, tasks, tables"
                                    minRows={4}
                                />
                            ) : (
                                <div className="pd-modal-desc-preview">
                                    {description ? (
                                            <MarkdownPreview
                                                text={description}
                                                onToggleCheckbox={handleDescriptionToggle}
                                            />
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
                                    <div key={i} className={`pd-modal-subtask-row ${isSubtaskLinked(description, i) ? 'linked' : ''}`}>
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
                                        <button
                                            className={`pd-modal-subtask-link ${isSubtaskLinked(description, i) ? 'active' : ''}`}
                                            title={isSubtaskLinked(description, i) ? 'Unlink from Description' : 'Link to Description'}
                                            onClick={() => handleLinkSubtask(i)}
                                        >
                                            <svg width="20" stroke='currentColor' height="10" viewBox="0 0 20 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8.90629 1.00129C9.36136 0.968858 9.81862 1.01452 10.2583 1.13629C10.7987 1.33453 11.2546 1.71244 11.5497 2.20673C11.8447 2.70102 11.961 3.28168 11.879 3.85145C11.7969 4.42123 11.5216 4.94553 11.0992 5.33654C10.6767 5.72755 10.1327 5.96153 9.55829 5.99929C9.42568 5.99929 9.2985 6.05197 9.20474 6.14574C9.11097 6.2395 9.05829 6.36668 9.05829 6.49929C9.05829 6.6319 9.11097 6.75907 9.20474 6.85284C9.2985 6.94661 9.42568 6.99929 9.55829 6.99929C10.157 6.97748 10.7402 6.80267 11.2523 6.49154C11.7643 6.1804 12.1881 5.74331 12.4833 5.22192C12.7785 4.70053 12.9352 4.11222 12.9385 3.51308C12.9419 2.91393 12.7917 2.32392 12.5023 1.79929C12.1939 1.25783 11.7488 0.806795 11.2115 0.491274C10.6741 0.175752 10.0634 0.00679432 9.44029 0.00128912H3.59629C3.13666 -0.0111865 2.67908 0.0669904 2.24967 0.231356C1.82025 0.395721 1.42742 0.643057 1.09359 0.95924C0.419399 1.5978 0.0264861 2.47803 0.00129057 3.40629C-0.023905 4.33455 0.32068 5.23479 0.959242 5.90899C1.5978 6.58318 2.47803 6.97609 3.40629 7.00129C4.13029 7.04229 4.86429 7.00129 5.58929 7.00129C5.7219 7.00129 5.84908 6.94861 5.94284 6.85484C6.03661 6.76107 6.08929 6.6339 6.08929 6.50129C6.08929 6.36868 6.03661 6.2415 5.94284 6.14774C5.84908 6.05397 5.7219 6.00129 5.58929 6.00129C4.26629 6.00129 2.67429 6.26329 1.69829 5.15829C1.38725 4.79303 1.18685 4.34663 1.1206 3.87148C1.05434 3.39632 1.12499 2.91213 1.32425 2.47572C1.52351 2.0393 1.84311 1.66878 2.24554 1.40762C2.64798 1.14646 3.11656 1.0055 3.59629 1.00129H8.90629Z" strokeLinecap="round" />
                                                <path d="M16.4165 10.0005C17.326 9.99726 18.1985 9.64014 18.8492 9.00477C19.4999 8.36941 19.8778 7.5057 19.9027 6.59657C19.9277 5.68745 19.5978 4.80431 18.9829 4.1342C18.368 3.46409 17.5164 3.05964 16.6085 3.0065C15.8845 2.9655 15.1505 3.0065 14.4255 3.0065C14.2929 3.0065 14.1657 3.05918 14.072 3.15295C13.9782 3.24672 13.9255 3.3739 13.9255 3.5065C13.9255 3.63911 13.9782 3.76629 14.072 3.86006C14.1657 3.95383 14.2929 4.0065 14.4255 4.0065C15.7485 4.0065 17.3405 3.7445 18.3165 4.8495C18.6258 5.21502 18.8247 5.66104 18.8898 6.13541C18.955 6.60977 18.8838 7.09289 18.6845 7.52827C18.4852 7.96366 18.1661 8.33331 17.7645 8.59402C17.3629 8.85473 16.8953 8.99572 16.4165 9.0005H11.1065C10.6515 9.03293 10.1942 8.98728 9.75452 8.8655C9.21408 8.66727 8.75817 8.28936 8.46313 7.79506C8.16809 7.30077 8.05184 6.72012 8.13386 6.15034C8.21588 5.58056 8.49117 5.05627 8.91365 4.66526C9.33612 4.27425 9.88011 4.04027 10.4545 4.0025C10.5871 4.0025 10.7143 3.94983 10.8081 3.85606C10.9018 3.76229 10.9545 3.63511 10.9545 3.5025C10.9545 3.3699 10.9018 3.24272 10.8081 3.14895C10.7143 3.05518 10.5871 3.0025 10.4545 3.0025C9.85577 3.02431 9.27257 3.19912 8.76054 3.51025C8.24851 3.82139 7.8247 4.25849 7.52951 4.77988C7.23432 5.30127 7.0776 5.88957 7.07427 6.48872C7.07095 7.08786 7.22114 7.67787 7.51052 8.2025C7.81891 8.74396 8.26401 9.195 8.80135 9.51052C9.33868 9.82604 9.94942 9.995 10.5725 10.0005H16.4165Z" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                        <div className="pd-modal-subtask-weight" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span className="pd-modal-weight-label">Wt:</span>
                                            <input
                                                type="number"
                                                className="pd-modal-weight-input"
                                                value={st.weight || 1}
                                                onChange={e => handleSubtaskChange(i, 'weight', e.target.value)}
                                                min="1"
                                                style={{ width: '40px', padding: '4px' }}
                                            />
                                            <span style={{ fontSize: '0.7rem', color: 'var(--pd-text-muted)', width: '30px', textAlign: 'right' }}>
                                                {(() => {
                                                    const totalWeight = subtasks.reduce((sum, s) => sum + (Number(s.weight) > 0 ? Number(s.weight) : 1), 0);
                                                    const w = Number(st.weight) > 0 ? Number(st.weight) : 1;
                                                    return totalWeight > 0 ? Math.round((w / totalWeight) * 100) + '%' : '0%';
                                                })()}
                                            </span>
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
