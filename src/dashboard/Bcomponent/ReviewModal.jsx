// ReviewModal.jsx
import React, { useEffect, useRef, useState } from 'react';

export default function ReviewModal({
    open,
    onClose,
    onConfirm, // async (action: 'approve' | 'reject', note: string) => Promise
    defaultNote = '',
    actionDefault = 'approve', // optional preselect
    reviewerName = ''
}) {
    const [action, setAction] = useState(actionDefault || 'approve');
    const [note, setNote] = useState(defaultNote || '');
    const [submitting, setSubmitting] = useState(false);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (!open) {
        setNote(defaultNote || '');
        setAction(actionDefault || 'approve');
        setSubmitting(false);
        } else {
        // autofocus textarea when open (nice UX)
        setTimeout(() => textareaRef.current?.focus?.(), 120);
        }
    }, [open, defaultNote, actionDefault]);

    if (!open) return null;

    const handle = async () => {
        if (!onConfirm) return onClose?.();
        setSubmitting(true);
        try {
            await onConfirm(action, note.trim());
            onClose?.();
        } catch (err) {
            // let parent show UI error; we just stop the spinner
            console.error('ReviewModal onConfirm failed', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="sd-modal-backdrop" role="dialog" aria-modal="true">
            <div className="sd-modal" style={{ maxWidth: 520, padding: '32px', border: '1px solid var(--bd-border-subtle)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div className="sd-icon" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', fontSize: '1.5rem', width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(102, 126, 234, 0.25)' }}>
                            📋
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--bd-text-main)', letterSpacing: '-0.3px' }}>Review Task</h3>
                            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.85rem', color: 'var(--bd-text-sub)' }}>
                                {reviewerName ? `Reviewing as ${reviewerName}` : 'Select an outcome for this submission'}
                            </p>
                        </div>
                    </div>

                    {/* Action Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <label style={{
                            padding: '16px', borderRadius: '14px', border: `2px solid ${action === 'approve' ? '#10b981' : 'var(--bd-border-subtle)'}`,
                            background: action === 'approve' ? 'rgba(16, 185, 129, 0.05)' : 'var(--bd-card-bg)',
                            cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 14,
                            boxShadow: action === 'approve' ? '0 4px 16px rgba(16, 185, 129, 0.15)' : 'none'
                        }}>
                            <input type="radio" style={{ display: 'none' }} checked={action === 'approve'} onChange={() => setAction('approve')} />
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: action === 'approve' ? '#10b981' : 'rgba(255,255,255,0.06)', border: action === 'approve' ? 'none' : '1px solid var(--bd-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem' }}>
                                {action === 'approve' && '✓'}
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: action === 'approve' ? '#10b981' : 'var(--bd-text-main)' }}>Approve</span>
                        </label>

                        <label style={{
                            padding: '16px', borderRadius: '14px', border: `2px solid ${action === 'reject' ? '#ef4444' : 'var(--bd-border-subtle)'}`,
                            background: action === 'reject' ? 'rgba(239, 68, 68, 0.05)' : 'var(--bd-card-bg)',
                            cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 14,
                            boxShadow: action === 'reject' ? '0 4px 16px rgba(239, 68, 68, 0.15)' : 'none'
                        }}>
                            <input type="radio" style={{ display: 'none' }} checked={action === 'reject'} onChange={() => setAction('reject')} />
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: action === 'reject' ? '#ef4444' : 'rgba(255,255,255,0.06)', border: action === 'reject' ? 'none' : '1px solid var(--bd-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 800 }}>
                                {action === 'reject' && '✕'}
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: action === 'reject' ? '#ef4444' : 'var(--bd-text-main)' }}>Reject</span>
                        </label>
                    </div>

                    {/* Separator */}
                    <div style={{ height: 1, background: 'var(--bd-border-subtle)', opacity: 0.6 }} />

                    {/* Feedback Note */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--bd-text-sub)' }}>Feedback Note <span style={{ opacity: 0.6, fontWeight: 400 }}>(Optional)</span></label>
                        <textarea
                            ref={textareaRef}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            style={{
                                width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid var(--bd-border-subtle)',
                                background: 'rgba(0,0,0,0.1)', color: 'var(--bd-text-main)', fontSize: '0.95rem', resize: 'vertical',
                                boxSizing: 'border-box', fontFamily: 'inherit'
                            }}
                            placeholder={action === 'approve' ? 'Add a supportive comment (e.g. Great work!)...' : 'Let the assignee know what needs to be fixed...'}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
                        <button
                            style={{ padding: '10px 24px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--bd-border-subtle)', color: 'var(--bd-text-main)', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => onClose?.()}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button
                            style={{
                                padding: '10px 28px', borderRadius: '12px',
                                background: action === 'approve' ? '#10b981' : '#ef4444',
                                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem',
                                boxShadow: action === 'approve' ? '0 6px 16px rgba(16, 185, 129, 0.3)' : '0 6px 16px rgba(239, 68, 68, 0.3)',
                                transition: 'transform 0.1s'
                            }}
                            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            onClick={handle}
                            disabled={submitting}
                        >
                            {submitting ? (action === 'approve' ? 'Approving…' : 'Rejecting…') : (action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
