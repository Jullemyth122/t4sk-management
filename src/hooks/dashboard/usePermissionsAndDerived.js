import { useMemo } from "react";
import useHasPerm from "../useHasPerm";

export function usePermissionsAndDerived({ profile, businessId, roles = [], members = [],boards, boardQuery, memberQuery, lists = [], uid, userEmail, getMemberLevel, businessOwnerUid }) {
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
    const canUseOCR = can('ocr.use');
    const canViewBoards = can('boards.read');

    const boardsFiltered = useMemo(() => {
        if (!boardQuery) return boards || [];
        const q = boardQuery.toLowerCase();
        return (boards || []).filter((b) => ((b.name || '') + ' ' + (b.description || '')).toLowerCase().includes(q));
    }, [boards, boardQuery]);

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
        // if user has general "boards.read" (or lists.read?), they typically see all lists in that board
        // Assuming if they can view the board, they can view lists.
        // But let's check if we want to restrict personal lists?
        // For now, let's say if you can 'boards.read', you see all.
        // Or keep legacy check: userLevel > 2 sees all.
        // Let's use 'boards.read' as "Member Access".
        if (can('boards.read')) return lists; 
        
        // Fallback for restricted users: only see lists they are assigned to
        return lists.filter(l => (l.assignees || []).some(x => String(x).trim() === uid || String(x).trim().toLowerCase() === userEmail));
    }, [lists, can, uid, userEmail]);

    const reviewerOptions = useMemo(() => {
        if (!Array.isArray(members) || members.length === 0) return null;
        const opts = [];
        const seen = new Set();
        members.forEach((m) => {
            const mUid = m.uid || m.id || null;
            const mEmail = (m.email || '').toLowerCase();
            const level = getMemberLevel(m);
            const isOwner = businessOwnerUid && mUid && String(mUid) === String(businessOwnerUid);
            // Hide very low level members from reviewers? Or just show everyone?
            // Legacy was level <= 2 hidden unless owner.
            // Maybe keep that for noise reduction, or allow configuration?
            // Let's keep it but relax if we want full list.
            if (!isOwner && level <= 0) return; // only hide level 0 (guests?)
            
            const val = mUid || mEmail;
            if (!val || seen.has(val)) return;
            seen.add(val);
            const roleDoc = roles.find((r) => r.id === m.roleId || r.name === m.roleId || r.id === m.roleName || r.name === m.roleName);
            const roleLabel = m.roleName || (roleDoc ? roleDoc.name : m.roleId) || '';
            const levelNum = isOwner ? 999 : level;
            opts.push({
                value: val,
                label: m.name || m.email || val,
                subtitle: roleLabel,
                level: levelNum,
                owner: isOwner
            });
        });
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
        canViewBoards, 
        boardsFiltered,
        membersFiltered,
        listsVisible,
        reviewerOptions,
        membersMap,
        emailMap
    };
}
