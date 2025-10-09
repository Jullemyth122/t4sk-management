/**
 * useBoardActions
 *
 * Thin, mechanical extraction of the "service wrappers" you had inline.
 * Each handler mirrors your original implementation and uses the same optimistic
 * snapshot / rollback patterns. These helpers do NOT capture state internally —
 * instead they accept the necessary state & setters as arguments so they are
 * simple to plug into your existing component.
 *
 * Example call signature (see each function JSDoc for exact params):
 *
 *   const actions = useBoardActions({ boardSvc, computePriority });
 *
 *   // create board
 *   await actions.handleCreateBoard({
 *     newBoardName, businessId, uid, boards, setBoards, snapshotRef, setUiError, setNewBoardName
 *   });
 *
 * The functions return a promise and will throw only if the underlying service
 * throws (same as before). They will set UI error via the passed setter.
 */

export default function useBoardActions({
    boardSvc,            // your services/board import (required)
    computePriority,     // computePriority util (required)
} = {}) {
    if (!boardSvc) throw new Error('useBoardActions: boardSvc is required');
    if (!computePriority) throw new Error('useBoardActions: computePriority is required');

    /**
     * handleRefreshBoard
     * @param {Object} opts
     *  - boardId
     *  - businessId
     *  - setBoards
     *  - setUiError
     */
    const handleRefreshBoard = async ({ boardId, businessId, setBoards, setUiError }) => {
        if (!boardId) return;
        try {
        const b = await boardSvc.getBoard({ businessId, uid: null, boardId });
        if (b && typeof setBoards === 'function') setBoards((prev) => prev.map((x) => (x.id === b.id ? b : x)));
        } catch (err) {
        console.warn('getBoard failed', err);
        if (typeof setUiError === 'function') setUiError(err?.message || 'Failed to refresh board');
        }
    };

    /**
     * handleUpdateBoard
     * @param {Object} opts
     *  - boardId, updates
     *  - businessId, uid
     *  - boards, setBoards
     *  - snapshotRef
     *  - setUiError, setEditingBoard (optional)
     *  - canEdit (boolean) — checked before operation
     */
    const handleUpdateBoard = async ({
        boardId, updates,
        businessId, uid,
        boards, setBoards,
        snapshotRef, setUiError, setEditingBoard,
        canEdit,
    }) => {
        if (!boardId) {
            if (typeof setUiError === 'function') setUiError('Board required');
            return;
        }
        if (!canEdit) {
            if (typeof setUiError === 'function') setUiError('Permission denied');
            return;
        }
        if (typeof setUiError === 'function') setUiError('');
        snapshotRef.current = snapshotRef.current || {};
        snapshotRef.current.boards = boards;
        try {
            await boardSvc.updateBoard({ businessId, uid, boardId, updates });
            if (typeof setBoards === 'function') setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, ...updates } : b)));
            if (typeof setEditingBoard === 'function') setEditingBoard(false);
        } catch (err) {
            console.error('updateBoard failed', err);
            if (typeof setBoards === 'function') setBoards(snapshotRef.current.boards || []);
            if (typeof setUiError === 'function') setUiError(err?.message || 'Failed to update board');
        }
    };

    /**
     * handleDeleteBoard
     * @param {Object} opts
     *  - boardId
     *  - businessId, uid
     *  - boards, setBoards
     *  - snapshotRef
     *  - setUiError, selectedBoardId, setSelectedBoardId
     *  - canEdit
     */
    const handleDeleteBoard = async ({
        boardId,
        businessId, uid,
        boards, setBoards,
        snapshotRef, setUiError,
        selectedBoardId, setSelectedBoardId,
        canEdit,
    }) => {
        if (!boardId) return;
        if (!canEdit) {
            if (typeof setUiError === 'function') setUiError('Permission denied');
            return;
        }
        if (!window.confirm('Delete board and all lists/cards? This action cannot be undone.')) return;
        if (typeof setUiError === 'function') setUiError('');
        snapshotRef.current = snapshotRef.current || {};
        snapshotRef.current.boards = boards;
        try {
            await boardSvc.deleteBoard({ businessId, uid, boardId });
            if (typeof setBoards === 'function') setBoards((prev) => prev.filter((b) => b.id !== boardId));
            if (selectedBoardId === boardId && typeof setSelectedBoardId === 'function') setSelectedBoardId(null);
        } catch (err) {
            console.error('deleteBoard failed', err);
            if (typeof setBoards === 'function') setBoards(snapshotRef.current.boards || []);
            if (typeof setUiError === 'function') setUiError(err?.message || 'Failed to delete board');
        }
    };

    /**
     * handleCreateBoard
     * Signature options object:
     *  { newBoardName, businessId, uid, boards, setBoards, snapshotRef, setUiError, setNewBoardName }
     */
    const handleCreateBoard = async ({ newBoardName, businessId, uid, boards, setBoards, snapshotRef, setUiError, setNewBoardName }) => {
        if (typeof setUiError === 'function') setUiError('');
        if (!newBoardName) {
            if (typeof setUiError === 'function') setUiError('Board name required');
            return;
        }
        if (!businessId) {
            if (typeof setUiError === 'function') setUiError('No business affiliation');
            return;
        }
        snapshotRef.current = snapshotRef.current || {};
        snapshotRef.current.boards = boards;
        const tempId = `tmp-board-${Date.now()}`;
        if (typeof setBoards === 'function') setBoards((prev) => [{ id: tempId, name: newBoardName, description: '(creating...)' }, ...prev]);
        try {
            const created = await boardSvc.createBoard({ businessId, uid, name: newBoardName, description: '' });
            if (typeof setBoards === 'function') setBoards((prev) => prev.map((b) => (b.id === tempId ? created : b)));
            if (typeof setNewBoardName === 'function') setNewBoardName('');
        } catch (err) {
            console.error('createBoard failed', err);
            if (typeof setBoards === 'function') setBoards(snapshotRef.current.boards || []);
            if (typeof setUiError === 'function') setUiError(err?.message || 'Failed to create board');
        }
    };

    /**
     * handleCreateList
     * @param opts
     *  - newListName, selectedBoardId, businessId, uid, lists, setLists, snapshotRef, setUiError, setNewListName
     */
    const handleCreateList = async ({ newListName, selectedBoardId, businessId, uid, lists, setLists, snapshotRef, setUiError, setNewListName }) => {
        if (typeof setUiError === 'function') setUiError('');
        if (!newListName) {
            if (typeof setUiError === 'function') setUiError('List name required');
            return;
        }
        if (!selectedBoardId) {
            if (typeof setUiError === 'function') setUiError('Select a board');
            return;
        }
        snapshotRef.current = snapshotRef.current || {};
        snapshotRef.current.lists = lists;
        const tempId = `tmp-list-${Date.now()}`;
        if (typeof setLists === 'function') setLists((prev) => [...prev, { id: tempId, name: newListName, position: prev.length }]);
        try {
            const created = await boardSvc.createList({ businessId, uid, boardId: selectedBoardId, name: newListName, position: lists?.length || 0 });
            if (typeof setLists === 'function') setLists((prev) => prev.map((l) => (l.id === tempId ? created : l)));
            if (typeof setNewListName === 'function') setNewListName('');
        } catch (err) {
            console.error('createList failed', err);
            if (typeof setLists === 'function') setLists(snapshotRef.current.lists || []);
            if (typeof setUiError === 'function') setUiError(err?.message || 'Failed to create list');
        }
    };

    /**
     * handleUpdateList
     * opts:
     *  - boardId, listId, updates, businessId, uid, lists, setLists, snapshotRef, setUiError, setListNameEditing, canEdit
     */
    const handleUpdateList = async ({ boardId, listId, updates, businessId, uid, lists, setLists, snapshotRef, setUiError, setListNameEditing, canEdit }) => {
        if (!listId) return;
        if (!canEdit) {
            if (typeof setUiError === 'function') setUiError('Permission denied');
            return;
        }
        snapshotRef.current = snapshotRef.current || {};
        snapshotRef.current.lists = lists;
        try {
            await boardSvc.updateList({ businessId, uid, boardId, listId, updates });
            if (typeof setLists === 'function') setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, ...updates } : l)));
            if (typeof setListNameEditing === 'function') setListNameEditing((p) => ({ ...p, [listId]: false }));
        } catch (err) {
            console.error('updateList failed', err);
            if (typeof setLists === 'function') setLists(snapshotRef.current.lists || []);
            if (typeof setUiError === 'function') setUiError(err?.message || 'Failed to update list');
        }
    };

    /**
     * handleCreateCardForList
     * opts:
     *  - listId, newCardInputs, selectedBoardId, businessId, uid, cardsMap, setCardsMap, snapshotRef, setUiError, setNewCardInputs
     */
    const handleCreateCardForList = async ({ listId, newCardInputs, selectedBoardId, businessId, uid, cardsMap, setCardsMap, snapshotRef, setUiError, setNewCardInputs }) => {
        if (typeof setUiError === 'function') setUiError('');
        const inputs = (newCardInputs && newCardInputs[listId]) || {};
        const title = (inputs.title || '').trim();
        if (!title) {
            if (typeof setUiError === 'function') setUiError('Card title required');
            return;
        }
        if (!selectedBoardId) {
            if (typeof setUiError === 'function') setUiError('Select a board');
            return;
        }
        const due = inputs.dueDate ? new Date(inputs.dueDate) : null;
        const priorityLabel = inputs.priority || 'medium';
        const effort = Number.isFinite(Number(inputs.effort)) ? Number(inputs.effort) : 1;
        const priorityScore = computePriority({ dueDate: due, priorityLabel, effort, dependencies: [] });
        const tempId = `tmp-card-${Date.now()}`;
        const tempCard = {
            id: tempId,
            title,
            description: inputs.description || '',
            assignees: inputs.assignees || [],
            labels: inputs.labels || [],
            priority: priorityLabel,
            priorityScore,
            status: 'todo',
            dueDate: due,
            effort,
            createdAt: new Date(),
            createdBy: uid || null,
        };

        snapshotRef.current = snapshotRef.current || {};
        snapshotRef.current.cardsMap = { ...cardsMap };

        if (typeof setCardsMap === 'function') setCardsMap((prev) => ({ ...prev, [listId]: [tempCard, ...(prev[listId] || [])] }));
        try {
            const created = await boardSvc.createCard({ businessId, uid, boardId: selectedBoardId, listId, card: tempCard });
            if (typeof setCardsMap === 'function') setCardsMap((prev) => ({ ...prev, [listId]: prev[listId].map((c) => (c.id === tempId ? created : c)) }));
            if (typeof setNewCardInputs === 'function') setNewCardInputs((p) => ({ ...p, [listId]: { title: '', dueDate: '', effort: 3, priority: 'medium' } }));
        } catch (err) {
            console.error('createCard failed', err);
            if (typeof setCardsMap === 'function') setCardsMap(snapshotRef.current.cardsMap || {});
            if (typeof setUiError === 'function') setUiError(err?.message || 'Failed to create card');
        }
    };

    /**
     * handleUpdateCard
     * opts:
     *  - { listId, cardId, updates, businessId, uid, selectedBoardId, cardsMap, setCardsMap, snapshotRef, setUiError, setCardEditing, canEdit }
     */
    const handleUpdateCard = async ({ listId, cardId, updates, businessId, uid, selectedBoardId, cardsMap, setCardsMap, snapshotRef, setUiError, setCardEditing, canEdit }) => {
        if (!cardId || !listId) return;
        if (!canEdit) {
        if (typeof setUiError === 'function') setUiError('Permission denied');
            return;
        }
        snapshotRef.current = snapshotRef.current || {};
        snapshotRef.current.cardsMap = { ...cardsMap };
        try {
            await boardSvc.updateCard({ businessId, uid, boardId: selectedBoardId, listId, cardId, updates });
            if (typeof setCardsMap === 'function') setCardsMap((prev) => ({ ...prev, [listId]: prev[listId].map((c) => (c.id === cardId ? { ...c, ...updates } : c)) }));
            if (typeof setCardEditing === 'function') setCardEditing((p) => ({ ...p, [cardId]: false }));
        } catch (err) {
            console.error('updateCard failed', err);
            if (typeof setCardsMap === 'function') setCardsMap(snapshotRef.current.cardsMap || {});
            if (typeof setUiError === 'function') setUiError(err?.message || 'Failed to update card');
        }
    };

    /**
     * handleMoveCard
     * opts:
     *  - { fromListId, toListId, card, businessId, uid, selectedBoardId, cardsMap, setCardsMap, snapshotRef, setUiError, canEdit }
     */
    const handleMoveCard = async ({ fromListId, toListId, card, businessId, uid, selectedBoardId, cardsMap, setCardsMap, snapshotRef, setUiError, canEdit }) => {
        if (!fromListId || !toListId || !card) return;
        if (!canEdit) {
            if (typeof setUiError === 'function') setUiError('Permission denied');
            return;
        }
        if (fromListId === toListId) return;
        snapshotRef.current = snapshotRef.current || {};
        snapshotRef.current.cardsMap = { ...cardsMap };
        if (typeof setCardsMap === 'function') {
            setCardsMap((prev) => {
                const src = (prev[fromListId] || []).filter((c) => c.id !== card.id);
                const dest = [{ ...card, id: `tmp-moved-${Date.now()}` }, ...(prev[toListId] || [])];
                return { ...prev, [fromListId]: src, [toListId]: dest };
            });
        }
        try {
            await boardSvc.moveCardBetweenLists({
                businessId,
                uid,
                boardId: selectedBoardId,
                fromListId,
                toListId,
                cardId: card.id,
                newPosition: 0,
            });
        } catch (err) {
            console.error('moveCardBetweenLists failed', err);
            if (typeof setCardsMap === 'function') setCardsMap(snapshotRef.current.cardsMap || {});
            if (typeof setUiError === 'function') setUiError(err?.message || 'Failed to move card');
        }
    };

    return {
        handleRefreshBoard,
        handleUpdateBoard,
        handleDeleteBoard,
        handleCreateBoard,
        handleCreateList,
        handleUpdateList,
        handleCreateCardForList,
        handleUpdateCard,
        handleMoveCard,
    };
}
