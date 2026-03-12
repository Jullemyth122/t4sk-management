import { useEffect } from "react";
import useMounted from "../useMounted";
import * as accountSvc from '../../services/accountService';

export function useBusinessLoading({ businessId, dispatchSet, profile, uid }) {
    const mountedRef = useMounted();

    // Derive businessId if not provided
    useEffect(() => {
        if (businessId) return;
        const derive = (p) => {
            if (!p || !Array.isArray(p.businessAffiliations) || p.businessAffiliations.length === 0) return null;
            const primary = p.businessAffiliations.find((a) => a.isPrimary) || p.businessAffiliations[0];
            return primary?.businessId || null;
        };
        const fromProfile = derive(profile);
        if (fromProfile) {
            dispatchSet('businessId', fromProfile);
            return;
        }
        (async () => {
            try {
                if (!uid) return;
                const acct = await accountSvc.fetchAccountProfile(uid);
                if (!mountedRef.current) return;
                const fromAcct = derive(acct);
                if (fromAcct) dispatchSet('businessId', fromAcct);
            } catch (err) {
                console.warn('BusinessDashboard: account fallback read failed', err);
            }
        })();
    }, [businessId, profile, uid, dispatchSet, mountedRef]);

    // Load business name and owner
    useEffect(() => {
        if (!businessId) {
            dispatchSet('businessName', null);
            dispatchSet('businessOwnerUid', null);
            return;
        }
        let mounted = true;
        (async () => {
            try {
                const biz = await accountSvc.getBusiness(businessId);
                if (!mounted) return;
                dispatchSet('businessName', biz?.name || null);
                dispatchSet('businessOwnerUid', biz?.ownerUid || null);
                dispatchSet('planType', biz?.planType || 'free');
            } catch (err) {
                console.warn('Failed to load business', err);
                if (mounted) {
                    dispatchSet('businessName', null);
                    dispatchSet('businessOwnerUid', null);
                }
            }
        })();
        return () => { mounted = false; };
    }, [businessId, dispatchSet]);
}