// src/hooks/usePagination.js
import { useState, useEffect, useCallback, useMemo } from 'react';

export default function usePagination(items = [], perPageDefault = 6) {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(perPageDefault);

    const itemsLength = (items && items.length) || 0;

    // memoize totalPages so it only changes when itemsLength or perPage changes
    const totalPages = useMemo(() => Math.max(1, Math.ceil(itemsLength / perPage)), [itemsLength, perPage]);

    // ensure we only update page when strictly necessary (avoids repeated state updates)
    useEffect(() => {
        const bounded = Math.max(1, Math.min(page, totalPages));
        if (bounded !== page) {
            setPage(bounded);
        }
        // intentionally not depending on items (only length & totalPages covered)
    }, [page, totalPages]);

    // visible slice memoized so it's stable unless inputs change
    const visible = useMemo(() => {
        const start = (page - 1) * perPage;
        return items.slice(start, start + perPage);
    }, [items, page, perPage]);

    // stable goto callback
    const goto = useCallback((p) => {
        const wanted = Number(p) || 1;
        setPage((curr) => {
            const bounded = Math.max(1, Math.min(totalPages, wanted));
            return curr === bounded ? curr : bounded;
        });
    }, [totalPages]);

    // return object memoized so consumers receive stable references
    return useMemo(() => ({
        page,
        perPage,
        setPerPage,
        totalPages,
        visible,
        goto,
        setPage
    }), [page, perPage, totalPages, visible, goto]);
}
