import { useCallback, useRef } from "react";
import { clampInt, deriveListName, inferDueDateFromItem, normalizeToTargetSum, parseISODateToDate } from "../../utils/dashboardUtils";
import * as boardSvc from '../../services/boardService'
import { computePriority } from "../../utils/prioritization";
export function useApplyOCR({ selectedBoardId, canCreateList, ocrResult, lists, businessId, uid, dispatchSet, cardsMap, emailMap, members, membersMap, getMemberLevel, roles, businessOwnerUid }) {
    const snapshotRef = useRef({});

    const handleApplyOCRToBoard = useCallback(async () => {
        if (!selectedBoardId) return dispatchSet('uiError', 'Select a board to import into.');
        if (!canCreateList) return dispatchSet('uiError', 'Permission denied to create lists.');
        if (!ocrResult) return dispatchSet('uiError', 'No OCR data to import.');

        dispatchSet('uiError', '');
        dispatchSet('loading', true);


        const listName = deriveListName(ocrResult);
        const tempListId = `tmp-list-${Date.now()}`;
        const tempList = { id: tempListId, name: listName, position: (lists && lists.length) ? lists.length : 0, assignees: [], meta: {} };

        snapshotRef.current.lists = lists;
        dispatchSet('lists', (prev) => [...(prev || []), tempList]);

        try {
            const created = await boardSvc.createList({
                businessId,
                uid,
                boardId: selectedBoardId,
                name: listName,
                position: (lists && lists.length) ? lists.length : 0,
                assignees: [] // Start empty; update with union later
            });
            dispatchSet('lists', (prev) => (prev || []).map(l => l.id === tempListId ? created : l));

            const listId = created.id || created._id || created.listId || null;
            if (!listId) throw new Error('Create list returned invalid result (no id)');
            const realList = created;

            const items = (ocrResult.arrays && Array.isArray(ocrResult.arrays.documentList)) ? ocrResult.arrays.documentList : [];
            const MAX_BATCH = 200;
            const toCreate = items.slice(0, MAX_BATCH);

            // Build low-level member lists (level <= 2)
            const lowLevelMembers = (members || []).filter(m => {
                const mUid = m.uid || m.id || null;
                if (!mUid) return false;
                if (businessOwnerUid && String(mUid) === String(businessOwnerUid)) return false;
                const lvl = typeof getMemberLevel === 'function' ? getMemberLevel(m, roles) : (m.level ?? null);
                return (typeof lvl === 'number') && (lvl <= 2);
            });

            // fallback pool used only for assignment rotation (do NOT automatically add to list union)
            const fallbackPool = lowLevelMembers
                .map(m => (m.uid || m.id) ? (m.uid || m.id) : (m.email ? String(m.email).toLowerCase() : null))
                .filter(Boolean);

            // Build candidateEmails list but ONLY include canonical email strings (do NOT push uids here)
            const candidateEmails = Array.from(new Set([
                ...lowLevelMembers.flatMap(m => {
                    const out = [];
                    if (m.email) out.push(String(m.email).toLowerCase().trim());
                    return out;
                }),
                ...(Object.keys(emailMap || {}) || []).map(k => (k || '').toString().toLowerCase().trim()).filter(Boolean)
            ].map(x => String(x).trim()).filter(Boolean)));

            // helpers: levenshtein, normalizeTokenForEmail, findBestCandidateForToken (kept similar)
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

            const normalizeTokenForEmail = (tok = '') => {
                if (!tok) return '';
                return String(tok).trim().toLowerCase().replace(/[()\[\]<>,"'`]/g, '').replace(/\s+/g, '');
            };

            const explicitEmailRE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
            const findBestCandidateForToken = (token) => {
                if (!token) return null;
                const norm = normalizeTokenForEmail(token);
                if (!norm) return null;

                if (explicitEmailRE.test(norm)) {
                    const exact = candidateEmails.find(c => c === norm);
                    if (exact) return exact;
                    return norm;
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

            // Simplified canonicalizer that returns either email or uid (or null) and filters owner
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
                        const id = mem.uid || mem.id || null;
                        if (id && String(id) === String(businessOwnerUid)) return null;
                        // prefer id if available, otherwise email
                        return id || emailKey;
                    }
                    return emailKey;
                }

                // uid or id token -> map via membersMap if possible (prefer uid)
                const uidMatch = raw.match(/^(?:uid:|id:)?([A-Za-z0-9\-_]+)$/i);
                if (uidMatch) {
                    const candidate = uidMatch[1];
                    if (membersMap && membersMap[candidate]) {
                        const mm = membersMap[candidate];
                        const id = mm.uid || mm.id || null;
                        if (id && String(id) === String(businessOwnerUid)) return null;
                        return id || (mm.email ? String(mm.email).toLowerCase() : null);
                    }
                }

                // fuzzy best candidate among candidateEmails (but do not auto-add all candidateEmails)
                const fuzzy = findBestCandidateForToken(norm);
                if (fuzzy) {
                    if (emailMap && emailMap[fuzzy]) {
                        const mem = emailMap[fuzzy];
                        const id = mem.uid || mem.id || null;
                        if (id && String(id) === String(businessOwnerUid)) return null;
                        return id || String(fuzzy).toLowerCase();
                    }
                    return String(fuzzy).toLowerCase();
                }

                return norm || null;
            };

            // === Build a global pool of tokens FOUND BY OCR (not candidateEmails!!) ===
            const poolCandidates = new Set();

            // 1) per-item assignees returned by OCR (raw)
            toCreate.forEach(it => {
                if (!it) return;
                if (Array.isArray(it.assignees)) {
                    it.assignees.forEach(a => {
                        if (!a) return;
                        const s = String(a).trim();
                        if (!s) return;
                        poolCandidates.add(normalizeTokenForEmail(s));
                    });
                }
            });

            // 2) scan header/footer/global ocrResult.strings (emails only)
            if (ocrResult.strings && typeof ocrResult.strings === 'string') {
                const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
                const foundGlobal = Array.from((ocrResult.strings.match(emailRegex) || [])).map(e => normalizeTokenForEmail(e));
                foundGlobal.forEach(e => poolCandidates.add(e));
            }

            // 3) scan item text/title/description for emails
            toCreate.forEach(it => {
                if (!it) return;
                const textBlob = `${it.title || ''} ${it.description || ''} ${it.text || ''}`;
                const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
                const found = Array.from((String(textBlob).match(emailRegex) || [])).map(e => normalizeTokenForEmail(e));
                found.forEach(e => poolCandidates.add(e));
            });

            // Resolve tokens to members where possible (prefer uid) and keep normalized values in resolvedPool
            const resolvedPoolSet = new Set();
            for (const token of Array.from(poolCandidates)) {
                if (!token) continue;
                const tnorm = normalizeTokenForEmail(token);
                let member = null;
                if (membersMap && membersMap[String(token)]) member = membersMap[String(token)];
                else if (membersMap && membersMap[String(tnorm)]) member = membersMap[String(tnorm)];
                else if (typeof token === 'string' && token.includes('@') && emailMap && emailMap[token.toLowerCase()]) {
                    member = emailMap[token.toLowerCase()];
                }
                if (member) {
                    const memberUidOrEmail = member.uid || member.id || (member.email && String(member.email).toLowerCase());
                    if (!memberUidOrEmail) continue;
                    if (businessOwnerUid && memberUidOrEmail && String(memberUidOrEmail) === String(businessOwnerUid)) continue;
                    resolvedPoolSet.add(String(memberUidOrEmail));
                } else {
                    resolvedPoolSet.add(String(tnorm));
                }
            }

            // Prepare assigneePool (rotation) for assigning cards: prefer resolvedPoolSet, then fallbackPool
            let assigneePool = Array.from(resolvedPoolSet).filter(Boolean);
            if (!assigneePool.length) assigneePool = Array.from(new Set(fallbackPool)).filter(Boolean);
            if (!assigneePool.length && uid) assigneePool = [uid];

            // rotation pointer
            let assigneePoolIndex = 0;

            // compute existing weights and availableForNew (unchanged)
            const stableExistingCards = Array.isArray(cardsMap[listId]) ? (cardsMap[listId] || []).filter(c => !(String(c.id || '').startsWith('tmp-'))) : [];
            const extractWeightFromCard = (c) => {
                if (c.submission && typeof c.submission.contribution === 'number') return clampInt(c.submission.contribution);
                if (Number.isFinite(Number(c.weight))) return clampInt(Number(c.weight));
                return null;
            };
            const existingWeights = stableExistingCards.map(extractWeightFromCard).filter(w => w !== null);
            const sumExisting = existingWeights.reduce((s, v) => s + v, 0);
            const availableForNew = Math.max(0, 100 - sumExisting);

            // Build raw scores and normalized weights (same approach)
            const rawScores = toCreate.map((it, idx) => {
                if (!it) return 0;
                if (typeof it.weight === 'number' && Number.isFinite(it.weight)) return Math.max(0, it.weight);
                if (typeof it.weight === 'string' && /^\d+$/.test(it.weight)) return Math.max(0, parseInt(it.weight, 10));
                const effort = (typeof it.effort === 'number' && Number.isFinite(it.effort)) ? Math.max(1, Math.min(10, Math.round(it.effort))) : null;
                const ps = it.priorityScale ? String(it.priorityScale).toLowerCase() : null;
                const priorityMultiplier = ps === 'high' || ps === 'hard' ? 1.4 : (ps === 'medium' ? 1.0 : (ps === 'easy' ? 0.8 : 1.0));
                if (effort !== null) return effort * priorityMultiplier;
                const combined = ((Array.isArray(it.labels) ? it.labels.join(' ') : '') + ' ' + (it.description || '') + ' ' + (it.text || '')).toLowerCase();
                if (combined.includes('daily')) return 8 * priorityMultiplier;
                if (combined.includes('weekly')) return 5 * priorityMultiplier;
                if (combined.includes('monthly')) return 2 * priorityMultiplier;
                return 3 * priorityMultiplier;
            });

            let normalized = [];
            if (availableForNew === 0) normalized = Array(rawScores.length).fill(0);
            else normalized = normalizeToTargetSum(rawScores, availableForNew);

            // Collect unique assignees across all cards for list update — but only those actually detected/used
            const allUniqueAssignees = new Set();

            console.debug('OCR pools (post-detect):', {
                poolCandidates: Array.from(poolCandidates).slice(0, 200),
                resolvedPool: Array.from(resolvedPoolSet).slice(0, 200),
                assigneePool: assigneePool.slice(0, 200),
                candidateEmails: candidateEmails.slice(0, 200) // candidateEmails used only for mapping NOT auto-add
            });

            // create optimistic cards sequentially (each card gets exactly one assignee)
            let runningWeightSum = 0;
            const failedItems = [];
            for (let idx = 0; idx < toCreate.length; idx++) {
                const item = toCreate[idx] || {};

                const title = (item.title || item.text || item.name || '').toString().trim().split(/\r?\n/).map(s => s.trim()).find(Boolean) || `Imported task (${idx + 1})`;
                const description = (item.description || item.text || '') ? String(item.description || item.text).trim().slice(0, 2000) : '';

                const dueFromOCR = item.dueDate ?? null;
                let dueDate = parseISODateToDate(dueFromOCR);
                if (!dueDate) {
                    // optional hook (if present in your environment)
                    const inferred = typeof inferDueDateFromItem === 'function' ? inferDueDateFromItem(item) : null;
                    if (inferred) dueDate = inferred;
                }

                const effortVal = (typeof item.effort === 'number' && Number.isFinite(item.effort)) ? Math.max(1, Math.min(10, Math.round(item.effort))) : null;

                const w = clampInt(normalized[idx] ?? 0);
                runningWeightSum += w;

                const ps = item.priorityScale ? String(item.priorityScale).toLowerCase() : null;
                let priorityLabel = (item.priority && typeof item.priority === 'string') ? String(item.priority).toLowerCase() : null;
                if (!priorityLabel) {
                    if (ps === 'easy') priorityLabel = 'low';
                    else if (ps === 'medium') priorityLabel = 'medium';
                    else if (ps === 'hard' || ps === 'high') priorityLabel = 'high';
                }
                if (!priorityLabel) {
                    if (w >= 70) priorityLabel = 'high';
                    else if (w >= 40) priorityLabel = 'medium';
                    else priorityLabel = 'low';
                }

                const cp = typeof computePriority === 'function'
                    ? computePriority({
                        dueDate: dueDate || undefined,
                        priorityLabel: priorityLabel || 'medium',
                        effort: effortVal !== null ? effortVal : undefined,
                        dependencies: [],
                        title,
                        description
                    })
                    : { priorityLabel: priorityLabel || 'medium', priorityRank: 50 };

                // --- ASSIGNEE RESOLUTION (single per card) ---
                let finalAssignees = [];

                // Prefer item.assignees returned from OCR (if present). Canonicalize to uid/email and filter owner.
                if (Array.isArray(item.assignees) && item.assignees.length) {
                    const first = String(item.assignees[0]);
                    // if looks like email
                    if (first.includes('@')) {
                        const lower = first.toLowerCase();
                        if (emailMap && emailMap[lower]) {
                            const mm = emailMap[lower];
                            const id = mm.uid || mm.id || null;
                            if (id && String(id) !== String(businessOwnerUid)) finalAssignees = [id || lower];
                        } else {
                            finalAssignees = [lower];
                        }
                    } else {
                        // try membersMap
                        if (membersMap && membersMap[first]) {
                            const mm = membersMap[first];
                            const id = mm.uid || mm.id || null;
                            if (id && String(id) !== String(businessOwnerUid)) finalAssignees = [id || first];
                            else finalAssignees = [];
                        } else {
                            // try fuzzy mapping via candidateEmails
                            const mapped = findBestCandidateForToken(first);
                            if (mapped) {
                                finalAssignees = [(emailMap && emailMap[mapped] ? (emailMap[mapped].uid || emailMap[mapped].id || mapped) : mapped)];
                            } else {
                                finalAssignees = [first];
                            }
                        }
                    }
                }

                // fallback to rotating assigneePool if no finalAssignees
                if ((!finalAssignees || finalAssignees.length === 0) && assigneePool.length > 0) {
                    const usedSet = new Set(Array.from(allUniqueAssignees));
                    const poolLen = assigneePool.length;
                    let start = Number(assigneePoolIndex || 0);
                    let picked = null;
                    for (let i = 0; i < poolLen; i++) {
                        const idxCandidate = (start + i) % poolLen;
                        const cand = assigneePool[idxCandidate];
                        if (!usedSet.has(cand)) { picked = cand; assigneePoolIndex = (idxCandidate + 1) % poolLen; break; }
                    }
                    if (!picked) {
                        picked = assigneePool[assigneePoolIndex % poolLen];
                        assigneePoolIndex = (assigneePoolIndex + 1) % poolLen;
                    }
                    if (picked) {
                        if (String(picked).includes('@')) {
                            const lower = String(picked).toLowerCase();
                            if (emailMap && emailMap[lower]) {
                                const mm = emailMap[lower];
                                const id = mm.uid || mm.id || null;
                                if (id && String(id) !== String(businessOwnerUid)) finalAssignees = [id || lower];
                                else finalAssignees = [];
                            } else {
                                finalAssignees = [lower];
                            }
                        } else {
                            if (membersMap && membersMap[picked]) {
                                const mm = membersMap[picked];
                                finalAssignees = [mm.uid || mm.id || picked];
                            } else {
                                finalAssignees = [picked];
                            }
                        }
                    }
                }

                // final canonical mapping: map any emails to uid when possible, keep uids intact
                finalAssignees = Array.from(new Set(finalAssignees.map(f => {
                    if (!f) return null;
                    const fs = String(f);
                    if (fs.includes('@')) {
                        const lower = fs.toLowerCase();
                        if (emailMap && emailMap[lower]) return emailMap[lower].uid || emailMap[lower].id || lower;
                        return lower;
                    }
                    if (membersMap && membersMap[fs]) {
                        const mm = membersMap[fs];
                        return mm.uid || mm.id || fs;
                    }
                    return fs;
                }).filter(Boolean)));

                finalAssignees = finalAssignees.slice(0, 1); // enforce one per card

                // --- Collect canonical tokens for final list union BUT ONLY tokens that were actually detected or used ---
                // We create canonicalItemAssignees from:
                //  - item.assignees (OCR) canonicalized,
                //  - explicit emails found in the item's text/title,
                //  - the final chosen assignee (finalAssignees) — this is important: if we assigned a fallback, the fallback was used and should appear in list union.
                const canonicalItemAssignees = new Set();

                // raw OCR tokens
                if (Array.isArray(item.assignees)) {
                    for (const tok of item.assignees) {
                        const canon = canonicalizeTokenToMemberOrEmail(tok);
                        if (canon) canonicalItemAssignees.add(canon);
                    }
                }

                // explicit foundInText (emails)
                const textBlob = `${item.title || ''} ${item.description || ''}`;
                const foundInText = Array.from((String(textBlob).match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [])).map(e => e.toLowerCase());
                for (const e of foundInText) {
                    const canon = canonicalizeTokenToMemberOrEmail(e);
                    if (canon) canonicalItemAssignees.add(canon);
                }

                // include the actually chosen finalAssignees (if any) — important because fallback rotation used them
                finalAssignees.forEach(a => {
                    if (a && String(a) !== String(businessOwnerUid)) canonicalItemAssignees.add(a);
                });

                // Add canonicalItemAssignees to the global union
                canonicalItemAssignees.forEach(a => {
                    if (a && String(a) !== String(businessOwnerUid)) allUniqueAssignees.add(a);
                });

                console.debug('OCR item idx', idx, 'rawAssignees', item.assignees, 'finalAssignees', finalAssignees, 'canonicalItemAssignees', Array.from(canonicalItemAssignees).slice(0, 10));

                const tempCardId = `tmp-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                const tempCard = {
                    id: tempCardId,
                    title,
                    description,
                    assignees: finalAssignees,
                    labels: Array.isArray(item.labels) ? item.labels : (item.labels ? [String(item.labels)] : []),
                    priority: cp.priorityLabel || priorityLabel || 'medium',
                    priorityRank: Number(cp.priorityRank || 50),
                    status: 'todo',
                    dueDate: dueDate,
                    effort: effortVal,
                    weight: w,
                    createdAt: new Date(),
                    createdBy: uid || null,
                };

                snapshotRef.current.cardsMap = { ...cardsMap };
                dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: [tempCard, ...((prev && prev[listId]) || [])] }));

                const cardToSend = { ...tempCard };
                delete cardToSend.id;

                try {
                    const createdCard = await boardSvc.createCard({ businessId, uid, boardId: selectedBoardId, listId: listId, card: cardToSend });
                    if (createdCard && (createdCard.id || createdCard._id)) {
                        dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: (prev[listId] || []).map(c => c.id === tempCardId ? createdCard : c) }));
                    } else {
                        console.debug('createCard returned unexpected shape:', createdCard);
                    }
                } catch (cardErr) {
                    console.error('Failed to create card from OCR item', cardErr, item);
                    dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: (prev[listId] || []).filter(c => c.id !== tempCardId) }));
                    runningWeightSum -= w;
                    failedItems.push({ index: idx, item, error: (cardErr && cardErr.message) ? cardErr.message : String(cardErr) });
                }
            } // end for items

            // attach local metadata for UI progress calculation
            dispatchSet('lists', (prev) => {
                return (prev || []).map(l => {
                    if (String(l.id) === String(listId) || l.id === tempListId) {
                        const copy = { ...l };
                        copy.meta = { ...(copy.meta || {}), weightSum: (copy.meta?.weightSum || 0) + runningWeightSum };
                        return copy;
                    }
                    return l;
                });
            });

            // attempt to persist list meta to server (best-effort)
            if (typeof boardSvc.updateList === 'function' && realList && (realList.id || listId)) {
                try {
                    await boardSvc.updateList({ businessId, uid, boardId: selectedBoardId, listId: listId, updates: { meta: { ...(realList.meta || {}), weightSum: runningWeightSum } } });
                } catch (metaErr) {
                    console.warn('Could not persist list meta.weightSum', metaErr);
                }
            }

            // ------------------- BUILD FINAL UNIQUE ASSIGNEES ARRAY (STRICTED) -------------------
            // We will:
            // 1) Map emails -> member UIDs via emailMap (if present).
            // 2) Keep only tokens that correspond to low-level members (level <= 2).
            // 3) Exclude owner/higher-level tokens.
            // 4) Normalize to UID when possible, otherwise skip external emails (since you want only low-level members).

            // build quick lookup of low-level members (uids + emails)
            const lowLevelUidSet = new Set();
            const lowLevelEmailToUid = {}; // email -> uid
            (lowLevelMembers || []).forEach(m => {
                const mid = (m.uid || m.id || '').toString().trim();
                const em = (m.email || '').toString().toLowerCase().trim();
                if (mid) lowLevelUidSet.add(mid);
                if (mid && em) lowLevelEmailToUid[em] = mid;
            });

            // helper to canonicalize final token -> uid (only allow low-level members)
            const canonicalToLowLevelUid = (tok) => {
                if (!tok) return null;
                const s = String(tok).trim();
                const n = s.toLowerCase();
                // if it's a uid and exists in low-level set => keep
                if (lowLevelUidSet.has(s)) return s;
                // if it's an email:
                if (n.includes('@')) {
                    // 1) if emailMap has a member, map to uid and ensure low-level
                    if (emailMap && emailMap[n]) {
                        const mm = emailMap[n];
                        const mmUid = mm.uid || mm.id || null;
                        if (mmUid && lowLevelUidSet.has(mmUid)) return mmUid;
                        // if member exists but is higher-level, skip it
                        return null;
                    }
                    // 2) maybe it's a direct low-level email (in lowLevelEmailToUid)
                    if (lowLevelEmailToUid[n]) return lowLevelEmailToUid[n];
                    // 3) otherwise it's an external email — skip (you said exclude non-low-level)
                    return null;
                }
                // fallback: maybe token is fuzzy uid-like; see membersMap
                if (membersMap && membersMap[s]) {
                    const mm = membersMap[s];
                    const mmUid = mm.uid || mm.id || null;
                    if (mmUid && lowLevelUidSet.has(mmUid)) return mmUid;
                }
                return null;
            };

            // map and dedupe
            const mappedUids = new Set();
            for (const tok of Array.from(allUniqueAssignees || [])) {
                const uid = canonicalToLowLevelUid(tok);
                if (uid && String(uid) !== String(businessOwnerUid)) mappedUids.add(uid);
            }

            // final array (uids only). If you prefer to save emails instead, change mapping above.
            const finalUniqueAssigneesUids = Array.from(mappedUids);

            // debug visibility to console
            console.debug('final-unique-assignees (LOW-LEVEL-ONLY):', finalUniqueAssigneesUids.slice(0, 200));

            // persist if non-empty
            if (finalUniqueAssigneesUids.length > 0 && typeof boardSvc.updateList === 'function') {
                try {
                    await boardSvc.updateList({
                        businessId,
                        uid,
                        boardId: selectedBoardId,
                        listId: listId,
                        updates: { assignees: finalUniqueAssigneesUids }
                    });
                    dispatchSet('lists', (prev) => prev.map(l => l.id === listId ? { ...l, assignees: finalUniqueAssigneesUids } : l));
                } catch (updateErr) {
                    console.warn('Failed to update list assignees with union', updateErr);
                }
            }


        } catch (err) {
            console.error('Failed to import OCR list', err);
            dispatchSet('lists', (prev) => (prev || []).filter(l => l.id !== tempListId));
            dispatchSet('uiError', err?.message || 'Failed to import OCR results.');
        } finally {
            dispatchSet('loading', false);
        }
    }, [
        selectedBoardId,
        canCreateList,
        ocrResult,
        lists,
        businessId,
        uid,
        dispatchSet,
        computePriority,
        boardSvc,
        cardsMap,
        emailMap,
        members,
        membersMap,
        getMemberLevel,
        roles,
        businessOwnerUid
    ]);
    return { handleApplyOCRToBoard };
}