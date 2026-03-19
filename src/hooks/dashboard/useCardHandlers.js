import { useCallback, useRef } from "react";
import * as boardSvc from '../../services/boardService'
import { clampInt } from "../../utils/dashboardUtils";
import { computePriority } from "../../utils/prioritization";
import { serverTimestamp } from "firebase/firestore";

export function useCardHandlers(props) {
    const depsRef = useRef(props);
    depsRef.current = props;
    const snapshotRef = useRef({});

    const handleCreateCardForList = useCallback(async (listIdOrObj) => {
        const { businessId, uid, userEmail, dispatchSet, selectedBoardId, cardsMap, lists, canEditBoardValue, canAssignTasks, newCardInputs, actorName, boardName } = depsRef.current;
        const isObj = listIdOrObj && typeof listIdOrObj === 'object';
        const listId = isObj ? listIdOrObj.listId : listIdOrObj;
        const cardOverride = isObj ? listIdOrObj.cardOverride : null;

        const inputs = cardOverride || newCardInputs[listId] || {};
        const title = (inputs.title || '').trim();
        if (!title || !selectedBoardId) {
            dispatchSet('uiError', 'Title or board required');
            throw new Error('Title or board required');
        }
        const assigned = (inputs.assignees || []).filter(Boolean);
        if (assigned.length > 0 && !canAssignTasks) {
            dispatchSet('uiError', 'Permission denied to assign tasks');
            throw new Error('Permission denied to assign tasks');
        }
        const due = inputs.dueDate ? new Date(inputs.dueDate) : null;
        const start = inputs.startDate ? new Date(inputs.startDate) : null;
        const priorityLabel = inputs.priority || 'medium';
        const effort = Number(inputs.effort) || 1;
        const cp = computePriority({ dueDate: due, priorityLabel, effort, dependencies: [], title });
        const parsedWeight = Number(inputs.weight) || null;
        const defaultWeight = parsedWeight !== null ? clampInt(parsedWeight) : null;
        
        // Extract subtasks (NEW)
        const subtasks = Array.isArray(inputs.subtasks) ? inputs.subtasks : [];

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
            startDate: start,
            effort,
            weight: defaultWeight,
            progress: Number(inputs.progress ?? 0),
            complexity: cp.complexity,
            complexityMode: inputs.complexityMode || 'auto',
            createdAt: new Date(),
            createdBy: uid || null,
            subtasks, 
        };
        snapshotRef.current.cardsMap = { ...cardsMap };
        dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: [tempCard, ...(prev[listId] || [])] }));
        try {
            const created = await boardSvc.createCard({ 
                businessId, 
                uid, 
                boardId: selectedBoardId, 
                listId, 
                card: tempCard,
                actorName,
                boardName
            });
            dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: prev[listId].map((c) => c.id === tempId ? created : c) }));
            // Reset form
            dispatchSet('newCardInputs', (p) => ({ ...p, [listId]: { title: '', dueDate: '', effort: 3, priority: 'medium', weight: '', subtasks: [] } }));
        } catch (err) {
            console.error('createCard failed', err);
            dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
            dispatchSet('uiError', err?.message || 'Failed to create card');
        }
    }, []);

    const handleUpdateCard = useCallback(async ({ listId, cardId, updates, listAssignees }) => {
        const { businessId, uid, userEmail, dispatchSet, selectedBoardId, cardsMap, lists, canEditBoardValue, canAssignTasks, newCardInputs, actorName, boardName } = depsRef.current;
        if (!cardId || !listId) return dispatchSet('uiError', 'Invalid card/list');
        
        if (String(cardId).startsWith('tmp-')) {
            console.warn('Ignored attempt to update temporary card:', cardId);
            return;
        }
        
        const updateKeys = Object.keys(updates || {});
        const isSubtaskOnlyUpdate = updateKeys.length > 0 && updateKeys.every(k => k === 'subtasks' || k === 'progress');
        
        if (!isSubtaskOnlyUpdate && !canEditBoardValue) {
            return dispatchSet('uiError', 'Permission denied - board edit required');
        }
        
        if (isSubtaskOnlyUpdate) {
            const card = (cardsMap[listId] || []).find(c => c.id === cardId);
            if (!card) return dispatchSet('uiError', 'Card not found');
            
            const allAssignees = [
                ...(Array.isArray(card.assignees) ? card.assignees : []),
                ...(Array.isArray(listAssignees) ? listAssignees : [])
            ].filter(Boolean);

            const assigneesNormalized = allAssignees.map(a => String(a).toLowerCase());
            const normalizedUid = String(uid || '').toLowerCase();
            const normalizedEmail = String(userEmail || '').toLowerCase();
            
            const isAssignee = assigneesNormalized.includes(normalizedUid) || 
                            assigneesNormalized.includes(normalizedEmail);
            
            if (!isAssignee) {
                return dispatchSet('uiError', 'Permission denied - not assigned to this card');
            }
        }
                
        snapshotRef.current.cardsMap = { ...cardsMap };
        try {
            const up = { ...updates };
            if (up.progress !== undefined) {
                up.progress = clampInt(up.progress, 0, 100);
            }
            const needRank = up.priority !== undefined || up.dueDate !== undefined || up.effort !== undefined || up.complexity !== undefined || up.complexityMode !== undefined || up.startDate !== undefined;
            if (needRank) {
                const cp = computePriority({
                    dueDate: up.dueDate,
                    startDate: up.startDate,
                    priorityLabel: up.priority,
                    effort: up.effort,
                    dependencies: [],
                    complexity: up.complexity,
                    complexityMode: up.complexityMode
                });
                up.priorityRank = cp.priorityRank;
                if (!up.complexity && cp.complexity) up.complexity = cp.complexity;
            }
            await boardSvc.updateCard({ 
                businessId, 
                uid, 
                boardId: selectedBoardId, 
                listId, 
                cardId, 
                updates: up,
                actorName,
                boardName
            });
            dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: prev[listId].map((c) => c.id === cardId ? { ...c, ...up } : c) }));
            dispatchSet('cardEditing', (p) => ({ ...p, [cardId]: false }));
        } catch (err) {
            console.error('updateCard failed', err);
            dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
            dispatchSet('uiError', err?.message || 'Failed to update card');
        }
    }, []);

    const handleDeleteCard = useCallback(async ({ listId, cardId }) => {
        const { businessId, uid, userEmail, dispatchSet, selectedBoardId, cardsMap, lists, canEditBoardValue, canAssignTasks, newCardInputs, actorName, boardName } = depsRef.current;
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
    }, []);

    const handleMoveCard = useCallback(async ({ fromListId, toListId, card }) => {
        const { businessId, uid, userEmail, dispatchSet, selectedBoardId, cardsMap, lists, canEditBoardValue, canAssignTasks, newCardInputs, actorName, boardName } = depsRef.current;
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
    }, []);

    return { handleCreateCardForList, handleUpdateCard, handleDeleteCard, handleMoveCard };
}