import React, { useState, useRef } from 'react';
import PersonalCard from './PersonalCard';
import PersonalListMenu from './PersonalListMenu';

export default function PersonalList({ list, onCardClick, onAddTask, highlightItemId }) {

    const { id, name, color, cards } = list;
    const [menuOpen, setMenuOpen] = useState(false);
    const menuBtnRef = useRef(null);

    const highlightClass = id === highlightItemId ? 'pd-highlight-pulse' : '';

    React.useEffect(() => {
        if (highlightItemId === id) {
            const el = document.getElementById(`list-${id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightItemId, id]);

    return (
        <div id={`list-${id}`} className={`pd-list ${highlightClass}`}>
            {/* List Header */}
            <div className="pd-list-header">
                <div className="pd-list-header-left">
                    <span className="pd-list-dot" style={{ background: color }} />
                    <h3 className="pd-list-title">{name}</h3>
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
                            listName={name}
                            onClose={() => setMenuOpen(false)}
                        />
                    )}
                </div>
            </div>

            {/* Cards */}
            <div className="pd-list-body">
                {cards.map(card => (
                    <PersonalCard
                        key={card.id}
                        card={card}
                        listColor={color}
                        onClick={() => onCardClick && onCardClick(card, name, color)}
                        highlightItemId={highlightItemId}
                    />
                ))}
            </div>

            {/* Add Card Button */}
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
