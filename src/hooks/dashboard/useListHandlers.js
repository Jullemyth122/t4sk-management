import { useCallback, useRef } from "react";
import * as boardSvc from '../../services/boardService'

export function useListHandlers({ businessId, uid, dispatchSet, selectedBoardId, cardsMap, lists, newListName, newListAssignees, canCreateList, canEditBoardValue, userLevel, userEmail }) {
    const snapshotRef = useRef({});

    const handleCreateList = useCallback(async () => {
        if (!canCreateList || !newListName || !selectedBoardId) return dispatchSet('uiError', 'Permission denied, name, or board required');
        let uniq = Array.from(new Set(newListAssignees.map(String).map(s => s.trim()).filter(Boolean)));
        if (userLevel <= 2 && uniq.length === 0) uniq.push(uid || userEmail.toLowerCase());
        dispatchSet('uiError', '');
        snapshotRef.current.lists = lists;
        const tempId = `tmp-list-${Date.now()}`;
        dispatchSet('lists', (prev) => [...prev, { id: tempId, name: newListName, position: prev.length, assignees: uniq }]);
        try {
            const created = await boardSvc.createList({ businessId, uid, boardId: selectedBoardId, name: newListName, position: lists.length, assignees: uniq });
            dispatchSet('lists', (prev) => prev.map((l) => l.id === tempId ? created : l));
            dispatchSet('newListName', '');
            dispatchSet('newListAssignees', []);
            dispatchSet('assigneeSearch', '');
            dispatchSet('assigneeDropdownOpen', false);
        } catch (err) {
            console.error('createList failed', err);
            dispatchSet('lists', snapshotRef.current.lists || []);
            dispatchSet('uiError', err?.message || 'Failed to create list');
        }
    }, [canCreateList, newListName, selectedBoardId, newListAssignees, businessId, uid, lists, dispatchSet, userLevel, userEmail]);

    const handleDeleteList = useCallback(async ({ boardId: bId, listId }) => {
        if (!bId || !listId || !canEditBoardValue || !window.confirm('Delete list and cards?')) return;
        dispatchSet('uiError', '');
        snapshotRef.current.lists = lists;
        snapshotRef.current.cardsMap = { ...cardsMap };
        try {
            dispatchSet('lists', (prev) => prev.filter((l) => l.id !== listId));
            dispatchSet('cardsMap', (prev) => {
                const copy = { ...prev };
                delete copy[listId];
                return copy;
            });
            await boardSvc.deleteList({ businessId, uid, boardId: bId, listId });
        } catch (err) {
            console.error('deleteList failed', err);
            dispatchSet('lists', snapshotRef.current.lists || []);
            dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
            dispatchSet('uiError', err?.message || 'Failed to delete list');
        }
    }, [businessId, uid, lists, cardsMap, canEditBoardValue, dispatchSet]);

    const handleUpdateList = useCallback(async (bId, listId, updates) => {
        if (!listId || !canEditBoardValue) return dispatchSet('uiError', 'Permission denied or invalid list');
        snapshotRef.current.lists = lists;
        try {
            await boardSvc.updateList({ businessId, uid, boardId: bId, listId, updates });
            dispatchSet('lists', (prev) => prev.map((l) => l.id === listId ? { ...l, ...updates } : l));
            dispatchSet('listNameEditing', (p) => ({ ...p, [listId]: false }));
        } catch (err) {
            console.error('updateList failed', err);
            dispatchSet('lists', snapshotRef.current.lists || []);
            dispatchSet('uiError', err?.message || 'Failed to update list');
        }
    }, [businessId, uid, lists, canEditBoardValue, dispatchSet]);

    return { handleCreateList, handleDeleteList, handleUpdateList };
}