import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    CartesianGrid, Legend 
} from 'recharts';

export default function AIUsageGraph({ businessId }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!businessId) return;

        const fetchData = async () => {
            try {
                const q = query(
                    collection(db, "businesses", businessId, "analytics", "ai_usage", "logs"),
                    orderBy("timestamp", "desc"),
                    limit(50)
                );
                const snapshot = await getDocs(q);
                
                // Process raw logs into daily/aggregated data
                const rawLogs = snapshot.docs.map(doc => {
                    const d = doc.data();
                    return {
                        ...d,
                        date: d.timestamp?.toDate ? d.timestamp.toDate() : new Date()
                    };
                });

                // Group by date (DD/MM)
                const grouped = {};
                rawLogs.forEach(log => {
                    const key = log.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    if (!grouped[key]) grouped[key] = { name: key, tasksCount: 0, timeSavedMinutes: 0 };
                    grouped[key].tasksCount += (log.tasksCount || 0);
                    grouped[key].timeSavedMinutes += (log.timeSavedMinutes || 0);
                });

                // Convert to array and reverse to show chronological order
                const chartData = Object.values(grouped).reverse();
                setData(chartData);
            } catch (err) {
                console.error("Failed to fetch AI analytics", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [businessId]);

    if (loading) return <div className="p-4 text-gray-500">Loading AI insights...</div>;
    
    // Fallback if no data populated yet
    if (data.length === 0) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                <h3>No AI Usage Data Yet</h3>
                <p>Use the OCR feature to import tasks and see your time savings here.</p>
            </div>
        );
    }

    return (
        <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '20px' }}>AI Utility Insights</h3>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            stroke="#888" 
                            tick={{ fill: '#888' }} 
                        />
                        <YAxis 
                            yAxisId="left" 
                            stroke="#888" 
                            tick={{ fill: '#888' }} 
                        />
                        <YAxis 
                            yAxisId="right" 
                            orientation="right" 
                            stroke="#82ca9d" 
                            tick={{ fill: '#82ca9d' }} 
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#222', borderColor: '#444', color: '#fff' }} 
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="tasksCount" name="Tasks Digitized" fill="#8884d8" barSize={30} />
                        <Bar yAxisId="right" dataKey="timeSavedMinutes" name="Time Saved (mins)" fill="#82ca9d" barSize={30} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
                <p>Estimated time saved based on manual entry reduction.</p>
            </div>
        </div>
    );
}
