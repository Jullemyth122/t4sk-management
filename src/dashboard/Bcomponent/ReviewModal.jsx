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
            <div className="sd-modal" style={{ maxWidth: 640 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: '0 0 90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 12, background: 'linear-gradient(90deg,#fff2,#0002)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800 }}>
                        ✓
                        </div>
                    </div>

                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, marginBottom: 6 }}>Review submission{ reviewerName ? ` — ${reviewerName}` : '' }</h3>
                        <div style={{ color: 'var(--sidenav-ISO)', marginBottom: 12 }}>Pick an action and optionally leave a note for the submitter.</div>

                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                                <input type="radio" name="reviewAction" checked={action === 'approve'} onChange={() => setAction('approve')} />
                                <span style={{ fontWeight: 700 }}>Approve</span>
                            </label>

                            <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                                <input type="radio" name="reviewAction" checked={action === 'reject'} onChange={() => setAction('reject')} />
                                <span style={{ fontWeight: 700 }}>Reject</span>
                            </label>
                        </div>

                        <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>Note (optional)</label>
                        <textarea
                            ref={textareaRef}
                            className="sd-textarea"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={5}
                            placeholder={ action === 'approve' ? 'Optional comment for the submitter (congrats, small suggestions)...' : 'Explain why the submission was rejected and what needs to change.' }
                        />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                            <button className="sd-btn sd-btn-ghost" onClick={() => onClose?.()} disabled={submitting}>Cancel</button>
                            <button
                                className="sd-btn sd-btn-primary"
                                onClick={handle}
                                disabled={submitting}
                            >
                                {submitting ? (action === 'approve' ? 'Approving…' : 'Rejecting…') : (action === 'approve' ? 'Approve' : 'Reject')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
