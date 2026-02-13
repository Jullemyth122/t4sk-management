import { useEffect } from 'react';
import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { dbRealtime } from '../config/firebase';

/**
 * Hook to manage user presence (online/offline) in Realtime Database.
 * @param {string} uid - The current user's UID.
 */
export const usePresence = (uid) => {
    useEffect(() => {
        if (!uid || !dbRealtime) return;

        // Special location provided by Firebase to track connection state
        const connectedRef = ref(dbRealtime, '.info/connected');
        
        // Location to store the user's online status
        const userStatusDatabaseRef = ref(dbRealtime, '/status/' + uid);

        const unsubscribe = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                // We're connected (or reconnected)!
                
                // When I disconnect, set state to offline
                onDisconnect(userStatusDatabaseRef).set({
                    state: 'offline',
                    last_changed: serverTimestamp(),
                }).then(() => {
                    // While I'm online, set state to online
                    set(userStatusDatabaseRef, {
                        state: 'online',
                        last_changed: serverTimestamp(),
                    });
                });
            }
        });

        return () => {
            unsubscribe();
        };
    }, [uid]);
};
