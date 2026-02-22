import { useEffect, useRef } from "react";
import * as accountSvc from '../../services/accountService';

export function useRolesAndMembers({ businessId, dispatchSet, businessOwnerUid, members }) {
    // Keep a ref to current members so the inject-owner effect doesn't
    // need `members` in its dependency array (which would cause a loop).
    const membersRef = useRef(members);
    membersRef.current = members;

    // Load roles & members
    useEffect(() => {
        if (!businessId) {
            dispatchSet('roles', []);
            dispatchSet('members', []);
            dispatchSet('membersLoading', false);
            dispatchSet('membersError', null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const r = await accountSvc.getRoles(businessId);
                if (cancelled) return;
                dispatchSet('roles', r || []);
            } catch (err) {
                console.warn('getRoles failed', err);
                if (!cancelled) dispatchSet('roles', []);
            }

            try {
                dispatchSet('membersLoading', true);
                const m = await accountSvc.getBusinessMembers(businessId);
                if (cancelled) return;
                dispatchSet('members', m || []);
            } catch (err) {
                console.warn('getBusinessMembers failed', err);
                if (!cancelled) {
                    dispatchSet('members', []);
                    dispatchSet('membersError', err.message || 'Error loading members');
                }
            } finally {
                if (!cancelled) dispatchSet('membersLoading', false);
            }
        })();
        return () => { cancelled = true; };
    }, [businessId, dispatchSet]);

    // Inject owner if missing — only re-run when businessOwnerUid changes
    useEffect(() => {
        if (!businessOwnerUid) return;
        // Check current members via ref to avoid dependency on `members`
        const alreadyPresent = (membersRef.current || []).some(m => {
            const key = m.uid || m.id || null;
            return key && String(key) === String(businessOwnerUid);
        });
        if (alreadyPresent) return;
        (async () => {
            try {
                const ownerProfile = await accountSvc.fetchAccountProfile(businessOwnerUid);
                if (!ownerProfile) return;
                const ownerMember = {
                    id: ownerProfile.uid || ownerProfile.id || businessOwnerUid,
                    uid: ownerProfile.uid || ownerProfile.id || businessOwnerUid,
                    email: ownerProfile.email || null,
                    name: ownerProfile.username || ownerProfile.name || ownerProfile.email || 'Owner',
                    roleId: 'owner'
                };
                dispatchSet('members', (prev) => {
                    if (prev.some(m => String(m.uid || m.id) === String(businessOwnerUid))) return prev;
                    return [ownerMember, ...prev];
                });
            } catch (err) {
                console.warn('failed to fetch owner profile for reviewer fallback', err);
            }
        })();
    }, [businessOwnerUid, dispatchSet]);
}