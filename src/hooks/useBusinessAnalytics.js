import { useState, useEffect, useMemo } from 'react';
import { collectionGroup, query, where, getDocs, collection } from 'firebase/firestore';
import { db } from '../config/firebase';

export function useBusinessAnalytics(businessId) {
    const [loading, setLoading] = useState(true);
    const [cards, setCards] = useState([]);
    const [members, setMembers] = useState([]);
    const [lists, setLists] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!businessId) return;

        let cancelled = false;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // FETCHING STRATEGY: Iterative (Waterfall)
                // Reason: 'cards' are subcollections deeply nested and might not have 'businessId' field on them 
                // for historical data, which breaks collectionGroup queries. 
                // Also avoids the need for a composite index.

                // 1. Fetch Boards
                const boardsRef = collection(db, 'businesses', businessId, 'boards');
                const boardsSnap = await getDocs(boardsRef);
                const boardIds = boardsSnap.docs.map(d => d.id);

                // 2. Fetch Lists for ALL boards
                const listPromises = boardIds.map(bid => 
                    getDocs(collection(db, 'businesses', businessId, 'boards', bid, 'lists'))
                );
                const listsSnaps = await Promise.all(listPromises);

                const listRefs = [];
                const listBoardIds = []; // Parallel array for board IDs
                listsSnaps.forEach((snap, i) => {
                    const bId = boardIds[i];
                    snap.docs.forEach(doc => {
                        // Store ref to fetch cards later
                        listRefs.push(doc.ref);
                        listBoardIds.push(bId);
                    });
                });

                // 3. Fetch Cards for ALL lists
                const cardPromises = listRefs.map(ref => getDocs(collection(ref, 'cards')));
                const cardsSnaps = await Promise.all(cardPromises);

                const loadedCards = [];
                cardsSnaps.forEach((snap, i) => {
                    const bId = listBoardIds[i]; // Corresponding board ID
                    snap.docs.forEach(doc => {
                        loadedCards.push({ id: doc.id, ...doc.data(), boardId: bId });
                    });
                });

                // 4. Fetch Members
                const membersQ = query(collection(db, 'businesses', businessId, 'members'));
                const membersSnap = await getDocs(membersQ);
                const loadedMembers = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                if (cancelled) return;

                setCards(loadedCards);
                setMembers(loadedMembers);
                
            } catch (err) {
                console.error("Error fetching analytics:", err);
                if (cancelled) return;
                setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();

        return () => { cancelled = true; };
    }, [businessId]);

    // Computed Advanced Analytics
    const analytics = useMemo(() => {
        if (loading || !cards.length) return null;

        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;

        // --- Data Structures ---
        let totalWeightedEffort = 0;
        let completedWeightedEffort = 0;
        let highRiskTasks = 0;
        let reviewBottlenecks = 0;
        const bottleneckCardIds = [];
        const highRiskCardIds = [];
        let bottleneckBoardId = null;
        let highRiskBoardId = null;
        
        const memberStats = {}; // uid -> { name, tasks, effort, complexity, completed, late, role }
        const riskDistribution = { low: 0, medium: 0, high: 0, critical: 0 };
        const statusBreakdown = {};
        const reviewFunnel = { pending: 0, approved: 0, rejected: 0, changesRequested: 0 };

        // Helper: safe date parsing
        const getDate = (d) => d?.toDate ? d.toDate() : (d ? new Date(d) : null);

        // --- Loop Cards ---
        cards.forEach(c => {
            // 1. Basic Props
            const status = (c.status || 'todo').toLowerCase();
            const priority = (c.priority || 'medium').toLowerCase();
            const effort = Number(c.effort) || 1;
            const complexity = c.complexity === 'hard' ? 3 : (c.complexity === 'medium' ? 2 : 1);
            const weight = effort * complexity; // Weighted Workload
            const progress = Number(c.progress || 0);
            const dueDate = getDate(c.dueDate);
            
            // 2. Aggregate Totals
            statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
            totalWeightedEffort += weight;
            if (status === 'done' || status === 'completed') {
                completedWeightedEffort += weight;
            }

            // 3. Risk Calculation
            let riskLevel = 'low';
            if (status !== 'done') {
                if (dueDate && dueDate < now) {
                    riskLevel = 'critical'; // Overdue
                } else if (priority === 'high' && progress < 20) {
                    riskLevel = 'high'; // Stagnant High Priority
                } else if (c.dependencies && c.dependencies.length > 0) {
                     // Simple check: if has dependencies and not started
                    if (progress === 0) riskLevel = 'medium';
                }
            }
            riskDistribution[riskLevel]++;
            if (riskLevel === 'high' || riskLevel === 'critical') {
                highRiskTasks++;
                highRiskCardIds.push(c.id);
                if (!highRiskBoardId && c.boardId) highRiskBoardId = c.boardId;
            }

            // 4. Submission / Review Analysis
            if (c.submission) {
                const subStatus = (c.submission.reviewStatus || 'pending').toLowerCase();
                reviewFunnel[subStatus] = (reviewFunnel[subStatus] || 0) + 1;
                
                if (subStatus === 'pending') {
                    const submittedAt = getDate(c.submission.createdAt || c.submittedAt);
                    if (submittedAt && (now - submittedAt) > (2 * oneDay)) {
                        reviewBottlenecks++;
                        bottleneckCardIds.push(c.id);
                        if (!bottleneckBoardId && c.boardId) bottleneckBoardId = c.boardId;
                    }
                }
            } else if (status === 'review' || status === 'pending') {
                 // Manual status check if submission object missing
                 // Check last updated
                 const updatedAt = getDate(c.updatedAt);
                 if (updatedAt && (now - updatedAt) > (3 * oneDay)) {
                     reviewBottlenecks++;
                     bottleneckCardIds.push(c.id);
                     if (!bottleneckBoardId && c.boardId) bottleneckBoardId = c.boardId;
                 }
            }

            // 5. Member Stats
            const assignees = Array.isArray(c.assignees) ? c.assignees : [];
            assignees.forEach(uid => {
                const strUid = String(uid);
                if (!memberStats[strUid]) {
                    const m = members.find(mem => String(mem.uid || mem.id) === strUid);
                    memberStats[strUid] = { 
                        name: m?.name || m?.email || 'Unknown', 
                        tasks: 0, 
                        weightedLoad: 0, 
                        highPriority: 0,
                        completed: 0,
                        // Performance Metrics
                        onTimeCount: 0,
                        totalDurationDays: 0,
                        weightedCompleted: 0
                    };
                }
                const stats = memberStats[strUid];
                stats.tasks++;
                stats.weightedLoad += weight;
                if (priority === 'high') stats.highPriority++;
                
                if (status === 'done' || status === 'completed') {
                    stats.completed++;
                    stats.weightedCompleted += weight;

                    // Reliability (On Time)
                    const completedAt = getDate(c.completedAt || c.updatedAt);
                    // If no due date, we consider it 'on time' or ignored. Let's ignore tasks without due dates for reliability score.
                    if (dueDate && completedAt) {
                         if (completedAt <= dueDate) stats.onTimeCount++;
                    } else if (!dueDate) {
                        // If no due date, count as on time for now, or just don't penalize?
                        // Let's count it to keep the ratio valid against "total completed".
                        stats.onTimeCount++;
                    }

                    // Efficiency (Speed)
                    // Duration = CompletedAt - (StartDate || CreatedAt)
                    const start = getDate(c.startDate || c.createdAt);
                    if (start && completedAt) {
                        let days = (completedAt - start) / oneDay;
                        if (days < 0.1) days = 0.1; // Minimum duration
                        stats.totalDurationDays += days;
                    }
                }
            });
        });

        // --- Derived Metrics ---
        const completionRate = totalWeightedEffort ? Math.round((completedWeightedEffort / totalWeightedEffort) * 100) : 0;
        
        // Project Health Score (0-100)
        // Starts at 100, penalized by risks and bottlenecks
        let healthScore = 100;
        healthScore -= (highRiskTasks * 5); // -5 per critical/high risk task
        healthScore -= (reviewBottlenecks * 3); // -3 per stuck review
        if (completionRate < 20 && totalWeightedEffort > 50) healthScore -= 10; // Low velocity penalty
        healthScore = Math.max(0, healthScore);

        // Sort Members by Workload and Calculate Performance
        const workloadData = Object.values(memberStats)
            .map(m => {
                // Reliability %
                const reliability = m.completed > 0 ? Math.round((m.onTimeCount / m.completed) * 100) : 100;
                
                // Efficiency (Points per Day)
                // Avoid division by zero
                const speed = m.totalDurationDays > 0 ? (m.weightedCompleted / m.totalDurationDays).toFixed(1) : "0.0";
                
                return { ...m, reliability, speed: Number(speed) };
            })
            .sort((a,b) => b.weightedLoad - a.weightedLoad)
            .slice(0, 10);

        // --- Qualitative Insights Generation ---
        const insights = [];

        // 1. Health Alert
        if (healthScore < 60) {
            insights.push({
                type: 'critical',
                title: 'Project Health Critical',
                message: `Health Score is ${healthScore}/100. ${highRiskTasks} tasks are High Risk or Overdue. Immediate triage required.`,
                action: 'Review "Critical" tasks in the board view.',
                cardIds: highRiskCardIds,
                boardId: highRiskBoardId
            });
        }

        // 2. Bottleneck Alert
        if (reviewBottlenecks > 0) {
            insights.push({
                type: 'warning',
                title: 'Review Process Stalled',
                message: `${reviewBottlenecks} tasks have been stuck in review for over 48h. This is impacting velocity.`,
                action: 'Ping reviewers or re-assign review ownership.',
                cardIds: bottleneckCardIds,
                boardId: bottleneckBoardId
            });
        }

        // 3. Workload Balance
        const avgLoad = workloadData.reduce((acc, curr) => acc + curr.weightedLoad, 0) / (workloadData.length || 1);
        const overloaded = workloadData.filter(m => m.weightedLoad > (avgLoad * 1.5));
        if (overloaded.length > 0) {
             insights.push({
                type: 'info',
                title: 'Resource Allocation Imbalance',
                message: `${overloaded.map(m => m.name).join(', ')} have significantly higher weighted workload than peers.`,
                action: 'Consider re-distributing intricate tasks.'
            });
        }

        // 4. Positive Reinforcement
        if (completionRate > 80) {
            insights.push({
                type: 'success',
                title: 'Excellent Velocity',
                message: `Team has completed ${completionRate}% of weighted effort. Project is on track for delivery.`,
                action: 'Celebrate with the team!'
            });
        }

        return {
            totalTasks: cards.length,
            healthScore,
            completionRate,
            highRiskTasks,
            reviewBottlenecks,
            workloadData,
            statusData: Object.entries(statusBreakdown).map(([k,v]) => ({ name: k, value: v })),
            riskData: Object.entries(riskDistribution).map(([k,v]) => ({ name: k, value: v })),
            insights
        };

    }, [cards, members, loading]);

    return { loading, error, ...analytics };
}
