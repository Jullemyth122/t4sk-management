import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import * as boardSvc from '../services/boardService';
import usePagination from '../hooks/usePagination';

// Reusing Bcomponents
import BoardSidebar from './Bcomponent/BoardSidebar';
import BoardTop from './Bcomponent/BoardTop';
import ListColumn from './Bcomponent/ListColumn';

// Styles (inherits from business dashboard but with tweaks)
import '../scss/personal-dashboard.scss';

export default function PersonalDashboard() {
    const { currentUser } = useAuth();
    const uid = currentUser?.uid;

    // State
    const [boards, setBoards] = useState([]);
    const [selectedBoardId, setSelectedBoardId] = useState(null);
    const [lists, setLists] = useState([]);
    const [cardsMap, setCardsMap] = useState({}); // { listId: [cards] }

    // UI State
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [boardQuery, setBoardQuery] = useState('');
    const [boardView, setBoardView] = useState('grid');
    const [boardSort, setBoardSort] = useState('recent');
    const [editingBoard, setEditingBoard] = useState(false);
    const [boardDraft, setBoardDraft] = useState({ name: '', description: '' });
    const [newBoardName, setNewBoardName] = useState('');
    
    // Quick-add state for lists/cards
    const [newListName, setNewListName] = useState('');
    const [listNameEditing, setListNameEditing] = useState({});
    const [listNameDrafts, setListNameDrafts] = useState({});

    // Card editing state
    const [cardEditing, setCardEditing] = useState({});
    const [cardDrafts, setCardDrafts] = useState({});
    const [newCardInputs, setNewCardInputs] = useState({}); // { listId: { title, ... } }

    const [uiError, setUiError] = useState('');

    // --- Subscriptions ---

    // 1. Boards
    useEffect(() => {
        if (!uid) return;
        const unsub = boardSvc.subscribeBoards({ 
            businessId: null, 
            uid, 
            cb: (data) => {
                setBoards(data || []);
            }
        });
        return () => unsub && unsub();
    }, [uid]);

    // 2. Select first board if none selected
    useEffect(() => {
        if (selectedBoardId) return;
        if (boards.length > 0) {
            setSelectedBoardId(boards[0].id);
        }
    }, [boards, selectedBoardId]);

    // 3. Lists & Cards for selected board
    useEffect(() => {
        setLists([]);
        setCardsMap({});
        if (!uid || !selectedBoardId) return;

        // Subscribe to lists
        const unsubLists = boardSvc.subscribeLists({
            businessId: null,
            uid,
            boardId: selectedBoardId,
            cb: (ls) => setLists(ls || [])
        });

        return () => unsubLists && unsubLists();
    }, [uid, selectedBoardId]);

    // Subscribe to cards for each list
    useEffect(() => {
        if (!uid || !selectedBoardId || lists.length === 0) return;

        const unsubs = [];
        lists.forEach(l => {
            const unsub = boardSvc.subscribeCardsForList({
                businessId: null,
                uid,
                boardId: selectedBoardId,
                listId: l.id,
                cb: (cs) => {
                    setCardsMap(prev => ({ ...prev, [l.id]: cs || [] }));
                }
            });
            unsubs.push(unsub);
        });

        return () => unsubs.forEach(u => u && u());
    }, [uid, selectedBoardId, lists]); // re-subscribing when lists change is acceptable for now

    // --- Derived State ---

    const selectedBoard = useMemo(() => boards.find(b => b.id === selectedBoardId), [boards, selectedBoardId]);

    const filteredBoards = useMemo(() => {
        let res = boards;
        if (boardQuery) {
            const q = boardQuery.toLowerCase();
            res = res.filter(b => b.name.toLowerCase().includes(q));
        }
        if (boardSort === 'alpha') {
            res = [...res].sort((a, b) => a.name.localeCompare(b.name));
        }
        // 'recent' is default from firestore usually, or we can sort by createdAt
        return res;
    }, [boards, boardQuery, boardSort]);

    // Pagination for boards
    const { 
        page: boardPage, 
        perPage: boardsPerPage, 
        setPerPage: setBoardsPerPage, 
        totalPages: boardsTotalPages, 
        visible: visibleBoards, 
        goto: gotoBoardPage 
    } = usePagination(filteredBoards, 6);


    // --- Handlers ---

    const handleCreateBoard = async () => {
        if (!newBoardName.trim()) return;
        try {
            const res = await boardSvc.createBoard({
                uid,
                businessId: null,
                name: newBoardName.trim(),
                description: '',
                settings: { theme: 'default' } // Personal boards can have themes later
            });
            setNewBoardName('');
            setSelectedBoardId(res.id);
            setUiError('');
        } catch (err) {
            console.error(err);
            setUiError('Failed to create board.');
        }
    };

    const handleUpdateBoard = async (boardId, data) => {
        try {
            await boardSvc.updateBoard({ uid, businessId: null, boardId, data });
            setEditingBoard(false);
        } catch(err) {
            console.error(err);
            setUiError('Failed to update board');
        }
    };

    const handleDeleteBoard = async (boardId) => {
        if (!window.confirm('Delete this board permanently?')) return;
        try {
            await boardSvc.deleteBoard({ uid, businessId: null, boardId });
            if (selectedBoardId === boardId) setSelectedBoardId(null);
        } catch(err) {
            console.error(err);
            setUiError('Failed to delete board');
        }
    };

    const handleCreateList = async () => {
        if (!newListName.trim() || !selectedBoardId) return;
        try {
            await boardSvc.createList({
                uid,
                businessId: null,
                boardId: selectedBoardId,
                name: newListName.trim(),
                assignees: [] // No assignees in personal mode
            });
            setNewListName('');
        } catch(err) {
            console.error(err);
            setUiError('Failed to create list');
        }
    };

    const handleUpdateList = async (boardId, listId, data) => {
        try {
            await boardSvc.updateList({ uid, businessId: null, boardId, listId, data });
            setListNameEditing(prev => ({ ...prev, [listId]: false }));
        } catch(err) {
            console.error(err);
        }
    };

    const handleDeleteList = async ({ boardId, listId }) => {
        try {
            await boardSvc.deleteList({ uid, businessId: null, boardId, listId });
        } catch(err) {
            console.error(err);
        }
    };

    // Cards
    const handleCreateCardForList = async (listId) => {
        const inputs = newCardInputs[listId] || {};
        if (!inputs.title) return;

        try {
            await boardSvc.createCard({
                uid,
                businessId: null,
                boardId: selectedBoardId,
                listId,
                card: {
                    title: inputs.title,
                    description: '',
                    startDate: inputs.startDate,
                    dueDate: inputs.dueDate,
                    priority: inputs.priority || 'medium',
                    weight: inputs.weight ? Number(inputs.weight) : 0,
                    status: 'todo',
                    subtasks: inputs.subtasks || []
                },
                actorName: currentUser?.displayName || 'Me',
                boardName: selectedBoard?.name || 'Board'
            });
            // Clear inputs
            setNewCardInputs(prev => ({
                ...prev,
                [listId]: { title: '', startDate: '', dueDate: '', priority: 'medium', weight: '' }
            }));
        } catch(err) {
            console.error(err);
            alert(err.message);
        }
    };

    const handleUpdateCard = async (listId, cardId, data) => {
        try {
            await boardSvc.updateCard({
                uid,
                businessId: null,
                boardId: selectedBoardId,
                listId,
                cardId,
                data
            });
            setCardEditing(prev => ({ ...prev, [cardId]: false }));
        } catch(err) {
            console.error(err); 
        }
    };

    const handleDeleteCard = async (listId, cardId) => {
        try {
            await boardSvc.deleteCard({ uid, businessId: null, boardId: selectedBoardId, listId, cardId });
        } catch(err) {
            console.error(err);
        }
    };

    const handleMoveCard = async (cardId, fromListId, toListId, newIndex) => {
        // Optimistic UI update could happen here, but simpler to rely on subscription for now
        try {
            // Get card data first
            const card = cardsMap[fromListId]?.find(c => c.id === cardId);
            if (!card) return;

            // Delete from old, create in new (standard Firestore approach due to subcollections)
            // Or if boardService supports moving:
            // Actually boardService doesn't have a direct 'moveCard' across lists usually, 
            // but let's see if we can implement it or if Reuse logic exists.
            // BusinessDashboard uses `useCardHandlers` which does this copy-delete dance.
            
            // Re-implementing move logic simply:
            await boardSvc.deleteCard({ uid, businessId: null, boardId: selectedBoardId, listId: fromListId, cardId });
            
            // Create in new list
            await boardSvc.createCard({
                uid,
                businessId: null,
                boardId: selectedBoardId,
                listId: toListId,
                card: {
                    ...card,
                    status: toListId === fromListId ? card.status : 'todo' // Reset status if moving lists? Or keep?
                    // actually we should probably keep data.
                },
                actorName: 'System', // suppress notification
                boardName: selectedBoard?.name
            });
        } catch(err) {
            console.error(err);
        }
    };

    // Submissions/Review - Not relevant for Personal, but handlers needed for ListColumn props
    const handleSubmitCard = () => {}; 
    const handleReviewAction = () => {};

    // --- Render ---

    const showAside = true; // Always show sidebar in Personal for now

    return (
        <main className={`bd-root p-4 personal-theme ${sidebarCollapsed ? 'collapsed-sidebar' : ''}`}>
             <button
                className="bd-sidebar-toggle"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
                {sidebarCollapsed ? '›' : '‹'}
            </button>

            {/* Header */}
            <div className="bd-header">
                <div className="bd-head-left">
                    <h1 className="bd-title">Personal Dashboard</h1>
                    <div className="bd-sub">{currentUser?.email}</div>
                </div>
                <div className="bd-head-right">
                    {/* Actions if any */}
                    {selectedBoard && (
                        <>
                             <div className="actions-group">
                                <button className="bd-btn" onClick={() => {
                                    setEditingBoard(true);
                                    setBoardDraft({ name: selectedBoard.name, description: selectedBoard.description });
                                }}>
                                    Edit Board
                                </button>
                                <button className="bd-btn" onClick={() => handleDeleteBoard(selectedBoard.id)}>
                                    Delete Board
                                </button>
                             </div>
                        </>
                    )}
                </div>
            </div>

            {uiError && <div className="bd-uierror">{uiError}</div>}

            <div className="bd-grid">
                <div className="bd-aside">
                     <div className="sidebar-tabs">
                        <button className="tab-btn active">Boards</button>
                     </div>

                     <BoardSidebar 
                        boards={boards}
                        boardQuery={boardQuery}
                        setBoardQuery={setBoardQuery}
                        boardView={boardView}
                        setBoardView={setBoardView}
                        boardSort={boardSort}
                        setBoardSort={setBoardSort}
                        visibleBoards={visibleBoards}
                        boardPage={boardPage}
                        boardsTotalPages={boardsTotalPages}
                        boardsPerPage={boardsPerPage}
                        setBoardsPerPage={setBoardsPerPage}
                        gotoBoardPage={gotoBoardPage}
                        selectedBoardId={selectedBoardId}
                        setSelectedBoardId={setSelectedBoardId}
                        newBoardName={newBoardName}
                        setNewBoardName={setNewBoardName}
                        handleCreateBoard={handleCreateBoard}
                        canCreateBoard={true}
                        canEditBoardValue={true}
                     />
                </div>

                <section className="bd-main">
                    <div className="board-content">
                        {!selectedBoard ? (
                            <div className="bd-empty">Select or create a board to get started.</div>
                        ) : (
                            <>
                                <BoardTop 
                                    selectedBoard={selectedBoard}
                                    editingBoard={editingBoard}
                                    setEditingBoard={setEditingBoard}
                                    boardDraft={boardDraft}
                                    setBoardDraft={setBoardDraft}
                                    handleUpdateBoard={handleUpdateBoard}
                                    handleRefreshBoard={() => {}} // No-op or re-fetch
                                    canEditBoardValue={true}
                                />

                                <div className="lists-wrap">
                                    {lists.map(l => (
                                        <ListColumn 
                                            key={l.id}
                                            boardId={selectedBoardId}
                                            list={l}
                                            lists={lists}
                                            cards={cardsMap[l.id] || []}
                                            listNameEditing={listNameEditing}
                                            setListNameEditing={setListNameEditing}
                                            listNameDrafts={listNameDrafts}
                                            setListNameDrafts={setListNameDrafts}
                                            handleUpdateList={handleUpdateList}
                                            handleDeleteList={handleDeleteList}
                                            canEdit={true}
                                            canUpdateList={true}
                                            canDeleteList={true}
                                            canCreateCard={true}
                                            cardEditing={cardEditing}
                                            setCardEditing={setCardEditing}
                                            cardDrafts={cardDrafts}
                                            setCardDrafts={setCardDrafts}
                                            handleUpdateCard={handleUpdateCard}
                                            handleMoveCard={handleMoveCard}
                                            handleDeleteCard={handleDeleteCard}
                                            handleSubmitCard={handleSubmitCard}
                                            handleReviewAction={handleReviewAction}
                                            newCardInputs={newCardInputs}
                                            setNewCardInputs={setNewCardInputs}
                                            handleCreateCardForList={handleCreateCardForList}
                                            currentUserUid={uid}
                                            currentUserEmail={currentUser.email}
                                            membersMap={{}} // No key dependency for personal
                                            emailMap={{}}
                                            roles={[]}
                                            reviewerOptions={[]}
                                            workloadMap={{}}
                                        />
                                    ))}

                                    <div className="list-col add-list">
                                        <div className="add-list-head">Add list</div>
                                        <input 
                                            className="add-list-name-input"
                                            value={newListName}
                                            onChange={(e) => setNewListName(e.target.value)}
                                            placeholder="New list name"
                                            onKeyDown={(e) => { if(e.key === 'Enter') handleCreateList(); }}
                                        />
                                        <button onClick={handleCreateList} className="create-list-btn">
                                            Create list
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
