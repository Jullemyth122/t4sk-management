import React, { useState, useEffect } from 'react';
import { getTodayTasks } from '../../services/boardService';

export default function TodayView({ uid, onTaskClick }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const fetchTasks = async () => {
            setLoading(true);
            const todayTasks = await getTodayTasks({ uid });
            if (mounted) {
                setTasks(todayTasks);
                setLoading(false);
            }
        };
        fetchTasks();
        return () => { mounted = false; };
    }, [uid]);

    // Group tasks by board
    const grouped = tasks.reduce((acc, t) => {
        const b = t.boardId || 'Unknown Board';
        if (!acc[b]) acc[b] = [];
        acc[b].push(t);
        return acc;
    }, {});

    if (loading) {
        return <div className="pd-today-view-loading">Loading today's tasks...</div>;
    }

    if (tasks.length === 0) {
        return (
            <div className="pd-today-view-empty">
                <h3>You're all caught up!</h3>
                <p>No tasks due today or overdue.</p>
            </div>
        );
    }

    return (
        <div className="pd-today-view">
            <h2 className="pd-today-header">Today's Focus</h2>
            <div className="pd-today-content">
                {Object.entries(grouped).map(([boardId, boardTasks]) => (
                    <div key={boardId} className="pd-today-group">
                        <div className="pd-today-group-header">
                            <span className="pd-board-icon">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M4 5h8M4 8h8M4 11h5" strokeLinecap="round" />
                                </svg>
                            </span>
                            <span className="pd-today-group-title">Board ID: {boardId}</span>
                        </div>
                        <div className="pd-today-list">
                            {boardTasks.map((task) => (
                                <div 
                                    key={task.id} 
                                    className="pd-listview-row pd-today-task-row"
                                    onClick={() => onTaskClick(boardId, task.id)}
                                >
                                    <span className="pd-listview-dot" style={{ background: '#f59e0b' }} />
                                    <div className="pd-listview-title-col">
                                        <span className="pd-listview-title">{task.title}</span>
                                    </div>
                                    <span className="pd-due-badge" style={task.isOverdue ? { color: '#ef4444', fontWeight: 'bold' } : {}}>
                                        {task.isOverdue ? 'Overdue' : 'Due Today'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
