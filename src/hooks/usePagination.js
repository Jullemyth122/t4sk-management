import { useState, useEffect, useCallback } from 'react';
export default function usePagination(items = [], perPageDefault = 6) {

    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(perPageDefault);
    const totalPages = Math.max(1, Math.ceil(items.length / perPage));

    useEffect(() => { 
        if (page > totalPages) setPage(totalPages); 
    }, [items.length, perPage, totalPages]);

    const pageStart = (page - 1) * perPage;
    const visible = items.slice(pageStart, pageStart + perPage);
    const goto = useCallback((p) => setPage(Math.max(1, Math.min(totalPages, p))), [totalPages]);
    
    return { page, perPage, setPerPage, totalPages, visible, goto, setPage };

}