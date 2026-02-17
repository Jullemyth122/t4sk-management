import React, { useState } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
    PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { useBusinessAnalytics } from '../hooks/useBusinessAnalytics';

// --- Theme Colors (Pro SaaS) ---
const THEME = {
    bg: '#0f172a', // Slate 900
    card: '#1e293b', // Slate 800
    text: '#94a3b8', // Slate 400
    textHi: '#f8fafc', // Slate 50
    accent: '#6366f1', // Indigo 500
    success: '#10b981', // Emerald 500
    warning: '#f59e0b', // Amber 500
    danger: '#ef4444', // Red 500
    grid: '#334155', // Slate 700
};

const COLORS = [THEME.accent, THEME.success, THEME.warning, THEME.danger, '#8b5cf6', '#ec4899'];

// --- SVGs ---
const IconCritical = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={THEME.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>;
const IconWarning = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={THEME.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01"/></svg>;
const IconSuccess = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={THEME.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconInfo = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={THEME.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;

const InsightCard = ({ insight, onInsightClick }) => {
    let borderColor = THEME.grid;
    let Icon = IconInfo;
    let titleColor = THEME.textHi;

    if (insight.type === 'critical') { borderColor = THEME.danger; Icon = IconCritical; titleColor = THEME.danger; }
    if (insight.type === 'warning') { borderColor = THEME.warning; Icon = IconWarning; titleColor = THEME.warning; }
    if (insight.type === 'success') { borderColor = THEME.success; Icon = IconSuccess; titleColor = THEME.success; }

    const hasCards = insight.cardIds && insight.cardIds.length > 0;
    const isClickable = hasCards && onInsightClick;

    return (
        <div
            style={{
                background: `linear-gradient(to right, ${THEME.card}, rgba(30, 41, 59, 0.5))`,
                borderLeft: `4px solid ${borderColor}`,
                padding: '16px',
                borderRadius: '0 8px 8px 0',
                marginBottom: '12px',
                cursor: isClickable ? 'pointer' : 'default',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onClick={() => isClickable && onInsightClick(insight)}
            onMouseEnter={(e) => { if (isClickable) { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = `0 0 12px ${borderColor}33`; } }}
            onMouseLeave={(e) => { if (isClickable) { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; } }}
        >
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ paddingTop: 2 }}><Icon /></div>
                <div style={{ flex: 1 }}>
                    <h4 style={{ color: titleColor, margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600 }}>{insight.title}</h4>
                    <p style={{ color: THEME.text, margin: '0 0 8px 0', fontSize: '14px' }}>{insight.message}</p>
                    {insight.action && (
                        <div style={{ 
                            display: 'inline-block', 
                            background: 'rgba(255,255,255,0.05)', 
                            padding: '4px 8px', 
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: THEME.textHi 
                        }}>
                            <strong>Recommendation:</strong> {insight.action}
                        </div>
                    )}
                    {isClickable && (
                        <div style={{
                            marginTop: 8,
                            fontSize: '12px',
                            fontWeight: 600,
                            color: borderColor,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                        }}>
                            <span>View {insight.cardIds.length} Task{insight.cardIds.length > 1 ? 's' : ''} →</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function AIInsightsView({ businessId, onInsightClick }) {
    const { 
        loading, error, healthScore, completionRate, highRiskTasks, reviewBottlenecks,
        workloadData, riskData, insights 
    } = useBusinessAnalytics(businessId);
    
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' | 'performance'

    if (loading) return <div className="p-8 text-center text-slate-400">Initializing Neural Analytics...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Analytics Engine Error: {error}</div>;

    const healthColor = healthScore > 80 ? THEME.success : (healthScore > 50 ? THEME.warning : THEME.danger);

    return (
        <div className="ai-dashboard fade-in" style={{ color: THEME.text, paddingBottom: 40 }}>
            {/* View Switcher */}
            <div className="flex gap-4 mb-6 border-b border-slate-700 pb-2">
                <button 
                    onClick={() => setViewMode('dashboard')}
                    style={{ 
                        color: viewMode === 'dashboard' ? THEME.accent : THEME.text, 
                        fontWeight: viewMode === 'dashboard' ? 'bold' : 'normal',
                        borderBottom: viewMode === 'dashboard' ? `2px solid ${THEME.accent}` : 'none',
                        paddingBottom: 4
                    }}
                >
                    Project Overview
                </button>
                <button 
                    onClick={() => setViewMode('performance')}
                    style={{ 
                        color: viewMode === 'performance' ? THEME.accent : THEME.text, 
                        fontWeight: viewMode === 'performance' ? 'bold' : 'normal',
                        borderBottom: viewMode === 'performance' ? `2px solid ${THEME.accent}` : 'none',
                        paddingBottom: 4
                    }}
                >
                    Staff Performance
                </button>
            </div>

            {viewMode === 'dashboard' ? (
                <>
                    {/* --- HEADLINE METRICS --- */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        {/* Health Score */}
                        <div style={{ background: THEME.card, padding: 20, borderRadius: 12, border: `1px solid ${THEME.grid}` }}>
                            <div className="text-xs uppercase tracking-widest font-bold mb-2">Project Health</div>
                            <div style={{ fontSize: '42px', fontWeight: '800', color: healthColor }}>
                                {healthScore}/100
                            </div>
                            <div className="text-xs mt-2 opacity-80">Composite Risk Analysis</div>
                        </div>

                        {/* Risk Counter */}
                        <div style={{ background: THEME.card, padding: 20, borderRadius: 12, border: `1px solid ${THEME.grid}` }}>
                            <div className="text-xs uppercase tracking-widest font-bold mb-2">High Risk Items</div>
                            <div style={{ fontSize: '42px', fontWeight: '800', color: highRiskTasks > 0 ? THEME.danger : THEME.textHi }}>
                                {highRiskTasks}
                            </div>
                            <div className="text-xs mt-2 opacity-80">Critical / Overdue / Stalled</div>
                        </div>

                        {/* Bottlenecks */}
                        <div style={{ background: THEME.card, padding: 20, borderRadius: 12, border: `1px solid ${THEME.grid}` }}>
                            <div className="text-xs uppercase tracking-widest font-bold mb-2">Review Bottlenecks</div>
                            <div style={{ fontSize: '42px', fontWeight: '800', color: reviewBottlenecks > 0 ? THEME.warning : THEME.textHi }}>
                                {reviewBottlenecks}
                            </div>
                            <div className="text-xs mt-2 opacity-80">Stuck &#60; 48h in Review</div>
                        </div>

                        {/* Velocity */}
                        <div style={{ background: THEME.card, padding: 20, borderRadius: 12, border: `1px solid ${THEME.grid}` }}>
                            <div className="text-xs uppercase tracking-widest font-bold mb-2">Weighted Completion</div>
                            <div style={{ fontSize: '42px', fontWeight: '800', color: THEME.accent }}>
                                {completionRate}%
                            </div>
                            <div className="text-xs mt-2 opacity-80">Effort x Complexity Completed</div>
                        </div>
                    </div>

                    {/* --- AI INTELLIGENCE FEED --- */}
                    <div className="mb-8">
                        <h3 style={{ color: THEME.textHi, fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="pulse-dot"></span> AI Strategic Analysis
                        </h3>
                        <div className="insights-feed">
                            {insights.length > 0 ? (
                                insights.map((ins, i) => <InsightCard key={i} insight={ins} onInsightClick={onInsightClick} />)
                            ) : (
                                <div style={{ padding: 20, background: THEME.card, borderRadius: 8, fontStyle: 'italic' }}>
                                    System detects optimal workflow. No actionable anomalies found.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- CHARTS ROW 1 --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Workload (Weighted) */}
                        <div style={{ background: THEME.card, padding: 24, borderRadius: 12, border: `1px solid ${THEME.grid}` }}>
                            <h4 style={{ color: THEME.textHi, marginBottom: 20, fontWeight: 600 }}>Effort Distribution (Weighted)</h4>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart data={workloadData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={THEME.grid} />
                                        <XAxis type="number" stroke={THEME.text} />
                                        <YAxis dataKey="name" type="category" width={80} stroke={THEME.text} style={{fontSize: '11px'}} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: THEME.bg, borderColor: THEME.grid, color: THEME.textHi }}
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        />
                                        <Bar dataKey="weightedLoad" name="Weighted Load" fill={THEME.accent} radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="completed" name="Completed Tasks" fill={THEME.success} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Risk Distribution */}
                        <div style={{ background: THEME.card, padding: 24, borderRadius: 12, border: `1px solid ${THEME.grid}` }}>
                            <h4 style={{ color: THEME.textHi, marginBottom: 20, fontWeight: 600 }}>Risk Profile</h4>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer>
                                     <PieChart>
                                        <Pie
                                            data={riskData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {riskData.map((entry, index) => {
                                                let col = THEME.success; // low
                                                if (entry.name === 'medium') col = THEME.warning;
                                                if (entry.name === 'high') col = '#fb923c';
                                                if (entry.name === 'critical') col = THEME.danger;
                                                return <Cell key={`cell-${index}`} fill={col} />;
                                            })}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: THEME.bg, borderColor: THEME.grid }} />
                                        <Legend verticalAlign="bottom" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="fade-in">
                    {/* --- PERFORMANCE MATRIX --- */}
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div style={{ background: THEME.card, padding: 24, borderRadius: 12, border: `1px solid ${THEME.grid}` }}>
                            <h4 style={{ color: THEME.textHi, marginBottom: 20, fontWeight: 600 }}>Performance Matrix (Speed vs Reliability)</h4>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer>
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid stroke={THEME.grid} />
                                        <XAxis type="number" dataKey="speed" name="Speed (Pts/Day)" stroke={THEME.text} label={{ value: 'Speed (Pts/Day)', position: 'bottom', fill: THEME.text }} />
                                        <YAxis type="number" dataKey="reliability" name="Reliability (%)" stroke={THEME.text} label={{ value: 'Reliability (%)', angle: -90, position: 'left', fill: THEME.text }} />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: THEME.bg, borderColor: THEME.grid, color: THEME.textHi }} />
                                        <Scatter name="Staff" data={workloadData} fill={THEME.accent}>
                                            {workloadData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                             <div className="text-xs text-center mt-2 opacity-50">Top Right = High Performance</div>
                        </div>

                        {/* Leaderboard Table */}
                        <div style={{ background: THEME.card, padding: 24, borderRadius: 12, border: `1px solid ${THEME.grid}` }}>
                            <h4 style={{ color: THEME.textHi, marginBottom: 20, fontWeight: 600 }}>Staff Leaderboard</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr style={{ borderBottom: `1px solid ${THEME.grid}`, color: THEME.text }}>
                                            <th className="pb-2 text-xs uppercase">Staff</th>
                                            <th className="pb-2 text-xs uppercase text-right">Speed (Pts/Day)</th>
                                            <th className="pb-2 text-xs uppercase text-right">Reliability</th>
                                            <th className="pb-2 text-xs uppercase text-right">Total Pts</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workloadData.map((m, i) => (
                                            <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                                                <td className="py-3 font-medium" style={{ color: THEME.textHi }}>{m.name}</td>
                                                <td className="py-3 text-right" style={{ color: THEME.accent }}>{m.speed}</td>
                                                <td className="py-3 text-right">
                                                    <span style={{ 
                                                        color: m.reliability >= 90 ? THEME.success : (m.reliability >= 70 ? THEME.warning : THEME.danger) 
                                                    }}>
                                                        {m.reliability}%
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right opacity-70">{m.weightedCompleted} / {m.weightedLoad}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            <style>{`
                .pulse-dot {
                    width: 8px; height: 8px; background: ${THEME.accent}; border-radius: 50%;
                    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
                    animation: pulse-blue 2s infinite;
                }
                @keyframes pulse-blue {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                }
                .fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
