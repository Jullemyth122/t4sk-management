// ListColumn.jsx

// src/pages/dashboard/Bcomponent/ListColumn.jsx
import { useState, useMemo, useEffect } from 'react';
import CardItem from './CardItem';
import CreateTaskModal from './CreateTaskModal';

export default function ListColumn({
    boardId,
    list,
    lists,
    cards = [],
    allCards,  // all cards in this list (unfiltered) — used for progress calculation

    handleUpdateList,
    handleDeleteList,
    canEdit,
    cardEditing,
    cardDrafts,
    setCardDrafts,
    setCardEditing,
    handleUpdateCard,
    handleMoveCard,
    handleDeleteCard,
    handleSubmitCard,
    handleReviewAction,
    handleCreateCardForList,
    membersMap = {},
    emailMap = {},
    currentUserUid,
    currentUserEmail,

    // forwarded from BusinessDashboard
    reviewerOptions = null,
    reviewerOptionsSource = '',
    roles = [], // NEW: pass roles for level computation

    // Granular permissions (fallback to canEdit if not provided)
    canUpdateList,
    canDeleteList,
    canCreateCard,
    workloadMap,
    isOverloaded,
    businessOwnerUid,
    isPersonal = false,
    highlightCardIds,
    highlightColor,

    // NEW: Pagination props from dashboard
    loadMoreCards,
    resetLimitCards,
    cardsHasMoreMap,
    cardsLimitsMap = {},
    cardsBaseLimit = 3
}) {
    // resolve permissions
    const _canUpdateList = (canUpdateList !== undefined) ? canUpdateList : canEdit;
    const _canDeleteList = (canDeleteList !== undefined) ? canDeleteList : canEdit;
    const _canCreateCard = (canCreateCard !== undefined) ? canCreateCard : canEdit;
    const [confirmDelete, setConfirmDelete] = useState(false);

    // per-card expanded state (true => expanded/full details shown; false => collapsed compact)
    // key: card.id -> boolean
    const [expandedMap, setExpandedMap] = useState({});
    const [collapsed, setCollapsed] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false); // New Premium Modal State

    useEffect(() => {
        setCollapsed(false);
        setExpandedMap({}); // optional: reset per-card expansion when the list switches
    }, [list.id]);

    // Robust deduplication: resolve to member UID if possible, else use string.
    const uniqueAssignees = useMemo(() => {
        const raw = Array.isArray(list.assignees) ? list.assignees : [];
        const seen = new Set();
        const result = [];

        for (const a of raw) {
            if (!a) continue;
            const s = String(a).trim();
            // Exclude owner if present
            if (businessOwnerUid && s === String(businessOwnerUid)) continue;

            // Resolve to member
            let member = membersMap[s];
            if (!member && s.includes('@')) {
                member = emailMap[s.toLowerCase()];
            }

            // If found member, check if matches owner by UID or Email
            if (member && businessOwnerUid && String(member.uid || member.id) === String(businessOwnerUid)) continue;

            // Canonical ID (uid or normalized string)
            const canonical = member ? (member.uid || member.id) : (s.includes('@') ? s.toLowerCase() : s);

            if (!seen.has(canonical)) {
                seen.add(canonical);
                // Prefer passing the UID if we have a member, so downstream lookups work consistently
                result.push(canonical);
            }
        }
        return result;
    }, [list.assignees, membersMap, emailMap, businessOwnerUid]);

    const prettyAssignees = uniqueAssignees;

    function hashCode(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = (h << 5) - h + str.charCodeAt(i);
            h |= 0;
        }
        return Math.abs(h);
    }

    function makeInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    // NEW: recreate getMemberLevel (similar to BusinessDashboard)
    const getMemberLevel = (m) => {
        if (typeof m.level === 'number') return m.level;
        const roleFromList = (roles || []).find((r) => r.id === m.roleId || r.name === m.roleName);
        if (roleFromList && typeof roleFromList.level === 'number') return roleFromList.level;
        if (roleFromList && typeof roleFromList.priority === 'number') return roleFromList.priority;
        return 0;
    };

    const resolvedAssignees = prettyAssignees.map((a) => {
        const key = String(a);
        const user = (membersMap && membersMap[key]) || (emailMap && emailMap[key]) || null;
        const name = user?.displayName || user?.name || (key.includes('@') ? key.split('@')[0] : key);
        const email = user?.email || (key.includes('@') ? key : '');
        const initials = makeInitials(name || email || key);
        const hue = hashCode(name || email || key) % 360;
        return { key, name, email, initials, hue };
    });

    const visibleCount = 3;
    const visible = resolvedAssignees.slice(0, visibleCount);
    const moreCount = Math.max(0, resolvedAssignees.length - visibleCount);
    const fullTitle = resolvedAssignees.map((r) => (r.email ? `${r.name} <${r.email}>` : r.name)).join(', ');

    // compute aggregated list progress from ALL cards (not filtered)
    // This ensures every member sees the full project progress regardless of their card visibility
    const progressCards = allCards || cards;
    const listProgress = useMemo(() => {
        if (!Array.isArray(progressCards) || progressCards.length === 0) {
            if (list && Number.isFinite(Number(list.progress))) {
                return Math.max(0, Math.min(100, Math.round(Number(list.progress))));
            }
            return 0;
        }

        // ignore optimistic/temp cards
        const stableCards = (progressCards || []).filter(c => !(String(c.id || '').startsWith('tmp-')));
        if (stableCards.length === 0) return 0;

        // helper to get weight
        const getWeight = (c) => {
            // Fix: Only use contribution if it's > 0 (explicitly set). 
            // If contribution is 0 (default/unset), fallback to card.weight so we don't lose the planned weight.
            if (c.submission && typeof c.submission.contribution === 'number' && c.submission.contribution > 0) {
                return Math.max(0, Number(c.submission.contribution));
            }
            if (Number.isFinite(Number(c.weight))) return Math.max(0, Number(c.weight));
            return null; // explicit null
        };

        // helper to get progress (0.0 to 1.0)
        const getProgressRatio = (c) => {
        // 1. If 'done' or 'approved', it is 100% (1.0)
            const s = String(c.status || '').toLowerCase();
            const rs = String((c.submission && c.submission.reviewStatus) || '').toLowerCase();
            if (s === 'done' || rs === 'approved') return 1.0;

            // 2. Otherwise use c.progress (0-100)
            const p = Number(c.progress);
            if (Number.isFinite(p)) return Math.max(0, Math.min(100, p)) / 100.0;
            return 0;
        };

        const weightsRaw = stableCards.map(getWeight);
        const hasExplicit = weightsRaw.some(w => w !== null);

        // Calculate final weights
        let finalWeights = [];
        if (!hasExplicit) {
            // Equal weights if no explicit weights found
            const val = 1;
            finalWeights = stableCards.map(() => val);
        } else {
            // Fill nulls with avg of explicit ones, or 1
            const explicitVals = weightsRaw.filter(w => w !== null);
            const sumExplicitVals = explicitVals.reduce((a, b) => a + b, 0);
            const avg = explicitVals.length > 0 ? sumExplicitVals / explicitVals.length : 1;
            finalWeights = weightsRaw.map(w => (w !== null ? w : avg));
        }

        const totalWeight = finalWeights.reduce((a, b) => a + b, 0);
        if (totalWeight === 0) return 0;

        // Calculate weighted progress sum
        let weightedProgressSum = 0;
        stableCards.forEach((c, idx) => {
            const w = finalWeights[idx];
            const ratio = getProgressRatio(c);
            weightedProgressSum += (w * ratio);
        });

        // Determine mode: "Absolute" or "Relative"
        // If all cards have explicit weights and they sum to <= 100, treat as absolute percentages of the list.
        const allHaveExplicit = !weightsRaw.includes(null);
        if (allHaveExplicit && totalWeight <= 100) {
            return Math.round(weightedProgressSum);
        }

        // Relative mode (default): Scale result to 0-100 range based on total weight
        return Math.round((weightedProgressSum / totalWeight) * 100);

    }, [progressCards, list]);

    // === New: prevent creating a new card when listProgress >= 100
    const isListComplete = Number.isFinite(Number(listProgress)) && Number(listProgress) >= 100;

    // safe wrapper for creating a card: rejects if list is already 100%
    const safeCreateCardForList = async (cardData) => {
        if (isListComplete) {
            const err = new Error('Cannot create card: list already 100% complete');
            console.warn(err.message, { listId: list.id, listProgress });
            return Promise.reject(err);
        }
        if (!handleCreateCardForList) {
            console.warn('handleCreateCardForList not provided');
            return Promise.reject(new Error('handleCreateCardForList not provided'));
        }

        // compute explicit weight sum from existing stable cards (ignore tmp- optimistic cards)
        const stableCards = (cards || []).filter(c => !(String(c.id || '').startsWith('tmp-')));
        const extractWeight = (c) => {
            if (c.submission && typeof c.submission.contribution === 'number') return Math.max(0, Math.min(100, Math.round(c.submission.contribution)));
            if (Number.isFinite(Number(c.weight))) return Math.max(0, Math.min(100, Math.round(Number(c.weight))));
            return null;
        };
        const existingWeights = stableCards.map(extractWeight).filter(w => w !== null);
        const sumExisting = existingWeights.reduce((s, v) => s + v, 0);

        // new weight from the modal's cardData
        const parsedNewWeight = (cardData.weight !== undefined && cardData.weight !== '') ? Number(cardData.weight) : null;

        // if there are explicit weights and the creator supplied a new explicit weight -> validate sum <= 100
        if (parsedNewWeight !== null && !Number.isNaN(parsedNewWeight)) {
            const newW = Math.max(0, Math.min(100, Math.round(parsedNewWeight)));
            if (sumExisting + newW > 100) {
                const err = new Error(`Cannot create card: weight ${newW}% would make list total ${sumExisting + newW}% (>100%)`);
                console.warn(err.message, { listId: list.id, sumExisting, newW });
                return Promise.reject(err);
            }
        } else {
            // if no new weight provided but existing explicit sum already >= 100, block new card creation
            if (sumExisting >= 100) {
                const err = new Error(`Cannot create card: existing explicit contributions already total ${sumExisting}%`);
                console.warn(err.message, { listId: list.id, sumExisting });
                return Promise.reject(err);
            }
        }

        try {
            // Provide the cardOverride from the Modal so it completely replaces the newCardInputs dependency
            const res = handleCreateCardForList({
                listId: list.id,
                cardOverride: cardData
            });
            return Promise.resolve(res);
        } catch (err) {
            return Promise.reject(err);
        }
    };

    // === end guard

    // helpers used by edit UI (replaced rename with edit)
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(list.name);
    const [editAssignees, setEditAssignees] = useState(prettyAssignees);
    const [assigneeSearch, setAssigneeSearch] = useState('');

    const startEdit = () => {
        setEditing(true);
        setEditName(list.name);
        setEditAssignees(prettyAssignees);
        setAssigneeSearch('');
    };

    const cancelEdit = () => {
        setEditing(false);
        setEditName(list.name);
        setEditAssignees(prettyAssignees);
        setAssigneeSearch('');
    };

    const saveEdit = () => {
        handleUpdateList(list.boardId || boardId, list.id, { name: editName || list.name, assignees: editAssignees });
        setEditing(false);
    };

    const onDeleteConfirm = () => {
        if (!handleDeleteList) {
            console.warn('handleDeleteList not provided');
            setConfirmDelete(false);
            return;
        }
        handleDeleteList({ boardId: list.boardId || boardId, listId: list.id });
        setConfirmDelete(false);
    };

    // cards sorted by priorityRank (desc) then dueDate asc
    const sortedCards = (cards || [])
        .slice()
        .sort((a, b) => {
            const ra = Number(a.priorityRank ?? 0);
            const rb = Number(b.priorityRank ?? 0);
            if (rb !== ra) return rb - ra;
            const da = a.dueDate ? (a.dueDate.seconds ? a.dueDate.seconds * 1000 : new Date(a.dueDate).getTime()) : Infinity;
            const db = b.dueDate ? (b.dueDate.seconds ? b.dueDate.seconds * 1000 : new Date(b.dueDate).getTime()) : Infinity;
            return da - db;
        });

    // split into two groups: active (non-approved) and approved/done
    const activeCards = [];
    const approvedCards = [];
    for (const c of sortedCards) {
        const s = String(c.status || '').toLowerCase();
        const rs = String((c.submission && c.submission.reviewStatus) || '').toLowerCase();
        const doneish = s === 'done' || rs === 'approved';
        if (doneish) approvedCards.push(c);
        else activeCards.push(c);
    }

    // pagination state (per group)
    const [pageActive, setPageActive] = useState(1);
    const [pageApproved, setPageApproved] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const totalPagesActive = Math.max(1, Math.ceil(activeCards.length / pageSize));
    const totalPagesApproved = Math.max(1, Math.ceil(approvedCards.length / pageSize));

    useEffect(() => {
        if (pageActive > totalPagesActive) setPageActive(totalPagesActive);
    }, [totalPagesActive, pageActive]);

    useEffect(() => {
        if (pageApproved > totalPagesApproved) setPageApproved(totalPagesApproved);
    }, [totalPagesApproved, pageApproved]);

    const pagedActive = activeCards.slice((pageActive - 1) * pageSize, pageActive * pageSize);
    const pagedApproved = approvedCards.slice((pageApproved - 1) * pageSize, pageApproved * pageSize);

    // priority options for quick-add (use same labels as elsewhere)
    const priorityOptions = [
        { value: 'low', label: 'Easy' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'Hard' },
    ];


    // NEW: assignee candidates (low-level only: level <= 2)
    const assigneeCandidates = useMemo(() => {
        const q = (assigneeSearch || '').toLowerCase().trim();
        const candidates = [];
        Object.values(membersMap || {}).forEach((m) => {
            const uidKey = m.uid || m.id || null;
            if (businessOwnerUid && String(uidKey) === String(businessOwnerUid)) return; // Exclude owner

            const level = getMemberLevel(m);
            if (level > 2) return; // low-level only
            const name = m.name || m.displayName || '';
            const email = m.email || '';
            if (q && !(name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || String(uidKey).toLowerCase().includes(q))) return;
            candidates.push({ name, email, uid: uidKey });
        });
        return candidates;
    }, [assigneeSearch, membersMap, getMemberLevel]);

    // NEW: toggle assignee during edit
    const toggleEditAssignee = (value) => {
        if (!value) return;
        // If it looks like an email, normalize to lowercase. Otherwise keep as-is (UIDs)
        const isEmail = String(value).includes('@');
        const norm = isEmail ? String(value).toLowerCase() : String(value);
        setEditAssignees((prev) => {
            const copy = [...prev];
            const idx = copy.findIndex(x => x === norm);
            if (idx >= 0) copy.splice(idx, 1);
            else copy.push(norm);
            return copy;
        });
    };


    return (
        <div className={`list-col ${collapsed ? 'is-collapsed' : ''}`} role="region" aria-labelledby={`list-${list.id}-name`}>
            <div className="list-head">
                <div id={`list-${list.id}-name`} className="list-name">
                    {editing ? (
                        <input
                            className="list-name-input list-name-input-edit"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            aria-label="Edit list name"
                        />
                    ) : (
                        list.name
                    )}
                </div>

                {/* collapse control placed in header */}
                <div className="assignees-right" aria-hidden>
                    <button
                        type="button"
                        className={`list-collapse ${collapsed ? 'is-collapsed' : ''}`}
                        onClick={() => setCollapsed((s) => !s)}
                        aria-expanded={!collapsed}
                        title={collapsed ? 'Expand list' : 'Collapse list'}
                    >
                        <span aria-hidden>{collapsed ? '▸' : '▾'}</span>
                        <span className="list-collapse-text">{collapsed ? 'Show' : 'Collapse'}</span>
                    </button>
                </div>

                <div className="list-header-meta">
                    <div className="list-count">{(progressCards || []).length} cards</div>
                    <div style={{ minWidth: 140 }}>
                        <div className="list-progress-track">
                            <div
                                className="list-progress-fill"
                                style={{
                                    width: `${Math.max(0, Math.min(100, listProgress))}%`
                                }}
                            />
                        </div>
                        <div className="list-progress-text">{listProgress}% complete</div>
                    </div>
                </div>
            </div>

            {resolvedAssignees.length > 0 && (
                <div className="list-assignees" title={fullTitle}>
                    <div className="assignees-left">
                        <div className="assignees-chips" role="list">
                            {visible.map((a) => (
                                <div key={a.key} className="assignee-chip" role="listitem" title={a.email ? `${a.name} — ${a.email}` : a.name}>
                                    <span className="assignee-avatar" aria-hidden style={{ backgroundColor: `hsl(${a.hue} 60% 60%)` }}>
                                        {a.initials}
                                    </span>
                                    <span className="assignee-meta">
                                        <span className="assignee-name">{a.name}</span>
                                        {a.email ? <span className="assignee-email">{a.email}</span> : null}
                                        {isOverloaded && isOverloaded(a.key) && (
                                            <span className="assignee-overloaded" title="High Workload">🔥</span>
                                        )}
                                    </span>
                                </div>
                            ))}
                            {moreCount > 0 && (
                                <button
                                    type="button"
                                    className="assignee-more"
                                    aria-label={`Show ${moreCount} more assignees`}
                                    title={resolvedAssignees.slice(visibleCount).map((r) => (r.email ? `${r.name} <${r.email}>` : r.name)).join(', ')}
                                >
                                    +{moreCount}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {editing ? (
                <div className="list-actions">
                    <button className="action-btn action-primary" onClick={saveEdit} aria-label="Save list edit">
                        ✔ Save
                    </button>
                    <button className="action-btn action-ghost" onClick={cancelEdit} aria-label="Cancel edit">
                        ✕ Cancel
                    </button>
                </div>
            ) : (_canUpdateList || _canDeleteList) ? (
                <div className="list-actions">
                        {_canUpdateList && (
                            <button className="action-btn" onClick={startEdit} aria-label={`Edit list ${list.name}`}>
                                ✎ Edit
                            </button>
                        )}
                        {_canDeleteList && (
                            !confirmDelete ? (
                                <button
                                    className="action-btn action-danger"
                                    onClick={() => setConfirmDelete(true)}
                                    aria-haspopup="true"
                                    aria-expanded="false"
                                    aria-label={`Delete list ${list.name}`}
                                    title="Delete list"
                                >
                                    🗑 Delete
                                </button>
                            ) : (
                                <div className="action-confirm" role="dialog" aria-label="Confirm delete list">
                                    <span className="confirm-label">Delete?</span>
                                    <button className="action-btn action-danger" onClick={onDeleteConfirm} aria-label="Confirm delete">
                                        Delete
                                    </button>
                                    <button className="action-btn action-ghost" onClick={() => setConfirmDelete(false)} aria-label="Cancel delete">
                                        Cancel
                                    </button>
                                </div>
                                )
                    )}
                </div>
            ) : null}

            {editing && (
                <div className="edit-assignees-wrapper">
                    <label>Assign low-level members:</label>
                    <input
                        placeholder="Search low-level members..."
                        value={assigneeSearch}
                        className="assignee-search-input"
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                    />
                    <div className="assignee-dropdown">
                        {assigneeCandidates.map((cand) => {
                            const value = cand.uid || cand.email;
                            const checked = editAssignees.includes(value);
                            return (
                                <div
                                    key={value} onClick={() => toggleEditAssignee(value)}
                                    className="assignee-dropdown-item"
                                >
                                    <input type="checkbox" checked={checked} readOnly />
                                    {cand.name || cand.email}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!collapsed && (
                <>
                    <div className="active-group-header">
                        <div className="load-more-group">
                            {loadMoreCards && cardsHasMoreMap[list.id] && (
                                <button
                                    className="list-load-more-btn"
                                    onClick={() => loadMoreCards(list.id)}
                                >
                                    ↓ Load More Cards
                                </button>
                            )}
                            {resetLimitCards && (cardsLimitsMap[list.id] || cardsBaseLimit) > cardsBaseLimit && (
                                <button
                                    className="list-reset-btn"
                                    onClick={() => resetLimitCards(list.id)}
                                >
                                    ↑ Show Less
                                </button>
                            )}
                        </div>
                        <div className="group-header">
                            <strong>Active</strong>
                            <span>{activeCards.length} items</span>
                        </div>

                        <div className="cards cards-list">
                            {pagedActive.map((card) => (
                                <CardItem
                                    key={card.id}
                                    card={card}
                                    listId={list.id}
                                    lists={lists}
                                    cardEditing={cardEditing}
                                    cardDrafts={cardDrafts}
                                    setCardDrafts={setCardDrafts}
                                    setCardEditing={setCardEditing}
                                    handleUpdateCard={handleUpdateCard}
                                    handleMoveCard={handleMoveCard}
                                    handleDeleteCard={handleDeleteCard}
                                    handleSubmitCard={handleSubmitCard}
                                    handleReviewAction={handleReviewAction}
                                    canEdit={canEdit}
                                    membersMap={membersMap}
                                    emailMap={emailMap}
                                    currentUserUid={currentUserUid}
                                    currentUserEmail={currentUserEmail}
                                    listCardCount={(cards || []).length}
                                    reviewerOptions={reviewerOptions}
                                    reviewerOptionsSource={reviewerOptionsSource}
                                    workloadMap={workloadMap}
                                    isOverloaded={isOverloaded}
                                    businessOwnerUid={businessOwnerUid}
                                    isPersonal={isPersonal}
                                    compactExpanded={!!expandedMap[card.id]}
                                    setCompactExpanded={() => setExpandedMap((p) => ({ ...(p || {}), [card.id]: !p?.[card.id] }))}
                                    highlightColor={highlightCardIds && highlightCardIds.has(card.id) ? highlightColor : null}
                                    listAssignees={list.assignees}
                                />
                            ))}
                        </div>

                        {/* active pagination */}
                        {activeCards.length > 0 && (
                            <div className="pagination-wrapper">
                                <div className="pagination-controls">
                                    <button className="action-btn" onClick={() => setPageActive((p) => Math.max(1, p - 1))} disabled={pageActive === 1}>
                                        Prev
                                    </button>
                                    <div className="pagination-info">
                                        Page {pageActive} / {totalPagesActive}
                                    </div>
                                    <button className="action-btn" onClick={() => setPageActive((p) => Math.min(totalPagesActive, p + 1))} disabled={pageActive === totalPagesActive}>
                                        Next
                                    </button>
                                </div>

                                <div className="pagination-controls">
                                    <select
                                        className="pagination-select"
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setPageActive(1);
                                            setPageApproved(1);
                                        }}
                                        aria-label="Cards per page"
                                    >
                                        <option value={10}>10 / page</option>
                                        <option value={20}>20 / page</option>
                                        <option value={50}>50 / page</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Global Load More for this List (Firestore Subscription Limit) */}
                        {/* {(cards || []).length >= (cardsLimitsMap[list.id] || cardsBaseLimit) && (
                            <div className="list-load-more-container">
                                <button
                                    className="list-load-more-btn"
                                    onClick={() => loadMoreCards && loadMoreCards(list.id)}
                                >
                                    ↓ Load More Cards
                                </button>
                            </div>
                        )} */}
                    </div>

                    {/* APPROVED / COMPLETED group */}
                    {approvedCards.length > 0 && (
                        <div style={{ marginTop: 18 }}>
                            <div className="group-header">
                                <strong>Approved / Completed</strong>
                                <span>{approvedCards.length} items</span>
                            </div>

                            <div className="cards cards-list">
                                {pagedApproved.map((card) => (
                                    <CardItem
                                        key={card.id}
                                        card={card}
                                        listId={list.id}
                                        lists={lists}
                                        cardEditing={cardEditing}
                                        cardDrafts={cardDrafts}
                                        setCardDrafts={setCardDrafts}
                                        setCardEditing={setCardEditing}
                                        handleUpdateCard={handleUpdateCard}
                                        handleMoveCard={handleMoveCard}
                                        handleDeleteCard={handleDeleteCard}
                                        handleSubmitCard={handleSubmitCard}
                                        handleReviewAction={handleReviewAction}
                                        canEdit={canEdit}
                                        membersMap={membersMap}
                                        emailMap={emailMap}
                                        currentUserUid={currentUserUid}
                                        currentUserEmail={currentUserEmail}
                                        listCardCount={(cards || []).length}
                                        reviewerOptions={reviewerOptions}
                                        reviewerOptionsSource={reviewerOptionsSource}
                                        workloadMap={workloadMap}
                                        isOverloaded={isOverloaded}
                                        compactExpanded={!!expandedMap[card.id]}
                                        setCompactExpanded={() => setExpandedMap((p) => ({ ...(p || {}), [card.id]: !p?.[card.id] }))}
                                        businessOwnerUid={businessOwnerUid}
                                        highlightColor={highlightCardIds && highlightCardIds.has(card.id) ? highlightColor : null}
                                        listAssignees={list.assignees}
                                    />
                                ))}
                            </div>

                            {/* approved pagination */}
                            <div className="pagination-wrapper">
                                <div className="pagination-controls">
                                    <button className="action-btn" onClick={() => setPageApproved((p) => Math.max(1, p - 1))} disabled={pageApproved === 1}>
                                        Prev
                                    </button>
                                    <div className="pagination-info">
                                        Page {pageApproved} / {totalPagesApproved}
                                    </div>
                                    <button className="action-btn" onClick={() => setPageApproved((p) => Math.min(totalPagesApproved, p + 1))} disabled={pageApproved === totalPagesApproved}>
                                        Next
                                    </button>
                                </div>

                                <div className="pagination-controls">
                                    <div className="pagination-info">{approvedCards.length} items</div>
                                    {/* pageSize control shared above already */}
                                </div>
                            </div>
                        </div>
                    )}

                    {_canCreateCard && (
                        <div className={`quick-add-wrapper ${isListComplete ? ' disabled' : ''}`} style={{ marginTop: '1rem' }}>
                            <button
                                className="action-btn action-primary"
                                onClick={() => setShowCreateModal(true)}
                                disabled={isListComplete}
                                style={{
                                    width: '100%',
                                    justifyContent: 'center',
                                    padding: '12px', /* Taller, more click area */
                                    fontSize: '0.95rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <span style={{ fontSize: '1.2rem', lineHeight: '1', fontWeight: 'bold' }}>+</span>
                                Add Task
                            </button>

                            <CreateTaskModal
                                isOpen={showCreateModal}
                                onClose={() => setShowCreateModal(false)}
                                listName={list.name}
                                isLocked={isListComplete}
                                onCreate={async (cardData) => {
                                    await safeCreateCardForList(cardData);
                                }}
                            />
                        </div>
                    )}

                            {isListComplete && (
                                <div className="list-complete-msg">
                            This list is 100% complete — new card creation is disabled.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
