// services/boardService.js
import {
    collection,
    doc,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot,
    runTransaction,
    setDoc,
    limit,
    collectionGroup,
    where,
    writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { COLLECTIONS, ensure, sendNotification, sanitizeString } from "./accountService"; // Assuming cross-import if needed; otherwise, duplicate or import from a shared helpers.

// --- Boards Section ---
function boardsRoot({ businessId = null, uid = null }) {
    if (businessId) return collection(db, COLLECTIONS.BUSINESSES, businessId, "boards");
    if (uid) return collection(db, COLLECTIONS.ACCOUNT, uid, "boards");
    throw new Error("boardsRoot: businessId or uid required");
}

export const getBoards = async ({ businessId = null, uid = null }) => {
    const root = boardsRoot({ businessId, uid });
    const q = query(root, orderBy("createdAt", "asc"));
    const snaps = await getDocs(q);
    return snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const subscribeBoards = ({ businessId = null, uid = null, cb }) => {
    const root = boardsRoot({ businessId, uid });
    const q = query(root, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
        q,
        (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => {
            console.warn("subscribeBoards error", err);
            cb([]);
        }
    );
    return unsub;
};

export const createBoard = async ({ businessId = null, uid = null, name, description = "", settings = {} }) => {
    ensure(name, "createBoard: name required");
    const safeName = sanitizeString(name, 200);
    const safeDesc = sanitizeString(description, 2000);
    const root = boardsRoot({ businessId, uid });
    const payload = {
        name: safeName,
        description: safeDesc,
        businessId: businessId ?? null,
        ownerUid: uid ?? null,
        settings: settings ?? {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(root, payload);
    const snap = await getDoc(ref);
    return { id: snap.id, ...snap.data() };
};

export const getBoard = async ({ businessId = null, uid = null, boardId }) => {
    if (!boardId) return null;
    const ref = doc(db, businessId ? COLLECTIONS.BUSINESSES : COLLECTIONS.ACCOUNT, businessId ?? uid, "boards", boardId);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updateBoard = async ({ businessId = null, uid = null, boardId, updates = {} }) => {
    ensure(boardId, "updateBoard: boardId required");
    const ref = doc(db, businessId ? COLLECTIONS.BUSINESSES : COLLECTIONS.ACCOUNT, businessId ?? uid, "boards", boardId);
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const deleteBoard = async ({ businessId = null, uid = null, boardId }) => {
    ensure(boardId, "deleteBoard: boardId required");
    await deleteDoc(doc(db, businessId ? COLLECTIONS.BUSINESSES : COLLECTIONS.ACCOUNT, businessId ?? uid, "boards", boardId));
    return true;
};

// --- Lists Section ---
export const subscribeLists = ({ businessId = null, uid = null, boardId, cb }) => {
    ensure(boardId, "subscribeLists: boardId required");
    const col = collection(db, businessId ? COLLECTIONS.BUSINESSES : COLLECTIONS.ACCOUNT, businessId ?? uid, "boards", boardId, "lists");
    const q = query(col, orderBy("position", "asc"));
    const unsub = onSnapshot(
        q,
        (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => {
            console.warn("subscribeLists error", err);
            cb([]);
        }
    );
    return unsub;
};

export const createList = async ({ businessId = null, uid = null, boardId, name, position = 0, assignees = [] }) => {
    ensure(boardId && name, "createList: boardId & name required");
    const col = collection(db, businessId ? COLLECTIONS.BUSINESSES : COLLECTIONS.ACCOUNT, businessId ?? uid, "boards", boardId, "lists");

    const normalizedAssignees = Array.isArray(assignees)
        ? [...new Set(assignees.filter(Boolean).map(a => String(a).includes('@') ? a.toLowerCase() : a))]
        : [];

    const payload = {
        name,
        position,
        assignees: normalizedAssignees,
        progress: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(col, payload);
    const snap = await getDoc(ref);
    return { id: snap.id, ...snap.data() };
};

export const deleteList = async ({ businessId = null, uid = null, boardId, listId }) => {
    ensure(boardId && listId, "deleteList: boardId & listId required");

    const cardsCol = collection(
        db,
        businessId ? COLLECTIONS.BUSINESSES : COLLECTIONS.ACCOUNT,
        businessId ?? uid,
        "boards",
        boardId,
        "lists",
        listId,
        "cards"
    );

    const snaps = await getDocs(cardsCol);
    if (!snaps.empty) {
        await Promise.all(snaps.docs.map((d) => deleteDoc(d.ref)));
    }

    await deleteDoc(
        doc(
            db,
            businessId ? COLLECTIONS.BUSINESSES : COLLECTIONS.ACCOUNT,
            businessId ?? uid,
            "boards",
            boardId,
            "lists",
            listId
        )
    );

    return true;
};

export const updateList = async ({ businessId = null, uid = null, boardId, listId, updates = {} }) => {
    const ref = doc(db, businessId ? COLLECTIONS.BUSINESSES : COLLECTIONS.ACCOUNT, businessId ?? uid, "boards", boardId, "lists", listId);
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const subscribeCardsForList = ({ businessId = null, uid = null, boardId, listId, limitCount = 10, cb }) => {
    ensure(boardId && listId, "subscribeCardsForList: boardId & listId required");
    const col = collection(db, businessId ? COLLECTIONS.BUSINESSES : COLLECTIONS.ACCOUNT, businessId ?? uid, "boards", boardId, "lists", listId, "cards");
    const q = query(col, orderBy("priorityRank", "desc"), limit(limitCount));
    const unsub = onSnapshot(
        q,
        (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => {
            console.warn("subscribeCardsForList error", err);
            cb([]);
        }
    );
    return unsub;
};

export const getTodayTasks = async ({ uid }) => {
    if (!uid) return [];
    try {
        const q = query(collectionGroup(db, "cards"), where("createdBy", "==", uid));
        const snaps = await getDocs(q);
        
        const localNow = new Date();
        const year = localNow.getFullYear();
        const month = String(localNow.getMonth() + 1).padStart(2, '0');
        const day = String(localNow.getDate()).padStart(2, '0');
        const todayLocal = `${year}-${month}-${day}`;

        return snaps.docs.map(d => {
            const data = d.data();
            
            const parseDate = (dateVal) => {
                if (!dateVal) return null;
                if (typeof dateVal === 'object' && dateVal.seconds) {
                    const dObj = new Date(dateVal.seconds * 1000);
                    return `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
                } else {
                    const dStr = String(dateVal);
                    if (dStr.includes('T')) {
                        const dObj = new Date(dStr);
                        if (!isNaN(dObj.getTime())) {
                            return `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
                        }
                    } else if (dStr.length >= 10) {
                        return dStr.slice(0, 10);
                    }
                }
                return null;
            };

            const cDate = parseDate(data.dueDate);
            const sDate = parseDate(data.startDate);

            const isDueToday = cDate === todayLocal;
            const isOverdue = cDate && cDate < todayLocal;
            const isStartToday = sDate === todayLocal;

            return {
                id: d.id,
                ...data,
                listId: d.ref.parent.parent.id,
                boardId: d.ref.parent.parent.parent.parent.id,
                isToday: isDueToday,
                isStartToday,
                isOverdue,
                isTodayOrOverdue: (isDueToday || isOverdue || isStartToday) && data.status !== 'done'
            };
        }).filter(c => c.isTodayOrOverdue);
    } catch (err) {
        console.error("getTodayTasks failed", err);
        return [];
    }
};

export const createCard = async ({ businessId = null, uid = null, boardId, listId, card, actorName = "A user", boardName = "Board" }) => {
    ensure(boardId && listId && card?.title, "createCard: missing args");
    const col = collection(db, businessId ? COLLECTIONS.BUSINESSES : COLLECTIONS.ACCOUNT, businessId ?? uid, "boards", boardId, "lists", listId, "cards");

    const defaultPriorityRank = (label) => {
        const l = (label ?? "medium").toLowerCase();
        if (l === "high") return 300;
        if (l === "low") return 100;
        return 200;
    };

    const payload = {
        title: sanitizeString(card.title, 200),
        description: sanitizeString(card.description ?? "", 2000),
        assignees: card.assignees ?? [],
        labels: card.labels ?? [],
        priority: card.priority ?? "medium",
        priorityRank: Number.isFinite(card.priorityRank) ? Number(card.priorityRank) : defaultPriorityRank(card.priority),
        status: card.status ?? "todo",
        dueDate: card.dueDate ?? null,
        startDate: card.startDate ?? null,
        effort: card.effort ?? 1,
        dependencies: card.dependencies ?? [],
        workflowStage: card.workflowStage ?? null,
        weight: typeof card.weight === "number" ? Math.max(0, Math.min(100, Math.round(card.weight))) : 0,
        progress: typeof card.progress === "number" ? Math.max(0, Math.min(100, Math.round(card.progress))) : 0,
        subtasks: Array.isArray(card.subtasks) ? card.subtasks : [],
        businessId: businessId ?? null, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: uid ?? null,
    };

    const ref = await addDoc(col, payload);
    const snap = await getDoc(ref);

    // NOTIFICATION: New Assignment
    if (payload.assignees && payload.assignees.length > 0) {
        payload.assignees.forEach(uidOrEmail => {
            if (uidOrEmail && !String(uidOrEmail).includes('@')) {
               // Don't notify self
               if (uidOrEmail === uid) return;
               
               sendNotification(uidOrEmail, {
                   title: "New Task Assigned",
                   message: `${actorName} assigned you to task: "${card.title}" in ${boardName}`,
                   link: `/business/${businessId}/boards/${boardId}`
               });
            }
        });
    }

    return { id: snap.id, ...snap.data() };
};

export const updateCard = async ({ businessId = null, uid = null, boardId, listId, cardId, updates = {}, actorName = "A user", boardName = "Board" }) => {
    ensure(boardId && listId && cardId, "updateCard: missing args");
    const ref = doc(db, businessId ? COLLECTIONS.BUSINESSES : COLLECTIONS.ACCOUNT, businessId ?? uid, "boards", boardId, "lists", listId, "cards", cardId);

    const payload = { ...updates };

    if (payload.progress !== undefined) {
        payload.progress = Math.max(0, Math.min(100, Math.round(Number(payload.progress) ?? 0)));
        // Removed auto-completion logic. 100% progress does NOT mean done.
        // if (payload.progress >= 100 && !payload.status) { payload.status = "done"; }
    }

    if (payload.status === "pending" && payload.submittedAt === undefined) {
        payload.submittedAt = serverTimestamp();
    }

    if (payload.status === "done") {
        if (payload.completedAt === undefined) payload.completedAt = serverTimestamp();
        if (payload.progress === undefined) payload.progress = 100;
    }

    if (payload.submission && typeof payload.submission === "object") {
        if ((payload.submission.reviewerUid || payload.submission.reviewerEmail) && payload.submission.reviewerAssignedAt === undefined) {
            payload.submission = { ...payload.submission, reviewerAssignedAt: serverTimestamp() };
        }
        if (payload.submission.reviewStatus && payload.submission.reviewedAt === undefined) {
            payload.submission = { ...payload.submission, reviewedAt: serverTimestamp() };
        }
    }

    try {
        const beforeSnap = await getDoc(ref);
        if (beforeSnap.exists()) {
            const curStatus = beforeSnap.data().status;
            const curReviewStatus = beforeSnap.data()?.submission?.reviewStatus;
            const isAlreadyDone = curStatus === "done" || curReviewStatus === "approved";
            const payloadSetsDone = payload.status === "done" || (payload.submission?.reviewStatus === "approved");
            if (isAlreadyDone && !payloadSetsDone) {
                throw new Error("Card is locked: already approved/done");
            }
        }
    } catch (err) {
        if (err.message.includes("Card is locked")) throw err;
        console.warn("updateCard: pre-check failed (continuing):", err);
    }

    const contributionExists = payload.submission && typeof payload.submission.contribution === "number";
    const contributionValue = contributionExists ? Math.max(0, Math.min(100, Math.round(payload.submission.contribution))) : null;

    if (contributionValue !== null && ((payload.submission?.reviewStatus === "approved") || payload.status === "done")) {
        const listRef = doc(db, businessId ? COLLECTIONS.BUSINESSES : COLLECTIONS.ACCOUNT, businessId ?? uid, "boards", boardId, "lists", listId);

        try {
            await runTransaction(db, async (tx) => {
                const listSnap = await tx.get(listRef);
                if (!listSnap.exists()) {
                    tx.set(listRef, { progress: contributionValue, updatedAt: serverTimestamp() }, { merge: true });
                } else {
                    const cur = Number(listSnap.data().progress ?? 0);
                    const newP = Math.max(0, Math.min(100, Math.round(cur + contributionValue)));
                    tx.update(listRef, { progress: newP, updatedAt: serverTimestamp() });
                }
            });
        } catch (err) {
            console.warn("Failed to update list progress on approved submission contribution", err);
        }
    }

    payload.updatedAt = serverTimestamp();

    await updateDoc(ref, payload);

    const snap = await getDoc(ref);

    // NOTIFICATION LOGIC
    try {
        const afterDt = snap.data();
        
        // 1. Check for Review Status Change (Approved/Rejected)
        if (payload.submission?.reviewStatus) {
            const status = payload.submission.reviewStatus;
            const submitter = afterDt.submission?.submitterUid || afterDt.submittedBy || afterDt.createdBy;
            if (submitter && submitter !== uid) {
                // Determine title/msg
                const title = status === 'approved' ? "Task Approved ✅" : "Task Rejected ❌";
                const msg = status === 'approved' 
                    ? `${actorName} approved your submission for "${afterDt.title}"` 
                    : `${actorName} rejected your submission for "${afterDt.title}". Check notes.`;
                
                sendNotification(submitter, {
                    title,
                    message: msg,
                    link: `/business/${businessId}/boards/${boardId}`
                });
            }
        }

        // 2. Check for Review Assigment (New Submission)
        // If we are setting reviewerUid/Email and it wasn't there before, or just if it's part of the payload.
        // Assuming if payload has submission.reviewerUid, we should notify.
        // To avoid spam, we might want to check if it CHANGED, but for now let's trust the caller sends it only when assigning.
        if (payload.submission?.reviewerUid) {
             const reviewer = payload.submission.reviewerUid;
             if (reviewer !== uid) {
                 sendNotification(reviewer, {
                     title: "Task Submitted for Review 📝",
                     message: `${actorName} submitted "${afterDt.title}" for your review.`,
                     link: `/business/${businessId}/boards/${boardId}`
                 });
             }
        }

    } catch (e) {
        console.warn("Notification trigger failed", e);
    }

    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const deleteCard = async ({ businessId = null, uid = null, boardId, listId, cardId }) => {
    ensure(boardId && listId && cardId, "deleteCard: missing args");
    const ref = doc(
        db,
        businessId ? COLLECTIONS.BUSINESSES : COLLECTIONS.ACCOUNT,
        businessId ?? uid,
        "boards",
        boardId,
        "lists",
        listId,
        "cards",
        cardId
    );
    await deleteDoc(ref);
    return true;
};

export const moveCardBetweenLists = async ({ businessId = null, uid = null, boardId, fromListId, toListId, cardId, newPosition = 0, newPriorityRank }) => {
    ensure(fromListId && toListId && cardId && boardId, "moveCardBetweenLists: missing args");

    const srcRef = doc(db, businessId ? COLLECTIONS.BUSINESSES : COLLECTIONS.ACCOUNT, businessId ?? uid, "boards", boardId, "lists", fromListId, "cards", cardId);
    const destCol = collection(db, businessId ? COLLECTIONS.BUSINESSES : COLLECTIONS.ACCOUNT, businessId ?? uid, "boards", boardId, "lists", toListId, "cards");
    // Preserve the exact same cardId!
    const destRef = doc(destCol, cardId);

    const srcSnap = await getDoc(srcRef);
    if (!srcSnap.exists()) throw new Error("moveCardBetweenLists: card missing");
    const data = srcSnap.data();

    const payload = {
        ...data,
        updatedAt: serverTimestamp(),
    };
    
    if (newPriorityRank !== undefined) {
        payload.priorityRank = newPriorityRank;
    }

    delete payload.__name__;
    delete payload.id;

    const batch = writeBatch(db);
    batch.set(destRef, payload);
    batch.delete(srcRef);
    await batch.commit();

    return { newCardId: destRef.id };
};

// --- Submissions Section ---
export async function createSubmission({
    businessId, boardId, listId, cardId,
    submitterUid, type, note, attachments = [], qaChecked = false, reviewerUid = null
}) {
    ensure(businessId && boardId && listId && cardId && submitterUid && type, "createSubmission: missing args");
    const submissionsRef = collection(db,
        "businesses", businessId,
        "boards", boardId,
        "lists", listId,
        "cards", cardId,
        "submissions"
    );

    const subDocRef = doc(submissionsRef);
    const cardRef = doc(db,
        "businesses", businessId,
        "boards", boardId,
        "lists", listId,
        "cards", cardId
    );

    const batch = writeBatch(db);

    const submission = {
        id: subDocRef.id,
        cardId,
        submitterUid,
        type,
        note: note ?? "",
        attachments: attachments.map(a => ({ name: a.name, url: a.url ?? null, mimeType: a.mimeType ?? null, size: a.size ?? null })),
        qaChecked: !!qaChecked,
        reviewerUid: reviewerUid ?? null,
        reviewerAssignedAt: reviewerUid ? serverTimestamp() : null,
        reviewStatus: "pending",
        reviewerNote: null,
        reviewedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    batch.set(subDocRef, submission);

    const cardUpdate = {
        status: "pending",
        submittedBy: submitterUid,
        submittedAt: serverTimestamp(),
        lastSubmissionId: subDocRef.id,
        reviewerUid: reviewerUid ?? null,
        updatedAt: serverTimestamp()
    };

    batch.update(cardRef, cardUpdate);

    await batch.commit();

    // NOTIFICATION: Notify Reviewer
    if (reviewerUid) {
        sendNotification(reviewerUid, {
            title: "New Submission 📝",
            message: `A task has been submitted for review.`,
            link: `/businessDashboard`
        });
    } else {
        // If no specific reviewer, maybe notify business owner?
        // We'd need to fetch business owner UID... which assumes 'submitterUid' is NOT the owner.
        // For now, we only notify if reviewerUid is explicit.
    }

    return { ...submission, id: subDocRef.id };
}
