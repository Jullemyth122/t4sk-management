import { useCallback, useRef } from "react";

export function useCopyEmail({ dispatchSet }) {
    const copyTimeoutRef = useRef(0);

    const copyEmail = useCallback(async (id, email) => {
        try {
            await navigator.clipboard.writeText(email || '');
            dispatchSet('copiedEmailId', id);
            clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = window.setTimeout(() => dispatchSet('copiedEmailId', null), 1800);
        } catch (err) {
            console.warn('Copy failed', err);
        }
    }, [dispatchSet]);

    return copyEmail;
}