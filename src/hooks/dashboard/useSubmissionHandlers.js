import { useCallback, useRef } from "react";
import * as boardSvc from '../../services/boardService'
import { arrayUnion, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";

export function useSubmissionHandlers({ businessId, uid, userEmail, dispatchSet, selectedBoardId, cardsMap, lists, selectedBoard, members, getMemberLevel, roles, userLevel }) {
    const snapshotRef = useRef({});

    const handleSubmitCard = useCallback(async ({ listId, cardId, note = '', type = 'for-review', qaChecked = false, reviewerUid = null, reviewerEmail = null, attachments = [], submission = {} }) => {
        if (!listId || !cardId) return dispatchSet('uiError', 'Card/list required');
        const card = (cardsMap[listId] || []).find(c => c.id === cardId);
        if (!card) return dispatchSet('uiError', 'Card not found');
        const listDoc = lists.find(l => l.id === listId) || {};
        const mergedAssignees = Array.from(new Set([...(card.assignees || []), ...(listDoc.assignees || [])].filter(Boolean).map(String).trim()));
        const isAssignee = mergedAssignees.some(a => a === uid || a.toLowerCase() === userEmail.toLowerCase());
        if (!isAssignee) return dispatchSet('uiError', 'Permission denied');
        snapshotRef.current.cardsMap = { ...cardsMap };
        let chosenReviewerUid = reviewerUid;
        let chosenReviewerEmail = reviewerEmail;
        if (!chosenReviewerUid && !chosenReviewerEmail && userLevel <= 2) {
            const candidates = members.filter(m => {
                const level = getMemberLevel(m);
                const mKey = m.uid || m.id;
                const assigneeConflict = mergedAssignees.some(a => (a.includes('@') ? (m.email || '').toLowerCase() === a.toLowerCase() : String(mKey) === a));
                return level > 2 && !assigneeConflict;
            });
            if (candidates.length > 0) {
                candidates.sort((a, b) => getMemberLevel(b) - getMemberLevel(a) || (a.name || a.email).localeCompare(b.name || b.email));
                chosenReviewerUid = candidates[0].uid || candidates[0].id;
            }
        }
        const contribution = submission.contribution ?? card.weight ?? Math.round(100 / (cardsMap[listId].length || 1));
        const submissionObj = {
            type,
            qaChecked: !!qaChecked,
            reviewerUid: chosenReviewerUid,
            reviewerEmail: chosenReviewerEmail,
            reviewerAssignedAt: chosenReviewerUid ? new Date() : null,
            reviewStatus: 'pending',
            attachments: (attachments || []).map(a => ({ name: a.name })),
            contribution
        };
        const updates = {
            status: 'pending',
            submittedBy: uid,
            submission: submissionObj,
            ...(note && { submissionNote: note })
        };
        dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: prev[listId].map(c => c.id === cardId ? { ...c, ...updates, submittedAt: new Date() } : c) }));
        try {
            await boardSvc.updateCard({ businessId, uid, boardId: selectedBoardId, listId, cardId, updates });
            if (submissionObj.reviewerUid) {
                const notif = {
                    id: `notif-${Date.now()}`,
                    type: 'assigned-review',
                    title: `Task assigned for review`,
                    body: `${selectedBoard?.name || 'Board'} — ${card.title}`,
                    link: `/business/${businessId}/boards/${selectedBoardId}`,
                    createdAt: serverTimestamp(),
                    read: false
                };
                await updateDoc(doc(db, 'account', submissionObj.reviewerUid), { notifications: arrayUnion(notif) });
            } else if (submissionObj.reviewerEmail) {
                window.alert(`Reviewer assigned: ${submissionObj.reviewerEmail}. (External email notification not implemented.)`);
            }
        } catch (err) {
            console.error('submitCard failed', err);
            dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
            dispatchSet('uiError', err?.message || 'Failed to submit card');
        }
    }, [businessId, uid, userEmail, selectedBoardId, cardsMap, lists, dispatchSet, selectedBoard, members, getMemberLevel, userLevel]);

    const handleReviewAction = useCallback(async ({ listId, cardId, action, note = '' }) => {
        if (!listId || !cardId || !['approve', 'reject'].includes(action)) return dispatchSet('uiError', 'Invalid action or card/list');
        const card = (cardsMap[listId] || []).find(c => c.id === cardId);
        if (!card) return dispatchSet('uiError', 'Card not found');
        const submission = card.submission || {};
        const isReviewer = (submission.reviewerUid === uid) || (submission.reviewerEmail.toLowerCase() === userEmail.toLowerCase());
        if (!isReviewer) return dispatchSet('uiError', 'Permission denied');
        snapshotRef.current.cardsMap = { ...cardsMap };
        const reviewStatus = action === 'approve' ? 'approved' : 'rejected';
        const updates = {
            submission: {
                ...submission,
                reviewStatus,
                reviewedBy: uid,
                reviewNote: note
            },
            status: action === 'approve' ? 'done' : 'rejected'
        };
        dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: prev[listId].map(c => c.id === cardId ? { ...c, ...updates } : c) }));
        try {
            await boardSvc.updateCard({ businessId, uid, boardId: selectedBoardId, listId, cardId, updates });
            const submitterUid = card.submittedBy || card.createdBy;
            if (submitterUid) {
                const notif = {
                    id: `notif-${Date.now()}`,
                    type: action === 'approve' ? 'review-approved' : 'review-rejected',
                    title: action === 'approve' ? 'Your submission was approved' : 'Your submission was rejected',
                    body: `${selectedBoard?.name || 'Board'} — ${card.title}`,
                    link: `/business/${businessId}/boards/${selectedBoardId}`,
                    createdAt: serverTimestamp(),
                    read: false
                };
                await updateDoc(doc(db, 'account', submitterUid), { notifications: arrayUnion(notif) });
            } else {
                window.alert(`Review ${action === 'approve' ? 'approved' : 'rejected'} — submitter not found to notify.`);
            }
        } catch (err) {
            console.error('review action failed', err);
            dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
            dispatchSet('uiError', err?.message || 'Failed to record review action');
        }
    }, [businessId, uid, userEmail, selectedBoardId, cardsMap, dispatchSet, selectedBoard]);

    return { handleSubmitCard, handleReviewAction };
}