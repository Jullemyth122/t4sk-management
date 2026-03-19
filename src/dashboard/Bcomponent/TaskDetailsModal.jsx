import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import CustomSelect from './CustomSelect';
import '../../scss/task-details-modal.scss'; 

export default function TaskDetailsModal({
    open,
    onClose,
    card,
    listId,
    draft,
    setDraft,
    onSave,
    onDelete,
    membersMap,
    emailMap,
    businessOwnerUid,
    priorityOptions = [],
    assigneeCandidates = [],
    handleReviewAction,
    currentUserUid,
    isReviewer,
    isHighLevel,
    canEdit,
    isPersonal = false
}) {
    // Only render if open
    if (!open || !card) return null;

    const isSubmitted = String(card.status || '').toLowerCase() === 'done' || String(card.submission?.reviewStatus || '').toLowerCase() === 'approved';
    const isRejected = String(card.submission?.reviewStatus || '').toLowerCase() === 'rejected';

    // Helper for assignee toggle
    const toggleDraftAssignee = (value) => {
        if (!value) return;
        const norm = String(value).includes('@') ? String(value).toLowerCase() : String(value);
        setDraft(p => {
            const d = p[card.id] || {};
            const current = d.assignees !== undefined ? d.assignees : (card.assignees || []);
            const normalizedCurrent = current.map(x => String(x).includes('@') ? String(x).toLowerCase() : String(x));
            const set = new Set(normalizedCurrent);
            if (set.has(norm)) set.delete(norm);
            else set.add(norm);
            return {
                ...p,
                [card.id]: {
                    ...d,
                    assignees: Array.from(set)
                }
            };
        });
    };

    // Helper to check if current user is an assignee
    const isAssignee = useMemo(() => {
        const currentAssignees = draft[card.id]?.assignees ?? card.assignees ?? [];
        const normUid = String(currentUserUid || '').toLowerCase();
        // You might need to check email too if your system mixes them
        return currentAssignees.some(a => String(a).toLowerCase().includes(normUid));
    }, [card.assignees, draft, card.id, currentUserUid]);

    // Helper to format date for input (YYYY-MM-DD)
    const formatDateForInput = (d) => {
        if (!d) return '';
        try {
            if (d && typeof d === 'object' && 'seconds' in d) {
                return new Date(d.seconds * 1000).toISOString().slice(0, 10);
            }
            const date = new Date(d);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().slice(0, 10);
        } catch (e) {
            console.error('Date parsing error', e);
            return '';
        }
    };

    const currentDraft = draft[card.id] || {};
    const title = currentDraft.title ?? card.title ?? '';
    const desc = currentDraft.description ?? card.description ?? '';
    
    // Safely parse start/due dates
    const startDate = currentDraft.startDate ?? formatDateForInput(card.startDate);
    const dueDate = currentDraft.dueDate ?? formatDateForInput(card.dueDate);

    const priority = currentDraft.priority ?? card.priority ?? 'medium';
    
    // Subtask Logic
    const subtasks = currentDraft.subtasks ?? card.subtasks ?? [];
    const calculateWeightedProgress = (subs) => {
        if (!subs || subs.length === 0) return 0;
        const getWeight = (s) => (Number(s.weight) > 0 ? Number(s.weight) : 1);
        const total = subs.reduce((sum, s) => sum + getWeight(s), 0);
        const completed = subs.filter(s => s.completed).reduce((sum, s) => sum + getWeight(s), 0);
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    };

    const balanceSubtasksLocally = (subsArray, modifiedIdx = -1) => {
        if (!subsArray || subsArray.length === 0) return subsArray;
        const total = subsArray.reduce((sum, st) => sum + (Number(st.weight) || 0), 0);
        if (total === 100) return subsArray;

        if (total === 0) {
            const eq = Math.floor(100 / subsArray.length);
            subsArray.forEach(s => s.weight = eq);
            const rem = 100 - (eq * subsArray.length);
            if (rem > 0) subsArray[0].weight += rem;
            return subsArray;
        }

        let adjustedTotal = 0;
        subsArray.forEach((st, i) => {
            const newW = Math.round(((Number(st.weight) || 0) / total) * 100);
            subsArray[i] = { ...st, weight: newW };
            adjustedTotal += newW;
        });

        if (adjustedTotal !== 100 && subsArray.length > 1) {
            const diff = 100 - adjustedTotal;
            // Add remainder to a subtask other than the one just modified
            const targetIdx = modifiedIdx === 0 ? 1 : 0;
            subsArray[targetIdx].weight += diff;
        }
        return subsArray;
    };

    const handleSubtaskChange = (idx, field, value) => {
        let newSubs = [...subtasks];
        newSubs[idx] = { ...newSubs[idx], [field]: value };

        if (field === 'weight') {
            newSubs = balanceSubtasksLocally(newSubs, idx);
        }

        const newProgress = calculateWeightedProgress(newSubs);
        setDraft(p => ({
            ...p,
            [card.id]: {
                ...(p[card.id] || {}),
                subtasks: newSubs,
                progress: newProgress
            }
        }));
    };

    const handleAddSubtask = () => {
        let newSubs = [...subtasks, { text: '', completed: false, weight: 1 }];
        newSubs = balanceSubtasksLocally(newSubs);
         const newProgress = calculateWeightedProgress(newSubs);
         setDraft(p => ({
            ...p,
            [card.id]: { ...(p[card.id] || {}), subtasks: newSubs, progress: newProgress }
         }));
    };

    const handleRemoveSubtask = (idx) => {
        let newSubs = subtasks.filter((_, i) => i !== idx);
        if (newSubs.length > 0) {
            newSubs = balanceSubtasksLocally(newSubs);
        }
        const newProgress = calculateWeightedProgress(newSubs);
        setDraft(p => ({
            ...p,
            [card.id]: { ...(p[card.id] || {}), subtasks: newSubs, progress: newProgress }
         }));
    };

    // Review Actions
    const [reviewNote, setReviewNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const onApprove = async () => {
        if (!handleReviewAction) return;
        setActionLoading(true);
        try {
            await handleReviewAction({ listId, cardId: card.id, action: 'approve', note: reviewNote });
            onClose();
        } finally { setActionLoading(false); }
    };
    const onReject = async () => {
        if (!handleReviewAction) return;
        setActionLoading(true);
        try {
            await handleReviewAction({ listId, cardId: card.id, action: 'reject', note: reviewNote });
            onClose();
        } finally { setActionLoading(false); }
    };


    const modalContent = (
        <div className="td-modal-overlay" onClick={onClose} style={{zIndex: 9998}}>
            <div className="td-modal-container" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="td-modal-header">
                    <div className="td-modal-title">Task Details</div>
                    <button className="td-btn-close" onClick={onClose}>×</button>
                </div>

                <div className="td-modal-body">
                    
                    {/* LEFT SIDEBAR: Meta & Assignees */}
                    <aside className="td-sidebar">
                         {/* Status Badge */}
                         {isRejected && (
                             <div className="td-status-badge td-status-rejected">
                                 ! Rejected
                                 {card.submission?.reviewerNote && <div style={{ marginTop: 4, fontSize: '0.8rem', fontWeight: 400 }}>"{card.submission.reviewerNote}"</div>}
                             </div>
                         )}
                         {isSubmitted && !isRejected && (
                             <div className="td-status-badge td-status-approved">
                                 ✓ Completed
                             </div>
                         )}

                         <div className="td-input-group">
                             <label className="td-label">Start Date</label>
                             <input type="date" className="td-input" value={startDate} onChange={e => setDraft(p => ({ ...p, [card.id]: { ...(p[card.id]||{}), startDate: e.target.value } }))} />
                         </div>

                         <div className="td-input-group">
                             <label className="td-label">Due Date</label>
                             <input type="date" className="td-input" value={dueDate} onChange={e => setDraft(p => ({ ...p, [card.id]: { ...(p[card.id]||{}), dueDate: e.target.value } }))} />
                         </div>

                         <div className="td-input-group">
                             <label className="td-label">Priority</label>
                             <CustomSelect 
                                options={priorityOptions} 
                                value={priority} 
                                onChange={v => setDraft(p => ({ ...p, [card.id]: { ...(p[card.id]||{}), priority: v } }))} 
                                placeholder="Priority"
                             />
                         </div>

                         <div className="td-input-group" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                             <label className="td-label" style={{ marginBottom: 8 }}>Assignees</label>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', paddingRight: 4 }}>
                                 {assigneeCandidates.map(cand => {
                                     const val = cand.id || cand.email;
                                     const currentAssignees = currentDraft.assignees ?? card.assignees ?? [];
                                     const isSelected = currentAssignees.map(x => String(x).toLowerCase()).includes(String(val).toLowerCase());
                                     return (
                                         <div key={val} className={`td-assignee-chip ${isSelected ? 'active' : ''}`} onClick={() => toggleDraftAssignee(val)}>
                                             <div className="td-avatar-small" style={{ opacity: isSelected ? 1 : 0.5 }}>
                                                 {isSelected ? '✓' : (cand.name?.[0] || '?')}
                                             </div>
                                             <div style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: isSelected ? 1 : 0.7 }}>
                                                {cand.name || cand.email}
                                             </div>
                                         </div>
                                     );
                                 })}
                             </div>
                         </div>
                    </aside>


                    {/* RIGHT MAIN CONTENT */}
                    <div className="td-content">
                        
                        <input 
                            className="td-task-title-input"
                            value={title} 
                            onChange={e => setDraft(p => ({ ...p, [card.id]: { ...(p[card.id]||{}), title: e.target.value } }))}
                            placeholder="Task Title"
                        />

                        <div className="td-input-group" style={{ marginBottom: 32 }}>
                            <label className="td-section-title">Description</label>
                            <textarea 
                                className="td-textarea" 
                                value={desc} 
                                onChange={e => setDraft(p => ({ ...p, [card.id]: { ...(p[card.id]||{}), description: e.target.value } }))}
                                placeholder="Add more details..."
                                rows={3}
                            />
                        </div>

                        {/* Subtasks */}
                        <div style={{ marginBottom: 32 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <label className="td-section-title" style={{ margin: 0 }}>Subtasks</label>
                                <button type="button" onClick={handleAddSubtask} className="td-btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>+ Add Item</button>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="td-progress-track">
                                <div className="td-progress-fill" style={{ width: `${currentDraft.progress ?? card.progress ?? 0}%` }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {subtasks.map((st, i) => (
                                    <div key={i} className="td-subtask-item">
                                        {/* Status indicator (read-only) */}
                                        <div
                                            style={{
                                            minWidth: 18,
                                            height: 18,
                                            borderRadius: 4,
                                            border: `2px solid ${st.completed ? '#4caf50' : '#555'}`,
                                            background: st.completed ? '#4caf50' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontSize: 11,
                                            fontWeight: 'bold',
                                                opacity: 0.7
                                        }}>
                                            {st.completed && '✓'}
                                        </div>
                                        <input 
                                            value={st.text} 
                                            onChange={e => handleSubtaskChange(i, 'text', e.target.value)} 
                                            className="td-subtask-input" 
                                            placeholder="Subtask..."
                                            style={{ textDecoration: st.completed ? 'line-through' : 'none', opacity: st.completed ? 0.6 : 1 }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Wt:</span>
                                            <input 
                                                type="number" 
                                                className="td-subtask-weight"
                                                value={st.weight != null ? st.weight : 0} 
                                                onChange={e => handleSubtaskChange(i, 'weight', e.target.value)} 
                                            />
                                        </div>
                                        <button onClick={() => handleRemoveSubtask(i)} className="td-btn-icon">×</button>
                                    </div>
                                ))}
                                {subtasks.length === 0 && <div style={{ opacity: 0.5, fontStyle: 'italic', fontSize: '0.9rem', padding: '8px 0' }}>No subtasks yet</div>}
                            </div>
                        </div>
                        {/* Reviewer Actions have been moved exclusively to ReviewModal.jsx triggered from CardItem */}                    </div>
                </div>

                {/* Footer */}
                <div className="td-footer">
                     {canEdit && (
                         <button onClick={onDelete} className="td-btn-ghost" style={{ marginRight: 'auto', color: '#f44336', opacity: 0.8 }}>Delete Task</button>
                     )}
                     
                     <button onClick={onClose} className="td-btn-ghost">Cancel</button>
                     <button onClick={() => { onSave(); onClose(); }} className="td-btn-primary">Save Changes</button>
                 </div>

            </div>
        </div>
    );
    
    return createPortal(modalContent, document.body);
}
