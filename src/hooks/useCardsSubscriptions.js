import { useEffect, useRef } from 'react';
import * as boardSvc from '../services/boardService';

// subscribe to cards with diffing: only subscribe new lists, unsubscribe removed ones
export default function useCardsSubscriptions({ businessId, boardId, lists, setCardsMap }) {
    const unsubsRef = useRef({});

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
            // quick check: if both are objects (not arrays) -> shallow compare their JSON of normalized values
            return JSON.stringify(na) === JSON.stringify(nb);
        } catch (e) {
            // fallback safe compare
            return JSON.stringify(a) === JSON.stringify(b);
        }
    }

    useEffect(() => {
        if (!boardId) return;

        const newListIds = new Set((lists || []).map((l) => String(l.id)));

        // unsubscribe removed lists
        Object.keys(unsubsRef.current).forEach((listId) => {
            if (!newListIds.has(listId)) {
                const u = unsubsRef.current[listId];
                if (u) u();
                delete unsubsRef.current[listId];
            }
        });

        // subscribe to newly added lists
        (lists || []).forEach((l) => {
            const listId = String(l.id);
            if (unsubsRef.current[listId]) return; // already subscribed

            try {
                const unsub = boardSvc.subscribeCardsForList({
                businessId,
                uid: null,
                boardId,
                listId: l.id,
                cb: (cards) => {
                    // incoming card docs (from snapshot) as 'cards' array
                    setCardsMap((prev) => {
                    const prevList = Array.isArray(prev[listId]) ? prev[listId] : [];
                    const incoming = Array.isArray(cards) ? cards : [];

                    // If lengths differ quickly update
                    if (prevList.length !== incoming.length) {
                        return { ...prev, [listId]: incoming };
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
                    return { ...prev, [listId]: incoming };
                    });
                }
                });

                unsubsRef.current[listId] = unsub;
            } catch (err) {
                console.warn('subscribeCardsForList failed for list', l.id, err);
                setCardsMap((prev) => ({ ...prev, [String(l.id)]: [] }));
            }
        });

        // cleanup unsub on rerun/unmount
        return () => {
            Object.values(unsubsRef.current).forEach((u) => u && u());
            unsubsRef.current = {};
        };
    }, [businessId, boardId, lists, setCardsMap]);
}
