import React, { useState, useRef, useEffect } from 'react';
import PersonalCard from './PersonalCard';
import PersonalListMenu from './PersonalListMenu';

export default function PersonalList({
    list,
    allLists,
    onCardClick,
    onAddTask,
    onRenameList,
    onUpdateListColor,
    onDeleteList,
    onDuplicateList,
    onSortCards,
    onMoveAllCards,
    onMoveCard,
    highlightItemId,
}) {
    const { name, color, cards } = list;
    const [menuOpen, setMenuOpen] = useState(false);
    const menuBtnRef = useRef(null);

    // Inline rename state
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(name);

    const handleStartRename = () => {
        setRenameValue(name);
        setIsRenaming(true);
        setMenuOpen(false);
    };

    const handleConfirmRename = () => {
        if (renameValue.trim() && renameValue.trim() !== name) {
            onRenameList && onRenameList(list.id, renameValue.trim());
        }
        setIsRenaming(false);
    };

    useEffect(() => {
        if (highlightItemId === list.id) {
            const el = document.getElementById(`list-${list.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightItemId, list.id]);

    return (
        <div id={`list-${list.id}`} className={`pd-list ${list.id === highlightItemId ? 'pd-highlight-pulse' : ''}`}>
            {/* List Header */}
            <div className="pd-list-header">
                <div className="pd-list-header-left">
                    <span className="pd-list-dot" style={{ background: color }} />
                    {isRenaming ? (
                        <input
                            autoFocus
                            className="pd-list-rename-input"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirmRename();
                                if (e.key === 'Escape') setIsRenaming(false);
                            }}
                            onBlur={handleConfirmRename}
                        />
                    ) : (
                        <h3 className="pd-list-title">{name}</h3>
                    )}
                    <span className="pd-list-count">{cards.length}</span>
                </div>
                <div className="pd-list-header-right-actions">
                    <button
                        ref={menuBtnRef}
                        className="pd-list-menu-btn"
                        title="List options"
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="8" cy="3" r="1.5" />
                            <circle cx="8" cy="8" r="1.5" />
                            <circle cx="8" cy="13" r="1.5" />
                        </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {menuOpen && (
                        <PersonalListMenu
                            anchorRef={menuBtnRef}
                            listId={list.id}
                            listName={name}
                            allLists={allLists}
                            onClose={() => setMenuOpen(false)}
                            onRename={handleStartRename}
                            onChangeColor={(clr) => {
                                onUpdateListColor && onUpdateListColor(list.id, clr);
                                setMenuOpen(false);
                            }}
                            onDuplicate={() => {
                                onDuplicateList && onDuplicateList(list.id);
                                setMenuOpen(false);
                            }}
                            onSort={(sortBy) => {
                                onSortCards && onSortCards(list.id, sortBy);
                                setMenuOpen(false);
                            }}
                            onMoveAll={(toListId) => {
                                onMoveAllCards && onMoveAllCards(list.id, toListId, cards);
                                setMenuOpen(false);
                            }}
                            onArchive={() => {
                                if (window.confirm(`Archive list "${name}"? This will delete the list and all its cards.`)) {
                                    onDeleteList && onDeleteList(list.id);
                                }
                                setMenuOpen(false);
                            }}
                            onDelete={() => {
                                if (window.confirm(`Delete list "${name}"? This cannot be undone.`)) {
                                    onDeleteList && onDeleteList(list.id);
                                }
                                setMenuOpen(false);
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Cards */}
            <div className="pd-list-body">
                {cards.map((card, index) => (
                    <PersonalCard
                        key={card.id}
                        card={card}
                        index={index}
                        listColor={color}
                        listId={list.id}
                        allLists={allLists}
                        onClick={() => onCardClick && onCardClick(card, name, color)}
                        onMoveCard={onMoveCard}
                        highlightItemId={highlightItemId}
                    />
                ))}
            </div>

            {/* Add Card Button — opens Create Modal */}
            <div className="pd-list-footer">
                <button 
                    className="pd-add-card-btn"
                    onClick={() => onAddTask && onAddTask(list.id)}
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M7 2v10M2 7h10" strokeLinecap="round" />
                    </svg>
                    <span>Add Task</span>
                </button>
            </div>
        </div>
    );
}
