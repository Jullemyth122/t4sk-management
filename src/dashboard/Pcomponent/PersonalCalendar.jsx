import React, { useState } from 'react';

export default function PersonalCalendar({ lists }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Helper to get days in month
    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    // Helper to get first day of month (0-6)
    const getFirstDayOfMonth = (year, month) => {
        return new Date(year, month, 1).getDay();
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    // Create matrix of days
    const days = [];
    // Padding for previous month
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    // Flatten all cards to check for due dates
    // This is "static" data processing for display
    const allCards = lists.flatMap(list => 
        list.cards.map(card => ({
            ...card,
            listColor: list.color
        }))
    );

    const getCardsForDate = (date) => {
        if (!date) return [];
        const dateString = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
        return allCards.filter(card => card.dueDate === dateString);
    };

    return (
        <div className="pd-calendar-view">
            <div className="pd-calendar-header">
                <div className="pd-calendar-controls">
                    <h2 className="pd-calendar-title">
                        {monthNames[month]} {year}
                    </h2>
                    <div className="pd-calendar-nav">
                        <button onClick={handlePrevMonth} className="pd-cal-nav-btn">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                        <button onClick={handleToday} className="pd-cal-today-btn">Today</button>
                        <button onClick={handleNextMonth} className="pd-cal-nav-btn">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M6 12l4-4-4-4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <div className="pd-calendar-grid">
                {/* Weekday Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="pd-calendar-day-header">{day}</div>
                ))}

                {/* Days */}
                {days.map((date, index) => {
                    if (!date) return <div key={`empty-${index}`} className="pd-calendar-day empty" />;
                    
                    const dayCards = getCardsForDate(date);
                    const isToday = new Date().toDateString() === date.toDateString();

                    return (
                        <div key={date.toString()} className={`pd-calendar-day ${isToday ? 'today' : ''}`}>
                            <span className="pd-day-number">{date.getDate()}</span>
                            <div className="pd-day-content">
                                {dayCards.map(card => (
                                    <div 
                                        key={card.id} 
                                        className="pd-cal-card"
                                        style={{ borderLeftColor: card.listColor }}
                                        title={card.title}
                                    >
                                        {card.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
