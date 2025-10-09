import { useEffect, useRef } from "react";

export function useAssigneeDropdown({ dispatchSet }) {
    const assigneeRef = useRef(null);

    useEffect(() => {
        const handleDocClick = (e) => {
            if (assigneeRef.current && !assigneeRef.current.contains(e.target)) dispatchSet('assigneeDropdownOpen', false);
        };
        const handleKey = (e) => {
            if (e.key === 'Escape') dispatchSet('assigneeDropdownOpen', false);
        };
        document.addEventListener('mousedown', handleDocClick);
        document.addEventListener('touchstart', handleDocClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleDocClick);
            document.removeEventListener('touchstart', handleDocClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [dispatchSet]);

    return assigneeRef;
}

