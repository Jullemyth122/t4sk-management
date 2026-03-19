import { useCallback, useState, useEffect, useRef } from "react";
import { generateBoardLayout } from "../../config/ocr";
import { createBoard, createList, createCard } from "../../services/boardService";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import { db } from "../../config/firebase";

export function usePersonalGenerativeBoard(props) {
    const depsRef = useRef(props);
    depsRef.current = props;
    const { uid } = props;
    const [aiGenerating, setAiGenerating] = useState(false);
    const [genProgressText, setGenProgressText] = useState("");
    const [aiUsageCount, setAiUsageCount] = useState(0);

    // For personal, we can just give a generous limit for now, or match business unlimited if possible
    // Let's assume everyone has a personal limit or unlimited for now. 
    // We'll give a free limit of 3 for personal, or unlimited if they have a premium plan
    const isUnlimited = true; // simplifying for personal
    const limitMax = 3;

    useEffect(() => {
        if (!uid) return;
        let isMounted = true;

        const fetchUsage = async () => {
            try {
                const ref = doc(db, 'users', uid, 'usage', 'aiBoard');
                const snap = await getDoc(ref);
                if (isMounted && snap.exists()) {
                    setAiUsageCount(snap.data().count || 0);
                }
            } catch (e) {
                console.error("Failed to fetch AI usage count", e);
            }
        };

        fetchUsage();
        return () => { isMounted = false; };
    }, [uid]);

    const handleGenerateBoard = useCallback(async (prompt) => {
        const { uid, currentUserEmail, dispatchSet } = depsRef.current;
        if (!uid) return dispatchSet('uiError', 'Please log in to use AI generation.');
        if (!prompt || prompt.trim().length < 5) return dispatchSet('uiError', 'Please provide a more descriptive prompt.');
        if (!isUnlimited && aiUsageCount >= limitMax) {
            return dispatchSet('uiError', 'You have reached your free generation limit.');
        }

        setAiGenerating(true);
        setGenProgressText("Consulting Co-Pilot...");

        try {
            const candidateEmails = currentUserEmail ? [currentUserEmail] : [];
            const aiData = await generateBoardLayout(prompt, candidateEmails);
            
            aiData.lists = Array.isArray(aiData.lists) ? aiData.lists : [];
            
            const now = new Date();
            const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const nextWeekStr = new Date(nextWeek.getTime() - nextWeek.getTimezoneOffset() * 60000).toISOString().split('T')[0];

            aiData.lists.forEach(l => {
                l.cards = Array.isArray(l.cards) ? l.cards : [];
                l.cards.forEach(c => {
                    if (!c.startDate) c.startDate = todayStr;
                    if (!c.dueDate) c.dueDate = nextWeekStr;
                });
            });
            
            setGenProgressText("");
            setAiGenerating(false);

            dispatchSet('aiResult', aiData);
            dispatchSet('aiVerificationOpen', true);

            return aiData;

        } catch (e) {
            console.error("AI Generation failed", e);
            dispatchSet('uiError', 'AI failed to generate board. Please try again.');
            setAiGenerating(false);
            setGenProgressText("");
            return null;
        }
    }, [isUnlimited, aiUsageCount]);

    const [aiApplying, setAiApplying] = useState(false);

    const handleApplyAIToBoard = useCallback(async (aiResult) => {
        const { uid, dispatchSet, currentUserEmail } = depsRef.current;
        if (!aiResult) return;
        setAiApplying(true);
        try {
            const boardName = aiResult.boardName || "AI Generated Board";
            const newBoard = await createBoard({
                uid,
                name: boardName,
                description: `AI Generated Board`
            });

            try {
                const usageRef = doc(db, 'users', uid, 'usage', 'aiBoard');
                await setDoc(usageRef, { count: increment(1) }, { merge: true });
                setAiUsageCount(prev => prev + 1);
            } catch (usageErr) {
                console.error("Failed to increment AI usage count", usageErr);
            }

            const aiLists = Array.isArray(aiResult.lists) ? aiResult.lists : [];

            for (let i = 0; i < aiLists.length; i++) {
                const lData = aiLists[i];
                const aiCards = Array.isArray(lData.cards) ? lData.cards : [];

                const newList = await createList({
                    uid,
                    boardId: newBoard.id,
                    name: lData.name || `List ${i + 1}`,
                    position: i,
                    assignees: []
                });

                for (let j = 0; j < aiCards.length; j++) {
                    const cData = aiCards[j];
                    const priorityScale = cData.priorityScale || 'medium';
                    const priorityRank =
                        priorityScale === 'high'   ? 3 :
                        priorityScale === 'medium' ? 2 :
                        priorityScale === 'low'    ? 1 : 0;

                    const cardPayload = {
                        title: cData.title || 'Task',
                        description: cData.description || '',
                        priority: String(priorityScale).toLowerCase(),
                        priorityRank,
                        effort: cData.effort || 3,
                        startDate: cData.startDate ? new Date(cData.startDate) : null,
                        dueDate: cData.dueDate ? new Date(cData.dueDate) : null,
                        subtasks: Array.isArray(cData.subtasks) ? cData.subtasks : [],
                        assignees: currentUserEmail ? [uid] : [], // Just assign to current user
                        status: 'todo',
                        createdAt: new Date(),
                        createdBy: uid
                    };

                    await createCard({
                        uid,
                        boardId: newBoard.id,
                        listId: newList.id,
                        card: cardPayload
                    });
                }
            }

            dispatchSet('aiResult', null);
            dispatchSet('aiVerificationOpen', false);
            dispatchSet('selectedBoardId', newBoard.id);
        } catch (e) {
            console.error("AI Apply failed", e);
            dispatchSet('uiError', 'Failed to save generated board.');
        } finally {
            setAiApplying(false);
        }
    }, []);

    return {
        aiGenerating,
        genProgressText,
        aiUsageCount,
        isGenUnlimited: isUnlimited,
        genLimitMax: limitMax,
        handleGenerateBoard,
        handleApplyAIToBoard,
        aiApplying
    };
}
