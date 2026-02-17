// hooks/personal/usePersonalLists.js
import { useState, useEffect } from "react";
import * as boardSvc from "../../services/boardService";

/**
 * Subscribe to lists for the selected personal board.
 * Uses uid as the personal identifier (no businessId).
 */
export function usePersonalLists(uid, selectedBoardId) {
    const [lists, setLists] = useState([]);

    useEffect(() => {
        setLists([]);
        if (!uid || !selectedBoardId) return;

        const unsub = boardSvc.subscribeLists({
            uid,
            boardId: selectedBoardId,
            cb: (ls) => setLists(ls || []),
        });

        return () => unsub && unsub();
    }, [uid, selectedBoardId]);

    return { lists };
}
