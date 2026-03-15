import React, { useState, useEffect, useRef } from 'react';
import PersonalList from './PersonalList';
import PersonalCard from './PersonalCard';
import PersonalCardModal from './PersonalCardModal';
const PRIORITY_STYLES = {
    high:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'High' },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Medium' },
    low:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',   label: 'Low' },
};

function ListViewRow({ card, listName, listColor, onClick, highlightItemId }) {
    const {
        title,
        priority,
        dueDate,
        startDate,
        tags = [],
        status,
        progress: cardProgress,
        subtasksCompleted = 0,
        subtasksTotal = 0,
    } = card;

    const ps = priority ? (PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium) : null;
    const progress = subtasksTotal > 0 ? Math.round((subtasksCompleted / subtasksTotal) * 100) : (cardProgress || 0);
    const isDone = status === 'done' || (cardProgress != null && cardProgress >= 100) || (subtasksTotal > 0 && subtasksCompleted === subtasksTotal);

    const formatDate = (d) => {
        if (!d) return null;
        try {
            const date = d && typeof d === 'object' && 'seconds' in d
                ? new Date(d.seconds * 1000)
                : new Date(d);
            if (isNaN(date.getTime())) return null;
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch { return null; }
    };

    const formattedDue = formatDate(dueDate);
    const formattedStart = formatDate(startDate);
    const isOverdue = dueDate && (() => {
        if (isDone) return false;
        let cDate = null;
        if (typeof dueDate === 'object' && dueDate.seconds) {
            const dObj = new Date(dueDate.seconds * 1000);
            cDate = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
        } else {
            const dStr = String(dueDate);
            if (dStr.includes('T')) {
                const dObj = new Date(dStr);
                if (!isNaN(dObj.getTime())) {
                    cDate = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
                }
            } else if (dStr.length >= 10) {
                cDate = dStr.slice(0, 10);
            }
        }
        if (!cDate) return false;
        
        const localNow = new Date();
        const todayLocal = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
        return cDate < todayLocal;
    })();

    const isStartToday = startDate && (() => {
        let sDate = null;
        if (typeof startDate === 'object' && startDate.seconds) {
            const dObj = new Date(startDate.seconds * 1000);
            sDate = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
        } else {
            const dStr = String(startDate);
            if (dStr.includes('T')) {
                const dObj = new Date(dStr);
                if (!isNaN(dObj.getTime())) {
                    sDate = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
                }
            } else if (dStr.length >= 10) {
                sDate = dStr.slice(0, 10);
            }
        }
        if (!sDate) return false;
        const localNow = new Date();
        const todayLocal = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
        return sDate === todayLocal;
    })();

    const highlightClass = card.id === highlightItemId 
       ? (isOverdue ? 'pd-highlight-pulse--overdue' : (isStartToday ? 'pd-highlight-pulse--start' : 'pd-highlight-pulse'))
       : '';

    useEffect(() => {
        if (highlightItemId === card.id) {
            const el = document.getElementById(`listview-${card.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightItemId, card.id]);

    return (
        <div
            id={`listview-${card.id}`}
            className={`pd-listview-row ${isDone ? 'pd-listview-row--done' : ''} ${highlightClass}`}
            onClick={() => onClick && onClick(card, listName, listColor, null)}
        >
            {/* Status dot */}
            <span className="pd-listview-dot" style={{ background: listColor }} />

            {/* Title */}
            <div className="pd-listview-title-col">
                <span className="pd-listview-title">{title}</span>
                <span className="pd-listview-list-name">{listName}</span>
            </div>

            {/* Tags */}
            <div className="pd-listview-tags">
                {tags.map(tag => (
                    <span key={tag} className="pd-tag">{tag}</span>
                ))}
            </div>

            {/* Progress */}
            <div className="pd-listview-progress-col">
                {subtasksTotal > 0 && (
                    <>
                        <div className="pd-progress-track pd-listview-progress-track">
                            <div
                                className="pd-progress-fill"
                                style={{
                                    width: `${progress}%`,
                                    background: isDone ? '#10b981' : listColor || (ps ? ps.color : '#f59e0b'),
                                }}
                            />
                        </div>
                        <span className="pd-progress-label">{subtasksCompleted}/{subtasksTotal}</span>
                    </>
                )}
            </div>

            {/* Priority */}
            {ps ? (
                <span
                    className="pd-priority-badge"
                    style={{ color: ps.color, background: ps.bg }}
                >
                    {ps.label}
                </span>
            ) : (
                <span className="pd-priority-badge pd-priority-badge--none">—</span>
            )}

            {/* Due Date */}
            <span className={`pd-due-badge ${isOverdue ? 'overdue' : ''}`}>
                {formattedDue ? (
                    <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <circle cx="6" cy="6" r="5" />
                            <path d="M6 3v3.5l2.5 1" strokeLinecap="round" />
                        </svg>
                        {formattedDue}
                    </>
                ) : (
                    <span className="pd-no-date">No date</span>
                )}
            </span>
        </div>
    );
}



export default function PersonalBoardLayout({
    viewMode = 'board',
    lists,
    onAddList,
    onAddTask,
    onUpdateCard,
    onDeleteCard,
    onMoveCard,
    onRenameList,
    onUpdateListColor,
    onDeleteList,
    onDuplicateList,
    onSortCards,
    onMoveAllCards,
    highlightItemId,
}) {
    const [selectedCard, setSelectedCard] = useState(null);
    const [selectedListId, setSelectedListId] = useState('');
    const [selectedListName, setSelectedListName] = useState('');
    const [selectedListColor, setSelectedListColor] = useState('');

    const [isAddingList, setIsAddingList] = useState(false);
    const [newListTitle, setNewListTitle] = useState('');
    const [createCardListId, setCreateCardListId] = useState('');

    const handleCardClick = (card, listName, listColor, listId) => {
        setSelectedCard(card);
        setSelectedListId(listId);
        setSelectedListName(listName);
        setSelectedListColor(listColor);
    };

    const handleCloseModal = () => {
        setSelectedCard(null);
        setSelectedListId('');
        setSelectedListName('');
        setSelectedListColor('');
        setCreateCardListId('');
    };
    return (
        <>
            {viewMode === 'list' ? (
                <div className="pd-listview-layout">
                    {/* List View Header */}
                    <div className="pd-listview-header-row">
                        <span className="pd-listview-header-cell pd-listview-header-dot" />
                        <span className="pd-listview-header-cell pd-listview-header-title">Task</span>
                        <span className="pd-listview-header-cell pd-listview-header-tags">Tags</span>
                        <span className="pd-listview-header-cell pd-listview-header-progress">Progress</span>
                        <span className="pd-listview-header-cell pd-listview-header-priority">Priority</span>
                        <span className="pd-listview-header-cell pd-listview-header-due">Due</span>
                    </div>

                    {/* Rows grouped by list */}
                    {lists.map(list => (
                        <div key={list.id} className="pd-listview-group">
                            <div className="pd-listview-group-header">
                                <span className="pd-list-dot" style={{ background: list.color }} />
                                <span className="pd-listview-group-name">{list.name}</span>
                                <span className="pd-list-count">{list.cards.length}</span>
                            </div>
                            {list.cards.map(card => (
                                <ListViewRow
                                    key={card.id}
                                    card={card}
                                    listName={list.name}
                                    listColor={list.color}
                                    highlightItemId={highlightItemId}
                                    onClick={(c, ln, lc) => handleCardClick(c, ln, lc, list.id)}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="pd-board-layout">
                    {lists.map(list => (
                        <PersonalList
                            key={list.id}
                            list={list}
                            allLists={lists}
                            onCardClick={(card, listName, listColor) => handleCardClick(card, listName, listColor, list.id)}
                            onAddTask={(listId) => setCreateCardListId(listId)}
                            onRenameList={onRenameList}
                            onUpdateListColor={onUpdateListColor}
                            onDeleteList={onDeleteList}
                            onDuplicateList={onDuplicateList}
                            onSortCards={onSortCards}
                            onMoveAllCards={onMoveAllCards}
                            onMoveCard={onMoveCard}
                            highlightItemId={highlightItemId}
                        />
                    ))}

                    {/* Add List Placeholder */}
                    <div className="pd-add-list">
                            {isAddingList ? (
                                <div className="pd-add-list-form">
                                    <input
                                        autoFocus
                                        type="text"
                                        className="pd-add-list-input"
                                        placeholder="Enter list title..."
                                        value={newListTitle}
                                        onChange={e => setNewListTitle(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && newListTitle.trim()) {
                                                onAddList(newListTitle.trim());
                                                setNewListTitle('');
                                                setIsAddingList(false);
                                            } else if (e.key === 'Escape') {
                                                setIsAddingList(false);
                                                setNewListTitle('');
                                            }
                                        }}
                                    />
                                    <div className="pd-add-list-actions">
                                        <button
                                            className="pd-add-list-submit"
                                            onClick={() => {
                                                if (newListTitle.trim()) {
                                                    onAddList(newListTitle.trim());
                                                    setNewListTitle('');
                                                    setIsAddingList(false);
                                                }
                                            }}
                                        >
                                            Add list
                                        </button>
                                        <button
                                            className="pd-add-list-cancel"
                                            onClick={() => {
                                                setIsAddingList(false);
                                                setNewListTitle('');
                                            }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                    <button
                                        className="pd-add-list-btn"
                                        onClick={() => setIsAddingList(true)}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                                        </svg>
                                        <span>Add List</span>
                                    </button>
                            )}
                    </div>
                </div>
            )}

            {/* Card Detail Modal */}
            {selectedCard && (
                <PersonalCardModal
                    card={selectedCard}
                    listId={selectedListId}
                    listName={selectedListName}
                    listColor={selectedListColor}
                    allLists={lists}
                    onClose={handleCloseModal}
                    onUpdateCard={onUpdateCard}
                    onDeleteCard={onDeleteCard}
                    onMoveCard={onMoveCard}
                    onCreateCard={onAddTask}
                />
            )}

            {/* Create Card Modal */}
            {createCardListId && !selectedCard && (
                <PersonalCardModal
                    isCreate={true}
                    card={{}}
                    listId={createCardListId}
                    listName={lists.find(l => l.id === createCardListId)?.name || ''}
                    listColor={lists.find(l => l.id === createCardListId)?.color || ''}
                    allLists={lists}
                    onClose={handleCloseModal}
                    onCreateCard={onAddTask}
                />
            )}
        </>
    );
}
