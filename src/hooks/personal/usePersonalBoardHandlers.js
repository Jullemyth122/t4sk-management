// hooks/personal/usePersonalBoardHandlers.js
import { useCallback } from "react";
import * as boardSvc from "../../services/boardService";

/**
 * CRUD handlers for personal boards.
 * Uses uid as the personal identifier — never passes businessId.
 */
export function usePersonalBoardHandlers({ uid, boards, selectedBoardId, setSelectedBoardId, newBoardName, setNewBoardName, setUiError }) {

    const handleCreateBoard = useCallback(async (nameOverride) => {
        // Use override if provided, else fall back to state (though state might be stale if not passed right)
        const nameToUse = (typeof nameOverride === 'string' ? nameOverride : newBoardName).trim();
        
        if (!nameToUse) return;
        try {
            const res = await boardSvc.createBoard({
                uid,
                name: nameToUse,
                description: "",
                settings: { theme: "default" },
            });
            setNewBoardName("");
            setSelectedBoardId(res.id);
            setUiError("");
            return res; // Return result for caller handling
        } catch (err) {
            console.error("createBoard failed", err);
            setUiError("Failed to create board.");
            throw err;
        }
    }, [uid, newBoardName, setNewBoardName, setSelectedBoardId, setUiError]);

    const handleUpdateBoard = useCallback(async (boardId, data) => {
        try {
            await boardSvc.updateBoard({ uid, boardId, updates: data });
        } catch (err) {
            console.error("updateBoard failed", err);
            setUiError("Failed to update board.");
        }
    }, [uid, setUiError]);

    const handleDeleteBoard = useCallback(async (boardId) => {
        if (!window.confirm("Delete this board permanently?")) return;
        try {
            await boardSvc.deleteBoard({ uid, boardId });
            if (selectedBoardId === boardId) setSelectedBoardId(null);
        } catch (err) {
            console.error("deleteBoard failed", err);
            setUiError("Failed to delete board.");
        }
    }, [uid, selectedBoardId, setSelectedBoardId, setUiError]);

    return { handleCreateBoard, handleUpdateBoard, handleDeleteBoard };
}
