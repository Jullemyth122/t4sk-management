// src/hooks/useRealtimeCollection.js
import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";

/**
 * q: a Firestore Query or null
 * deps: dependency array to control when to re-subscribe (usually include businessId)
 */
export default function useRealtimeCollection(q, deps = []) {
    const [items, setItems] = useState([]);
    useEffect(() => {
        if (!q) {
            setItems([]);
            return;
        }
        const unsub = onSnapshot(
            q,
            (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
            (err) => {
                console.warn("useRealtimeCollection snapshot error", err);
                setItems([]);
            }
        );
        return () => unsub();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return items;
}
