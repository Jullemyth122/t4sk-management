import { useCallback } from 'react';
import { useAuth } from '../context/useAuth';

/**
 * Hook to check if the current user has specific permissions.
 * 
 * NOTE: This hook assumes that the consuming component is somehow providing the 
 * "current business" context or roles list, OR it relies on what's available in useAuth/profile.
 * 
 * However, since permissions are typically tied to a specific business role, 
 * and a user might be an owner (all perms) or a member with a specific role,
 * we need to know WHICH business we are checking against.
 * 
 * If no businessId is passed (and not in a context that provides it), checks might fail.
 * 
 * @param {Array} roles - List of all roles in the current business (optional, if we want to resolve roleId -> permissions)
 * @param {String} currentBusinessId - ID of the business we are checking (optional)
 */
export default function useHasPerm(roles = [], currentBusinessId = null) {
    const { currentUser } = useAuth();

    /**
     * Check if user has permission(s).
     * @param {string | string[]} requiredPerms - Single string or array of permission keys.
     * @param {boolean} requireAll - If true, user must have ALL permissions. If false, ANY. Default true.
     */
    const can = useCallback((requiredPerms, requireAll = true) => {
        if (!currentUser) return false;

        // 1. Owner check
        // If the user is the owner of the passed businessId (if known), they have ALL permissions.
        // We can check this via profile.businessAffiliations
        let isOwner = false;
        if (currentBusinessId && currentUser.profile?.businessAffiliations) {
            const aff = currentUser.profile.businessAffiliations.find(a => a.businessId === currentBusinessId);
            if (aff && aff.roleId === 'owner') isOwner = true;
        }
        // Fallback: checks if they have a generic 'owner' role in the provided roles list 
        // (though 'owner' is usually a special case in affiliations, sometimes it's also a role doc)

        if (isOwner) return true;

        // 2. Resolve User's Role Permissions
        // We need to find the user's role in the current business
        let userRole = null;
        if (currentBusinessId && currentUser.profile?.businessAffiliations) {
            const aff = currentUser.profile.businessAffiliations.find(a => a.businessId === currentBusinessId);
            if (aff) {
                // Find the role object in the passed `roles` array
                userRole = roles.find(r => r.id === aff.roleId);
            }
        }
        
        // If we couldn't resolve a role, they have no permissions (unless owner, handled above)
        if (!userRole) return false;

        // If the role name is 'owner' (case insensitive), allow everything
        if (String(userRole.name).toLowerCase() === 'owner') return true;

        // 3. Check requested permissions against userRole.permissions
        // userRole.permissions is expected to be an object: { "roles.read": true, ... }
        const userPerms = userRole.permissions || {};

        const needed = Array.isArray(requiredPerms) ? requiredPerms : [requiredPerms];

        if (requireAll) {
            return needed.every(p => !!userPerms[p]);
        } else {
            return needed.some(p => !!userPerms[p]);
        }

    }, [currentUser, roles, currentBusinessId]);

    return { can };
}
