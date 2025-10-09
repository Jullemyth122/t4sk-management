import { useCallback } from "react";
import useCardsSubscriptions from "../useCardsSubscriptions";

export function useCards({ businessId, selectedBoardId, lists, dispatchSet }) {
    const setCardsMapForHook = useCallback((valueOrFn) => {
        dispatchSet('cardsMap', valueOrFn);
    }, [dispatchSet]);
    useCardsSubscriptions({ businessId, boardId: selectedBoardId, lists, setCardsMap: setCardsMapForHook });
}