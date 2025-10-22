import { useEffect } from "react";
import * as accountSvc from '../../services/accountService';

export function useRolesAndMembers({ businessId, dispatchSet, businessOwnerUid, members }) {
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

    // Inject owner if missing
    useEffect(() => {
        if (!businessOwnerUid) return;
        // If members already include owner (by uid), nothing to do
        const found = (members || []).some(m => {
            const key = m.uid || m.id || null;
            return key && String(key) === String(businessOwnerUid);
        });
        if (found) return;
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
    }, [businessOwnerUid, members, dispatchSet]);
}