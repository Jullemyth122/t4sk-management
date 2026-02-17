import { useEffect } from "react";
import * as boardSvc from '../../services/boardService'
export function useBoardsAndLists({ businessId, dispatchSet, selectedBoardId, userLevel, boards, highlightBoardId }) {
    // Subscribe to boards
    useEffect(() => {
        if (!businessId) {
            dispatchSet('boards', []);
            return;
        }
        const unsub = boardSvc.subscribeBoards({ businessId, uid: null, cb: (b) => dispatchSet('boards', b || []) });
        return unsub;
    }, [businessId, dispatchSet]);

    // Auto-select first board for low-level users
    // Auto-select first board for low-level users (OR handle highlightBoardId)
    useEffect(() => {
        if (!boards || boards.length === 0) return;

        // If highlight request exists and is valid, prefer it OVER default selection
        if (highlightBoardId && boards.some(b => b.id === highlightBoardId)) {
            if (selectedBoardId !== highlightBoardId) {
                dispatchSet('selectedBoardId', highlightBoardId);
            }
            return;
        }

        if (userLevel > 2 || selectedBoardId) return;
        dispatchSet('selectedBoardId', boards[0].id);
    }, [boards, userLevel, selectedBoardId, dispatchSet, highlightBoardId]);

    // Keep selectedBoardId valid
    useEffect(() => {
        if (!selectedBoardId || boards.find(b => b.id === selectedBoardId)) return;
        dispatchSet('selectedBoardId', null);
    }, [boards, selectedBoardId, dispatchSet]);

    // Subscribe to lists for selected board
    useEffect(() => {
        dispatchSet('lists', []);
        dispatchSet('cardsMap', {});
        if (!selectedBoardId) return;
        const unsub = boardSvc.subscribeLists({ businessId, uid: null, boardId: selectedBoardId, cb: (ls) => dispatchSet('lists', ls || []) });
        return unsub;
    }, [businessId, selectedBoardId, dispatchSet]);
}