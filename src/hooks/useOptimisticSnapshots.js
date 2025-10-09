/**
 * useOptimisticSnapshots
 * Lightweight helper for saving/restoring ephemeral snapshots used for optimistic rollbacks.
 *
 * Usage:
 *   // in component
 *   const snapshotRef = useRef({});
 *   const { saveSnapshot, restoreSnapshot, clearSnapshot } = useOptimisticSnapshots(snapshotRef);
 *
 *   saveSnapshot('boards', boards);
 *   // ... perform optimistic update
 *   restoreSnapshot('boards', setBoards); // rollback if needed
 */
export default function useOptimisticSnapshots(snapshotRef) {
    if (!snapshotRef || typeof snapshotRef !== 'object') {
        // defensive: create a lightweight ref-like object if none provided
        snapshotRef = { current: {} };
    }

    const saveSnapshot = (key, value) => {
        if (!key) return;
        snapshotRef.current = snapshotRef.current || {};
        snapshotRef.current[key] = value;
    };

    const restoreSnapshot = (key, setter, fallback = undefined) => {
        if (!key || typeof setter !== 'function') return;
        const val = snapshotRef.current ? snapshotRef.current[key] : undefined;
        if (val === undefined) {
            if (fallback !== undefined) setter(fallback);
        } else {
            setter(val);
        }
    };

    const clearSnapshot = (key) => {
        if (!snapshotRef.current) return;
        if (key) delete snapshotRef.current[key];
        else snapshotRef.current = {};
    };

    return { saveSnapshot, restoreSnapshot, clearSnapshot };
}
