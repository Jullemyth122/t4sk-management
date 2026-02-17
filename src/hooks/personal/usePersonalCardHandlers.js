// hooks/personal/usePersonalCardHandlers.js
import { useCallback } from "react";
import * as boardSvc from "../../services/boardService";

/**
 * CRUD handlers for personal cards.
 * Uses uid as the personal identifier — no submissions, reviews, or assignee logic.
 */
export function usePersonalCardHandlers({ uid, selectedBoardId, selectedBoard, currentUser, newCardInputs, setNewCardInputs, setUiError }) {

    const handleCreateCardForList = useCallback(async (listId, overrideData = null) => {
        // Use overrideData if provided, otherwise fall back to state (for legacy/business compat)
        const inputs = overrideData || newCardInputs[listId] || {};
        
        if (!inputs.title) return;

        try {
            await boardSvc.createCard({
                uid,
                boardId: selectedBoardId,
                listId,
                card: {
                    title: inputs.title,
                    description: "",
                    startDate: inputs.startDate || null,
                    dueDate: inputs.dueDate || null,
                    priority: inputs.priority || "low",
                    weight: inputs.weight ? Number(inputs.weight) : 0,
                    status: "todo",
                    subtasks: inputs.subtasks || [],
                },
                actorName: currentUser?.displayName || "Me",
                boardName: selectedBoard?.name || "Board",
            });
            
            // Only clear state if we used strict state (not override)
            if (!overrideData) {
                setNewCardInputs((prev) => ({
                    ...prev,
                    [listId]: { title: "", startDate: "", dueDate: "", priority: "medium", weight: "" },
                }));
            }
        } catch (err) {
            console.error("createCard failed", err);
            setUiError(err.message || "Failed to create card.");
        }
    }, [uid, selectedBoardId, selectedBoard, currentUser, newCardInputs, setNewCardInputs, setUiError]);

    const handleUpdateCard = useCallback(async ({ listId, cardId, updates }) => {
        try {
            await boardSvc.updateCard({
                uid,
                boardId: selectedBoardId,
                listId,
                cardId,
                updates,
            });
        } catch (err) {
            console.error("updateCard failed", err);
        }
    }, [uid, selectedBoardId]);

    const handleDeleteCard = useCallback(async ({ listId, cardId }) => {
        try {
            await boardSvc.deleteCard({
                uid,
                boardId: selectedBoardId,
                listId,
                cardId,
            });
        } catch (err) {
            console.error("deleteCard failed", err);
        }
    }, [uid, selectedBoardId]);

    const handleMoveCard = useCallback(async ({ cardId, fromListId, toListId, newIndex }) => {
        try {
            await boardSvc.moveCardBetweenLists({
                uid,
                boardId: selectedBoardId,
                fromListId,
                toListId,
                cardId,
                newPosition: newIndex ?? 0,
            });
        } catch (err) {
            console.error("moveCard failed", err);
        }
    }, [uid, selectedBoardId]);

    // Personal mode submission: just mark as done (no review process)
    const handleSubmitCard = useCallback(async ({ listId, cardId, ...data }) => {
        try {
            await boardSvc.updateCard({
                uid,
                boardId: selectedBoardId,
                listId,
                cardId,
                updates: {
                    status: 'done',
                    progress: 100,
                    submission: {
                        ...data,
                        submittedAt: new Date(),
                        reviewStatus: 'approved' // auto-approve for personal
                    }
                }
            });
        } catch (err) {
            console.error("submitCard failed", err);
        }
    }, [uid, selectedBoardId]);

    const handleReviewAction = useCallback(() => {}, []);

    return {
        handleCreateCardForList,
        handleUpdateCard,
        handleDeleteCard,
        handleMoveCard,
        handleSubmitCard,
        handleReviewAction,
    };
}
