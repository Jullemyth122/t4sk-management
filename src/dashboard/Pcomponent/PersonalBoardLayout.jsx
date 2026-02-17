import React, { useState } from 'react';
import PersonalList from './PersonalList';
import PersonalCard from './PersonalCard';
import PersonalCardModal from './PersonalCardModal';
const PRIORITY_STYLES = {
    high:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'High' },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Medium' },
    low:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',   label: 'Low' },
};

function ListViewRow({ card, listName, listColor, onClick }) {
    const {
        title,
        priority,
        dueDate,
        tags = [],
        subtasksCompleted = 0,
        subtasksTotal = 0,
    } = card;

    const ps = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
    const progress = subtasksTotal > 0 ? Math.round((subtasksCompleted / subtasksTotal) * 100) : 0;
    const isDone = subtasksTotal > 0 && subtasksCompleted === subtasksTotal;

    const formattedDate = dueDate
        ? new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : null;

    const isOverdue = dueDate && new Date(dueDate) < new Date() && !isDone;

    return (
        <div
            className={`pd-listview-row ${isDone ? 'pd-listview-row--done' : ''}`}
            onClick={() => onClick && onClick(card, listName, listColor)}
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
                                    background: isDone ? '#10b981' : listColor || ps.color,
                                }}
                            />
                        </div>
                        <span className="pd-progress-label">{subtasksCompleted}/{subtasksTotal}</span>
                    </>
                )}
            </div>

            {/* Priority */}
            <span
                className="pd-priority-badge"
                style={{ color: ps.color, background: ps.bg }}
            >
                {ps.label}
            </span>

            {/* Due Date */}
            <span className={`pd-due-badge ${isOverdue ? 'overdue' : ''}`}>
                {formattedDate && (
                    <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <circle cx="6" cy="6" r="5" />
                            <path d="M6 3v3.5l2.5 1" strokeLinecap="round" />
                        </svg>
                        {formattedDate}
                    </>
                )}
            </span>
        </div>
    );
}



export default function PersonalBoardLayout({ viewMode = 'board', lists, onAddList, onAddTask }) {
    const [selectedCard, setSelectedCard] = useState(null);

    const [selectedListName, setSelectedListName] = useState('');
    const [selectedListColor, setSelectedListColor] = useState('');

    const handleCardClick = (card, listName, listColor) => {
        setSelectedCard(card);
        setSelectedListName(listName);
        setSelectedListColor(listColor);
    };

    const handleCloseModal = () => {
        setSelectedCard(null);
        setSelectedListName('');
        setSelectedListColor('');
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
                                    onClick={handleCardClick}
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
                            onCardClick={handleCardClick}
                            onAddTask={onAddTask}
                        />
                    ))}

                    {/* Add List Placeholder */}
                    <div className="pd-add-list">
                        <button 
                            className="pd-add-list-btn"
                            onClick={onAddList}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                            </svg>
                            <span>Add List</span>
                        </button>
                    </div>
                </div>
            )}


            {/* Card Detail Modal */}
            {selectedCard && (
                <PersonalCardModal
                    card={selectedCard}
                    listName={selectedListName}
                    listColor={selectedListColor}
                    onClose={handleCloseModal}
                />
            )}
        </>
    );
}
