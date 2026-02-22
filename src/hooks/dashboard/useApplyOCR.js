import { useCallback, useRef } from "react";
import { clampInt, deriveListName, inferDueDateFromItem, normalizeToTargetSum, parseISODateToDate } from "../../utils/dashboardUtils";
import * as boardSvc from '../../services/boardService'
import { db } from "../../config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { computePriority } from "../../utils/prioritization";

export function useApplyOCR({ selectedBoardId, canCreateList, ocrResult, lists, businessId, uid, dispatchSet, cardsMap, emailMap, members, membersMap, getMemberLevel, roles, businessOwnerUid }) {
    const snapshotRef = useRef({});

    const handleApplyOCRToBoard = useCallback(async () => {
        if (!selectedBoardId) return dispatchSet('uiError', 'Select a board to import into.');
        if (!canCreateList) return dispatchSet('uiError', 'Permission denied to create lists.');
        if (!ocrResult) return dispatchSet('uiError', 'No OCR data to import.');

        dispatchSet('uiError', '');
        dispatchSet('loading', true);

        // --- 1. Prepare Data Logic ---

        // Helpers for Assignee Resolution
        const normalizeTokenForEmail = (tok = '') => {
            if (!tok) return '';
            return String(tok).trim().toLowerCase().replace(/[()\[\]<>,"'`]/g, '').replace(/\s+/g, '');
        };

        const levenshtein = (a = '', b = '') => {
            const A = String(a || ''), B = String(b || '');
            const al = A.length, bl = B.length;
            if (al === 0) return bl;
            if (bl === 0) return al;
            const dp = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
            for (let i = 0; i <= al; i++) dp[i][0] = i;
            for (let j = 0; j <= bl; j++) dp[0][j] = j;
            for (let i = 1; i <= al; i++) {
                for (let j = 1; j <= bl; j++) {
                    const cost = A[i - 1] === B[j - 1] ? 0 : 1;
                    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
                }
            }
            return dp[al][bl];
        };

        // Determine lists to create
        let listsToCreate = [];
        if (Array.isArray(ocrResult.lists)) {
            listsToCreate = ocrResult.lists;
        } else if (ocrResult.arrays && Array.isArray(ocrResult.arrays.documentList)) {
            listsToCreate = [{
                name: deriveListName(ocrResult),
                items: ocrResult.arrays.documentList
            }];
        }

        if (listsToCreate.length === 0) {
             dispatchSet('loading', false);
             return dispatchSet('uiError', 'No lists found in OCR result.');
        }

        // Build member pools
        const lowLevelMembers = (members || []).filter(m => {
            const mUid = m.uid || m.id || null;
            if (!mUid) return false;
            if (businessOwnerUid && String(mUid) === String(businessOwnerUid)) return false;
            const lvl = typeof getMemberLevel === 'function' ? getMemberLevel(m, roles) : (m.level ?? null);
            return (typeof lvl === 'number') && (lvl <= 2);
        });

        const lowLevelUidSet = new Set(lowLevelMembers.map(m => (m.uid || m.id)).filter(Boolean));

        const fallbackPool = lowLevelMembers
            .map(m => (m.uid || m.id) ? (m.uid || m.id) : (m.email ? String(m.email).toLowerCase() : null))
            .filter(Boolean);

        const candidateEmails = Array.from(new Set([
            ...lowLevelMembers.flatMap(m => {
                const out = [];
                if (m.email) out.push(String(m.email).toLowerCase().trim());
                return out;
            }),
            ...(Object.keys(emailMap || {}) || []).map(k => (k || '').toString().toLowerCase().trim()).filter(Boolean)
        ].map(x => String(x).trim()).filter(Boolean)));

        const explicitEmailRE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

        const findBestCandidateForToken = (token) => {
            if (!token) return null;
            const norm = normalizeTokenForEmail(token);
            if (!norm) return null;

            if (explicitEmailRE.test(norm)) {
                const exact = candidateEmails.find(c => c === norm);
                if (exact) return exact;
                // No exact match — do NOT return the raw OCR email.
                // Fall through to fuzzy matching below.
            }

            const tokenLocal = (norm.split('@')[0] || norm);
            let best = null;
            let bestScore = Infinity;
            for (const candidate of candidateEmails) {
                const candNorm = normalizeTokenForEmail(candidate);
                const candLocal = (candNorm.split('@')[0] || candNorm);
                const localDist = levenshtein(tokenLocal, candLocal);
                const fullDist = levenshtein(norm, candNorm);
                const score = localDist + fullDist * 0.2;
                if (score < bestScore) {
                    bestScore = score;
                    best = candidate;
                }
            }
            if (best) {
                const candLen = Math.max(1, (best || '').length);
                if (bestScore <= 2 || (bestScore / candLen) <= 0.25) return best;
            }
            return null;
        };

        const canonicalizeTokenToMemberOrEmail = (token) => {
            if (!token) return null;
            const raw = String(token).trim();
            const norm = normalizeTokenForEmail(raw);

            // skip short numeric "garbage"
            if (/^[+\-]?\d{1,3}$/.test(raw)) return null;

            // email-like -> prefer emailMap resolution then return email
            if (norm.includes('@')) {
                const emailKey = norm.toLowerCase();
                if (emailMap && emailMap[emailKey]) {
                    const mem = emailMap[emailKey];
                    const id = mem.uid || null;
                    if (id && String(id) === String(businessOwnerUid)) return null;
                    return id || emailKey;
                }
                // Email not found in members — check candidateEmails list
                if (candidateEmails.includes(emailKey)) return emailKey;
                // Not a known member email — exclude it
                return null;
            }

            // uid or id token -> map via membersMap if possible (prefer uid)
            const uidMatch = raw.match(/^(?:uid:|id:)?([A-Za-z0-9\-_]+)$/i);
            if (uidMatch) {
                const candidate = uidMatch[1];
                if (membersMap && membersMap[candidate]) {
                    const mm = membersMap[candidate];
                    const id = mm.uid || null;
                    if (id && String(id) === String(businessOwnerUid)) return null;
                    return id || (mm.email ? String(mm.email).toLowerCase() : null);
                }
            }

            // fuzzy best candidate among candidateEmails
            const fuzzy = findBestCandidateForToken(norm);
            if (fuzzy) {
                if (emailMap && emailMap[fuzzy]) {
                    const mem = emailMap[fuzzy];
                    const id = mem.uid || null;
                    if (id && String(id) === String(businessOwnerUid)) return null;
                    return id || String(fuzzy).toLowerCase();
                }
                return String(fuzzy).toLowerCase();
            }

            // No match found — exclude unknown tokens to avoid assigning to non-existent members
            return null;
        };

        // --- 2. Execution Loop ---
        try {
            let totalTasksCreated = 0;

            for (const listObj of listsToCreate) {
                const listName = listObj.name || `Imported List ${new Date().toLocaleTimeString()}`;
                const itemsStr = JSON.stringify(listObj.items || []);
                const items = JSON.parse(itemsStr); // clone
                
                if (items.length === 0) continue;

                const tempListId = `tmp-list-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const currentLists = snapshotRef.current.lists || lists || [];
                const position = currentLists.length;
                
                const tempList = { id: tempListId, name: listName, position, assignees: [], meta: {} };

                // Optimistic UI update for List
                dispatchSet('lists', (prev) => [...(prev || []), tempList]);
                
                // Create List API
                const created = await boardSvc.createList({
                    businessId,
                    uid,
                    boardId: selectedBoardId,
                    name: listName,
                    position,
                    assignees: [] 
                });

                const listId = created.id || created._id || created.listId || null;
                if (!listId) throw new Error('Create list returned invalid result (no id)');
                const realList = created;
                
                // Update optimisitic list with real ID
                dispatchSet('lists', (prev) => (prev || []).map(l => l.id === tempListId ? created : l));
                
                // Process Cards for this List
                const toCreate = items.slice(0, 200); // Batch limit per list

                // Build a global pool of tokens FOUND BY OCR (for this loop's usage context)
                const poolCandidates = new Set();
                toCreate.forEach(it => {
                    if (Array.isArray(it.assignees)) it.assignees.forEach(a => poolCandidates.add(normalizeTokenForEmail(a)));
                });
                if (ocrResult.strings) {
                    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
                    const foundGlobal = Array.from((ocrResult.strings.match(emailRegex) || [])).map(e => normalizeTokenForEmail(e));
                    foundGlobal.forEach(e => poolCandidates.add(e));
                }
                
                // scanning item text for emails
                toCreate.forEach(it => {
                     const blob = `${it.title} ${it.description} ${it.text}`;
                     const matches = blob.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g);
                     if (matches) matches.forEach(m => poolCandidates.add(normalizeTokenForEmail(m)));
                });

                // Resolve candidates for pool rotation
                const resolvedPoolSet = new Set();
                poolCandidates.forEach(token => {
                    const canon = canonicalizeTokenToMemberOrEmail(token);
                    if (canon) resolvedPoolSet.add(canon);
                });
                
                let assigneePool = Array.from(resolvedPoolSet).filter(Boolean);
                if (!assigneePool.length) assigneePool = Array.from(new Set(fallbackPool)).filter(Boolean);
                if (!assigneePool.length && uid) assigneePool = [uid];
                let assigneePoolIndex = 0;

                // Weights Calc
                const rawScores = toCreate.map((it) => {
                     if (typeof it.weight === 'number') return Math.max(0, it.weight);
                     const effort = (typeof it.effort === 'number') ? Math.max(1, Math.min(10, Math.round(it.effort))) : null;
                     const ps = it.priorityScale ? String(it.priorityScale).toLowerCase() : null;
                     const priorityMultiplier = ps === 'high' || ps === 'hard' ? 1.4 : (ps === 'medium' ? 1.0 : (ps === 'easy' ? 0.8 : 1.0));
                     if (effort !== null) return effort * priorityMultiplier;
                     return 3 * priorityMultiplier; 
                });
                
                const normalized = normalizeToTargetSum(rawScores, 100);
                let runningWeightSum = 0;
                const allUniqueAssignees = new Set();
                
                // Create Cards
                for (let idx = 0; idx < toCreate.length; idx++) {
                     const item = toCreate[idx] || {};
                     const title = (item.title || item.text || item.name || '').toString().trim().split(/\r?\n/).map(s => s.trim()).find(Boolean) || `Imported task (${idx + 1})`;
                     const description = (item.description || item.text || '') ? String(item.description || item.text).trim().slice(0, 2000) : '';
                     
                     const dueFromOCR = item.dueDate ?? null;
                     let dueDate = parseISODateToDate(dueFromOCR);
                     if (!dueDate) {
                        const inferred = typeof inferDueDateFromItem === 'function' ? inferDueDateFromItem(item) : null;
                        if (inferred) dueDate = inferred;
                     }

                     const effortVal = (typeof item.effort === 'number') ? item.effort : null;
                     const w = clampInt(normalized[idx] ?? 0);
                     runningWeightSum += w;

                     const ps = item.priorityScale ? String(item.priorityScale).toLowerCase() : null;
                     let priorityLabel = (item.priority && typeof item.priority === 'string') ? String(item.priority).toLowerCase() : null;
                     if (!priorityLabel) {
                         if (w >= 70) priorityLabel = 'high';
                         else if (w >= 40) priorityLabel = 'medium';
                         else priorityLabel = 'low';
                     }
                     const cp = typeof computePriority === 'function' ? computePriority({ dueDate, priorityLabel, effort: effortVal, title, description }) : { priorityLabel: priorityLabel || 'medium', priorityRank: 50 };

                     // Assignee Logic
                     let finalAssignees = [];
                     
                     // Try specific assignees from item
                     if (Array.isArray(item.assignees) && item.assignees.length) {
                         // support multiple assignees
                         finalAssignees = item.assignees
                             .map(t => canonicalizeTokenToMemberOrEmail(t))
                             .filter(Boolean);
                     }
                     
                     // Fallback to pool ONLY if NO valid assignees found explicitly
                     if (!finalAssignees.length && assigneePool.length > 0) {
                         finalAssignees = [assigneePool[assigneePoolIndex % assigneePool.length]];
                         assigneePoolIndex++;
                     }

                     // Dedup/Clean finalAssignees
                     finalAssignees = finalAssignees.map(x => String(x)).filter(x => x && x !== String(businessOwnerUid));
                     finalAssignees.forEach(a => allUniqueAssignees.add(a));

                     const tempCardId = `tmp-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                     const cardData = {
                        title, description, assignees: finalAssignees, 
                        labels: item.labels || [], priority: cp.priorityLabel, priorityRank: cp.priorityRank,
                        status: 'todo', dueDate, startDate: item.startDate || null,
                        effort: effortVal, weight: w, subtasks: item.subtasks || [],
                        createdAt: new Date(), createdBy: uid
                     };
                     
                     // Optimistic Card
                     dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: [ { ...cardData, id: tempCardId }, ...((prev && prev[listId]) || [])] }));

                     try {
                        const createdCard = await boardSvc.createCard({ businessId, uid, boardId: selectedBoardId, listId, card: cardData });
                         // Replace optimistic
                         if (createdCard && createdCard.id) {
                            dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: (prev[listId] || []).map(c => c.id === tempCardId ? createdCard : c) }));
                         }
                     } catch(e) {
                         console.error("Card create failed", e);
                         // Remove optimistic
                         dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: (prev[listId] || []).filter(c => c.id !== tempCardId) }));
                     }
                }
                
                totalTasksCreated += toCreate.length;

                // Update list assignees (Union of all cards, excluding owner)
                const finalUniqueAssigneesUids = Array.from(allUniqueAssignees).filter(id => id && String(id) !== String(businessOwnerUid)); 
                if (finalUniqueAssigneesUids.length > 0) {
                     await boardSvc.updateList({ businessId, uid, boardId: selectedBoardId, listId, updates: { assignees: finalUniqueAssigneesUids } });
                     dispatchSet('lists', (prev) => (prev || []).map(l => l.id === listId ? { ...l, assignees: finalUniqueAssigneesUids } : l));
                }

            } // end list loop

             // Logs
             if (businessId && totalTasksCreated > 0) {
                const logsRef = collection(db, "businesses", businessId, "analytics", "ai_usage", "logs");
                await addDoc(logsRef, {
                    timestamp: serverTimestamp(),
                    action: 'ocr_import',
                    tasksCount: totalTasksCreated,
                    timeSavedMinutes: totalTasksCreated * 5,
                    performedBy: uid
                });
             }

        } catch (err) {
            console.error('Failed to import OCR list(s)', err);
            dispatchSet('uiError', err?.message || 'Failed to import OCR results.');
        } finally {
            dispatchSet('loading', false);
        }
    }, [
        selectedBoardId, canCreateList, ocrResult, lists, businessId, uid, dispatchSet, computePriority, boardSvc, cardsMap, emailMap, members, membersMap, getMemberLevel, roles, businessOwnerUid
    ]);
    return { handleApplyOCRToBoard };
}