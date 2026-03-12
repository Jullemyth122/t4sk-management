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
        
        let hasInitialized = false;

        const unsub = boardSvc.subscribeBoards({
            uid,
            cb: async (data) => {
                const userBoards = data || [];
                
                // If it's the very first load and no boards exist, auto-create one
                if (userBoards.length === 0 && !hasInitialized) {
                    hasInitialized = true;
                    try {
                        await boardSvc.createBoard({
                            uid,
                            name: "My Tasks",
                            description: "My personal tasks dashboard",
                            settings: { isDefaultPersonal: true }
                        });
                        // The onSnapshot will fire again with the new board
                    } catch (err) {
                        console.error("Failed to auto-create personal board", err);
                    }
                } else {
                    hasInitialized = true;
                    setBoards(userBoards);
                }
            },
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
