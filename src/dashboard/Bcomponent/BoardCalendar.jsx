import React, { useState, useMemo } from 'react';

const MAX_VISIBLE_LANES = 3;

const parseDate = (val) => {
    if (!val) return null;
    const d = new Date(val.seconds ? val.seconds * 1000 : val);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const formatShort = (d) =>
    d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function BoardCalendar({
    lists,
    cardsMap,
    membersMap,
    emailMap,
    businessOwnerUid,
    currentUserUid,
    currentUserEmail,
    handleUpdateCard,
    handleDeleteCard,
    handleSubmitCard,
    handleReviewAction,
    canEdit,
    reviewerOptions
}) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // ---------- Build weeks ----------
    const weeks = useMemo(() => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        const allDays = [];
        for (let i = 0; i < firstDay; i++) allDays.push(null);
        for (let d = 1; d <= daysInMonth; d++) allDays.push(new Date(year, month, d));
        while (allDays.length % 7 !== 0) allDays.push(null);

        const result = [];
        for (let i = 0; i < allDays.length; i += 7) {
            result.push(allDays.slice(i, i + 7));
        }
        return result;
    }, [year, month]);

    // ---------- Parse events ----------
    const events = useMemo(() => {
        const result = [];
        lists.forEach(list => {
            (cardsMap[list.id] || []).forEach(card => {
                const start = parseDate(card.startDate);
                const end = parseDate(card.dueDate);
                if (!start && !end) return;
                result.push({
                    id: card.id,
                    card,
                    listColor: list.color || '#667eea',
                    listName: list.name,
                    start: start || end,
                    end: end || start,
                });
            });
        });
        // Sort: earliest start first, then longest span first
        result.sort((a, b) => {
            const d = a.start.getTime() - b.start.getTime();
            if (d !== 0) return d;
            return (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime());
        });
        return result;
    }, [lists, cardsMap]);

    // ---------- Compute bar placements for each week ----------
    const weekPlacements = useMemo(() => {
        return weeks.map(weekDates => {
            const firstDate = weekDates.find(d => d);
            const lastDate = [...weekDates].reverse().find(d => d);
            if (!firstDate || !lastDate) return [];

            const wStart = firstDate.getTime();
            const wEnd = lastDate.getTime();

            // Find events overlapping this week
            const overlapping = events.filter(ev =>
                ev.start.getTime() <= wEnd && ev.end.getTime() >= wStart
            );

            const placements = overlapping.map(ev => {
                // Compute which column the bar starts and ends in (0-6)
                let startCol, endCol;

                if (ev.start.getTime() < wStart) {
                    startCol = weekDates.findIndex(d => d !== null);
                } else {
                    const idx = weekDates.findIndex(d => d && d.getTime() === ev.start.getTime());
                    startCol = idx >= 0 ? idx : 0;
                }

                if (ev.end.getTime() > wEnd) {
                    for (let i = 6; i >= 0; i--) {
                        if (weekDates[i]) { endCol = i; break; }
                    }
                } else {
                    const idx = weekDates.findIndex(d => d && d.getTime() === ev.end.getTime());
                    endCol = idx >= 0 ? idx : 6;
                }

                return {
                    ...ev,
                    startCol,
                    endCol,
                    continuesFromPrev: ev.start.getTime() < wStart,
                    continuesToNext: ev.end.getTime() > wEnd,
                    lane: 0
                };
            });

            // Lane assignment (greedy)
            placements.sort((a, b) =>
                a.startCol - b.startCol || (b.endCol - b.startCol) - (a.endCol - a.startCol)
            );
            const laneEnds = [];
            placements.forEach(p => {
                let assigned = -1;
                for (let i = 0; i < laneEnds.length; i++) {
                    if (laneEnds[i] < p.startCol) {
                        assigned = i;
                        laneEnds[i] = p.endCol;
                        break;
                    }
                }
                if (assigned === -1) {
                    assigned = laneEnds.length;
                    laneEnds.push(p.endCol);
                }
                p.lane = assigned;
            });

            return placements;
        });
    }, [weeks, events]);

    // ---------- Navigation ----------
    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const handleToday = () => setCurrentDate(new Date());

    // ---------- Render ----------
    return (
        <div className="bd-calendar-view">
            {/* Header */}
            <div className="bd-calendar-header">
                <div className="bd-calendar-controls">
                    <h2 className="bd-calendar-title">
                        {monthNames[month]} {year}
                    </h2>
                    <div className="bd-calendar-nav">
                        <button onClick={handlePrevMonth} className="bd-cal-nav-btn">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                        <button onClick={handleToday} className="bd-cal-today-btn">Today</button>
                        <button onClick={handleNextMonth} className="bd-cal-nav-btn">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M6 12l4-4-4-4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar body */}
            <div className="bd-calendar-body">
                {/* Day-of-week headers */}
                <div className="bd-calendar-dow-row">
                    {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                        <div key={d} className="bd-calendar-day-header">{d}</div>
                    ))}
                </div>

                {/* Week rows */}
                {weeks.map((weekDates, wi) => {
                    const placements = weekPlacements[wi] || [];
                    const visible = placements.filter(p => p.lane < MAX_VISIBLE_LANES);
                    const hidden = placements.filter(p => p.lane >= MAX_VISIBLE_LANES);

                    return (
                        <div key={wi} className="bd-calendar-week-row">
                            {/* Day number labels */}
                            <div className="bd-week-header">
                                {weekDates.map((date, di) => {
                                    const isToday = date && new Date().toDateString() === date.toDateString();
                                    return (
                                        <div
                                            key={di}
                                            className={`bd-day-label ${!date ? 'empty' : ''} ${isToday ? 'today' : ''}`}
                                        >
                                            {date && (
                                                <span className={`bd-day-number ${isToday ? 'is-today' : ''}`}>
                                                    {date.getDate()}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Event bars area */}
                            <div className="bd-week-events">
                                {visible.map(p => (
                                    <div
                                        key={p.id}
                                        className={`bd-cal-bar ${p.continuesFromPrev ? 'cont-left' : ''} ${p.continuesToNext ? 'cont-right' : ''}`}
                                        style={{
                                            gridColumn: `${p.startCol + 1} / ${p.endCol + 2}`,
                                            gridRow: p.lane + 1,
                                            backgroundColor: p.listColor,
                                        }}
                                        title={`${p.card.title}\n${formatShort(p.start)} – ${formatShort(p.end)}\nList: ${p.listName}`}
                                    >
                                        <span className="bd-cal-bar-title">{p.card.title}</span>
                                    </div>
                                ))}

                                {/* "+N more" when too many bars */}
                                {hidden.length > 0 && (
                                    <div
                                        className="bd-cal-more"
                                        style={{ gridColumn: '1 / -1', gridRow: MAX_VISIBLE_LANES + 1 }}
                                    >
                                        +{hidden.length} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
