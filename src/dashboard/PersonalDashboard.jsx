// src/dashboard/PersonalDashboard.jsx
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import * as boardSvc from '../services/boardService';

import PersonalSidebar from './Pcomponent/PersonalSidebar';
import PersonalBoardLayout from './Pcomponent/PersonalBoardLayout';
import TodayView from './Pcomponent/TodayView';
import PersonalCalendar from './Pcomponent/PersonalCalendar';
import PersonalStatistics from './Pcomponent/PersonalStatistics';

import '../scss/personal-dashboard.scss';

// Import hooks
import { usePersonalBoards } from '../hooks/personal/usePersonalBoards';
import { usePersonalLists } from '../hooks/personal/usePersonalLists';
import { usePersonalCards } from '../hooks/personal/usePersonalCards';
import { usePersonalCardHandlers } from '../hooks/personal/usePersonalCardHandlers';

const DEFAULT_COLORS = ['#f59e0b', '#6366f1', '#10b981', '#ec4899', '#8b5cf6', '#3b82f6'];

export default function PersonalDashboard() {
    const { currentUser } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [viewMode, setViewMode] = useState('board');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [uiError, setUiError] = useState('');
    const [newCardInputs, setNewCardInputs] = useState({});

    // --- Search & Highlight State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [highlightItemId, setHighlightItemId] = useState(null);
    const searchRef = useRef(null);

    const uid = currentUser?.uid;

    // Data Hooks
    const { boards, selectedBoardId, setSelectedBoardId } = usePersonalBoards(uid);
    const { lists: rawLists } = usePersonalLists(uid, selectedBoardId);
    const { cardsMap, optimisticallyMoveCard } = usePersonalCards(uid, selectedBoardId, rawLists);

    // Find the selected board object for display
    const selectedBoard = useMemo(() => boards.find(b => b.id === selectedBoardId) || { name: 'My Tasks' }, [boards, selectedBoardId]);

    // Card Handlers (update, delete, etc.)
    const { handleUpdateCard, handleDeleteCard } = usePersonalCardHandlers({
        uid,
        selectedBoardId,
        selectedBoard,
        currentUser,
        newCardInputs,
        setNewCardInputs,
        setUiError
    });

    // ─── Board Handlers ──────────────────────────────────────────

    const handleCreateBoard = useCallback(async (name) => {
        if (!name || !uid) return;
        try {
            await boardSvc.createBoard({ uid, name, description: '', settings: {} });
        } catch (err) {
            console.error('Failed to create board', err);
            setUiError('Failed to create board.');
        }
    }, [uid]);

    const handleRenameBoard = useCallback(async (boardId, newName) => {
        if (!boardId || !newName || !uid) return;
        try {
            await boardSvc.updateBoard({ uid, boardId, updates: { name: newName } });
        } catch (err) {
            console.error('Failed to rename board', err);
            setUiError('Failed to rename board.');
        }
    }, [uid]);

    const handleDeleteBoard = useCallback(async (boardId) => {
        if (!boardId || !uid) return;
        try {
            await boardSvc.deleteBoard({ uid, boardId });
            // Switch to another board if the deleted one was selected
            if (boardId === selectedBoardId) {
                const remaining = boards.filter(b => b.id !== boardId);
                if (remaining.length > 0) setSelectedBoardId(remaining[0].id);
            }
        } catch (err) {
            console.error('Failed to delete board', err);
            setUiError('Failed to delete board.');
        }
    }, [uid, selectedBoardId, boards, setSelectedBoardId]);

    // ─── List Action Handlers ────────────────────────────────────

    const handleRenameList = useCallback(async (listId, newName) => {
        if (!newName || !listId || !uid || !selectedBoardId) return;
        try {
            await boardSvc.updateList({ uid, boardId: selectedBoardId, listId, updates: { name: newName } });
        } catch (err) {
            console.error('Failed to rename list', err);
            setUiError('Failed to rename list.');
        }
    }, [uid, selectedBoardId]);

    const handleUpdateListColor = useCallback(async (listId, color) => {
        if (!listId || !uid || !selectedBoardId) return;
        try {
            await boardSvc.updateList({ uid, boardId: selectedBoardId, listId, updates: { color } });
        } catch (err) {
            console.error('Failed to update list color', err);
            setUiError('Failed to update list color.');
        }
    }, [uid, selectedBoardId]);

    const handleArchiveList = useCallback(async (listId) => {
        if (!listId || !uid || !selectedBoardId) return;
        try {
            await boardSvc.updateList({ uid, boardId: selectedBoardId, listId, updates: { archived: true } });
        } catch (err) {
            console.error('Failed to archive list', err);
            setUiError('Failed to archive list.');
        }
    }, [uid, selectedBoardId]);

    const handleRestoreList = useCallback(async (listId) => {
        if (!listId || !uid || !selectedBoardId) return;
        try {
            await boardSvc.updateList({ uid, boardId: selectedBoardId, listId, updates: { archived: false } });
        } catch (err) {
            console.error('Failed to restore list', err);
            setUiError('Failed to restore list.');
        }
    }, [uid, selectedBoardId]);

    const handleDeleteList = useCallback(async (listId) => {
        if (!listId || !uid || !selectedBoardId) return;
        try {
            await boardSvc.deleteList({ uid, boardId: selectedBoardId, listId });
        } catch (err) {
            console.error('Failed to delete list', err);
            setUiError('Failed to delete list.');
        }
    }, [uid, selectedBoardId]);

    const handleDuplicateList = useCallback(async (listId) => {
        if (!listId || !uid || !selectedBoardId) return;
        try {
            const sourceList = rawLists.find(l => l.id === listId);
            if (!sourceList) return;
            const newList = await boardSvc.createList({
                uid, boardId: selectedBoardId,
                name: `${sourceList.name} (copy)`,
                assignees: sourceList.assignees || [],
            });
            const sourceCards = cardsMap[listId] || [];
            for (const card of sourceCards) {
                await boardSvc.createCard({
                    uid, boardId: selectedBoardId, listId: newList.id,
                    card: {
                        title: card.title, description: card.description || '',
                        priority: card.priority || null, startDate: card.startDate || null,
                        dueDate: card.dueDate || null, status: 'todo', subtasks: card.subtasks || [],
                        recurrence: card.recurrence || null,
                        tags: card.tags || [],
                        youtubeLink: card.youtubeLink || '',
                    },
                    actorName: currentUser?.displayName || 'Me',
                    boardName: selectedBoard?.name || 'Board',
                });
            }
        } catch (err) {
            console.error('Failed to duplicate list', err);
            setUiError('Failed to duplicate list.');
        }
    }, [uid, selectedBoardId, rawLists, cardsMap, currentUser, selectedBoard]);

    const handleSortCards = useCallback(async (listId, sortBy) => {
        if (!listId || !uid || !selectedBoardId) return;
        try {
            const cards = [...(cardsMap[listId] || [])];
            const rankMap = { high: 3, medium: 2, low: 1 };
            cards.sort((a, b) => {
                if (sortBy === 'priority') return (rankMap[b.priority] || 0) - (rankMap[a.priority] || 0);
                if (sortBy === 'date') {
                    const da = a.dueDate ? new Date(a.dueDate.seconds ? a.dueDate.seconds * 1000 : a.dueDate).getTime() : Infinity;
                    const db_ = b.dueDate ? new Date(b.dueDate.seconds ? b.dueDate.seconds * 1000 : b.dueDate).getTime() : Infinity;
                    return da - db_;
                }
                if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
                return 0;
            });
            for (let i = 0; i < cards.length; i++) {
                await boardSvc.updateCard({
                    uid, boardId: selectedBoardId, listId, cardId: cards[i].id,
                    updates: { priorityRank: 1000 - i },
                });
            }
        } catch (err) {
            console.error('Failed to sort cards', err);
            setUiError('Failed to sort cards.');
        }
    }, [uid, selectedBoardId, cardsMap]);

    const handleMoveCard = useCallback(async (cardId, fromListId, toListId) => {
        if (!uid || !selectedBoardId || !cardId || !fromListId || !toListId) {
            console.warn('[handleMoveCard] missing required params', { uid, selectedBoardId, cardId, fromListId, toListId });
            return;
        }
        try {
            await boardSvc.moveCardBetweenLists({
                uid,
                boardId: selectedBoardId,
                cardId,
                fromListId,
                toListId,
                newPosition: 0
            });
            console.log('[handleMoveCard] card moved successfully');
        } catch (err) {
            console.error('Failed to move card', err);
            setUiError('Failed to move card.');
        }
    }, [uid, selectedBoardId]);

    const handleMoveAllCards = useCallback(async (fromListId, toListId, cards) => {
        if (!uid || !selectedBoardId || !fromListId || !toListId) {
            console.warn('[handleMoveAllCards] missing required params', { uid, selectedBoardId, fromListId, toListId });
            return;
        }
        // Use cards passed directly, or fallback to cardsMap
        const cardsToMove = cards || cardsMap[fromListId] || [];
        if (cardsToMove.length === 0) {
            console.warn('[handleMoveAllCards] no cards to move');
            return;
        }
        try {
            for (const card of cardsToMove) {
                await boardSvc.moveCardBetweenLists({
                    uid,
                    boardId: selectedBoardId,
                    cardId: card.id,
                    fromListId,
                    toListId,
                    newPosition: 0
                });
            }
        } catch (err) {
            console.error('Failed to move all cards', err);
            setUiError('Failed to move all cards.');
        }
    }, [uid, selectedBoardId, cardsMap]);

    // ─── Merge lists and cards for UI ────────────────────────────

    const allLists = useMemo(() => {
        return rawLists.map((list, index) => ({
            ...list,
            color: list.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
            cards: cardsMap[list.id] || []
        }));
    }, [rawLists, cardsMap]);

    // Split into active and archived
    const lists = useMemo(() => allLists.filter(l => !l.archived), [allLists]);
    const archivedLists = useMemo(() => allLists.filter(l => l.archived), [allLists]);

    // Calculate total stats for header
    const totalTasks = lists.reduce((acc, list) => acc + list.cards.length, 0);
    const totalLists = lists.length;

    // --- Search Logic ---
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return null;
        const q = searchQuery.toLowerCase();

        const b = boards.filter(b => b.name.toLowerCase().includes(q));
        const l = lists.filter(l => l.name.toLowerCase().includes(q));
        const c = [];

        Object.values(cardsMap).forEach(listCards => {
            listCards.forEach(card => {
                const matchTitle = (card.title || '').toLowerCase().includes(q);
                const matchDesc = (card.description || '').toLowerCase().includes(q);
                const matchTag = card.tags && card.tags.some(t => t.toLowerCase().includes(q));
                
                if (matchTitle || matchDesc || matchTag) {
                    c.push(card);
                }
            });
        });

        return { boards: b, lists: l, cards: c };
    }, [searchQuery, boards, lists, cardsMap]);

    const handleSelectSearchResult = (type, item) => {
        if (type === 'board') {
            setSelectedBoardId(item.id);
            setActiveTab('dashboard');
            triggerHighlight(item.id);
        } else if (type === 'list') {
            setActiveTab('dashboard');
            triggerHighlight(item.id);
        } else if (type === 'card') {
            setActiveTab('dashboard');
            triggerHighlight(item.id);
        }
        setSearchQuery('');
        setIsSearchFocused(false);
    };

    const triggerHighlight = (id) => {
        setHighlightItemId(id);
        setTimeout(() => {
            setHighlightItemId(curr => curr === id ? null : curr);
        }, 2200); // clear highlight after animation
    };

    return (
        <div className={`pd-root ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <PersonalSidebar
                user={currentUser}
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                boards={boards}
                selectedBoardId={selectedBoardId}
                setSelectedBoardId={setSelectedBoardId}
                onCreateBoard={handleCreateBoard}
                onRenameBoard={handleRenameBoard}
                onDeleteBoard={handleDeleteBoard}
                lists={lists}
                highlightItemId={highlightItemId}
            />

            <main className="pd-main">
                {/* Header */}
                <header className="pd-header">
                    <div className="pd-header-left">
                        <button
                            className="pd-sidebar-toggle"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        >
                            <span className="pd-hamburger" />
                        </button>
                        <div className="pd-header-title-group">
                            <h1 className="pd-board-title">
                                {activeTab === 'dashboard' && selectedBoard.name}
                                {activeTab === 'today' && 'Today'}
                                {activeTab === 'calendar' && 'Calendar'}
                                {activeTab === 'stats' && 'Statistics'}
                            </h1>
                            {activeTab === 'dashboard' && (
                                <span className="pd-board-meta">{totalTasks} tasks · {totalLists} lists</span>
                            )}
                        </div>
                    </div>

                    <div className="pd-header-right">
                        <div className="pd-global-search" ref={searchRef}>
                            <input
                                type="text"
                                className="pd-search-input"
                                placeholder="Search boards, lists, tasks..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                            />
                            {isSearchFocused && searchResults && (
                                <div className="pd-search-dropdown">
                                    {searchResults.boards.length > 0 && (
                                        <div className="pd-search-group">
                                            <div className="pd-search-group-title">Boards</div>
                                            {searchResults.boards.map(b => (
                                                <div key={b.id} className="pd-search-item" onClick={() => handleSelectSearchResult('board', b)}>
                                                    <span className="pd-list-dot" style={{ background: '#8b5cf6' }} /> {b.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {searchResults.lists.length > 0 && (
                                        <div className="pd-search-group">
                                            <div className="pd-search-group-title">Lists</div>
                                            {searchResults.lists.map(l => (
                                                <div key={l.id} className="pd-search-item" onClick={() => handleSelectSearchResult('list', l)}>
                                                    <span className="pd-list-dot" style={{ background: l.color }} /> {l.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {searchResults.cards.length > 0 && (
                                        <div className="pd-search-group">
                                            <div className="pd-search-group-title">Tasks</div>
                                            {searchResults.cards.map(c => (
                                                <div key={c.id} className="pd-search-item" onClick={() => handleSelectSearchResult('card', c)}>
                                                    <span>📝</span> {c.title}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {searchResults.boards.length === 0 && searchResults.lists.length === 0 && searchResults.cards.length === 0 && (
                                        <div className="pd-search-empty">No results found for "{searchQuery}"</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {activeTab === 'dashboard' && (
                            <>
                                <div className="pd-view-switcher">
                                    <button className={`pd-view-btn ${viewMode === 'board' ? 'active' : ''}`} title="Board View" onClick={() => setViewMode('board')}>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="4" height="14" rx="1" /><rect x="6" y="1" width="4" height="10" rx="1" /><rect x="11" y="1" width="4" height="12" rx="1" /></svg>
                                    </button>
                                    <button className={`pd-view-btn ${viewMode === 'list' ? 'active' : ''}`} title="List View" onClick={() => setViewMode('list')}>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="2.5" rx="1" /><rect x="1" y="6.5" width="14" height="2.5" rx="1" /><rect x="1" y="11" width="14" height="2.5" rx="1" /></svg>
                                    </button>
                                </div>
                                <div className="pd-header-divider" />
                                <button className="pd-header-action" title="Filter">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 3h13M3.5 8h9M5.5 13h5" strokeLinecap="round" /></svg>
                                    <span>Filter</span>
                                </button>
                            </>
                        )}
                        <div className="pd-user-chip">
                            <div className="pd-chip-avatar">
                                {currentUser?.photoURL ? (
                                    <img src={currentUser.photoURL} alt="" />
                                ) : (
                                    <span>{currentUser?.displayName?.[0] || 'U'}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="pd-board-area">
                    {uiError && <div className="pd-error-banner" style={{ background: '#fee2e2', color: '#dc2626', padding: '0.5rem', marginBottom: '1rem', borderRadius: '4px' }}>{uiError}</div>}
                    {activeTab === 'dashboard' && (
                        <PersonalBoardLayout
                            viewMode={viewMode}
                            lists={lists}
                            archivedLists={archivedLists}
                            onAddList={async (name) => {
                                if (!name) return;
                                try {
                                    await boardSvc.createList({ uid, boardId: selectedBoardId, name, assignees: [] });
                                } catch (e) {
                                    setUiError("Failed to add list");
                                }
                            }}
                            onAddTask={async (listId, taskData) => {
                                const isObj = typeof taskData === 'object';
                                const title = isObj ? taskData.title : taskData;
                                if (!title) return;
                                try {
                                    const cardProps = { title, status: 'todo' };
                                    if (isObj) {
                                        if (taskData.priority) cardProps.priority = taskData.priority;
                                        if (taskData.dueDate) cardProps.dueDate = taskData.dueDate;
                                        if (taskData.startDate) cardProps.startDate = taskData.startDate;
                                        if (taskData.description) cardProps.description = taskData.description;
                                        if (taskData.subtasks && taskData.subtasks.length > 0) cardProps.subtasks = taskData.subtasks;
                                        if (taskData.progress != null) cardProps.progress = taskData.progress;
                                        if (taskData.recurrence) cardProps.recurrence = taskData.recurrence;
                                        if (taskData.timeSpent) cardProps.timeSpent = taskData.timeSpent;
                                        if (taskData.tags && taskData.tags.length > 0) cardProps.tags = taskData.tags;
                                        if (taskData.youtubeLink) cardProps.youtubeLink = taskData.youtubeLink;
                                    }

                                    await boardSvc.createCard({
                                        uid, boardId: selectedBoardId, listId,
                                        card: cardProps,
                                        actorName: currentUser?.displayName || 'Me',
                                        boardName: selectedBoard?.name || 'Board'
                                    });
                                } catch (e) {
                                    setUiError("Failed to add task");
                                }
                            }}
                            onUpdateCard={handleUpdateCard}
                            onDeleteCard={handleDeleteCard}
                            onMoveCard={handleMoveCard}
                            onRenameList={handleRenameList}
                            onUpdateListColor={handleUpdateListColor}
                            onArchiveList={handleArchiveList}
                            onRestoreList={handleRestoreList}
                            onDeleteList={handleDeleteList}
                            onDuplicateList={handleDuplicateList}
                            onSortCards={handleSortCards}
                            onMoveAllCards={handleMoveAllCards}
                            highlightItemId={highlightItemId}
                        />
                    )}
                    {activeTab === 'today' && (
                        <TodayView
                            uid={uid}
                            onTaskClick={(bId, tId) => {
                                setSelectedBoardId(bId);
                                setActiveTab('dashboard');
                                triggerHighlight(tId);
                            }}
                        />
                    )}
                    {activeTab === 'calendar' && (
                        <PersonalCalendar lists={lists} />
                    )}
                    {activeTab === 'stats' && (
                        <PersonalStatistics lists={lists} />
                    )}
                </div>
            </main>
        </div>
    );
}
