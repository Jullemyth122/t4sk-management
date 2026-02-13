import { useMemo } from 'react';

/**
 * Hook to calculate workload for each member based on active cards.
 * 
 * @param {Object} cardsMap - Map of listId -> array of cards
 * @param {Array} lists - Array of lists (needed to check list assignees)
 * @param {String} activeStatus - Status considered 'active' (default: 'pending')
 * @returns {Object} { workloadMap, getWorkload, isOverloaded }
 */
export function useMemberWorkload({ cardsMap, lists }) {
    
    // Compute workload map: uid -> count of active tasks
    const workloadMap = useMemo(() => {
        const counts = {};

        // Helper to increment
        const inc = (id) => {
            if (!id) return;
            const nid = String(id);
            counts[nid] = (counts[nid] || 0) + 1;
        };

        // 1. Iterate all lists
        (lists || []).forEach(list => {
            const cards = cardsMap[list.id] || [];
            
            // list assignees apply to ALL cards in the list? 
            // Usually in this app, list assignees seem to "own" the column, but cards might be specific.
            // Let's assume for "workload" we care about direct card assignment + list assignment if card has none?
            // Or maybe just combine them as CardItem does.
            
            const listAssignees = list.assignees || [];

            cards.forEach(card => {
                // Ignore done/approved
                const s = String(card.status || '').toLowerCase();
                const rs = String(card.submission?.reviewStatus || '').toLowerCase();
                if (s === 'done' || rs === 'approved') return;

                // Collect unique assignees for this card
                const distinct = new Set();
                
                // Card specific
                if (Array.isArray(card.assignees)) {
                    card.assignees.forEach(a => distinct.add(String(a)));
                }

                // List inherited (if that's the rule - CardItem implies it is)
                if (Array.isArray(listAssignees)) {
                    listAssignees.forEach(a => distinct.add(String(a)));
                }

                distinct.forEach(uid => inc(uid));
            });
        });

        return counts;
    }, [cardsMap, lists]);

    const getWorkload = (uid) => {
        if (!uid) return 0;
        return workloadMap[String(uid)] || 0;
    };

    const isOverloaded = (uid, limit = 5) => {
        return getWorkload(uid) >= limit;
    };

    return { workloadMap, getWorkload, isOverloaded };
}
