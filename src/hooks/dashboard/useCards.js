import { useCallback } from "react";
import useCardsSubscriptions from "../useCardsSubscriptions";

export function useCards({ businessId, selectedBoardId, lists, dispatchSet }) {
    const setCardsMapForHook = useCallback((valueOrFn) => {
        dispatchSet('cardsMap', valueOrFn);
    }, [dispatchSet]);

    const { loadMore,resetLimit, limitsMap, hasMoreMap, baseLimit } = useCardsSubscriptions({ 
        businessId, 
        boardId: selectedBoardId, 
        lists, 
        setCardsMap: setCardsMapForHook 
    });

    // Return pagination features directly instead of dispatching to state
    // (dispatching objects/functions into the reducer caused infinite re-render loops)
    return { 
        loadMoreCards: loadMore,
        resetLimitCards: resetLimit,      // ← new
        cardsLimitsMap: limitsMap,
        cardsHasMoreMap: hasMoreMap,      // ← new
        cardsBaseLimit: baseLimit 
    };
}