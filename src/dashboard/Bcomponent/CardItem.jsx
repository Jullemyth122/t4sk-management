import React, { useState } from 'react';
import { timeAgo } from '../../utils/time';
import TaskDetailsModal from './TaskDetailsModal';
import SubmissionModal from './SubmissionModal';
import ReviewModal from './ReviewModal';

export default function CardItem({
    card,
    listId,
    cardDrafts,
    setCardDrafts,
    handleUpdateCard,     // updates card content
    handleDeleteCard,
    handleSubmitCard,
    handleReviewAction,   // approve/reject
    canEdit,
    membersMap = {},
    emailMap = {},
    businessOwnerUid,
    currentUserUid,        // needed for permissions in modal
    reviewerOptions,       // needed for modal
    currentUserEmail
}) {
    const [modalOpen, setModalOpen] = useState(false);
    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);

    // Helpers
    const resolveAssignee = (val) => {
        if (!val) return null;
        const s = String(val).trim();
        if (s.includes('@')) {
            const m = emailMap[s.toLowerCase()];
            return { name: m?.name || m?.email || s, email: s, avatar: m?.avatar };
        }
        const m = membersMap[s];
        return { name: m?.name || m?.displayName || s, email: m?.email, avatar: m?.avatar };
    };

    const assignees = (card.assignees || []).map(resolveAssignee).filter(Boolean);
    const completedSubtasks = (card.subtasks || []).filter(s => s.completed).length;
    const totalSubtasks = (card.subtasks || []).length;

    // Status Logic
    const isDone = String(card.status || '').toLowerCase() === 'done';
    const isApproved = String(card.submission?.reviewStatus || '').toLowerCase() === 'approved';
    const isRejected = String(card.submission?.reviewStatus || '').toLowerCase() === 'rejected';
    const isPendingReview = String(card.status || '').toLowerCase() === 'pending';

    // Progress Bar Logic
    const displayProgress = Number.isFinite(Number(card.progress)) ? Math.round(Number(card.progress)) : 0;
    const progress = isApproved || isDone ? 100 : displayProgress;

    // Permissions
    const currentUserMember = membersMap[currentUserUid] || Object.values(membersMap).find(m => m.email === currentUserEmail);

    // Check if user is business owner (always high-level)
    const isBusinessOwner = businessOwnerUid && currentUserUid && String(currentUserUid) === String(businessOwnerUid);

    // Check role name for high-level (use roleName, role, or inferred from member data)
    const memberRole = currentUserMember?.roleName || currentUserMember?.role || '';
    const isHighLevelByRole = currentUserMember && ['owner', 'admin', 'manager'].includes(String(memberRole).toLowerCase());

    // User is high-level if they are the business owner OR have a high-level role
    const isHighLevel = isBusinessOwner || isHighLevelByRole;

    const isReviewer = (card.submission?.reviewerUid === currentUserUid) || (card.submission?.reviewerEmail === currentUserEmail);

    const showReviewActions = (isHighLevel || isReviewer) && isPendingReview;

    // Open Modal Handler
    const handleCardClick = (e) => {
        // Prevent opening if clicking buttons/inputs directly
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.card-actions-row')) return;

        // Only high-level users or reviewers can open the details modal
        if (!isHighLevel && !isReviewer) return;

        setModalOpen(true);
    };

    // Priority badge styles with cool gradients
    const priorityStyles = {
        high: { background: 'linear-gradient(135deg, #ff416c, #ff4b2b)', color: '#fff', boxShadow: '0 2px 8px rgba(255, 65, 108, 0.4)' },
        medium: { background: 'linear-gradient(135deg, #f7971e, #ffd200)', color: '#1a1a2e', boxShadow: '0 2px 8px rgba(247, 151, 30, 0.4)' },
        low: { background: 'linear-gradient(135deg, #11998e, #38ef7d)', color: '#fff', boxShadow: '0 2px 8px rgba(56, 239, 125, 0.4)' },
        easy: { background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)' },
    };

    const getPriorityStyle = () => {
        const p = String(card.priority || 'medium').toLowerCase();
        return priorityStyles[p] || priorityStyles.medium;
    };

    return (
        <>
            <article
                className={`card-item summary-mode ${isRejected ? 'rejected' : ''} ${isApproved ? 'approved' : ''}`}
                onClick={handleCardClick}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', padding: '10px 12px' }}
            >
                {/* Row 1: Priority Badge + Title + Dates (all inline) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{
                        ...getPriorityStyle(),
                        padding: '3px 8px',
                        borderRadius: 12,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                    }}>
                        {card.priority || 'Medium'}
                    </span>

                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {card.title || 'Untitled Task'}
                    </h4>

                    <div style={{ display: 'flex', gap: 6, fontSize: '0.7rem', opacity: 0.7, whiteSpace: 'nowrap' }}>
                        {card.startDate && <span>🚀{new Date(card.startDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</span>}
                        {card.dueDate && <span>📅{new Date(card.dueDate.seconds ? card.dueDate.seconds * 1000 : card.dueDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</span>}
                    </div>
                </div>

                {/* Row 2: Status badges (if any) */}
                {(isRejected || isPendingReview || isApproved) && (
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                        {isRejected && <span className="status-badge rejected" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>✕ Rejected</span>}
                        {isPendingReview && !isRejected && <span className="status-badge pending" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>⏳ Review</span>}
                        {isApproved && <span className="status-badge approved" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>✓ Done</span>}
                    </div>
                )}

                {/* Row 3: Progress bar + percentage (slim) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                        <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            background: isRejected ? '#ff416c' : (isApproved ? '#38ef7d' : 'linear-gradient(90deg, #667eea, #764ba2)'),
                            borderRadius: 3,
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                    <span style={{ fontSize: '0.65rem', opacity: 0.6, minWidth: 28 }}>{progress}%</span>
                    {totalSubtasks > 0 && <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>{completedSubtasks}/{totalSubtasks}</span>}
                </div>

                {/* Row 4: Assignees + Actions + Details (all in one row) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Quick action buttons */}
                    <div style={{ display: 'flex', gap: 4 }}>
                        {!isApproved && !isPendingReview && (currentUserMember && assignees.some(a => String(a.email).toLowerCase() === String(currentUserMember.email).toLowerCase() || a.name === currentUserMember.name)) && (
                            <button
                                className="btn-small action ghost"
                                onClick={(e) => { e.stopPropagation(); setSubmitModalOpen(true); }}
                                style={{ fontSize: '0.68rem', padding: '3px 6px', borderRadius: 4 }}
                            >
                                Submit
                            </button>
                        )}
                        {showReviewActions && (
                            <button 
                                className="btn-small action primary"
                                onClick={(e) => { e.stopPropagation(); setReviewModalOpen(true); }}
                                style={{ fontSize: '0.68rem', padding: '3px 6px', borderRadius: 4 }}
                            >
                                Review
                            </button>
                        )}
                    </div>

                    {/* Assignees + Details button (right side) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex' }}>
                            {assignees.slice(0, 3).map((a, i) => (
                                <div key={i} title={a.name} style={{
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                    border: '2px solid var(--card-bg, #1a1a2e)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.55rem', fontWeight: 600, marginLeft: i > 0 ? -6 : 0,
                                    overflow: 'hidden', color: '#fff'
                                }}>
                                    {a.avatar ? <img src={a.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (a.name[0] || '?').toUpperCase()}
                                </div>
                            ))}
                            {assignees.length > 3 && (
                                <div style={{
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.15)',
                                    border: '2px solid var(--card-bg, #1a1a2e)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.5rem', marginLeft: -6, color: '#fff'
                                }}>
                                    +{assignees.length - 3}
                                </div>
                            )}
                        </div>

                        {(isHighLevel || isReviewer) && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
                                title="View details"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2))',
                                    border: '1px solid rgba(102,126,234,0.3)',
                                    borderRadius: 6,
                                    padding: '3px 8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    color: '#a78bfa',
                                    fontSize: '0.65rem',
                                    fontWeight: 500,
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102,126,234,0.35), rgba(118,75,162,0.35))'; e.currentTarget.style.borderColor = 'rgba(102,126,234,0.5)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2))'; e.currentTarget.style.borderColor = 'rgba(102,126,234,0.3)'; }}
                            >
                                <span>📋</span>
                                <span>Details</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Rejected Feedback (if any) */}
                {isRejected && card.submission?.reviewerNote && (
                    <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(255, 65, 108, 0.1)', borderRadius: 4, fontSize: '0.7rem', color: '#ff8a80', borderLeft: '2px solid #ff416c' }}>
                        "{card.submission.reviewerNote}"
                    </div>
                )}
            </article>

            {/* --- Modals --- */}

            <TaskDetailsModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                card={card}
                draft={cardDrafts}
                setDraft={setCardDrafts}
                canEdit={canEdit}
                onSave={() => {
                    const d = cardDrafts[card.id];
                    if (d) handleUpdateCard({ listId, cardId: card.id, updates: d });
                    setModalOpen(false);
                }}
                onDelete={() => handleDeleteCard({ listId, cardId: card.id })}
                membersMap={membersMap}
                emailMap={emailMap}
                businessOwnerUid={businessOwnerUid}
                currentUserUid={currentUserUid}
                handleReviewAction={handleReviewAction}
                isReviewer={isReviewer}
                isHighLevel={isHighLevel}
                assigneeCandidates={Object.values(membersMap).map(m => ({
                    id: m.uid || m.id,
                    email: m.email,
                    name: m.name || m.displayName
                }))}
                // Pass priority/complexity options if needed, or define in modal
                priorityOptions={[
                    { value: 'low', label: 'Easy' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'Hard' }
                ]}
            />

            <SubmissionModal
                open={submitModalOpen}
                onClose={() => setSubmitModalOpen(false)}
                card={card}
                assignees={assignees.map(a => ({ ...a, id: a.email || a.name }))} // adapter
                currentUser={currentUserMember}
                onSubmit={async (data) => {
                    if (!handleSubmitCard) return;
                    await handleSubmitCard(listId, card.id, data);
                }}
                onSubtaskToggle={async (subtaskIndex, newCompleted) => {
                    // Immediately persist subtask toggle to Firestore
                    if (!handleUpdateCard || !card?.subtasks) return;
                    const newSubtasks = card.subtasks.map((st, idx) =>
                        idx === subtaskIndex ? { ...st, completed: newCompleted } : st
                    );
                    // Calculate new progress based on subtasks
                    const completedCount = newSubtasks.filter(s => s.completed).length;
                    const newProgress = newSubtasks.length > 0 ? Math.round((completedCount / newSubtasks.length) * 100) : 0;
                    await handleUpdateCard({
                        listId,
                        cardId: card.id,
                        updates: { subtasks: newSubtasks, progress: newProgress }
                    });
                }}
                reviewerOptions={reviewerOptions}
            />

            <ReviewModal
                open={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                onApprove={async (note) => {
                    await handleReviewAction({ listId, cardId: card.id, action: 'approve', note });
                    setReviewModalOpen(false);
                }}
                onReject={async (note) => {
                    await handleReviewAction({ listId, cardId: card.id, action: 'reject', note });
                    setReviewModalOpen(false);
                }}
            />
        </>
    );
}