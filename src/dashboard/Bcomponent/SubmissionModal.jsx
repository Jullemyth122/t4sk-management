// src/pages/dashboard/Bcomponent/SubmissionModal.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { timeAgo } from '../../utils/time';
import CustomSelect from './CustomSelect';

export default function SubmissionModal({
    open,
    onClose,
    onSubmit,     // async ({ note, type, attachments, qaChecked, reviewerUid })
    defaultNote = '',
    card,
    assignees = [],
    currentUser = {},
    reviewerOptions: reviewerOptionsProp = null, // array of {value,label,subtitle,level,owner,icon}
    reviewerOptionsSource = '', // 'higher' | 'assignees' | 'all-members'
    defaultReviewerUid = ''
}) {
    // Core state + refs (always declared in same order)
    const [note, setNote] = useState(defaultNote || '');
    const [submitting, setSubmitting] = useState(false);
    const [type, setType] = useState('for-review'); // 'for-review' | 'complete' | 'request-feedback'
    const [qaChecked, setQaChecked] = useState(false);
    const [attachments, setAttachments] = useState([]); // File objects
    const [reviewerUid, setReviewerUid] = useState('');
    const fileRef = useRef(null);
    const dropRef = useRef(null);

    // reset-on-close effect
    useEffect(() => {
        if (!open) {
            setNote(defaultNote || '');
            setType('for-review');
            setQaChecked(false);
            setAttachments([]);
            setReviewerUid('');
        }
    }, [open, defaultNote]);

    // preselect default reviewer when modal opens
    useEffect(() => {
        if (open) {
            if (defaultReviewerUid) setReviewerUid(defaultReviewerUid);
            else setReviewerUid('');
        }
    }, [open, defaultReviewerUid]);

    // drag-drop visuals - attach listeners once
    useEffect(() => {
        const node = dropRef.current;
        if (!node) return;
        const onDragOver = (e) => { e.preventDefault(); node.classList.add('sd-dragover'); };
        const onDragLeave = () => node.classList.remove('sd-dragover');
        const onDrop = (e) => {
            e.preventDefault();
            node.classList.remove('sd-dragover');
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length) addFiles(files);
        };
        node.addEventListener('dragover', onDragOver);
        node.addEventListener('dragleave', onDragLeave);
        node.addEventListener('drop', onDrop);
        return () => {
            node.removeEventListener('dragover', onDragOver);
            node.removeEventListener('dragleave', onDragLeave);
            node.removeEventListener('drop', onDrop);
        };
    }, []); // <- empty deps; we don't want ref.current here

    // Helper to add files (keeps stable identity)
    const addFiles = (filesOrEvent) => {
        const files = Array.isArray(filesOrEvent) ? filesOrEvent : Array.from(filesOrEvent.target.files || []);
        setAttachments((p) => [...p, ...files.map(f => ({ name: f.name, file: f }))]);
        if (fileRef.current) fileRef.current.value = '';
    };

    const removeAttachment = (idx) => setAttachments((p) => p.filter((_, i) => i !== idx));

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await onSubmit({
                note: note.trim(),
                type,
                qaChecked,
                attachments,
                reviewerUid: reviewerUid || null
            });
            onClose?.();
        } catch (err) {
            console.error('Submission failed', err);
        } finally {
            setSubmitting(false);
        }
    };

    // Build reviewer options (stable order, always run)
    const reviewerOptions = useMemo(() => {
        if (Array.isArray(reviewerOptionsProp) && reviewerOptionsProp.length > 0) {
            const seen = new Set();
            const out = [];
            reviewerOptionsProp.forEach((opt) => {
                if (!opt) return;
                const val = opt.value === undefined || opt.value === null ? '' : String(opt.value);
                if (seen.has(val)) return;
                seen.add(val);
                out.push(opt);
            });
            if (!out.length || out[0].value !== '') {
                out.unshift({ value: '', label: '— none —', subtitle: '' });
            }
            return out;
        }

        // fallback to assignees list
        const fallback = [{ value: '', label: '— none —', subtitle: '' }];
        (assignees || []).forEach(a => {
            const val = a.uid || a.id || (a.email ? String(a.email).toLowerCase() : (a.id || ''));
            const label = a.name || a.email || String(a.id || a.uid || '');
            fallback.push({
                value: val,
                label,
                subtitle: a.email || '',
                icon: a.avatar ? (<img src={a.avatar} alt="" style={{ width: 28, height: 28, borderRadius: 6 }} />) : null
            });
        });
        return fallback;
    }, [reviewerOptionsProp, assignees]);

    const ownerIncluded = useMemo(() => {
        return Array.isArray(reviewerOptions) && reviewerOptions.some(opt => !!opt.owner);
    }, [reviewerOptions]);

    const reviewerSourceLabel = reviewerOptionsSource === 'higher'
        ? 'Showing higher-level staff'
        : (reviewerOptionsSource === 'Assignees' || reviewerOptionsSource === 'assignees'
            ? 'Showing assignees'
            : (reviewerOptionsSource === 'all-members' ? 'Showing all members' : ''));

    if (!open) return null;

    const typeOptions = [
      { value: 'for-review', label: 'For review', subtitle: 'Ready for QA / review' },
      { value: 'complete', label: 'Mark complete', subtitle: 'Done — ready to close' },
      { value: 'request-feedback', label: 'Request feedback', subtitle: 'Need input from reviewer' },
    ];

    return (
        <div className="sd-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sd-modal-title">
            <div className="sd-modal" role="document">
                <div className="sd-modal-grid">
                    <aside className="sd-left">
                        <div className="sd-left-top">
                            <div className="sd-icon" aria-hidden>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h10M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            <div>
                                <h3 id="sd-modal-title" className="sd-left-title">Submit Task</h3>
                                <div className="sd-left-sub">{card?.title || 'Untitled task'}</div>
                            </div>
                        </div>

                        <div className="sd-meta">
                            <div className="sd-meta-row">
                                <strong>Due</strong>
                                <span>{card?.dueDate ? (card.dueDate.seconds ? new Date(card.dueDate.seconds * 1000).toLocaleDateString() : new Date(card.dueDate).toLocaleDateString()) : '—'}</span>
                            </div>
                            <div className="sd-meta-row">
                                <strong>Priority</strong>
                                <span className={`p-1 rounded-sm pill pill-${(card?.priority||'medium').toLowerCase()}`}>{card?.priority || 'medium'}</span>
                            </div>
                        </div>

                        <div className="sd-assignees">
                            <strong>Assignees</strong>
                            <div className="sd-assignees-list">
                                {assignees && assignees.length ? (
                                assignees.map((a, i) => (
                                    <div key={String(a.id || a.uid || a)} className="sd-assignee">
                                    <div className="sd-av">{(a.name||a.email||String(a.id||a)).split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()}</div>
                                    <div className="sd-av-meta">
                                        <div className="sd-av-name">{a.name || a.email || a.id}</div>
                                        <div className="sd-av-email">{a.email || ''}</div>
                                    </div>
                                    </div>
                                ))
                                ) : <div className="sd-muted">No assignees</div>}
                            </div>
                        </div>

                        <div className="sd-note-mini">
                            <small className="sd-muted">You can retract a submission while it hasn't been reviewed.</small>
                            <div className="sd-server-time">Server time: {card?.submittedAt ? timeAgo(card.submittedAt) : '—'}</div>
                        </div>
                    </aside>

                    {/* Right form */}
                    <div className="sd-right" role="form" aria-labelledby="sd-modal-title">
                        <div className="sd-field-row">
                            <label className="sd-label">Submission type</label>
                            <CustomSelect
                                options={typeOptions}
                                value={type}
                                onChange={(v) => setType(v)}
                                placeholder="Select submission type"
                                searchable={false}
                                ariaLabel="Submission type"
                            />
                        </div>

                        <div className="sd-field-row">
                            <label className="sd-label">Short note (optional)</label>
                            <textarea
                                className="sd-textarea"
                                value={note}
                                onChange={(e)=>setNote(e.target.value)}
                                placeholder="Describe what you did — highlight key changes, blockers, and acceptance criteria."
                                rows={5}
                                aria-label="Submission note"
                            />
                        </div>

                        <div className="sd-field-row">
                            <label className="sd-label">Attachments</label>

                            <div className="sd-drop" ref={dropRef}>
                                <div className="sd-drop-inner">
                                <div>Drag & drop files here or</div>
                                <button type="button" className="sd-link-btn" onClick={()=>fileRef.current?.click()}>choose files</button>
                                </div>
                                <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={addFiles} aria-hidden />
                            </div>

                            {attachments.length > 0 && (
                                <div className="sd-attach-list">
                                {attachments.map((a, i) => (
                                    <div className="sd-attach-item" key={i}>
                                    <div className="sd-attach-name">{a.name}</div>
                                    <div className="sd-attach-actions">
                                        <button type="button" className="sd-btn-ghost" onClick={()=>removeAttachment(i)}>Remove</button>
                                    </div>
                                    </div>
                                ))}
                                </div>
                            )}
                        </div>

                        <div className="sd-field-row sd-row-inline">
                            <label className="sd-checkbox">
                                <input type="checkbox" checked={qaChecked} onChange={(e)=>setQaChecked(e.target.checked)} />
                                <span>Passes acceptance criteria</span>
                            </label>

                            <div className="sd-reviewer">
                                <label className="sd-label">Assign reviewer (optional)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    { reviewerSourceLabel ? (
                                        <div style={{ fontSize: 12, color: 'var(--sidenav-ISO)' }}>{reviewerSourceLabel}</div>
                                    ) : null }
                                    { ownerIncluded ? (
                                        <div style={{ fontSize: 12, background: 'rgba(0,0,0,0.04)', padding: '4px 8px', borderRadius: 999, color: 'var(--sidenav-ISO)' }}>
                                            Owner included
                                        </div>
                                    ) : null }
                                </div>

                                <CustomSelect
                                    options={reviewerOptions}
                                    value={reviewerUid}
                                    onChange={(v) => setReviewerUid(v)}
                                    placeholder="— none —"
                                    searchable={true}
                                    ariaLabel="Assign reviewer"
                                />
                            </div>
                        </div>

                        <div className="sd-footer">
                        <button className="sd-btn sd-btn-ghost" onClick={()=>onClose?.()} disabled={submitting}>Cancel</button>
                            <button className="sd-btn sd-btn-primary" onClick={handleSubmit} disabled={submitting}>
                                {submitting ? 'Submitting…' : (type === 'complete' ? 'Mark complete' : 'Submit')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
