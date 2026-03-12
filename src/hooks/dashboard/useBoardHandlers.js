import { useCallback, useRef } from "react";
import * as boardSvc from '../../services/boardService'

export function useBoardHandlers({ businessId, uid, dispatchSet, boards, selectedBoardId, canEditBoardValue, newBoardName, planType = 'free' }) {
    const snapshotRef = useRef({});

    const handleRefreshBoard = useCallback(async (boardIdArg) => {
        if (!boardIdArg) return;
        try {
            const b = await boardSvc.getBoard({ businessId, uid: null, boardId: boardIdArg });
            if (b) dispatchSet('boards', (prev) => prev.map((x) => x.id === b.id ? b : x));
        } catch (err) {
            console.warn('getBoard failed', err);
            dispatchSet('uiError', err?.message || 'Failed to refresh board');
        }
    }, [businessId, dispatchSet]);

    const handleUpdateBoard = useCallback(async (boardIdArg, updates) => {
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
    }, [businessId, uid, boards, canEditBoardValue, dispatchSet]);

    const handleDeleteBoard = useCallback(async (boardIdArg) => {
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
    }, [businessId, uid, boards, canEditBoardValue, selectedBoardId, dispatchSet]);

    const handleCreateBoard = useCallback(async () => {
        if (!newBoardName || !businessId) return dispatchSet('uiError', 'Board name or business required');
        
        // Free tier board limit check
        if (planType === 'free' && boards.length >= 10) {
            return dispatchSet('uiError', 'Free plan is limited to 10 boards. Please upgrade to Pro or Enterprise to unlock unlimited boards.');
        }

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
    }, [newBoardName, businessId, uid, boards, dispatchSet]);

    return { handleRefreshBoard, handleUpdateBoard, handleDeleteBoard, handleCreateBoard };
}