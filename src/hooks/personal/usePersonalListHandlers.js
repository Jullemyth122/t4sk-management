// hooks/personal/usePersonalListHandlers.js
import { useCallback } from "react";
import * as boardSvc from "../../services/boardService";

/**
 * CRUD handlers for personal lists.
 * Uses uid as the personal identifier — no assignees logic (personal mode).
 */
export function usePersonalListHandlers({ uid, selectedBoardId, newListName, setNewListName, setUiError }) {

    const handleCreateList = useCallback(async () => {
        if (!newListName.trim() || !selectedBoardId) return;
        try {
            await boardSvc.createList({
                uid,
                boardId: selectedBoardId,
                name: newListName.trim(),
                assignees: [], // No assignees in personal mode
            });
            setNewListName("");
        } catch (err) {
            console.error("createList failed", err);
            setUiError("Failed to create list.");
        }
    }, [uid, selectedBoardId, newListName, setNewListName, setUiError]);

    const handleUpdateList = useCallback(async (boardId, listId, data) => {
        try {
            await boardSvc.updateList({ 
                uid, 
                boardId: boardId || selectedBoardId, 
                listId, 
                updates: data 
            });
        } catch (err) {
            console.error("updateList failed", err);
            setUiError("Failed to update list.");
        }
    }, [uid, selectedBoardId, setUiError]);

    const handleDeleteList = useCallback(async ({ boardId, listId }) => {
        try {
            await boardSvc.deleteList({ 
                uid, 
                boardId: boardId || selectedBoardId, 
                listId 
            });
        } catch (err) {
            console.error("deleteList failed", err);
            setUiError("Failed to delete list.");
        }
    }, [uid, selectedBoardId, setUiError]);

    return { handleCreateList, handleUpdateList, handleDeleteList };
}
