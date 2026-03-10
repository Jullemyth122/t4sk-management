import { useMemo, useCallback } from "react";
import useHasPerm from "../useHasPerm";

export function usePermissionsAndDerived({ profile, businessId, planType = 'free', roles = [], members = [],boards, boardQuery, memberQuery, lists = [], uid, userEmail, getMemberLevel, businessOwnerUid }) {
    const userRoleId = useMemo(() => {
        if (!profile || !Array.isArray(profile.businessAffiliations) || !businessId) return null;
        const a = profile.businessAffiliations.find((x) => x.businessId === businessId);
        return a ? a.roleId : null;
    }, [profile, businessId]);

    const userRoleName = useMemo(() => {
        if (!userRoleId) return null;
        if (userRoleId === 'owner') return 'Owner';
        const rDoc = roles.find((r) => r.id === userRoleId);
        return rDoc ? rDoc.name || rDoc.id : userRoleId;
    }, [userRoleId, roles]);

    // compute userLevel here (legacy support / visual)
    const userLevel = useMemo(() => {
        if (!userRoleId) return 0;
        if (userRoleId === 'owner') return 999;
        const r = roles.find((rr) => rr.id === userRoleId || rr.name === userRoleId);
        return r ? Number(r.level || 0) : 0;
    }, [userRoleId, roles]);

    // NEW: Use granular permissions
    const { can } = useHasPerm(roles, businessId);

    const canEditBoardValue = can('boards.update');
    const canCreateBoard = can('boards.create');
    const canCreateList = can('lists.create');
    const canViewMembers = can('members.read');
    const canAssignTasks = can('cards.assign'); 
    
    // Additional granular permissions needed by dashboard components
    const canDeleteBoard = can('boards.delete');
    const canDeleteList = can('lists.delete');
    const canUpdateList = can('lists.update');
    const canCreateCard = can('cards.create');
    
    // Determine if the current user is the business owner
    const isOwner = String(uid) === String(businessOwnerUid) || userRoleId === 'owner';

    // Feature Gating
    const isPremium = planType === 'pro' || planType === 'enterprise';
    
    // For Free plan, only the business owner gets limited access to premium features (OCR, AI, Calendar)
    const canUseOCR = can('ocr.use') && (isPremium || isOwner);
    const canViewBoards = can('boards.read');
    const canUseAI = can('ai.chat') && (isPremium || isOwner);
    
    // Premium features
    const canUseCalendar = isPremium;
    const boardsFiltered = useMemo(() => {
        if (!boardQuery) return boards || [];
        const q = boardQuery.toLowerCase();
        return (boards || []).filter((b) => ((b.name || '') + ' ' + (b.description || '')).toLowerCase().includes(q));
    }, [boards, boardQuery]);

    // For low-level users: filter boards to only show boards where user has assigned tasks
    // This requires cardsMap from the parent - we receive it indirectly through the filtering functions
    // We expose a helper that the parent can call to filter boards after cardsMap is populated
    const filterBoardsByAssignee = useCallback((allBoards, allLists, allCardsMap) => {
        // High-level users or owners see all boards
        if (userLevel > 2) return allBoards;
        
        const userIdentifiers = new Set();
        if (uid) userIdentifiers.add(String(uid).toLowerCase());
        if (userEmail) userIdentifiers.add(String(userEmail).toLowerCase());
        if (userIdentifiers.size === 0) return allBoards;

        // Build a set of boardIds that have at least one card assigned to this user
        const boardsWithAssignedCards = new Set();
        (allLists || []).forEach(list => {
            const cards = allCardsMap[list.id] || [];
            cards.forEach(card => {
                const assignees = card.assignees || [];
                const hasUser = assignees.some(a => userIdentifiers.has(String(a).toLowerCase()));
                if (hasUser && list.boardId) {
                    boardsWithAssignedCards.add(list.boardId);
                }
            });
        });

        // Also check list-level assignees (user is assigned to a list in this board)
        (allLists || []).forEach(list => {
            const listAssignees = list.assignees || [];
            const hasUser = listAssignees.some(a => userIdentifiers.has(String(a).toLowerCase()));
            if (hasUser && list.boardId) {
                boardsWithAssignedCards.add(list.boardId);
            }
        });

        return allBoards.filter(b => boardsWithAssignedCards.has(b.id));
    }, [userLevel, uid, userEmail]);

    const membersFiltered = useMemo(() => {
        const q = (memberQuery || '').toLowerCase();
        const filtered = (members || []).filter((m) => {
            if (!q) return true;
            const roleFromList = roles.find((r) => r.id === m.roleId);
            const resolvedRoleName = (m.roleName || (roleFromList ? roleFromList.name : '') || '').toLowerCase();
            return (m.name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q) || resolvedRoleName.includes(q);
        });
        filtered.sort((a, b) => {
            const la = getMemberLevel(a);
            const lb = getMemberLevel(b);
            if (lb !== la) return lb - la;
            return (a.name || '').localeCompare(b.name || '');
        });
        return filtered;
    }, [members, memberQuery, roles, getMemberLevel]);

    const listsVisible = useMemo(() => {
        if (!Array.isArray(lists)) return [];
        // High-level users see all lists
        if (userLevel > 2) return lists;
        // For boards.read permission holders who are low-level: filter by assignee
        if (can('boards.read')) {
            const userIdentifiers = new Set();
            if (uid) userIdentifiers.add(String(uid).toLowerCase());
            if (userEmail) userIdentifiers.add(String(userEmail).toLowerCase());
            if (userIdentifiers.size === 0) return [];
            return lists.filter(l => {
                const assignees = l.assignees || [];
                return assignees.some(x => userIdentifiers.has(String(x).trim().toLowerCase()));
            });
        }
        // Fallback for restricted users: only see lists they are assigned to
        return lists.filter(l => (l.assignees || []).some(x => String(x).trim() === uid || String(x).trim().toLowerCase() === userEmail));
    }, [lists, can, uid, userEmail, userLevel]);

    // Card-level filtering: for low-level users, only show cards assigned to them
    const filterCardsByAssignee = useCallback((cardsMap) => {
        // High-level users see all cards
        if (userLevel > 2) return cardsMap;

        const userIdentifiers = new Set();
        if (uid) userIdentifiers.add(String(uid).toLowerCase());
        if (userEmail) userIdentifiers.add(String(userEmail).toLowerCase());
        if (userIdentifiers.size === 0) return {};

        const filtered = {};
        Object.keys(cardsMap).forEach(listId => {
            const cards = cardsMap[listId] || [];
            filtered[listId] = cards.filter(card => {
                const assignees = card.assignees || [];
                return assignees.some(a => userIdentifiers.has(String(a).toLowerCase()));
            });
        });
        return filtered;
    }, [userLevel, uid, userEmail]);

    const reviewerOptions = useMemo(() => {
        if (!Array.isArray(members) || members.length === 0) return null;
        const opts = [];
        const seen = new Set();
        let ownerIncluded = false;

        members.forEach((m) => {
            const mUid = m.uid || m.id || null;
            const mEmail = (m.email || '').toLowerCase();
            const level = getMemberLevel(m);
            const isOwner = businessOwnerUid && mUid && String(mUid) === String(businessOwnerUid);
            const roleDoc = roles.find((r) => r.id === m.roleId || r.name === m.roleId || r.id === m.roleName || r.name === m.roleName);
            const roleLabel = m.roleName || (roleDoc ? roleDoc.name : m.roleId) || '';
            const isElevated = ['owner', 'admin', 'manager', 'lead', 'director', 'supervisor', 'staff'].includes(String(roleLabel).toLowerCase());
            
            // Determine if they can receive reviews
            let canReceive = false;
            if (isOwner) canReceive = true;
            else if (roleDoc && String(roleDoc.name).toLowerCase() === 'owner') canReceive = true;
            else if (roleDoc && roleDoc.permissions && roleDoc.permissions['reviews.receive']) canReceive = true;
            else if (isElevated) canReceive = true; // Fallback for elevated roles if permissions not yet saved

            // Only hide explicit guests, or level < 0 if strictly enforced.
            const isGuest = String(roleLabel).toLowerCase() === 'guest' || level < 0;
            if (isGuest || !canReceive) return;
            
            const val = mUid || mEmail;
            if (!val || seen.has(val)) return;
            seen.add(val);
            if (isOwner) ownerIncluded = true;

            const levelNum = isOwner ? 999 : (isElevated && level <= 0 ? 5 : level);
            opts.push({
                value: val,
                label: m.name || m.email || val,
                subtitle: roleLabel,
                level: levelNum,
                owner: isOwner
            });
        });

        // If the business owner wasn't found in the members array, force inject them!
        if (businessOwnerUid && !ownerIncluded) {
            const ownerVal = businessOwnerUid;
            if (!seen.has(ownerVal)) {
                opts.push({
                    value: ownerVal,
                    label: 'Business Owner',
                    subtitle: 'Owner',
                    level: 999,
                    owner: true
                });
            }
        }

        opts.sort((a, b) => b.level - a.level || a.label.localeCompare(b.label));
        return [{ value: '', label: '— none —', subtitle: '' }, ...opts];
    }, [members, roles, businessOwnerUid, getMemberLevel]);

    const membersMap = useMemo(() => {
        const m = {};
        (members || []).forEach((mm) => {
            const keyUid = mm.uid || mm.id || null;
            if (keyUid) m[String(keyUid)] = mm;
        });
        return m;
    }, [members]);

    const emailMap = useMemo(() => {
        const e = {};
        (members || []).forEach((mm) => {
            if (mm.email) e[String(mm.email).toLowerCase()] = mm;
        });
        return e;
    }, [members]);

    return {
        userRoleId,
        userRoleName,
        userLevel,
        canEditBoardValue,
        canCreateBoard,
        canCreateList,
        canViewMembers,
        canAssignTasks,
        canDeleteBoard,
        canDeleteList, 
        canUpdateList, 
        canCreateCard, 
        canUseOCR,     
        canUseAI,
        canUseCalendar,
        isOwner,
        isPremium,
        canViewBoards, 
        boardsFiltered,
        membersFiltered,
        listsVisible,
        reviewerOptions,
        membersMap,
        emailMap,
        filterBoardsByAssignee,
        filterCardsByAssignee
    };
}
