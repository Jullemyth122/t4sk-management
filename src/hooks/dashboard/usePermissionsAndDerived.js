// src/hooks/dashboard/usePermissionsAndDerived.js
import { useMemo } from "react";

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

    // compute userLevel here (based on userRoleId + roles)
    const userLevel = useMemo(() => {
        if (!userRoleId) return 0;
        if (userRoleId === 'owner') return 999;
        const r = roles.find((rr) => rr.id === userRoleId || rr.name === userRoleId);
        return r ? Number(r.level || 0) : 0;
    }, [userRoleId, roles]);

    const canEditBoardValue = useMemo(() => {
        if (!userRoleId) return false;
        if (userRoleId === 'owner') return true;
        const r = roles.find((rr) => rr.id === userRoleId);
        return r ? Number(r.level || 0) >= 5 : false;
    }, [userRoleId, roles]);

    const canCreateBoard = useMemo(() => userRoleId === 'owner' || userLevel >= 2, [userRoleId, userLevel]);
    const canCreateList = useMemo(() => userRoleId === 'owner' || userLevel >= 2, [userRoleId, userLevel]);
    const canViewMembers = useMemo(() => userRoleId === 'owner' || userLevel >= 2, [userRoleId, userLevel]);
    const canAssignTasks = useMemo(() => userRoleId === 'owner' || userLevel > 2, [userRoleId, userLevel]);

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
        if (userLevel > 2) return lists;
        return lists.filter(l => (l.assignees || []).some(x => String(x).trim() === uid || String(x).trim().toLowerCase() === userEmail));
    }, [lists, userLevel, uid, userEmail]);

    const reviewerOptions = useMemo(() => {
        if (!Array.isArray(members) || members.length === 0) return null;
        const opts = [];
        const seen = new Set();
        members.forEach((m) => {
            const mUid = m.uid || m.id || null;
            const mEmail = (m.email || '').toLowerCase();
            const level = getMemberLevel(m);
            const isOwner = businessOwnerUid && mUid && String(mUid) === String(businessOwnerUid);
            if (!isOwner && level <= 2) return;
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
        userLevel,              // <-- now returned
        canEditBoardValue,
        canCreateBoard,
        canCreateList,
        canViewMembers,
        canAssignTasks,
        boardsFiltered,
        membersFiltered,
        listsVisible,
        reviewerOptions,
        membersMap,
        emailMap
    };
}
