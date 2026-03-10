import { useState, useEffect } from 'react';
import * as boardSvc from '../../services/boardService';

export function usePersonalBoard(uid) {
    const [board, setBoard] = useState(null);
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!uid) {
            setLoading(false);
            return;
        }

        let isMounted = true;
        let unsubLists = null;

        const initBoard = async () => {
            try {
                // 1. Fetch personal boards
                const userBoards = await boardSvc.getBoards({ uid });
                let personalBoard = null;

                if (userBoards.length > 0) {
                    // Use the first board as the default personal board
                    personalBoard = userBoards[0];
                } else {
                    // Create a default Personal Board
                    personalBoard = await boardSvc.createBoard({
                        uid,
                        name: "Personal Board",
                        description: "My personal tasks dashboard",
                        settings: { isDefaultPersonal: true }
                    });
                }

                if (!isMounted) return;
                setBoard(personalBoard);

                // 2. Subscribe to lists for this board
                unsubLists = boardSvc.subscribeLists({
                    uid,
                    boardId: personalBoard.id,
                    cb: (fetchedLists) => {
                        if (isMounted) {
                            setLists(fetchedLists || []);
                            setLoading(false);
                        }
                    }
                });
            } catch (err) {
                console.error("Error initializing personal board:", err);
                if (isMounted) setLoading(false);
            }
        };

        setLoading(true);
        initBoard();

        return () => {
            isMounted = false;
            if (unsubLists) unsubLists();
        };
    }, [uid]);

    return { board, lists, loading };
}
