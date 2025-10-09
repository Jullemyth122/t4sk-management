import { useCallback, useRef } from "react";
import * as boardSvc from '../../services/boardService'

export function useCardHandlers({ businessId, uid, dispatchSet, selectedBoardId, cardsMap, lists, canEditBoardValue, canAssignTasks, newCardInputs }) {
    const snapshotRef = useRef({});

    const handleCreateCardForList = useCallback(async (listId) => {
        const inputs = newCardInputs[listId] || {};
        const title = (inputs.title || '').trim();
        if (!title || !selectedBoardId) return dispatchSet('uiError', 'Title or board required');
        const assigned = (inputs.assignees || []).filter(Boolean);
        if (assigned.length > 0 && !canAssignTasks) return dispatchSet('uiError', 'Permission denied to assign tasks');
        const due = inputs.dueDate ? new Date(inputs.dueDate) : null;
        const priorityLabel = inputs.priority || 'medium';
        const effort = Number(inputs.effort) || 1;
        const cp = computePriority({ dueDate: due, priorityLabel, effort, dependencies: [], title });
        const parsedWeight = Number(inputs.weight) || null;
        const defaultWeight = parsedWeight !== null ? clampInt(parsedWeight) : null;
        const tempId = `tmp-card-${Date.now()}`;
        const tempCard = {
            id: tempId,
            title,
            description: inputs.description || '',
            assignees: assigned,
            labels: inputs.labels || [],
            priority: priorityLabel,
            priorityRank: cp.priorityRank,
            status: 'todo',
            dueDate: due,
            effort,
            weight: defaultWeight,
            progress: Number(inputs.progress ?? 0),
            complexity: cp.complexity,
            complexityMode: inputs.complexityMode || 'auto',
            createdAt: new Date(),
            createdBy: uid || null,
        };
        snapshotRef.current.cardsMap = { ...cardsMap };
        dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: [tempCard, ...(prev[listId] || [])] }));
        try {
            const created = await boardSvc.createCard({ businessId, uid, boardId: selectedBoardId, listId, card: tempCard });
            dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: prev[listId].map((c) => c.id === tempId ? created : c) }));
            dispatchSet('newCardInputs', (p) => ({ ...p, [listId]: { title: '', dueDate: '', effort: 3, priority: 'medium', weight: '' } }));
        } catch (err) {
            console.error('createCard failed', err);
            dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
            dispatchSet('uiError', err?.message || 'Failed to create card');
        }
    }, [newCardInputs, selectedBoardId, businessId, uid, cardsMap, canAssignTasks, dispatchSet]);

    const handleUpdateCard = useCallback(async ({ listId, cardId, updates }) => {
        if (!cardId || !listId || !canEditBoardValue) return dispatchSet('uiError', 'Permission denied or invalid card/list');
        snapshotRef.current.cardsMap = { ...cardsMap };
        try {
            const up = { ...updates };
            if (up.progress !== undefined) {
                up.progress = clampInt(up.progress, 0, 100);
                if (up.progress === 100) {
                    up.status = up.status || 'done';
                    up.completedAt = up.completedAt || serverTimestamp();
                }
            }
            const needRank = up.priority !== undefined || up.dueDate !== undefined || up.effort !== undefined || up.complexity !== undefined || up.complexityMode !== undefined;
            if (needRank) {
                const cp = computePriority({
                    dueDate: up.dueDate,
                    priorityLabel: up.priority,
                    effort: up.effort,
                    dependencies: [],
                    complexity: up.complexity,
                    complexityMode: up.complexityMode
                });
                up.priorityRank = cp.priorityRank;
                if (!up.complexity && cp.complexity) up.complexity = cp.complexity;
            }
            await boardSvc.updateCard({ businessId, uid, boardId: selectedBoardId, listId, cardId, updates: up });
            dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: prev[listId].map((c) => c.id === cardId ? { ...c, ...up } : c) }));
            dispatchSet('cardEditing', (p) => ({ ...p, [cardId]: false }));
        } catch (err) {
            console.error('updateCard failed', err);
            dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
            dispatchSet('uiError', err?.message || 'Failed to update card');
        }
    }, [businessId, uid, selectedBoardId, cardsMap, canEditBoardValue, dispatchSet]);

    const handleDeleteCard = useCallback(async ({ listId, cardId }) => {
        if (!listId || !cardId || !canEditBoardValue || !window.confirm('Delete this card?')) return;
        dispatchSet('uiError', '');
        snapshotRef.current.cardsMap = { ...cardsMap };
        dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: (prev[listId] || []).filter((c) => c.id !== cardId) }));
        try {
            await boardSvc.deleteCard({ businessId, uid, boardId: selectedBoardId, listId, cardId });
        } catch (err) {
            console.error('deleteCard failed', err);
            dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
            dispatchSet('uiError', err?.message || 'Failed to delete card');
        }
    }, [businessId, uid, selectedBoardId, cardsMap, canEditBoardValue, dispatchSet]);

    const handleMoveCard = useCallback(async ({ fromListId, toListId, card }) => {
        if (!fromListId || !toListId || !card || fromListId === toListId || !canEditBoardValue) return dispatchSet('uiError', 'Permission denied or invalid move');
        snapshotRef.current.cardsMap = { ...cardsMap };
        dispatchSet('cardsMap', (prev) => {
            const src = (prev[fromListId] || []).filter((c) => c.id !== card.id);
            const dest = [{ ...card, id: `tmp-moved-${Date.now()}` }, ...(prev[toListId] || [])];
            return { ...prev, [fromListId]: src, [toListId]: dest };
        });
        try {
            await boardSvc.moveCardBetweenLists({ businessId, uid, boardId: selectedBoardId, fromListId, toListId, cardId: card.id, newPosition: 0 });
        } catch (err) {
            console.error('moveCardBetweenLists failed', err);
            dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
            dispatchSet('uiError', err?.message || 'Failed to move card');
        }
    }, [businessId, uid, selectedBoardId, cardsMap, canEditBoardValue, dispatchSet]);

    return { handleCreateCardForList, handleUpdateCard, handleDeleteCard, handleMoveCard };
}