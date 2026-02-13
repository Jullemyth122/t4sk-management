// ListColumn.jsx

// src/pages/dashboard/Bcomponent/ListColumn.jsx
import React, { useState, useMemo, useEffect } from 'react';
import CardItem from './CardItem';
import CustomSelect from './CustomSelect';
import { getProjectedWeight, validateTotalWeight } from '../utils/subtaskUtils';

export default function ListColumn({
    boardId,
    list,
    lists,
    cards = [],
    listNameEditing,
    listNameDrafts,
    setListNameDrafts,
    setListNameEditing,
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
    newCardInputs,
    setNewCardInputs,
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

    // compute aggregated list progress: prefer explicit list.progress ONLY if no cards
    const listProgress = useMemo(() => {
        if (!Array.isArray(cards) || cards.length === 0) {
            if (list && Number.isFinite(Number(list.progress))) {
                return Math.max(0, Math.min(100, Math.round(Number(list.progress))));
            }
            return 0;
        }

        // ignore optimistic/temp cards
        const stableCards = (cards || []).filter(c => !(String(c.id || '').startsWith('tmp-')));
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

    }, [cards, list]);

    // === New: prevent creating a new card when listProgress >= 100
    const isListComplete = Number.isFinite(Number(listProgress)) && Number(listProgress) >= 100;

    // safe wrapper for creating a card: rejects if list is already 100%
    const safeCreateCardForList = async (listId) => {
        if (isListComplete) {
            const err = new Error('Cannot create card: list already 100% complete');
            console.warn(err.message, { listId, listProgress });
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

        // new weight from quick-add inputs (may be empty)
        const newInputs = newCardInputs[listId] || {};
        const rawNewWeight = newInputs.weight;
        const parsedNewWeight = (rawNewWeight !== undefined && rawNewWeight !== '') ? Number(rawNewWeight) : null;

        // if there are explicit weights and the creator supplied a new explicit weight -> validate sum <= 100
        if (parsedNewWeight !== null && !Number.isNaN(parsedNewWeight)) {
            const newW = Math.max(0, Math.min(100, Math.round(parsedNewWeight)));
            if (sumExisting + newW > 100) {
                const err = new Error(`Cannot create card: weight ${newW}% would make list total ${sumExisting + newW}% (>100%)`);
                console.warn(err.message, { listId, sumExisting, newW });
                return Promise.reject(err);
            }
        } else {
            // if no new weight provided but existing explicit sum already >= 100, block new card creation
            if (sumExisting >= 100) {
                const err = new Error(`Cannot create card: existing explicit contributions already total ${sumExisting}%`);
                console.warn(err.message, { listId, sumExisting });
                return Promise.reject(err);
            }
        }

        try {
            const res = handleCreateCardForList(listId);
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
                            className="list-name-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            aria-label="Edit list name"
                            style={{ background:'var(--bd-inp_list)', padding:'5px' }}
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
                        <span style={{ marginLeft: 6, fontWeight: 700 }}>{collapsed ? 'Show' : 'Collapse'}</span>
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="list-count">{(cards || []).length} cards</div>
                    <div style={{ minWidth: 140 }}>
                        <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 6, overflow: 'hidden' }}>
                            <div
                                style={{
                                    width: `${Math.max(0, Math.min(100, listProgress))}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg,#4caf50,#8bc34a)',
                                }}
                            />
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--sidenav-ISO)', marginTop: 6 }}>{listProgress}% complete</div>
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
                                            <span style={{ marginLeft: 6, fontSize: '0.8em' }} title="High Workload">🔥</span>
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
                <div style={{ marginTop: 12, position:'relative' }}>
                    <label>Assign low-level members:</label>
                    <input
                        placeholder="Search low-level members..."
                        value={assigneeSearch}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'var(--bd-inp_list)' }}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                    />
                    <div style={{
                        position: 'absolute',
                        zIndex: 200,
                        left: 0,
                        right: 0,
                        marginTop: 6,
                        background: 'var(--task-modalBG)',
                        border: '1px solid rgba(0,0,0,0.06)',
                        borderRadius: 8,
                        maxHeight: 220,
                        overflow: 'auto',
                        padding: 8,
                    }}>
                        {assigneeCandidates.map((cand) => {
                            const value = cand.uid || cand.email;
                            const checked = editAssignees.includes(value);
                            return (
                                <div
                                    key={value} onClick={() => toggleEditAssignee(value)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '6px 8px',
                                        borderRadius: 6,
                                        cursor: 'pointer'
                                    }}
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
                    <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                            <strong>Active</strong>
                            <span style={{ fontSize: 12, color: 'var(--sidenav-ISO)' }}>{activeCards.length} items</span>
                        </div>

                        <div className="cards" style={{ marginTop: 8 }}>
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
                                    compactExpanded={!!expandedMap[card.id]}
                                    setCompactExpanded={() => setExpandedMap((p) => ({ ...(p || {}), [card.id]: !p?.[card.id] }))}
                                />
                            ))}
                        </div>

                        {/* active pagination */}
                        {activeCards.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button className="action-btn" onClick={() => setPageActive((p) => Math.max(1, p - 1))} disabled={pageActive === 1}>
                                        Prev
                                    </button>
                                    <div style={{ fontSize: 13, color: 'var(--sidenav-ISO)' }}>
                                        Page {pageActive} / {totalPagesActive}
                                    </div>
                                    <button className="action-btn" onClick={() => setPageActive((p) => Math.min(totalPagesActive, p + 1))} disabled={pageActive === totalPagesActive}>
                                        Next
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <div style={{ fontSize: 13, color: 'var(--sidenav-ISO)' }}>{activeCards.length} items</div>
                                    <select
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
                    </div>

                    {/* APPROVED / COMPLETED group */}
                    {approvedCards.length > 0 && (
                        <div style={{ marginTop: 18 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                <strong>Approved / Completed</strong>
                                <span style={{ fontSize: 12, color: 'var(--sidenav-ISO)' }}>{approvedCards.length} items</span>
                            </div>

                            <div className="cards" style={{ marginTop: 8 }}>
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
                                    />
                                ))}
                            </div>

                            {/* approved pagination */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button className="action-btn" onClick={() => setPageApproved((p) => Math.max(1, p - 1))} disabled={pageApproved === 1}>
                                        Prev
                                    </button>
                                    <div style={{ fontSize: 13, color: 'var(--sidenav-ISO)' }}>
                                        Page {pageApproved} / {totalPagesApproved}
                                    </div>
                                    <button className="action-btn" onClick={() => setPageApproved((p) => Math.min(totalPagesApproved, p + 1))} disabled={pageApproved === totalPagesApproved}>
                                        Next
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <div style={{ fontSize: 13, color: 'var(--sidenav-ISO)' }}>{approvedCards.length} items</div>
                                    {/* pageSize control shared above already */}
                                </div>
                            </div>
                        </div>
                    )}

                    {_canCreateCard && (
                        // quick-add: disabled when listProgress >= 100
                        <div className={`quick-add${isListComplete ? ' disabled' : ''}`} style={{ marginTop: 14 }}>
                            <input
                                placeholder="Title"
                                value={(newCardInputs[list.id] || {}).title || ''}
                                onChange={(e) => setNewCardInputs((p) => ({ ...p, [list.id]: { ...(p[list.id] || {}), title: e.target.value } }))}
                            />
                            <div className="quick-meta-row">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <label style={{ fontSize: '0.65rem', color: 'var(--sidenav-ISO)', textTransform: 'uppercase' }}>Start</label>
                                    <input
                                        type="date"
                                        title="Start Date"
                                        value={(newCardInputs[list.id] || {}).startDate || ''}
                                        onChange={(e) => setNewCardInputs((p) => ({ ...p, [list.id]: { ...(p[list.id] || {}), startDate: e.target.value } }))}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <label style={{ fontSize: '0.65rem', color: 'var(--sidenav-ISO)', textTransform: 'uppercase' }}>Due</label>
                                    <input
                                        type="date"
                                        title="Due Date"
                                        value={(newCardInputs[list.id] || {}).dueDate || ''}
                                        onChange={(e) => setNewCardInputs((p) => ({ ...p, [list.id]: { ...(p[list.id] || {}), dueDate: e.target.value } }))}
                                    />
                                </div>

                                {/* Priority selector replaced with CustomSelect */}
                                <div style={{ minWidth: 120, flex: 1 }}>
                                    <label style={{ fontSize: '0.65rem', color: 'var(--sidenav-ISO)', textTransform: 'uppercase', display: 'block' }}>Priority</label>
                                    <CustomSelect
                                        options={priorityOptions}
                                        value={(newCardInputs[list.id] || {}).priority ?? 'medium'}
                                        onChange={(val) => setNewCardInputs((p) => ({ ...p, [list.id]: { ...(p[list.id] || {}), priority: val } }))}
                                        placeholder="Priority"
                                        searchable={false}
                                        ariaLabel="Card priority"
                                        width="100%"
                                        // Some CustomSelect implementations ignore `disabled`, so also prevent pointer events when list is complete
                                        style={isListComplete ? { pointerEvents: 'none' } : undefined}
                                    />
                                </div>

                                {/* Optional: weight (contribution to list total) */}
                                <div style={{ width: 80 }}>
                                    <label style={{ fontSize: '0.65rem', color: 'var(--sidenav-ISO)', textTransform: 'uppercase' }}>Weight %</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="%"
                                        className="weight-input"
                                        value={(newCardInputs[list.id] || {}).weight ?? ''}
                                        onChange={(e) => setNewCardInputs((p) => ({ ...p, [list.id]: { ...(p[list.id] || {}), weight: e.target.value } }))}
                                        aria-label="Card weight"
                                    />
                                </div>
                            </div>

                            <div className="quick-actions">
                                <button
                                    onClick={async () => {
                                        try {
                                            await safeCreateCardForList(list.id);
                                            // clear quick-add on success
                                            setNewCardInputs((p) => ({ ...p, [list.id]: { title: '', startDate: '', dueDate: '', effort: 3, priority: 'medium', weight: '' } }));
                                        } catch (err) {
                                            // user-visible feedback when blocked (or handler failed)
                                            try {
                                                // prefer a non-blocking toast if you have one; fallback to alert
                                                window.alert(err.message || 'Failed to create card');
                                            } catch (e) {
                                                // swallow (some environments may block alert)
                                                console.warn(err);
                                            }
                                        }
                                    }}
                                >
                                    Add
                                </button>
                                <button
                                    onClick={() =>
                                        setNewCardInputs((p) => ({ ...p, [list.id]: { title: '', dueDate: '', effort: 3, priority: 'medium', weight: '' } }))
                                    }
                                >
                                    Cancel
                                </button>
                            </div>

                            {/* Subtask addition UI */}
                            <div className="quick-subtasks" style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sidenav-ISO)', marginBottom: 6 }}>
                                    Subtasks ({((newCardInputs[list.id] || {}).subtasks || []).length})
                                </div>

                                <div className="subtask-mini-list" style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8, maxHeight: 120, overflowY: 'auto' }}>
                                    {((newCardInputs[list.id] || {}).subtasks || []).map((st, i) => (
                                        <div key={st.id || i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '2px 6px', borderRadius: 4 }}>
                                            <span style={{ color: 'var(--sidenav-ISO)' }}>•</span>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {st.text}
                                                <span style={{ opacity: 0.6, fontSize: '0.75em', marginLeft: 6 }}>
                                                    ({st.weight > 0 ? st.weight : getProjectedWeight((newCardInputs[list.id] || {}).subtasks || [], i)}%)
                                                </span>
                                            </span>
                                            <button
                                                onClick={() => setNewCardInputs(p => {
                                                    const prevSub = (p[list.id] || {}).subtasks || [];
                                                    return {
                                                        ...p,
                                                        [list.id]: {
                                                            ...(p[list.id] || {}),
                                                            subtasks: prevSub.filter((_, idx) => idx !== i)
                                                        }
                                                    };
                                                })}
                                                style={{ border: 'none', background: 'transparent', color: '#ff6b6b', cursor: 'pointer', padding: 2 }}
                                                title="Remove subtask"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: 6 }}>
                                    <input
                                        placeholder="Subtask..."
                                        style={{
                                            flex: 1,
                                            background: 'rgba(0,0,0,0.1)',
                                            border: 'none',
                                            padding: '4px 8px',
                                            borderRadius: 4,
                                            fontSize: '0.8rem',
                                            color: 'var(--text-color)',
                                            minWidth: 0
                                        }}
                                        value={(newCardInputs[list.id] || {}).tempSubtaskText || ''}
                                        onChange={(e) => setNewCardInputs(p => ({
                                            ...p,
                                            [list.id]: { ...(p[list.id] || {}), tempSubtaskText: e.target.value }
                                        }))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const text = ((newCardInputs[list.id] || {}).tempSubtaskText || '').trim();
                                                const weight = Number((newCardInputs[list.id] || {}).tempSubtaskWeight) || 0;
                                                if (text) {
                                                    setNewCardInputs(p => {
                                                        const prevSub = (p[list.id] || {}).subtasks || [];
                                                        return {
                                                            ...p,
                                                            [list.id]: {
                                                                ...(p[list.id] || {}),
                                                                subtasks: [...prevSub, { id: Date.now(), text, weight, completed: false }],
                                                                tempSubtaskText: '',
                                                                tempSubtaskWeight: ''
                                                            }
                                                        };
                                                    });
                                                    // Optional: focus back to text input? It's already there.
                                                }
                                            }
                                        }}
                                    />
                                    <input
                                        type="number"
                                        placeholder={(getProjectedWeight((newCardInputs[list.id] || {}).subtasks || [], -1 /* placeholder for auto */) || 'Auto') + ''}
                                        style={{
                                            width: 42,
                                            background: 'rgba(0,0,0,0.1)',
                                            border: 'none',
                                            padding: '4px',
                                            borderRadius: 4,
                                            fontSize: '0.8rem',
                                            color: 'var(--text-color)',
                                            textAlign: 'center'
                                        }}
                                        min="0"
                                        max="100"
                                        value={(newCardInputs[list.id] || {}).tempSubtaskWeight || ''}
                                        onChange={(e) => setNewCardInputs(p => ({
                                            ...p,
                                            [list.id]: { ...(p[list.id] || {}), tempSubtaskWeight: e.target.value }
                                        }))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const text = ((newCardInputs[list.id] || {}).tempSubtaskText || '').trim();
                                                const weight = Number((newCardInputs[list.id] || {}).tempSubtaskWeight) || 0;
                                                if (text) {
                                                    setNewCardInputs(p => {
                                                        const prevSub = (p[list.id] || {}).subtasks || [];
                                                        const newSubList = [...prevSub, { id: Date.now(), text, weight, completed: false }];

                                                        const validCheck = validateTotalWeight(newSubList);
                                                        // "also have a warning"
                                                        if (!validCheck.valid) {
                                                            alert(validCheck.message);
                                                        }

                                                        return {
                                                            ...p,
                                                            [list.id]: {
                                                                ...(p[list.id] || {}),
                                                                subtasks: newSubList,
                                                                tempSubtaskText: '',
                                                                tempSubtaskWeight: ''
                                                            }
                                                        };
                                                    });
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            const text = ((newCardInputs[list.id] || {}).tempSubtaskText || '').trim();
                                            const weight = Number((newCardInputs[list.id] || {}).tempSubtaskWeight) || 0;
                                            if (text) {
                                                setNewCardInputs(p => {
                                                    const prevSub = (p[list.id] || {}).subtasks || [];
                                                    const newSubList = [...prevSub, { id: Date.now(), text, weight, completed: false }];

                                                    const validCheck = validateTotalWeight(newSubList);
                                                    if (!validCheck.valid) {
                                                        alert(validCheck.message);
                                                    }

                                                    return {
                                                        ...p,
                                                        [list.id]: {
                                                            ...(p[list.id] || {}),
                                                            subtasks: newSubList,
                                                            tempSubtaskText: '',
                                                            tempSubtaskWeight: ''
                                                        }
                                                    };
                                                });
                                            }
                                        }}
                                        style={{
                                            border: 'none',
                                            background: 'rgba(255,255,255,0.1)',
                                            color: 'var(--text-color)',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            padding: '0 8px',
                                            fontSize: '1rem',
                                            fontWeight: 700
                                        }}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {isListComplete && (
                                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--sidenav-ISO)' }}>
                                    This list is 100% complete — new card creation is disabled.
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
