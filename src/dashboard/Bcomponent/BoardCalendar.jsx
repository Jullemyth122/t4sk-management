import { useState, useMemo } from 'react';

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
    loadMoreCards,
    resetLimitCards,
    cardsHasMoreMap,
    cardsLimitsMap,
    cardsBaseLimit,
    highlightCardIds,
    highlightColor
}) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [maxVisibleLanes, setMaxVisibleLanes] = useState(3);

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
        const seenIds = new Set();

        lists.forEach(list => {
            (cardsMap[list.id] || []).forEach(card => {
                if (seenIds.has(card.id)) return;
                seenIds.add(card.id);

                let start = parseDate(card.startDate);
                let end = parseDate(card.dueDate);
                if (!start && !end) return;

                start = start || end;
                end = end || start;

                if (start.getTime() > end.getTime()) {
                    const temp = start;
                    start = end;
                    end = temp;
                }

                result.push({
                    id: card.id,
                    card,
                    listColor: list.color || '#667eea',
                    listName: list.name,
                    start,
                    end,
                });
            });
        });
        result.sort((a, b) => {
            const d = a.start.getTime() - b.start.getTime();
            if (d !== 0) return d;
            return (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime());
        });
        return result;
    }, [lists, cardsMap]);

    // ---------- Compute bar placements for each week ----------
    const weekPlacements = useMemo(() => {
        const laneMemory = {};

        // Clamp boundaries: only render events that touch the current month
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0); // last day of month

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
                let startCol, endCol;

                // Clamp the visible portion of the event to this week
                const visStart = ev.start.getTime() < wStart ? firstDate : ev.start;
                const visEnd = ev.end.getTime() > wEnd ? lastDate : ev.end;

                // Find column index by matching date in weekDates array
                startCol = weekDates.findIndex(d => d && d.getTime() === visStart.getTime());
                endCol = weekDates.findIndex(d => d && d.getTime() === visEnd.getTime());

                // Fallback: if exact match not found, find the closest valid column
                if (startCol < 0) startCol = weekDates.findIndex(d => d !== null);
                if (endCol < 0) {
                // Find the last non-null column
                    for (let i = 6; i >= 0; i--) {
                        if (weekDates[i]) { endCol = i; break; }
                    }
                }

                // Strict safety clamp
                startCol = Math.max(0, Math.min(6, startCol));
                endCol = Math.max(startCol, Math.min(6, endCol));

                return {
                    ...ev,
                    startCol,
                    endCol,
                    continuesFromPrev: ev.start.getTime() < wStart,
                    continuesToNext: ev.end.getTime() > wEnd,
                    lane: 0
                };
            });

            // Lane assignment (stable)
            placements.sort((a, b) =>
                a.startCol - b.startCol || (b.endCol - b.startCol) - (a.endCol - a.startCol)
            );
            const laneEnds = [];
            placements.forEach(p => {
                if (laneMemory[p.id] !== undefined) {
                    // Task already has a lane assigned from a previous week. Force it to stay in that lane.
                    p.lane = laneMemory[p.id];
                    laneEnds[p.lane] = p.endCol; // update the end col for this lane
                } else {
                    let assigned = -1;
                    for (let i = 0; i < laneEnds.length; i++) {
                        // Check if lane is empty or previous task in lane ends before this one starts
                        if (laneEnds[i] === undefined || laneEnds[i] < p.startCol) {
                            assigned = i;
                            laneEnds[i] = p.endCol;
                            break;
                        }
                    }
                    if (assigned === -1) {
                        // Create a new lane
                        assigned = laneEnds.length;
                        laneEnds.push(p.endCol);
                    }
                    p.lane = assigned;
                    laneMemory[p.id] = assigned; // Remember this lane for future weeks
                }
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
                <div className="bd-calendar-controls" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <h2 className="bd-calendar-title" style={{ margin: 0 }}>
                            {monthNames[month]} {year}
                        </h2>

                        {/* Global Pagination Actions */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {loadMoreCards && cardsHasMoreMap && Object.values(cardsHasMoreMap).some(Boolean) && (
                                <button
                                    className="bd-btn bd-btn--small"
                                    style={{ backgroundColor: "#2d3748", color: "#e2e8f0", border: "1px solid #4a5568", fontSize: "0.75rem", padding: "4px 8px" }}
                                    onClick={() => {
                                        lists.forEach(l => {
                                            if (cardsHasMoreMap[l.id]) {
                                                loadMoreCards(l.id);
                                            }
                                        });
                                    }}
                                >
                                    ↓ Load More Tasks
                                </button>
                            )}
                            {resetLimitCards && cardsLimitsMap && cardsBaseLimit && Object.values(cardsLimitsMap).some(v => v > cardsBaseLimit) && (
                                <button
                                    className="bd-btn bd-btn--small"
                                    style={{ backgroundColor: "transparent", color: "#a0aec0", border: "1px solid #4a5568", fontSize: "0.75rem", padding: "4px 8px" }}
                                    onClick={() => {
                                        lists.forEach(l => {
                                            if (cardsLimitsMap[l.id] > cardsBaseLimit) {
                                                resetLimitCards(l.id);
                                            }
                                        });
                                        setMaxVisibleLanes(3); // Reset calendar lanes as well
                                    }}
                                >
                                    ↑ Show Less
                                </button>
                            )}
                            {/* Expand/Collapse calendar lanes toggle (independent of fetching) */}
                            {maxVisibleLanes === 3 ? (
                                <button
                                    className="bd-btn bd-btn--small"
                                    style={{ backgroundColor: "transparent", color: "#a0aec0", border: "1px solid #4a5568", fontSize: "0.75rem", padding: "4px 8px" }}
                                    onClick={() => setMaxVisibleLanes(10)}
                                    title="Expand calendar rows"
                                >
                                    ⤓ Expand Calendar View
                                </button>
                            ) : (
                                <button
                                    className="bd-btn bd-btn--small"
                                    style={{ backgroundColor: "transparent", color: "#a0aec0", border: "1px solid #4a5568", fontSize: "0.75rem", padding: "4px 8px" }}
                                    onClick={() => setMaxVisibleLanes(3)}
                                    title="Collapse calendar rows"
                                >
                                    ⤒ Collapse Calendar View
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bd-calendar-nav" style={{ marginLeft: 'auto' }}>
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
                    const visible = placements.filter(p => p.lane < maxVisibleLanes);
                    const hidden = placements.filter(p => p.lane >= maxVisibleLanes);

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
                                {visible.map(p => {
                                    // Inline overdue logic for Calendar
                                    const now = new Date();
                                    const isDone = String(p.card.status || '').toLowerCase() === 'done';
                                    const isApproved = String(p.card.submission?.reviewStatus || '').toLowerCase() === 'approved';
                                    const isOverdue = p.card.dueDate && new Date(p.card.dueDate.seconds ? p.card.dueDate.seconds * 1000 : p.card.dueDate) < now && !isDone && !isApproved;

                                    const isHighlighted = highlightCardIds && highlightCardIds.has(p.id);
                                    let itemBg = isOverdue ? 'transparent' : p.listColor;
                                    let itemBorder = isOverdue ? '2px solid #f56565' : 'none';
                                    let itemShadow = isOverdue ? '0 0 8px rgba(245, 101, 101, 0.6)' : 'none';
                                    let itemColor = isOverdue ? '#f56565' : undefined;

                                    if (isHighlighted) {
                                        itemBg = 'transparent';
                                        itemBorder = `2px solid ${highlightColor || '#eab308'}`;
                                        itemShadow = `0 0 12px ${highlightColor || '#eab308'}`;
                                        itemColor = highlightColor || '#eab308';
                                    }

                                    return (
                                        <div
                                            key={p.id}
                                            className={`bd-cal-bar ${p.continuesFromPrev ? 'cont-left' : ''} ${p.continuesToNext ? 'cont-right' : ''} ${isOverdue ? 'calendar-bar-overdue' : ''} ${isHighlighted ? 'highlight-pulse' : ''}`}
                                            style={{
                                                gridColumn: `${p.startCol + 1} / ${p.endCol + 2}`,
                                                gridRow: p.lane + 1,
                                                backgroundColor: itemBg,
                                                border: itemBorder,
                                                boxShadow: itemShadow,
                                                color: itemColor
                                            }}
                                            title={`${p.card.title}\n${formatShort(p.start)} – ${formatShort(p.end)}\nList: ${p.listName}${isOverdue ? '\n⚠️ OVERDUE' : ''}${isHighlighted ? '\n✨ HIGHLIGHTED' : ''}`}
                                        >
                                            <span className="bd-cal-bar-title">{p.card.title}</span>
                                        </div>
                                    );
                                })}

                                {/* "+N more" when too many bars */}
                                {hidden.length > 0 && maxVisibleLanes === 3 && (
                                    <div
                                        className="bd-cal-more"
                                        style={{
                                            gridColumn: '1 / -1',
                                            gridRow: maxVisibleLanes + 1,
                                            cursor: 'pointer',
                                            textDecoration: 'underline'
                                        }}
                                        onClick={() => setMaxVisibleLanes(10)}
                                        title="Click to expand full calendar list"
                                    >
                                        +{hidden.length} more
                                    </div>
                                )}

                                {/* "Show Less" when bars expanded */}
                                {placements.length > 3 && maxVisibleLanes > 3 && (
                                    <div
                                        className="bd-cal-less"
                                        style={{
                                            gridColumn: '1 / -1',
                                            gridRow: placements.length + 1, // Place below all visible internal rows naturally
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                            fontSize: '0.75rem',
                                            color: '#a0aec0',
                                            paddingLeft: '0.25rem',
                                            marginTop: '4px'
                                        }}
                                        onClick={() => setMaxVisibleLanes(3)}
                                        title="Click to collapse calendar list"
                                    >
                                        ↑ Show less
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
