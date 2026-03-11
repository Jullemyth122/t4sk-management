import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function PersonalStatistics({ lists }) {
    // 1. Calculate Tasks by Status (List)
    const tasksByStatus = lists.map(list => ({
        name: list.name,
        value: list.cards.length,
        color: list.color
    }));

    // 2. Calculate Tasks by Priority
    const allCards = lists.flatMap(l => l.cards);
    
    const priorityCounts = { High: 0, Medium: 0, Low: 0 };
    allCards.forEach(card => {
        const p = card.priority.charAt(0).toUpperCase() + card.priority.slice(1);
        if (priorityCounts[p] !== undefined) {
            priorityCounts[p]++;
        }
    });

    const tasksByPriority = [
        { name: 'High', value: priorityCounts.High, color: '#ef4444' },
        { name: 'Medium', value: priorityCounts.Medium, color: '#f59e0b' },
        { name: 'Low', value: priorityCounts.Low, color: '#10b981' },
    ];

    // 3. Overall Completion
    const totalTasks = allCards.length;
    // Calculate done tasks based on progress or status
    const completedTasksCards = allCards.filter(c => c.status === 'done' || (c.subtasksTotal > 0 && c.subtasksCompleted === c.subtasksTotal) || c.progress === 100);
    const completedTasks = completedTasksCards.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 4. Time Tracking
    const totalTimeSpent = allCards.reduce((sum, c) => sum + (Number(c.timeSpent) || 0), 0);
    const formattedTime = totalTimeSpent >= 60 ? `${Math.floor(totalTimeSpent/60)}h ${totalTimeSpent%60}m` : `${totalTimeSpent}m`;

    // 5. Velocity (Completed over last 7 days)
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - (6 - i));
        return {
            dateStr: d.toISOString().slice(0, 10),
            display: d.toLocaleDateString(undefined, { weekday: 'short' }),
            completed: 0
        };
    });

    completedTasksCards.forEach(card => {
        // Find completion date
        let cDate = null;
        if (card.completedAt) {
            const d = card.completedAt.seconds ? new Date(card.completedAt.seconds * 1000) : new Date(card.completedAt);
            if (!isNaN(d.getTime())) cDate = d.toISOString().slice(0, 10);
        } else if (card.dueDate && card.progress === 100) {
            // fallback if no completedAt but is done, assume due date or today
            const d = card.dueDate.seconds ? new Date(card.dueDate.seconds * 1000) : new Date(card.dueDate);
            if (!isNaN(d.getTime())) cDate = d.toISOString().slice(0, 10);
            if (!cDate || cDate > today.toISOString().slice(0, 10)) cDate = today.toISOString().slice(0, 10); // cap fallback to today
        }
        
        if (cDate) {
            const dayObj = last7Days.find(d => d.dateStr === cDate);
            if (dayObj) dayObj.completed++;
        }
    });

    return (
        <div className="pd-stats-view">
            <h2 className="pd-stats-title">Dashboard Statistics</h2>
            
            <div className="pd-stats-grid">
                {/* Summary Cards */}
                <div className="pd-stat-card summary">
                    <h3>Total Tasks</h3>
                    <div className="pd-stat-value">{totalTasks}</div>
                </div>
                <div className="pd-stat-card summary">
                    <h3>Completed</h3>
                    <div className="pd-stat-value">{completedTasks}</div>
                </div>
                <div className="pd-stat-card summary">
                    <h3>Completion Rate</h3>
                    <div className="pd-stat-value">{completionRate}%</div>
                </div>
                <div className="pd-stat-card summary">
                    <h3>Focus Time</h3>
                    <div className="pd-stat-value">{formattedTime}</div>
                </div>

                {/* Charts */}
                <div className="pd-stat-card chart-card">
                    <h3>Tasks by Status</h3>
                    <div className="pd-chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={tasksByStatus}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {tasksByStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="pd-stat-card chart-card">
                    <h3>Tasks by Priority</h3>
                    <div className="pd-chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={tasksByPriority} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                    {tasksByPriority.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="pd-stat-card chart-card" style={{ gridColumn: '1 / -1' }}>
                    <h3>Velocity (Last 7 Days)</h3>
                    <div className="pd-chart-container" style={{ height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={last7Days}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.1)" />
                                <XAxis dataKey="display" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip />
                                <Line 
                                    type="monotone" 
                                    dataKey="completed" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3} 
                                    dot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
