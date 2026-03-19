import { useCallback, useRef } from "react";
import * as boardSvc from '../../services/boardService'

export function useBoardHandlers(props) {
    const depsRef = useRef(props);
    depsRef.current = props;
    const snapshotRef = useRef({});

    const handleRefreshBoard = useCallback(async (boardIdArg) => {
        const { businessId, uid, dispatchSet, boards, selectedBoardId, canEditBoardValue, newBoardName } = depsRef.current;
        if (!boardIdArg) return;
        try {
            const b = await boardSvc.getBoard({ businessId, uid: null, boardId: boardIdArg });
            if (b) dispatchSet('boards', (prev) => prev.map((x) => x.id === b.id ? b : x));
        } catch (err) {
            console.warn('getBoard failed', err);
            dispatchSet('uiError', err?.message || 'Failed to refresh board');
        }
    }, []);

    const handleUpdateBoard = useCallback(async (boardIdArg, updates) => {
        const { businessId, uid, dispatchSet, boards, selectedBoardId, canEditBoardValue, newBoardName } = depsRef.current;
        if (!boardIdArg || !canEditBoardValue) return dispatchSet('uiError', 'Permission denied or invalid board');
        dispatchSet('uiError', '');
        snapshotRef.current.boards = boards;
        try {
            await boardSvc.updateBoard({ businessId, uid, boardId: boardIdArg, updates });
            dispatchSet('boards', (prev) => prev.map((b) => b.id === boardIdArg ? { ...b, ...updates } : b));
            dispatchSet('editingBoard', false);
        } catch (err) {
            console.error('updateBoard failed', err);
            dispatchSet('boards', snapshotRef.current.boards || []);
            dispatchSet('uiError', err?.message || 'Failed to update board');
        }
    }, []);

    const handleDeleteBoard = useCallback(async (boardIdArg) => {
        const { businessId, uid, dispatchSet, boards, selectedBoardId, canEditBoardValue, newBoardName } = depsRef.current;
        if (!boardIdArg || !canEditBoardValue || !window.confirm('Delete board and all lists/cards?')) return;
        dispatchSet('uiError', '');
        snapshotRef.current.boards = boards;
        try {
            await boardSvc.deleteBoard({ businessId, uid, boardId: boardIdArg });
            dispatchSet('boards', (prev) => prev.filter((b) => b.id !== boardIdArg));
            if (selectedBoardId === boardIdArg) dispatchSet('selectedBoardId', null);
        } catch (err) {
            console.error('deleteBoard failed', err);
            dispatchSet('boards', snapshotRef.current.boards || []);
            dispatchSet('uiError', err?.message || 'Failed to delete board');
        }
    }, []);

    const handleCreateBoard = useCallback(async () => {
        const { businessId, uid, dispatchSet, boards, selectedBoardId, canEditBoardValue, newBoardName } = depsRef.current;
        if (!newBoardName || !businessId) return dispatchSet('uiError', 'Board name or business required');
        dispatchSet('uiError', '');
        snapshotRef.current.boards = boards;
        const tempId = `tmp-board-${Date.now()}`;
        dispatchSet('boards', (prev) => [{ id: tempId, name: newBoardName, description: '(creating...)' }, ...prev]);
        try {
            const created = await boardSvc.createBoard({ businessId, uid, name: newBoardName, description: '' });
            dispatchSet('boards', (prev) => prev.map((b) => b.id === tempId ? created : b));
            dispatchSet('newBoardName', '');
        } catch (err) {
            console.error('createBoard failed', err);
            dispatchSet('boards', snapshotRef.current.boards || []);
            dispatchSet('uiError', err?.message || 'Failed to create board');
        }
    }, []);

    return { handleRefreshBoard, handleUpdateBoard, handleDeleteBoard, handleCreateBoard };
}