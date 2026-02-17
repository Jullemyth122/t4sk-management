// hooks/personal/usePersonalCards.js
import { useState, useEffect } from "react";
import * as boardSvc from "../../services/boardService";

/**
 * Subscribe to cards for each list in the selected personal board.
 * Uses uid as the personal identifier (no businessId).
 */
export function usePersonalCards(uid, selectedBoardId, lists) {
    const [cardsMap, setCardsMap] = useState({}); // { listId: [cards] }

    useEffect(() => {
        setCardsMap({});
        if (!uid || !selectedBoardId || !lists || lists.length === 0) return;

        const unsubs = [];
        lists.forEach((l) => {
            const unsub = boardSvc.subscribeCardsForList({
                uid,
                boardId: selectedBoardId,
                listId: l.id,
                cb: (cs) => {
                    setCardsMap((prev) => ({ ...prev, [l.id]: cs || [] }));
                },
            });
            unsubs.push(unsub);
        });

        return () => unsubs.forEach((u) => u && u());
    }, [uid, selectedBoardId, lists]);

    return { cardsMap };
}
