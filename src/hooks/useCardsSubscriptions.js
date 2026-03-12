// import { useEffect, useRef, useState, useCallback } from 'react';
// import * as boardSvc from '../services/boardService';

// // subscribe to cards with diffing: only subscribe new lists, unsubscribe removed ones
// export default function useCardsSubscriptions({ businessId, boardId, lists, setCardsMap }) {
//     const unsubsRef = useRef({});
//     const baseLimit = 3;
//     const [limitsMap, setLimitsMap] = useState({});

//     // Keep track of limits in a ref so we can query it without causing re-runs
//     const limitsRef = useRef({});
//     useEffect(() => {
//         limitsRef.current = limitsMap;
//     }, [limitsMap]);

//     const loadMore = useCallback((listId) => {
//         setLimitsMap(prev => ({
//             ...prev,
//             [listId]: (prev[listId] || baseLimit) + baseLimit
//         }));
//     }, [baseLimit]);

//     //  Reset to original 3 cards
//     const resetLimit = useCallback((listId) => {
//         setLimitsMap(prev => ({
//             ...prev,
//             [listId]: baseLimit
//         }));
//         setHasMoreMap(prev => ({ ...prev, [listId]: true })); // optimistic
//     }, [baseLimit]);

//     // helper: "normalize" card-like values so we can compare timestamps and Dates robustly
//     function normalizeValue(v) {
//         if (v == null) return null;
//         // Firestore Timestamp objects { seconds, nanoseconds }
//         if (typeof v === 'object' && v !== null && ('seconds' in v || 'nanoseconds' in v)) {
//             return `${v.seconds || 0}:${v.nanoseconds || 0}`;
//         }
//         if (v instanceof Date) return v.toISOString();
//         if (Array.isArray(v)) return v.map(normalizeValue);
//         if (typeof v === 'object') {
//             // stable serialization of object: sort keys
//             const keys = Object.keys(v).sort();
//             const out = {};
//             keys.forEach((k) => { out[k] = normalizeValue(v[k]); });
//             return out;
//         }
//         return v;
//     }

//     function docsEqual(a, b) {
//         if (a === b) return true;
//         if (!a || !b) return false;
//         try {
//             const na = normalizeValue(a);
//             const nb = normalizeValue(b);
//             // quick check: if both are objects (not arrays) -> shallow compare their JSON of normalized values
//             return JSON.stringify(na) === JSON.stringify(nb);
//         } catch (e) {
//             // fallback safe compare
//             return JSON.stringify(a) === JSON.stringify(b);
//         }
//     }

//     useEffect(() => {
//         if (!boardId) return;

//         const newListIds = new Set((lists || []).map((l) => String(l.id)));

//         // Unsubscribe removed lists
//         Object.keys(unsubsRef.current).forEach((listId) => {
//             if (!newListIds.has(listId)) {
//                 const u = unsubsRef.current[listId];
//                 if (u) u();
//                 delete unsubsRef.current[listId];
//             }
//         });

//         // Unsubscribe lists if their limits changed so they can be re-subscribed
//         (lists || []).forEach((l) => {
//            const listId = String(l.id);
//            const u = unsubsRef.current[listId];
//            if (u && u.limit !== (limitsMap[listId] || baseLimit)) {
//                u.unsub();
//                delete unsubsRef.current[listId];
//            }
//         });

//         // subscribe to newly added (or limit-updated) lists
//         (lists || []).forEach((l) => {
//             const listId = String(l.id);
//             if (unsubsRef.current[listId]) return; // already subscribed

//             try {
//                 const currentLimit = limitsMap[listId] || baseLimit;
//                 const unsub = boardSvc.subscribeCardsForList({
//                 businessId,
//                 uid: null,
//                 boardId,
//                 listId: l.id,
//                 limitCount: currentLimit,
//                 cb: (cards) => {
//                     // incoming card docs (from snapshot) as 'cards' array
//                     setCardsMap((prev) => {
//                         const prevList = Array.isArray(prev[listId]) ? prev[listId] : [];
//                         const incoming = Array.isArray(cards) ? cards : [];

//                         // If lengths differ quickly update
//                         if (prevList.length !== incoming.length) {
//                             return { ...prev, [listId]: incoming };
//                         }

//                         // Build prev map for quick lookup by id
//                         const prevMap = {};
//                         for (const pc of prevList) {
//                             if (pc && pc.id) prevMap[String(pc.id)] = pc;
//                         }

//                         // Compare per-id content (tolerant to reorder)
//                         let changed = false;
//                         for (const inc of incoming) {
//                             const id = String(inc.id);
//                             const prevDoc = prevMap[id];
//                             if (!prevDoc) { changed = true; break; }
//                             if (!docsEqual(prevDoc, inc)) { changed = true; break; }
//                         }

//                         if (!changed) {
//                             // no meaningful change -> keep prev (avoid re-renders)
//                             return prev;
//                         }

//                         // otherwise set new incoming list
//                         return { ...prev, [listId]: incoming };
//                     });
//                 }
//                 });

//                 unsubsRef.current[listId] = { unsub, limit: currentLimit };
//             } catch (err) {
//                 console.warn('subscribeCardsForList failed for list', l.id, err);
//                 setCardsMap((prev) => ({ ...prev, [String(l.id)]: [] }));
//             }
//         });

//         // cleanup unsub on rerun/unmount
//         return () => {
//             Object.values(unsubsRef.current).forEach((u) => u && u.unsub && u.unsub());
//             unsubsRef.current = {};
//         };
//     }, [businessId, boardId, lists, setCardsMap, limitsMap, baseLimit]);

//     return { loadMore, limitsMap, baseLimit };
// }
import { useEffect, useRef, useState, useCallback } from 'react';
import * as boardSvc from '../services/boardService';

// subscribe to cards with diffing: only subscribe new lists, unsubscribe removed ones
export default function useCardsSubscriptions({ businessId, uid, boardId, lists, setCardsMap }) {
    const unsubsRef = useRef({});
    const baseLimit = 3;

    const [limitsMap, setLimitsMap] = useState({});
    const [hasMoreMap, setHasMoreMap] = useState({});   // ← NEW: tracks if there are more cards

    // Keep track of limits in a ref so we can query it without causing re-runs
    const limitsRef = useRef({});
    useEffect(() => {
        limitsRef.current = limitsMap;
    }, [limitsMap]);

    const loadMore = useCallback((listId) => {
        setLimitsMap(prev => ({
            ...prev,
            [listId]: (prev[listId] || baseLimit) + baseLimit
        }));
    }, [baseLimit]);

    // Reset to original 3 cards (Show Less)
    const resetLimit = useCallback((listId) => {
        setLimitsMap(prev => ({
            ...prev,
            [listId]: baseLimit
        }));
        // Optimistic update – the new snapshot will correct it anyway
        setHasMoreMap(prev => ({ ...prev, [listId]: true }));
    }, [baseLimit]);

    // helper: "normalize" card-like values so we can compare timestamps and Dates robustly
    function normalizeValue(v) {
        if (v == null) return null;
        // Firestore Timestamp objects { seconds, nanoseconds }
        if (typeof v === 'object' && v !== null && ('seconds' in v || 'nanoseconds' in v)) {
            return `${v.seconds || 0}:${v.nanoseconds || 0}`;
        }
        if (v instanceof Date) return v.toISOString();
        if (Array.isArray(v)) return v.map(normalizeValue);
        if (typeof v === 'object') {
            // stable serialization of object: sort keys
            const keys = Object.keys(v).sort();
            const out = {};
            keys.forEach((k) => { out[k] = normalizeValue(v[k]); });
            return out;
        }
        return v;
    }

    function docsEqual(a, b) {
        if (a === b) return true;
        if (!a || !b) return false;
        try {
            const na = normalizeValue(a);
            const nb = normalizeValue(b);
            return JSON.stringify(na) === JSON.stringify(nb);
        } catch (e) {
            return JSON.stringify(a) === JSON.stringify(b);
        }
    }

    useEffect(() => {
        if (!boardId) return;

        const newListIds = new Set((lists || []).map((l) => String(l.id)));

        // Unsubscribe removed lists
        Object.keys(unsubsRef.current).forEach((listId) => {
            if (!newListIds.has(listId)) {
                const u = unsubsRef.current[listId];
                if (u) u();
                delete unsubsRef.current[listId];
                setHasMoreMap(prev => { const n = { ...prev }; delete n[listId]; return n; });
            }
        });

        // Unsubscribe lists if their limits changed so they can be re-subscribed
        (lists || []).forEach((l) => {
           const listId = String(l.id);
           const u = unsubsRef.current[listId];
           if (u && u.limit !== (limitsMap[listId] || baseLimit)) {
               u.unsub();
               delete unsubsRef.current[listId];
           }
        });

        // subscribe to newly added (or limit-updated) lists
        (lists || []).forEach((l) => {
            const listId = String(l.id);
            if (unsubsRef.current[listId]) return; // already subscribed
            const currentLimit = limitsMap[listId] || baseLimit;
            const queryLimit = currentLimit + 1;   // ← FETCH ONE EXTRA

            try {
                const unsub = boardSvc.subscribeCardsForList({
                businessId,
                uid: uid || null,
                boardId,
                listId: l.id,
                limitCount: queryLimit,
                cb: (cards) => {
                    const incoming = Array.isArray(cards) ? cards : [];
                    const hasMore = incoming.length > currentLimit;   // ← now correct!

                    // Never show the extra card to the user
                    const cardsToShow = hasMore ? incoming.slice(0, currentLimit) : incoming;
                    
                    // incoming card docs (from snapshot) as 'cards' array
                    setCardsMap((prev) => {
                        const prevList = Array.isArray(prev[listId]) ? prev[listId] : [];
                        const incoming = Array.isArray(cards) ? cards : [];

                        // If lengths differ quickly update
                        if (prevList.length !== cardsToShow.length) {
                            return { ...prev, [listId]: cardsToShow };
                        }

                        // Build prev map for quick lookup by id
                        const prevMap = {};
                        for (const pc of prevList) {
                            if (pc && pc.id) prevMap[String(pc.id)] = pc;
                        }

                        // Compare per-id content (tolerant to reorder)
                        let changed = false;
                        for (const inc of incoming) {
                            const id = String(inc.id);
                            const prevDoc = prevMap[id];
                            if (!prevDoc) { changed = true; break; }
                            if (!docsEqual(prevDoc, inc)) { changed = true; break; }
                        }

                        if (!changed) {
                            // no meaningful change -> keep prev (avoid re-renders)
                            return prev;
                        }

                        // otherwise set new incoming list
                        return changed ? { ...prev, [listId]: cardsToShow } : prev;
                    });

                    // 🔥 NEW: Accurate "has more" detection (this fixes the vanishing button)
                    setHasMoreMap(prev => ({
                        ...prev,
                        [listId]: hasMore
                    }));
                }
                });

                unsubsRef.current[listId] = { unsub, limit: currentLimit };
            } catch (err) {
                console.warn('subscribeCardsForList failed for list', l.id, err);
                setCardsMap((prev) => ({ ...prev, [String(l.id)]: [] }));
                setHasMoreMap(prev => ({ ...prev, [String(l.id)]: false }));
            }
        });

        // cleanup unsub on rerun/unmount
        return () => {
            Object.values(unsubsRef.current).forEach((u) => u && u.unsub && u.unsub());
            unsubsRef.current = {};
        };
    }, [businessId, boardId, lists, setCardsMap, limitsMap, baseLimit]);

    return { 
        loadMore, 
        resetLimit, 
        limitsMap, 
        hasMoreMap, 
        baseLimit 
    };
}