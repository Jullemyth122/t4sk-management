// src/hooks/useFirestore.js
import { useEffect, useState, useMemo } from "react";
import { doc, onSnapshot, collection, query as fbQuery } from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * useFirestoreDoc(pathOrRef)
 * - pathOrRef: "collection/doc/..." string or DocumentReference
 * returns { data, loading, error }
 */
export function useFirestoreDoc(pathOrRef) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(Boolean(pathOrRef));
    const [error, setError] = useState(null);

    const ref = useMemo(() => {
        if (!pathOrRef) return null;
        if (typeof pathOrRef === "string") {
            const parts = pathOrRef.split("/").filter(Boolean);
            if (parts.length % 2 === 1) {
                F
                console.warn("useFirestoreDoc: invalid doc path", pathOrRef);
                return null;
            }
            // safe: doc(db, ...parts)
            return doc(db, ...parts);
        }
        return pathOrRef;
    }, [pathOrRef]);

    useEffect(() => {
        if (!ref) {
            setData(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsub = onSnapshot(
            ref,
            snap => {
                setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
                setLoading(false);
            },
            err => {
                console.error("useFirestoreDoc snapshot error:", err);
                setError(err);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [ref]);

    return { data, loading, error };
}

/**
 * useFirestoreCollection(queryBuilder, deps = [])
 * - queryBuilder: () => Query or null
 * returns { items, loading, error }
 */
export function useFirestoreCollection(queryBuilder, deps = []) {
    // keep stable builder
    const memoBuilder = useMemo(() => queryBuilder, deps || []);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(Boolean(queryBuilder));
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!memoBuilder) {
            setItems([]);
            setLoading(false);
            return;
        }

        let q;
        try {
            q = memoBuilder();
        } catch (err) {
            console.error("useFirestoreCollection: queryBuilder error", err);
            setError(err);
            setItems([]);
            setLoading(false);
            return;
        }

        if (!q) {
            setItems([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsub = onSnapshot(
            q,
            snap => {
                const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setItems(arr);
                setLoading(false);
            },
            err => {
                console.warn("useFirestoreCollection snapshot error", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsub();
        // memoBuilder already changes when deps change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [memoBuilder]);

    return { items, loading, error };
}
