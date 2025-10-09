// CardItem.jsx

// src/pages/dashboard/Bcomponent/CardItem.jsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { computePriority } from '../../utils/prioritization';
import SubmissionModal from './SubmissionModal';
import { timeAgo } from '../../utils/time';
import ReviewModal from './ReviewModal';
import CustomSelect from './CustomSelect';

export default function CardItem({
    card,
    listId,
    listCardCount = 1,
    lists,
    cardEditing,
    cardDrafts,
    setCardDrafts,
    setCardEditing,
    handleUpdateCard,
    handleDeleteCard,
    handleMoveCard,
    handleSubmitCard,
    handleReviewAction,
    canEdit,
    membersMap = {},
    emailMap = {},
    currentUserUid = null,
    currentUserEmail = '',

    reviewerOptions = null,
    reviewerOptionsSource = '',
    compactExpanded,
    setCompactExpanded
}) {
    // state (kept minimal)
    const [submissionNote, setSubmissionNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [moveSelectValue, setMoveSelectValue] = useState(null);

    // refs & animation helpers
    const barRef = useRef(null);
    const percentRef = useRef(null);
    const checkRef = useRef(null);
    const animRefs = useRef({});
    const prevPctRef = useRef(null);

    // small helpers
    const formatDateForInput = (d) => {
        if (!d) return '';
        try {
            if (d.seconds) return new Date(d.seconds * 1000).toISOString().slice(0, 10);
            return new Date(d).toISOString().slice(0, 10);
        } catch (e) {
            return '';
        }
    };

    const resolveAssigneeLabel = (a) => {
        if (!a) return '';
        const s = String(a);
        if (s.includes('@')) {
            const lower = s.toLowerCase();
            const m = emailMap[lower];
            return m ? (m.name || m.email) : s;
        } else {
            const m = membersMap[s];
            return m ? (m.email || m.name || s) : s;
        }
    };

    const prettyDate = (d) => {
        if (!d) return '—';
        try {
            if (d.seconds) return new Date(d.seconds * 1000).toLocaleDateString();
            return new Date(d).toLocaleDateString();
        } catch (e) {
            return '—';
        }
    };
    const prettyDue = (d) => prettyDate(d);

    // data derived from props (hooks must run every render)
    const parentList = Array.isArray(lists) ? lists.find((L) => String(L.id) === String(listId)) : null;

    const mergedAssignees = useMemo(() => {
        const arr = [];
        if (Array.isArray(card.assignees)) arr.push(...card.assignees);
        if (parentList && Array.isArray(parentList.assignees)) arr.push(...parentList.assignees);
        return Array.from(new Set(arr.filter(Boolean).map((x) => String(x).trim())));
    }, [card.assignees, parentList]);

    const mergedAssigneesNormalized = useMemo(() => {
        return new Set(
            mergedAssignees.map((a) => {
                if (!a) return '';
                const s = String(a).trim();
                return s.includes('@') ? s.toLowerCase() : s;
            })
        );
    }, [mergedAssignees]);

    const isAssignee = mergedAssignees.some((a) => {
        if (!a) return false;
        const s = String(a).trim();
        if (currentUserUid && s === currentUserUid) return true;
        if (currentUserEmail && s.toLowerCase() === currentUserEmail.toLowerCase()) return true;
        return false;
    });

    const alreadySubmitted =
        String(card.status || '').toLowerCase() === 'pending' || String(card.status || '').toLowerCase() === 'done';

    const reviewerUidFromCard = card.submission?.reviewerUid || null;
    const reviewerEmailFromCard = card.submission?.reviewerEmail || null;
    const isReviewer =
        (reviewerUidFromCard && currentUserUid && String(reviewerUidFromCard) === String(currentUserUid)) ||
        (reviewerEmailFromCard &&
            currentUserEmail &&
            String(reviewerEmailFromCard).toLowerCase() === String(currentUserEmail).toLowerCase());

    const submissionStatus = String(card.submission?.reviewStatus || '').toLowerCase();
    const showReviewActions =
        isReviewer &&
        (submissionStatus === 'pending' || !submissionStatus) &&
        String(card.status || '').toLowerCase() === 'pending';

    const onPerformReview = useCallback(
        async (action, note = '') => {
            if (!handleReviewAction) {
                console.warn('handleReviewAction not provided');
                return;
            }
            try {
                await handleReviewAction({ listId, cardId: card.id, action, note });
            } catch (err) {
                console.error('review action failed', err);
                throw err;
            }
        },
        [handleReviewAction, listId, card.id]
    );

    const onDelete = useCallback(async () => {
        if (!handleDeleteCard) {
            console.warn('handleDeleteCard not provided');
            return;
        }
        if (!window.confirm('Delete this card? This action cannot be undone.')) return;
        try {
            await handleDeleteCard({ listId, cardId: card.id });
        } catch (err) {
            console.error('delete card failed', err);
        }
    }, [handleDeleteCard, listId, card.id]);

    const isLocked =
        String(card.status || '').toLowerCase() === 'done' ||
        String(card.submission?.reviewStatus || '').toLowerCase() === 'approved';

    const isDoneish =
        String(card.status || '').toLowerCase() === 'done' ||
        String(card.submission?.reviewStatus || '').toLowerCase() === 'approved';

    const displayPct = isDoneish
        ? 100
        : Number.isFinite(Number(card.progress))
            ? Math.max(0, Math.min(100, Math.round(Number(card.progress))))
            : 0;

    const pct = clampPercent(displayPct);

    const cardWeight =
        Number.isFinite(Number(card.weight))
            ? Math.round(Number(card.weight))
            : card.submission && typeof card.submission.contribution === 'number'
                ? Math.round(card.submission.contribution)
                : null;

    const modalReviewerOptions = useMemo(() => {
        const ops = Array.isArray(reviewerOptions) ? reviewerOptions.slice() : null;

        if (Array.isArray(ops) && ops.length) {
            return ops.filter((opt) => {
                if (!opt || opt.value === undefined || opt.value === null) return true;
                const v = String(opt.value);
                const norm = v.includes('@') ? v.toLowerCase() : v;
                return !mergedAssigneesNormalized.has(norm);
            });
        }

        const fallback = mergedAssignees
            .map((a) => {
                if (!a) return null;
                const s = String(a).trim();
                if (s.includes('@')) {
                    const mm = emailMap[s.toLowerCase()] || null;
                    return { value: s.toLowerCase(), label: mm ? mm.name || mm.email : s, subtitle: mm ? mm.email : '' };
                } else {
                    const mm = membersMap[s] || null;
                    return { value: s, label: mm ? mm.name || mm.email : s, subtitle: mm ? mm.email : '' };
                }
            })
            .filter(Boolean);

        return fallback.filter((opt) => {
            const v = String(opt.value);
            const norm = v.includes('@') ? v.toLowerCase() : v;
            return !mergedAssigneesNormalized.has(norm);
        });
    }, [reviewerOptions, mergedAssigneesNormalized, membersMap, emailMap, mergedAssignees]);

    // GSAP animation hook (always declared)
    useEffect(() => {
        const toPct = pct;

        try {
            animRefs.current.tween && animRefs.current.tween.kill && animRefs.current.tween.kill();
        } catch (e) { }
        try {
            animRefs.current.counter && animRefs.current.counter.kill && animRefs.current.counter.kill();
        } catch (e) { }

        const prev = prevPctRef.current;
        const startVal = prev === null || prev === undefined ? 0 : Number(prev);

        if (prev !== null && Number(prev) === toPct) {
            if (barRef.current) barRef.current.style.width = `${toPct}%`;
            if (percentRef.current) {
                percentRef.current.textContent = `${toPct}%`;
                percentRef.current.dataset.val = String(toPct);
            }
            if (toPct === 100 && checkRef.current) {
                checkRef.current.style.display = 'inline-flex';
                checkRef.current.style.opacity = '1';
                checkRef.current.style.transform = 'scale(1)';
            } else if (checkRef.current) {
                checkRef.current.style.display = 'none';
            }
            prevPctRef.current = toPct;
            return;
        }

        if (!barRef.current || !percentRef.current) {
            if (barRef.current) barRef.current.style.width = `${toPct}%`;
            if (percentRef.current) {
                percentRef.current.textContent = `${toPct}%`;
                percentRef.current.dataset.val = String(toPct);
            }
            prevPctRef.current = toPct;
            return;
        }

        try {
            gsap.set(barRef.current, { width: `${startVal}%` });
            if (percentRef.current) {
                percentRef.current.textContent = `${startVal}%`;
                percentRef.current.dataset.val = String(startVal);
            }

            animRefs.current.tween = gsap.to(barRef.current, {
                duration: 0.6,
                width: `${toPct}%`,
                ease: 'power2.out',
            });

            const counter = { val: startVal };
            animRefs.current.counter = gsap.to(counter, {
                duration: 0.6,
                val: toPct,
                roundProps: 'val',
                ease: 'power2.out',
                onUpdate: () => {
                    if (percentRef.current) {
                        percentRef.current.textContent = `${counter.val}%`;
                        percentRef.current.dataset.val = String(counter.val);
                    }
                },
            });

            if (toPct === 100) {
                if (checkRef.current) {
                    gsap.set(checkRef.current, { scale: 0, opacity: 0, display: 'inline-flex' });
                    gsap.to(checkRef.current, { duration: 0.48, scale: 1, opacity: 1, ease: 'back.out(1.7)' });
                }
                gsap.fromTo(
                    barRef.current,
                    { boxShadow: '0 0 0px rgba(76,175,80,0)' },
                    { duration: 0.6, boxShadow: '0 0 12px rgba(76,175,80,0.45)', yoyo: true, repeat: 1 }
                );
            } else {
                if (checkRef.current) {
                    gsap.to(checkRef.current, {
                        duration: 0.18,
                        scale: 0,
                        opacity: 0,
                        onComplete: () => {
                            if (checkRef.current) checkRef.current.style.display = 'none';
                        },
                    });
                }
                gsap.to(barRef.current, { duration: 0.2, boxShadow: '0 0 0px rgba(0,0,0,0)' });
            }
        } catch (err) {
            if (barRef.current) barRef.current.style.width = `${toPct}%`;
            if (percentRef.current) {
                percentRef.current.textContent = `${toPct}%`;
                percentRef.current.dataset.val = String(toPct);
            }
            if (toPct === 100 && checkRef.current) {
                checkRef.current.style.display = 'inline-flex';
                checkRef.current.style.opacity = '1';
                checkRef.current.style.transform = 'scale(1)';
            } else if (checkRef.current) {
                checkRef.current.style.display = 'none';
            }
        } finally {
            prevPctRef.current = toPct;
        }
    }, [pct]);

    // ready to render — don't return early, render conditional UI instead
    const isEditing = !!(cardEditing && cardEditing[card.id]);
    // const isCompact = isDoneish && !isEditing;
    const shouldCompact = !isEditing && !compactExpanded;


    // prepare some values used in edit UI (safe to compute here as plain vars)
    const complexityOptions = [
        { value: 'auto||', label: 'Auto detect', subtitle: 'Let system infer complexity' },
        { value: 'manual||easy', label: 'Manual: Easy' },
        { value: 'manual||medium', label: 'Manual: Medium' },
        { value: 'manual||hard', label: 'Manual: Hard' },
    ];

    const curComplexVal =
        (cardDrafts[card.id]?.complexityMode ?? card.complexityMode ?? 'auto') +
        '||' +
        String(cardDrafts[card.id]?.complexity ?? card.complexity ?? '');

    const priorityOptions = [
        { value: 'low', label: 'Easy' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'Hard' },
    ];

    const curPriority = cardDrafts[card.id]?.priority ?? card.priority ?? 'medium';

    return (
        <article className={`card-item ${String(card.id).startsWith('tmp-') ? 'optimistic' : ''}  ${shouldCompact ? 'compact' : ''} `} data-priority={card.priority || 'medium'}>
            {/** If editing show edit UI **/}
            {isEditing ? (
                <>
                    <input
                        className="card-edit-input card-title-input"
                        value={cardDrafts[card.id]?.title ?? card.title}
                        onChange={(e) => setCardDrafts((p) => ({ ...p, [card.id]: { ...(p[card.id] || {}), title: e.target.value } }))}
                        aria-label="Card title"
                    />
                    <div className="card-edit-row">
                        <input
                            type="date"
                            className="card-edit-input"
                            value={(cardDrafts[card.id]?.dueDate ?? formatDateForInput(card.dueDate)) || ''}
                            onChange={(e) => setCardDrafts((p) => ({ ...p, [card.id]: { ...(p[card.id] || {}), dueDate: e.target.value } }))}
                            aria-label="Due date"
                        />
                        <input
                            type="number"
                            className="card-edit-input card-effort-input"
                            value={cardDrafts[card.id]?.effort ?? card.effort}
                            onChange={(e) => setCardDrafts((p) => ({ ...p, [card.id]: { ...(p[card.id] || {}), effort: e.target.value } }))}
                            aria-label="Effort estimate"
                        />
                    </div>

                    <div className="card-edit-row" style={{ alignItems: 'center', gap: 12 }}>
                        <label style={{ fontSize: 13, minWidth: 70 }}>Priority</label>
                        <div style={{ flex: 1 }}>
                            <CustomSelect
                                options={priorityOptions}
                                value={curPriority}
                                onChange={(val) => {
                                    setCardDrafts((p) => ({ ...p, [card.id]: { ...(p[card.id] || {}), priority: String(val) } }));
                                }}
                                placeholder="Priority"
                                searchable={false}
                                ariaLabel="Priority"
                                width="160px"
                            />
                        </div>
                    </div>

                    <div className="card-edit-px">
                        <label style={{ fontSize: 13 }}>Complexity:</label>
                        <div style={{ flex: 1 }}>
                            <CustomSelect
                                options={complexityOptions}
                                value={curComplexVal}
                                onChange={(val) => {
                                    const [mode, valPart] = String(val).split('||');
                                    setCardDrafts((p) => ({
                                        ...p,
                                        [card.id]: {
                                            ...(p[card.id] || {}),
                                            complexityMode: mode,
                                            complexity: valPart === '' ? null : isNaN(Number(valPart)) ? valPart : Number(valPart),
                                        },
                                    }));
                                }}
                                placeholder="Select complexity"
                                searchable={true}
                                ariaLabel="Complexity"
                            />
                        </div>

                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 13 }}>Progress</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={cardDrafts[card.id]?.progress ?? card.progress ?? 0}
                                onChange={(e) => setCardDrafts((p) => ({ ...p, [card.id]: { ...(p[card.id] || {}), progress: Number(e.target.value) } }))}
                            />
                            <div style={{ minWidth: 40, textAlign: 'right' }}>{cardDrafts[card.id]?.progress ?? card.progress ?? 0}%</div>
                        </div>
                    </div>

                    <div className="card-edit-actions">
                        <button
                            className="card-btn card-btn-primary"
                            onClick={() => {
                                const draft = cardDrafts[card.id] || {};
                                const updates = {};
                                if (draft.title !== undefined) updates.title = draft.title;
                                if (draft.effort !== undefined) updates.effort = Number(draft.effort) || 1;
                                if (draft.dueDate !== undefined) updates.dueDate = draft.dueDate ? new Date(draft.dueDate) : null;

                                if (draft.complexityMode !== undefined) updates.complexityMode = draft.complexityMode;
                                if (draft.complexity !== undefined) updates.complexity = draft.complexity === '' ? null : draft.complexity;
                                if (draft.progress !== undefined) updates.progress = Number(draft.progress) || 0;

                                const due = updates.dueDate || card.dueDate || null;
                                const priorityLabel = cardDrafts[card.id]?.priority ?? card.priority ?? 'medium';
                                const effortVal = updates.effort ?? card.effort ?? 1;
                                const complexityModeVal = updates.complexityMode ?? card.complexityMode ?? 'auto';
                                const complexityVal = updates.complexity ?? card.complexity ?? null;
                                const cp = computePriority({
                                    dueDate: due,
                                    priorityLabel,
                                    effort: effortVal,
                                    dependencies: card.dependencies || [],
                                    createdAt: card.createdAt || null,
                                    complexity: complexityVal,
                                    complexityMode: complexityModeVal,
                                    title: cardDrafts[card.id]?.title ?? card.title,
                                    description: card.description || '',
                                });

                                updates.priorityRank = cp.priorityRank;
                                updates.complexity = cp.complexity ?? updates.complexity;
                                updates.complexityMode = complexityModeVal;
                                updates.priority = priorityLabel;

                                handleUpdateCard({ listId, cardId: card.id, updates });
                            }}
                            aria-label="Save card"
                        >
                            ✎ Save
                        </button>

                        <button
                            className="card-btn card-btn-ghost"
                            onClick={() => {
                                setCardEditing((p) => ({ ...p, [card.id]: false }));
                                setCardDrafts((p) => {
                                    const c = { ...p };
                                    delete c[card.id];
                                    return c;
                                });
                            }}
                            aria-label="Cancel edit"
                        >
                            ↺ Cancel
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className="card-top">
                        <div className="card-title" title={card.title}>{card.title}</div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {/* per-card expand/collapse — compactExpanded = true means expanded/full details shown */}
                            {!isEditing && (
                                <button
                                    className="card-btn"
                                    onClick={() => setCompactExpanded(!compactExpanded)}
                                    aria-label={compactExpanded ? 'Collapse details' : 'Expand details'}
                                    title={compactExpanded ? 'Collapse details' : 'Expand details'}
                                    style={{ padding: '6px 8px' }}
                                >
                                    {compactExpanded ? '▾' : '▸'}
                                </button>
                            )}

                            <div className={`card-priority pill pill-${String(card.priority || 'medium').toLowerCase()}`}>
                                {card.priority || 'medium'}
                            </div>
                        </div>
                    </div>

                    <div className="card-meta">
                        <div className="card-meta-left">
                            {card.dueDate ? (
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div className="card-start" style={{ fontSize: 13 }}>
                                        Start:{' '}
                                        <span className="card-start-val">{card.createdAt ? prettyDate(card.createdAt) : '—'}</span>
                                    </div>
                                    <div className="card-due">
                                        Due: <span className="card-due-val">{prettyDue(card.dueDate)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="card-due">
                                    Due: <span className="card-due-val">{prettyDue(card.dueDate)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: '10px', textAlign: 'right' }} aria-hidden>
                            <span ref={percentRef} data-val={String(pct)}>
                                {`${pct}%`}
                            </span>
                        </div>

                        <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                            <div
                                ref={barRef}
                                style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg,#4caf50,#8bc34a)',
                                    transition: 'none',
                                }}
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={pct}
                            />
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--sidenav-ISO)', marginTop: 6 }}>
                            {isDoneish ? 'Done' : `${displayPct}% complete`}
                            {cardWeight !== null ? (
                                <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--sidenav-ISO)' }}>• Contrib: {cardWeight}%</span>
                            ) : null}
                        </div>
                    </div>

                    {Array.isArray(card.assignees) && card.assignees.length > 0 && (
                        <div className="card-assignees" aria-hidden>
                            {card.assignees.map((a, idx) => (
                                <div key={idx} className="assignee-pill" title={resolveAssigneeLabel(a)}>
                                    {resolveAssigneeLabel(a)}
                                </div>
                            ))}
                        </div>
                    )}

                    {(String(card.status || '').toLowerCase() === 'pending' ||
                        String(card.status || '').toLowerCase() === 'done' ||
                        String(card.status || '').toLowerCase() === 'rejected') && (
                            <div className="card-submitted" style={{ marginTop: 6, fontSize: 12, color: 'var(--sidenav-ISO)' }}>
                                <span style={{ fontWeight: 700, marginRight: 8 }}>
                                    {String(card.status || '').toLowerCase() === 'done' || String(card.submission?.reviewStatus || '').toLowerCase() === 'approved'
                                        ? card.submission?.type === 'complete'
                                            ? '✅ Completed'
                                            : '✓ Approved'
                                        : String(card.status || '').toLowerCase() === 'pending'
                                            ? '⏳ Pending'
                                            : '✕ Rejected'}
                                </span>

                                <span>
                                    by{' '}
                                    {card.submittedBy && membersMap[String(card.submittedBy)]
                                        ? membersMap[String(card.submittedBy)].name || membersMap[String(card.submittedBy)].email
                                        : card.submittedBy || 'Unknown'}
                                </span>

                                <span style={{ marginLeft: 8, color: 'var(--sidenav-ISO)', fontWeight: 600 }}>• {timeAgo(card.submittedAt)}</span>

                                {card.submission?.qaChecked && (
                                    <span className="pill" style={{ marginLeft: 8 }}>
                                        QA ✓
                                    </span>
                                )}

                                {(card.submission?.reviewerUid || card.submission?.reviewerEmail) && (
                                    <span style={{ marginLeft: 8, color: 'var(--sidenav-ISO)' }}>
                                        • Reviewer:{' '}
                                        {card.submission?.reviewerUid
                                            ? membersMap[String(card.submission.reviewerUid)]
                                                ? membersMap[String(card.submission.reviewerUid)].name || membersMap[String(card.submission.reviewerUid)].email
                                                : card.submission.reviewerUid
                                            : card.submission?.reviewerEmail}
                                    </span>
                                )}

                                {card.submission?.reviewStatus && (
                                    <span style={{ marginLeft: 8 }} className={`pill pill-review-${card.submission.reviewStatus}`}>
                                        {card.submission.reviewStatus.charAt(0).toUpperCase() + card.submission.reviewStatus.slice(1)}
                                    </span>
                                )}

                                {card.submissionNote ? <div style={{ marginTop: 6, fontStyle: 'italic' }}>"{card.submissionNote}"</div> : null}

                                {card.submission?.reviewNote ? (
                                    <div style={{ marginTop: 8, fontSize: 13, color: 'var(--sidenav-ISO)' }}>
                                        <strong>Reviewer note:</strong>
                                        <div style={{ marginTop: 6, fontStyle: 'italic' }}>{card.submission.reviewNote}</div>
                                    </div>
                                ) : null}
                            </div>
                        )}

                    <div className="card-actions">
                        {canEdit && !isLocked && (
                            <button
                                className="card-btn"
                                onClick={() => {
                                    setCardEditing((p) => ({ ...(p || {}), [card.id]: true }));
                                    setCardDrafts((p) => ({
                                        ...(p || {}),
                                        [card.id]: {
                                            title: card.title,
                                            dueDate:
                                                card.dueDate && (card.dueDate.seconds ? new Date(card.dueDate.seconds * 1000).toISOString().slice(0, 10) : new Date(card.dueDate).toISOString().slice(0, 10)),
                                            effort: card.effort,
                                            progress: card.progress ?? 0,
                                            complexityMode: card.complexityMode ?? 'auto',
                                            complexity: card.complexity ?? null,
                                        },
                                    }));
                                }}
                                aria-label={`Edit card ${card.title || ''}`}
                            >
                                ✎ Edit
                            </button>
                        )}

                        {canEdit && !isLocked && (
                            <div style={{ minWidth: 120 }}>
                                <CustomSelect
                                    options={[{ value: '', label: '⇄ Move', subtitle: 'Move to another list' }, ...lists.filter((x) => x.id !== listId).map((opt) => ({ value: String(opt.id), label: opt.name }))]}
                                    value={moveSelectValue}
                                    onChange={async (val) => {
                                        if (!val) return;
                                        setMoveSelectValue(val);
                                        try {
                                            await handleMoveCard({ fromListId: listId, toListId: val, card });
                                        } finally {
                                            setMoveSelectValue(null);
                                        }
                                    }}
                                    placeholder="⇄ Move"
                                    searchable={true}
                                    width="200px"
                                    ariaLabel="Move card"
                                />
                            </div>
                        )}

                        {canEdit && !isLocked && (
                            <button className="card-btn card-btn-danger" onClick={onDelete} aria-label={`Delete card ${card.title || ''}`} title="Delete card">
                                🗑 Delete
                            </button>
                        )}

                        {isAssignee && !alreadySubmitted && !isLocked && (
                            <>
                                <button className="card-btn card-btn-primary" onClick={() => setModalOpen(true)} aria-label={`Submit task ${card.title || ''}`} disabled={submitting}>
                                    ⤴ Submit
                                </button>

                                <SubmissionModal
                                    open={modalOpen}
                                    onClose={() => setModalOpen(false)}
                                    onSubmit={async ({ note, type, attachments, qaChecked, reviewerUid: selReviewer }) => {
                                        let reviewerUid = null;
                                        let reviewerEmail = null;
                                        if (selReviewer) {
                                            if (String(selReviewer).includes('@')) {
                                                reviewerEmail = String(selReviewer).toLowerCase();
                                            } else {
                                                reviewerUid = String(selReviewer);
                                            }
                                        }

                                        const defaultContribution = Number.isFinite(Number(card.weight)) && Number(card.weight) > 0 ? Number(card.weight) : Math.round(100 / Math.max(1, listCardCount || 1));

                                        await handleSubmitCard({
                                            listId,
                                            cardId: card.id,
                                            note,
                                            type,
                                            qaChecked: !!qaChecked,
                                            reviewerUid,
                                            reviewerEmail,
                                            attachments: attachments || [],
                                            submission: { contribution: defaultContribution },
                                        });
                                    }}
                                    defaultNote={submissionNote}
                                    card={card}
                                    assignees={mergedAssignees.map((a) => {
                                        const m = a && a.includes('@') ? emailMap[a.toLowerCase()] || null : membersMap[a] || null;
                                        return { id: a, name: m ? m.name || m.email : a, email: m?.email || (a.includes('@') ? a : '') };
                                    })}
                                    currentUser={{ uid: currentUserUid, email: currentUserEmail }}
                                    reviewerOptions={modalReviewerOptions}
                                    reviewerOptionsSource={reviewerOptionsSource || 'higher'}
                                    defaultReviewerUid={card.submission?.reviewerUid || ''}
                                />
                            </>
                        )}

                        {showReviewActions && (
                            <>
                                <button className="card-btn card-btn-primary" onClick={() => setReviewModalOpen(true)} aria-label="Open review dialog">
                                    Review
                                </button>

                                <ReviewModal
                                    open={reviewModalOpen}
                                    onClose={() => setReviewModalOpen(false)}
                                    reviewerName={
                                        reviewerUidFromCard && membersMap[String(reviewerUidFromCard)] ? membersMap[String(reviewerUidFromCard)].name || membersMap[String(reviewerUidFromCard)].email : reviewerEmailFromCard || ''
                                    }
                                    onConfirm={async (action, note) => {
                                        await onPerformReview(action, note);
                                    }}
                                />
                            </>
                        )}

                        {showReviewActions && handleReviewAction && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 6 }}>
                                <button className="card-btn card-btn-primary" onClick={() => handleReviewAction({ listId, cardId: card.id, action: 'approve' })} aria-label="Approve submission">
                                    ✓ Approve
                                </button>

                                <button
                                    className="card-btn card-btn-danger"
                                    onClick={() => {
                                        const note = window.prompt('Optional note for rejection (visible to submitter):', '') || '';
                                        handleReviewAction({ listId, cardId: card.id, action: 'reject', note });
                                    }}
                                    aria-label="Reject submission"
                                >
                                    ✕ Reject
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </article>
    );
}

// small helper outside component
function clampPercent(v) {
    const n = Number(v) || 0;
    return Math.max(0, Math.min(100, Math.round(n)));
}