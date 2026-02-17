// hooks/personal/usePersonalBoards.js
import { useState, useEffect, useCallback } from "react";
import * as boardSvc from "../../services/boardService";

/**
 * Subscribe to personal boards for the given uid.
 * Routes to `account/{uid}/boards` in Firestore (no businessId).
 */
export function usePersonalBoards(uid) {
    const [boards, setBoards] = useState([]);
    const [selectedBoardId, setSelectedBoardId] = useState(null);

    // Subscribe to boards
    useEffect(() => {
        if (!uid) {
            setBoards([]);
            return;
        }
        const unsub = boardSvc.subscribeBoards({
            uid,
            cb: (data) => setBoards(data || []),
        });
        return () => unsub && unsub();
    }, [uid]);

    // Auto-select first board if none selected
    useEffect(() => {
        if (selectedBoardId) return;
        if (boards.length > 0) {
            setSelectedBoardId(boards[0].id);
        }
    }, [boards, selectedBoardId]);

    // Keep selectedBoardId valid
    useEffect(() => {
        if (!selectedBoardId || boards.find((b) => b.id === selectedBoardId)) return;
        setSelectedBoardId(null);
    }, [boards, selectedBoardId]);

    return { boards, selectedBoardId, setSelectedBoardId };
}
