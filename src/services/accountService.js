// services/accountService.js
import {
  collection, doc, setDoc, updateDoc, getDoc, getDocs,
  query as fsQuery, where, serverTimestamp, arrayUnion,
  arrayRemove, writeBatch, Timestamp, deleteDoc, collectionGroup,
  increment, limit, addDoc, orderBy, runTransaction
} from "firebase/firestore";

import { db } from "../config/firebase";

// --- Helpers Section ---
export const COLLECTIONS = {
    ACCOUNT: "account",
    BUSINESSES: "businesses",
};

export const ensure = (cond, message) => {
    if (!cond) throw new Error(message);
};

// Input sanitization: trim + truncate to a max length
export const sanitizeString = (str, maxLength = 500) => {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLength);
};

export const slugify = (name = "") => String(name)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

export const getDocData = async (ref) => {
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const setDocMerge = async (ref, payload) => {
    await setDoc(ref, payload, { merge: true });
};

export const updateDocWithTimestamp = async (ref, payload) => {
    await updateDoc(ref, { ...payload, updatedAt: serverTimestamp() });
};

export const safeArrayUnion = async (ref, field, obj) => {
    try {
        await updateDoc(ref, { [field]: arrayUnion(obj), updatedAt: serverTimestamp() });
    } catch (err) {
        await setDoc(ref, { [field]: [obj], updatedAt: serverTimestamp() }, { merge: true });
    }
};

// --- Account Section ---
export const saveUserData = async (user, username, options = {}) => {
    ensure(user?.uid, "saveUserData: user.uid required");

    const emailToStore = options.originalEmail ?? user.email ?? null;
    const lower = emailToStore?.toLowerCase() ?? "";

    const payload = {
        username: user.displayName ?? username ?? null,
        email: emailToStore,
        lowerEmail: lower,
        uid: user.uid,
        notifications: [],
        ...(options.accountType !== undefined ? { accountType: options.accountType } : {}),
        invitesEmail: [],
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, COLLECTIONS.ACCOUNT, user.uid), payload, { merge: true });
    return payload;
};

export const updateAccountType = async (uid, accountType) => {
    ensure(uid, "updateAccountType: uid required");

    await setDoc(doc(db, COLLECTIONS.ACCOUNT, uid), {
        accountType,
        updatedAt: serverTimestamp(),
    }, { merge: true });

    try {
        await removeAllInvitesFromAccount(uid);
    } catch (e) {
        console.warn("updateAccountType: failed to clear invites", e);
    }
};

export const fetchAccountProfile = async (uid) => {
    if (!uid) return null;
    const snap = await getDoc(doc(db, COLLECTIONS.ACCOUNT, uid));
    return snap.exists() ? snap.data() : null;
};

export const searchUsersByEmail = async (emailQuery) => {
    if (!emailQuery || emailQuery.length < 3) return [];
    const lowerQuery = emailQuery.toLowerCase();
    const col = collection(db, COLLECTIONS.ACCOUNT);
    const q = fsQuery(col, where("lowerEmail", ">=", lowerQuery), where("lowerEmail", "<", lowerQuery + "\uf8ff"), limit(10));
    const snaps = await getDocs(q);
    const users = snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
    const filtered = users.filter((u) => (!u.businessAffiliations?.length) && !u.accountType);
    return filtered.map((u) => ({ uid: u.uid || u.id, email: u.email, name: u.username || u.email }));
};

// --- Notifications Section ---
export const sendNotification = async (recipientUid, { title, message, link = null, type = "info" }) => {
    if (!recipientUid) return;
    const accountRef = doc(db, COLLECTIONS.ACCOUNT, recipientUid);
    
    // Sanitize inputs
    const safeTitle = sanitizeString(title, 100);
    const safeMessage = sanitizeString(message, 500);

    const notification = {
        id: doc(collection(db, "dummy")).id,
        title: safeTitle,
        message: safeMessage,
        link,
        type,
        read: false,
        createdAt: Timestamp.now()
    };

    try {
        // Check existing notifications count and cap at 100
        const acctSnap = await getDoc(accountRef);
        if (acctSnap.exists()) {
            const data = acctSnap.data();
            let notifications = Array.isArray(data.notifications) ? data.notifications : [];

            // Dedup: skip if identical title+message exists in last 5 notifications
            const recentDup = notifications.slice(-5).some(
                n => n.title === safeTitle && n.message === safeMessage
            );
            if (recentDup) return;

            // Cap: if over 100, trim oldest
            if (notifications.length >= 100) {
                notifications = notifications.slice(-99);
            }
            notifications.push(notification);
            await updateDoc(accountRef, {
                notifications,
                updatedAt: serverTimestamp()
            });
        } else {
            await updateDoc(accountRef, {
                notifications: arrayUnion(notification),
                updatedAt: serverTimestamp()
            });
        }
    } catch (err) {
        console.warn("Failed to send notification:", err);
    }
};

export const clearNotifications = async (uid) => {
    if (!uid) return;
    const accountRef = doc(db, COLLECTIONS.ACCOUNT, uid);
    await updateDoc(accountRef, {
        notifications: [],
        updatedAt: serverTimestamp()
    });
};

// --- Business Section ---
export const createBusiness = async ({ ownerUid, businessName, payload = {} }) => {
    ensure(ownerUid, "createBusiness: ownerUid required");
    ensure(businessName, "createBusiness: businessName required");

    // Sanitize business name
    const safeName = sanitizeString(businessName, 200);
    const businessRef = doc(collection(db, COLLECTIONS.BUSINESSES));
    const businessId = businessRef.id;
    const now = serverTimestamp();

    const defaultSettings = { maxRoleLevel: 10, maxRoleCapacity: 20 };

    const businessDoc = {
        name: safeName,
        slug: slugify(`${safeName}-${businessId.slice(0, 6)}`),
        ownerUid,
        published: false,
        createdAt: now,
        updatedAt: now,
        settings: {
            ...(payload.settings ?? {}),
            ...defaultSettings,
        },
        ...payload,
    };

    const batch = writeBatch(db);
    batch.set(businessRef, businessDoc);

    const affiliation = {
        businessId,
        roleId: "owner",
        joinedAt: Timestamp.now(),
        isPrimary: true,
    };

    const accountRef = doc(db, COLLECTIONS.ACCOUNT, ownerUid);
    batch.set(
        accountRef,
        {
            accountType: "business",
            businessAffiliations: arrayUnion(affiliation),
            updatedAt: serverTimestamp(),
            invitesEmail: [],
        },
        { merge: true }
    );

    await batch.commit();
    return { businessId, businessDoc: { id: businessId, ...businessDoc } };
};

export const addMemberToBusiness = async ({ businessId, uid = null, email = null, name = null, roleId = "member" }) => {
    ensure(businessId, "addMemberToBusiness: businessId required");
    ensure(uid || email, "addMemberToBusiness: either uid or email required");

    const resolvedRoleDoc = await getRoleDoc(businessId, roleId);
    const resolvedRoleId = resolvedRoleDoc?.id ?? roleId;

    const membersCol = collection(db, COLLECTIONS.BUSINESSES, businessId, "members");
    const roleRef = resolvedRoleId ? doc(db, COLLECTIONS.BUSINESSES, businessId, "roles", resolvedRoleId) : null;
    const accountRef = uid ? doc(db, COLLECTIONS.ACCOUNT, uid) : null;

    await runTransaction(db, async (tx) => {
        let roleData = null;
        if (roleRef) {
            const roleSnap = await tx.get(roleRef);
            if (!roleSnap.exists()) throw new Error("addMemberToBusiness: role not found");
            roleData = roleSnap.data();
        }

        let acctSnap = null;
        let accountExists = false;
        if (accountRef) {
            acctSnap = await tx.get(accountRef);
            accountExists = acctSnap.exists();
        }

        if (roleRef && roleData) {
            const capacity = roleData.capacity ?? null;
            const membersCount = Number(roleData.membersCount ?? 0);
            if (capacity !== null && membersCount >= capacity) throw new Error("role capacity reached");
        }

        if (roleRef) tx.update(roleRef, { membersCount: increment(1), updatedAt: serverTimestamp() });

        const newMemberRef = doc(membersCol);
        tx.set(newMemberRef, {
            uid: uid ?? null,
            email: email ?? null,
            name: name ?? null,
            roleId: resolvedRoleId ?? roleId,
            joinedAt: serverTimestamp(),
        });

        if (accountRef) {
            const affiliation = {
                businessId,
                roleId: resolvedRoleId ?? roleId,
                joinedAt: Timestamp.now(),
                isPrimary: false,
            };

            if (accountExists) {
                tx.update(accountRef, {
                    businessAffiliations: arrayUnion(affiliation),
                    invitesEmail: [],
                    accountType: "business", // Ensure they become a business user
                    updatedAt: serverTimestamp(),
                });
            } else {
                tx.set(accountRef, {
                    businessAffiliations: [affiliation],
                    invitesEmail: [],
                    accountType: "business",
                    updatedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                });
            }
        }
    });

    return true;
};

export const getBusiness = async (businessId) => {
    if (!businessId) return null;
    const snap = await getDoc(doc(db, COLLECTIONS.BUSINESSES, businessId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getBusinessMembers = async (businessId) => {
    if (!businessId) return [];
    const membersCol = collection(db, COLLECTIONS.BUSINESSES, businessId, "members");
    const snaps = await getDocs(fsQuery(membersCol));
    return snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const updateBusinessSettings = async (businessId, settings = {}) => {
    ensure(businessId, "updateBusinessSettings: businessId required");
    const ref = doc(db, COLLECTIONS.BUSINESSES, businessId);
    await updateDoc(ref, { ...settings, updatedAt: serverTimestamp() });
    return true;
};

export const deleteBusiness = async (businessId, ownerUid) => {
    ensure(businessId && ownerUid, "deleteBusiness: missing args");
    
    // 1. Cleanup subcollections: members, roles, invites
    const subcollections = ["members", "roles", "invites"];
    for (const sub of subcollections) {
        try {
            const col = collection(db, COLLECTIONS.BUSINESSES, businessId, sub);
            const snaps = await getDocs(col);
            if (!snaps.empty) {
                // Also clean up member affiliations if deleting members
                if (sub === "members") {
                    await Promise.all(snaps.docs.map(async (d) => {
                        const memberData = d.data();
                        if (memberData.uid && memberData.uid !== ownerUid) {
                            try {
                                const memberAcctRef = doc(db, COLLECTIONS.ACCOUNT, memberData.uid);
                                const memberSnap = await getDoc(memberAcctRef);
                                if (memberSnap.exists()) {
                                    const mData = memberSnap.data();
                                    const mAff = (mData.businessAffiliations || []).filter(a => a.businessId !== businessId);
                                    const mUpdates = { businessAffiliations: mAff, updatedAt: serverTimestamp() };
                                    if (mAff.length === 0) mUpdates.accountType = null;
                                    await updateDoc(memberAcctRef, mUpdates);
                                }
                            } catch (e) { console.warn("deleteBusiness: failed to clean member affiliation", e); }
                        }
                    }));
                }
                await Promise.all(snaps.docs.map(d => deleteDoc(d.ref)));
            }
        } catch (e) {
            console.warn(`deleteBusiness: failed to cleanup ${sub}`, e);
        }
    }

    // 2. Delete Business Doc
    await deleteDoc(doc(db, COLLECTIONS.BUSINESSES, businessId));

    // 3. Remove affiliation from owner
    const accountRef = doc(db, COLLECTIONS.ACCOUNT, ownerUid);
    const snap = await getDoc(accountRef);
    if (snap.exists()) {
        const data = snap.data();
        const aff = data.businessAffiliations || [];
        const newAff = aff.filter(a => a.businessId !== businessId);
        const updates = {
             businessAffiliations: newAff,
             updatedAt: serverTimestamp()
        };
        if (newAff.length === 0) updates.accountType = null;

        await updateDoc(accountRef, updates);
    }

    return true;
};

export const leaveBusiness = async (businessId, uid) => {
    ensure(businessId && uid, "leaveBusiness: missing args");

    const batch = writeBatch(db);

    // 1. Remove from Business->Members
    // We need to find the member doc ID first. 
    // Optimization: If we stored memberId in account affiliation, this would be easier. 
    // For now, query it.
    const membersCol = collection(db, COLLECTIONS.BUSINESSES, businessId, "members");
    const q = fsQuery(membersCol, where("uid", "==", uid), limit(1));
    const snaps = await getDocs(q);
    if (!snaps.empty) {
        batch.delete(snaps.docs[0].ref);
    }

    // 2. Remove from Account->Affiliations
    const accountRef = doc(db, COLLECTIONS.ACCOUNT, uid);
    const acctSnap = await getDoc(accountRef);
    if (acctSnap.exists()) {
        const data = acctSnap.data();
        const aff = data.businessAffiliations || [];
        const newAff = aff.filter(a => a.businessId !== businessId);
        
        // If no affiliations left, reset accountType to null
        const updates = {
             businessAffiliations: newAff,
             updatedAt: serverTimestamp()
        };
        if (newAff.length === 0) {
            updates.accountType = null; 
        }

        batch.update(accountRef, updates);
    }

    await batch.commit();
    return true;
};

// --- Invites Section ---
export const fetchPendingInvitesForEmail = async (email) => {
    if (!email) return [];
    const lower = email.trim().toLowerCase();
    const q = fsQuery(
        collectionGroup(db, "invites"),
        where("emailLower", "==", lower),
        where("status", "==", "pending")
    );
    const snaps = await getDocs(q);

    const results = await Promise.all(
        snaps.docs.map(async (d) => {
            const data = d.data();
            const parts = d.ref.path.split("/");
            const businessId = parts[1];
            let businessName = null;

            try {
                const b = await getDoc(doc(db, COLLECTIONS.BUSINESSES, businessId));
                if (b.exists()) businessName = b.data().name ?? null;
            } catch (err) {
                console.warn("fetchPendingInvitesForEmail: failed to load business", err);
            }

            let roleName = data.roleName ?? null;
            if (!roleName && data.roleId) {
                try {
                    const r = await getDoc(doc(db, COLLECTIONS.BUSINESSES, businessId, "roles", data.roleId));
                    if (r.exists()) roleName = r.data().name ?? data.roleId;
                } catch (err) {
                    roleName = data.roleId;
                }
            }

            return {
                inviteId: d.id,
                businessId,
                businessName,
                roleId: data.roleId,
                roleName,
                invitedBy: data.invitedBy,
                message: data.message,
                createdAt: data.createdAt,
                status: data.status,
                email: data.email,
            };
        })
    );

    return results;
};

export const inviteMember = async ({ businessId, email, invitedByUid, roleId = "", message = "" }) => {
    ensure(businessId && email && invitedByUid, "inviteMember: missing args");
    const emailTrim = String(email).trim();
    const emailLower = emailTrim.toLowerCase();

    const invitesCol = collection(db, COLLECTIONS.BUSINESSES, businessId, "invites");
    const dupQuery = fsQuery(invitesCol, where("emailLower", "==", emailLower), where("status", "==", "pending"), limit(1));
    const dupSnaps = await getDocs(dupQuery);
    if (!dupSnaps.empty) {
        const existing = dupSnaps.docs[0];
        return { inviteId: existing.id, invite: { id: existing.id, ...existing.data() }, existing: true };
    }

    if (roleId) {
        try {
            const roleDoc = await getRoleDoc(businessId, roleId);
            if (roleDoc?.capacity !== undefined && roleDoc.capacity !== null) {
                await checkRoleCapacity(businessId, roleDoc.id);
            }
        } catch (err) {
            if (err.message?.includes("role capacity reached")) throw err;
            console.warn("inviteMember: role capacity check failed or role missing", err);
        }
    }

    let resolvedRoleDoc = null;
    if (roleId) resolvedRoleDoc = await getRoleDoc(businessId, roleId);

    let resolvedRoleId = resolvedRoleDoc?.id ?? null;
    let roleName = resolvedRoleDoc?.name ?? null;

    if (!resolvedRoleId) {
        try {
            const rolesCol = collection(db, COLLECTIONS.BUSINESSES, businessId, "roles");
            const roleSnaps = await getDocs(fsQuery(rolesCol, limit(1)));
            if (!roleSnaps.empty) {
                const firstRoleDoc = roleSnaps.docs[0];
                resolvedRoleId = firstRoleDoc.id;
                roleName = firstRoleDoc.data().name ?? "member";
            } else {
                resolvedRoleId = "member";
                roleName = "member";
            }
        } catch (err) {
            resolvedRoleId = "member";
            roleName = "member";
        }
    }

    let businessName = null;
    try {
        const bSnap = await getDoc(doc(db, COLLECTIONS.BUSINESSES, businessId));
        if (bSnap.exists()) businessName = bSnap.data().name ?? null;
    } catch (err) {
        console.warn("inviteMember: failed to load business for businessName", err);
    }

    const newInviteRef = doc(invitesCol);
    const inviteId = newInviteRef.id;
    const inviteDoc = {
        email: emailTrim,
        emailLower,
        invitedBy: invitedByUid,
        roleId: resolvedRoleId,
        roleName,
        businessName: businessName ?? null,
        message: message ?? "",
        status: "pending",
        createdAt: serverTimestamp(),
    };

    const accountsCol = collection(db, COLLECTIONS.ACCOUNT);
    const qAcct = fsQuery(accountsCol, where("lowerEmail", "==", emailLower), limit(1));
    const snaps = await getDocs(qAcct);

    const batch = writeBatch(db);
    batch.set(newInviteRef, inviteDoc);

    let recipientAccountUid = null;
    if (!snaps.empty) {
        const acctDoc = snaps.docs[0];
        const acctData = acctDoc.data();
        const acctUid = acctDoc.id ?? acctData.uid;
        recipientAccountUid = acctUid;

        if (acctData.accountType || (acctData.businessAffiliations?.length > 0)) {
            throw new Error("inviteMember: target account already has an account type or is affiliated with a business");
        }

        const accountInviteObj = {
            inviteId,
            businessId,
            businessName: businessName ?? null,
            roleId: resolvedRoleId,
            roleName,
            invitedBy: invitedByUid,
            status: "pending",
            createdAt: Timestamp.now(),
            message: message ?? "",
            email: emailTrim,
        };

        const accountRef = doc(db, COLLECTIONS.ACCOUNT, acctUid);
        batch.update(accountRef, {
            invitesEmail: arrayUnion(accountInviteObj),
            updatedAt: serverTimestamp(),
        });
    }

    await batch.commit();

    const createdSnap = await getDoc(newInviteRef);
    const createdInvite = createdSnap.exists() ? { id: createdSnap.id, ...createdSnap.data() } : { id: inviteId, ...inviteDoc };

    return { inviteId, invite: createdInvite, recipientAccountUid };
};

export const removeAllInvitesFromAccount = async (uid) => {
    if (!uid) return false;
    const accountRef = doc(db, COLLECTIONS.ACCOUNT, uid);
    try {
        await updateDoc(accountRef, {
            invitesEmail: [],
            updatedAt: serverTimestamp(),
        });
        return true;
    } catch (err) {
        try {
            await setDoc(accountRef, { invitesEmail: [], updatedAt: serverTimestamp() }, { merge: true });
            return true;
        } catch (e) {
            console.warn("removeAllInvitesFromAccount failed", e);
            return false;
        }
    }
};

export const removeInviteFromAccount = async ({ uid, inviteId, businessId }) => {
    if (!uid) return false;
    const accountRef = doc(db, COLLECTIONS.ACCOUNT, uid);
    const snap = await getDoc(accountRef);
    if (!snap.exists()) return false;
    const data = snap.data();
    const invites = data.invitesEmail ?? [];

    const found = invites.find((i) => i?.inviteId === inviteId || i?.businessId === businessId);
    if (!found) return false;

    try {
        await updateDoc(accountRef, {
            invitesEmail: arrayRemove(found),
            updatedAt: serverTimestamp(),
        });
        return true;
    } catch (err) {
        const filtered = invites.filter((i) => !(i?.inviteId === inviteId || i?.businessId === businessId));
        await setDoc(accountRef, { invitesEmail: filtered, updatedAt: serverTimestamp() }, { merge: true });
        return true;
    }
};

export const declineInvite = async ({ businessId, inviteId, uid = null, reason = "" }) => {
    ensure(businessId && inviteId, "declineInvite: missing args");

    const inviteRef = doc(db, COLLECTIONS.BUSINESSES, businessId, "invites", inviteId);
    await deleteDoc(inviteRef);

    if (uid) {
        try {
            await removeInviteFromAccount({ uid, inviteId, businessId });
        } catch (err) {
            console.warn("declineInvite: failed to remove invite from account doc", err);
        }
    }

    return true;
};

export const acceptInvite = async ({ businessId, inviteId, uid, name, email }) => {
    ensure(businessId && inviteId && uid, "acceptInvite: missing args");
    const inviteRef = doc(db, COLLECTIONS.BUSINESSES, businessId, "invites", inviteId);
    const snap = await getDoc(inviteRef);
    if (!snap.exists()) throw new Error("acceptInvite: invite not found");
    const invite = snap.data();

    if ((invite.emailLower ?? invite.email ?? "").toLowerCase() !== (email ?? "").toLowerCase()) {
        throw new Error("acceptInvite: email mismatch");
    }

    await addMemberToBusiness({ businessId, uid, email, name, roleId: invite.roleId });

    await deleteDoc(inviteRef);

    try {
        await removeAllInvitesFromAccount(uid);
    } catch (err) {
        console.warn("acceptInvite: failed to remove invite from account doc", err);
    }

    return true;
};

// --- Roles Section ---
export const getRoles = async (businessId) => {
    if (!businessId) return [];
    const col = collection(db, COLLECTIONS.BUSINESSES, businessId, "roles");
    const snaps = await getDocs(fsQuery(col, orderBy("level", "desc")));
    return snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getRoleDoc = async (businessId, roleIdOrName) => {
    if (!businessId || !roleIdOrName) return null;
    try {
        const byIdSnap = await getDoc(doc(db, COLLECTIONS.BUSINESSES, businessId, "roles", roleIdOrName));
        if (byIdSnap.exists()) return { id: byIdSnap.id, ...byIdSnap.data() };

        const rolesCol = collection(db, COLLECTIONS.BUSINESSES, businessId, "roles");
        const q = fsQuery(rolesCol, where("name", "==", String(roleIdOrName)), limit(1));
        const snaps = await getDocs(q);
        if (!snaps.empty) {
            const d = snaps.docs[0];
            return { id: d.id, ...d.data() };
        }
        return null;
    } catch (err) {
        console.warn("getRoleDoc error", err);
        return null;
    }
};

export const checkRoleCapacity = async (businessId, roleIdOrName) => {
    if (!businessId || !roleIdOrName) return;
    const roleDoc = await getRoleDoc(businessId, roleIdOrName);

    if (!roleDoc || roleDoc.capacity == null) return;

    const membersCol = collection(db, COLLECTIONS.BUSINESSES, businessId, "members");
    const q = fsQuery(membersCol, where("roleId", "==", roleDoc.id));
    const snaps = await getDocs(q);

    if (snaps.size >= roleDoc.capacity) {
        throw new Error("role capacity reached");
    }
};

export const createRole = async (businessId, role) => {
    ensure(businessId, "createRole: businessId required");
    ensure(role?.name, "createRole: role.name required");

    const businessSnap = await getDoc(doc(db, COLLECTIONS.BUSINESSES, businessId));
    const businessData = businessSnap.data() ?? {};
    const maxLevel = businessData.settings?.maxRoleLevel ?? 10;
    const maxCapacity = businessData.settings?.maxRoleCapacity ?? 20;

    const level = Math.floor(Number(role.level ?? 0));
    if (level < 0) throw new Error("createRole: level must be >= 0");
    if (level > maxLevel) throw new Error(`createRole: level cannot exceed business maxRoleLevel (${maxLevel})`);

    const capacityRaw = role.capacity ?? null;
    const capacity = capacityRaw === null ? null : Math.floor(Number(capacityRaw));
    if (capacity !== null) {
        if (capacity < 0) throw new Error("createRole: capacity must be a non-negative integer or null");
        if (capacity > maxCapacity) throw new Error(`createRole: capacity cannot exceed business maxRoleCapacity (${maxCapacity})`);
    }

    const existing = await getRoles(businessId);
    const dup = existing.find((r) => Number(r.level ?? 0) === level);
    if (dup) throw new Error(`createRole: a role with level ${level} already exists (${dup.name})`);

    const col = collection(db, COLLECTIONS.BUSINESSES, businessId, "roles");
    const docRef = await addDoc(col, {
        name: role.name,
        level,
        membersCount: 0,
        capacity,
        permissions: role.permissions ?? {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return {
        roleId: docRef.id,
        role: { id: docRef.id, name: role.name, level, capacity, permissions: role.permissions ?? {} },
    };
};

export const updateRole = async (businessId, roleId, updates = {}) => {
    ensure(businessId && roleId, "updateRole: missing args");

    const businessSnap = await getDoc(doc(db, COLLECTIONS.BUSINESSES, businessId));
    const businessData = businessSnap.data() ?? {};
    const maxLevel = businessData.settings?.maxRoleLevel ?? 10;
    const maxCapacity = businessData.settings?.maxRoleCapacity ?? 50;

    if (updates.level !== undefined) {
        const level = Math.floor(Number(updates.level));
        if (level < 0) throw new Error("updateRole: level must be >= 0");
        if (level > maxLevel) throw new Error(`updateRole: level cannot exceed business maxRoleLevel (${maxLevel})`);

        const roles = await getRoles(businessId);
        const dup = roles.find((r) => r.id !== roleId && Number(r.level ?? 0) === level);
        if (dup) throw new Error(`updateRole: another role (${dup.name}) already uses level ${level}`);
        updates.level = level;
    }

    if (updates.capacity !== undefined) {
        if (updates.capacity === null) {
            updates.capacity = null;
        } else {
            const cap = Math.floor(Number(updates.capacity));
            if (cap < 0) throw new Error("updateRole: capacity must be a non-negative integer or null");
            if (cap > maxCapacity) throw new Error(`updateRole: capacity cannot exceed business maxRoleCapacity (${maxCapacity})`);
            updates.capacity = cap;
        }
    }

    const ref = doc(db, COLLECTIONS.BUSINESSES, businessId, "roles", roleId);
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
    return true;
};

export const deleteRole = async (businessId, roleId) => {
    ensure(businessId && roleId, "deleteRole: missing args");
    await deleteDoc(doc(db, COLLECTIONS.BUSINESSES, businessId, "roles", roleId));
    return true;
};
export const updateMemberRole = async ({ businessId, uid, roleId }) => {
    ensure(businessId && uid && roleId, "updateMemberRole: missing args");

    const resolvedRoleDoc = await getRoleDoc(businessId, roleId);
    if (!resolvedRoleDoc) throw new Error("Role not found");

    if (resolvedRoleDoc.capacity !== undefined && resolvedRoleDoc.capacity !== null) {
         // Optimization: Ideally we check if user already has this role, but for simplicity we check capacity.
         // If we are strictly checking, we should get current member role. 
         // But let's just check capability.
         await checkRoleCapacity(businessId, resolvedRoleDoc.id);
    }

    const membersCol = collection(db, COLLECTIONS.BUSINESSES, businessId, "members");
    const q = fsQuery(membersCol, where("uid", "==", uid), limit(1));
    const snaps = await getDocs(q);
    if (snaps.empty) throw new Error("Member not found in business");
    
    // Update member doc
    const memberDoc = snaps.docs[0];
    const oldRoleId = memberDoc.data().roleId;
    
    const batch = writeBatch(db);
    batch.update(memberDoc.ref, { roleId: resolvedRoleDoc.id, updatedAt: serverTimestamp() });

    // Update account affiliation
    const accountRef = doc(db, COLLECTIONS.ACCOUNT, uid);
    const acctSnap = await getDoc(accountRef);
    if (acctSnap.exists()) {
        const data = acctSnap.data();
        const aff = data.businessAffiliations || [];
        const idx = aff.findIndex(a => a.businessId === businessId);
        if (idx >= 0) {
            // Arrays in firestore are hard to update at index. 
            // We read, modify, write.
            const newAff = [...aff];
            newAff[idx] = { ...newAff[idx], roleId: resolvedRoleDoc.id };
            batch.update(accountRef, { 
                businessAffiliations: newAff, 
                accountType: "business", // Ensure account type is correct
                updatedAt: serverTimestamp() 
            });
        }
    }

    // Role counts
    if (oldRoleId !== resolvedRoleDoc.id) {
         const oldRoleRef = doc(db, COLLECTIONS.BUSINESSES, businessId, "roles", oldRoleId);
         batch.update(oldRoleRef, { membersCount: increment(-1) });
         
         const newRoleRef = doc(db, COLLECTIONS.BUSINESSES, businessId, "roles", resolvedRoleDoc.id);
         batch.update(newRoleRef, { membersCount: increment(1) });
    }

    await batch.commit();
    return true;
};

export const updateMemberStatus = async ({ businessId, uid, status }) => {
    ensure(businessId && uid && status, "updateMemberStatus: missing args");
    const membersCol = collection(db, COLLECTIONS.BUSINESSES, businessId, "members");
    const q = fsQuery(membersCol, where("uid", "==", uid), limit(1));
    const snaps = await getDocs(q);
    if (!snaps.empty) {
        await updateDoc(snaps.docs[0].ref, { status, updatedAt: serverTimestamp() });
        return true;
    }
    return false;
};
