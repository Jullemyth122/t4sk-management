import { useCallback, useRef } from "react";
import { clampInt, deriveListName, inferDueDateFromItem, normalizeToTargetSum, parseISODateToDate, autoBalanceSubtaskList } from "../../utils/dashboardUtils";
import * as boardSvc from '../../services/boardService'
import { db } from "../../config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { computePriority } from "../../utils/prioritization";

export function usePersonalApplyOCR(props) {
    const depsRef = useRef(props);
    depsRef.current = props;
    const snapshotRef = useRef({});

    const handleApplyOCRToBoard = useCallback(async () => {
        const { selectedBoardId, ocrResult, lists, uid, dispatchSet, cardsMap } = depsRef.current;

        if (!selectedBoardId) return dispatchSet('uiError', 'Select a board to import into.');
        if (!ocrResult) return dispatchSet('uiError', 'No OCR data to import.');

        dispatchSet('uiError', '');
        dispatchSet('loading', true);

        // --- 1. Prepare Data Logic ---
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

                dispatchSet('lists', (prev) => [...(prev || []), tempList]);
                
                const created = await boardSvc.createList({
                    uid,
                    boardId: selectedBoardId,
                    name: listName,
                    position,
                    assignees: [] 
                });

                const listId = created.id || created._id || created.listId || null;
                if (!listId) throw new Error('Create list returned invalid result (no id)');
                
                dispatchSet('lists', (prev) => (prev || []).map(l => l.id === tempListId ? created : l));
                
                const toCreate = items.slice(0, 200);

                const rawScores = toCreate.map((it) => {
                     if (typeof it.weight === 'number') return Math.max(0, it.weight);
                     const effort = (typeof it.effort === 'number') ? Math.max(1, Math.min(10, Math.round(it.effort))) : null;
                     const ps = it.priorityScale ? String(it.priorityScale).toLowerCase() : null;
                     const priorityMultiplier = ps === 'high' || ps === 'hard' ? 1.4 : (ps === 'medium' ? 1.0 : (ps === 'easy' ? 0.8 : 1.0));
                     if (effort !== null) return effort * priorityMultiplier;
                     return 3 * priorityMultiplier; 
                });
                
                const normalized = normalizeToTargetSum(rawScores, 100);
                
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

                     const ps = item.priorityScale ? String(item.priorityScale).toLowerCase() : null;
                     let priorityLabel = (item.priority && typeof item.priority === 'string') ? String(item.priority).toLowerCase() : null;
                     if (!priorityLabel) {
                         if (w >= 70) priorityLabel = 'high';
                         else if (w >= 40) priorityLabel = 'medium';
                         else priorityLabel = 'low';
                     }
                     const cp = typeof computePriority === 'function' ? computePriority({ dueDate, priorityLabel, effort: effortVal, title, description }) : { priorityLabel: priorityLabel || 'medium', priorityRank: 50 };

                     // In personal mode, all imported cards simply belong to the user
                     const finalAssignees = [uid];

                     const tempCardId = `tmp-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                     const cardData = {
                        title, description, assignees: finalAssignees, 
                        labels: item.labels || [], priority: cp.priorityLabel, priorityRank: cp.priorityRank,
                        status: 'todo', dueDate, startDate: item.startDate || null,
                        effort: effortVal, weight: w, subtasks: autoBalanceSubtaskList(item.subtasks || []),
                        createdAt: new Date(), createdBy: uid
                     };
                     
                     dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: [ { ...cardData, id: tempCardId }, ...((prev && prev[listId]) || [])] }));

                     try {
                        const createdCard = await boardSvc.createCard({ uid, boardId: selectedBoardId, listId, card: cardData });
                         if (createdCard && createdCard.id) {
                            dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: (prev[listId] || []).map(c => c.id === tempCardId ? createdCard : c) }));
                         }
                     } catch(e) {
                         console.error("Card create failed", e);
                         dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: (prev[listId] || []).filter(c => c.id !== tempCardId) }));
                     }
                }
                
                totalTasksCreated += toCreate.length;

            }

        } catch (err) {
            console.error('Failed to import OCR list(s)', err);
            dispatchSet('uiError', err?.message || 'Failed to import OCR results.');
        } finally {
            dispatchSet('loading', false);
        }
    }, []);

    return { handleApplyOCRToBoard };
}
