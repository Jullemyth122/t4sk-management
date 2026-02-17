import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

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
    // Assuming 'Done' list is the completion criteria, or we could check subtasks
    // Let's use the 'Done' list name if it exists, otherwise relying on list names
    const doneList = lists.find(l => l.name === 'Done');
    const completedTasks = doneList ? doneList.cards.length : 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
            </div>
        </div>
    );
}
