import React, { useState, useEffect, useRef } from 'react';

export default function PomodoroTimer({ 
    cardId, 
    initialTimeSpent = 0, 
    onSessionComplete,
    onTimerStateChange
}) {
    const [focusSeconds, setFocusSeconds] = useState(25 * 60);
    const [breakSeconds, setBreakSeconds] = useState(5 * 60);
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editStr, setEditStr] = useState('');
    
    const intervalRef = useRef(null);

    const playAlarm = () => {
        try {
            const audio = new Audio('/service-bell.wav');
            audio.play().catch(e => console.warn('Audio play failed', e));
        } catch (e) { console.warn('Audio initialization failed', e); }
    };

    // Notify parent when timer starts/stops
    useEffect(() => {
        if (onTimerStateChange) onTimerStateChange(isActive);
    }, [isActive, onTimerStateChange]);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (isActive && timeLeft === 0) {
            clearInterval(intervalRef.current);
            setIsActive(false);
            playAlarm();
            
            if (!isBreak && onSessionComplete) {
                onSessionComplete(Math.round(focusSeconds / 60));
                setIsBreak(true);
                setTimeLeft(breakSeconds); 
            } else if (isBreak) {
                setIsBreak(false);
                setTimeLeft(focusSeconds);
            }
        }
        return () => clearInterval(intervalRef.current);
    }, [isActive, timeLeft, isBreak, onSessionComplete, focusSeconds, breakSeconds]);

    const toggleTimer = (e) => {
        e.stopPropagation();
        if (isEditing) setIsEditing(false);
        if (timeLeft <= 0) setTimeLeft(isBreak ? breakSeconds : focusSeconds);
        setIsActive(!isActive);
    };

    const resetTimer = (e) => {
        e.stopPropagation();
        setIsActive(false);
        setIsBreak(false);
        setTimeLeft(focusSeconds);
        setIsEditing(false);
    };

    const handleEditClick = () => {
        if (isActive) return;
        setEditStr(formatTime(timeLeft));
        setIsEditing(true);
    };

    const handleTimeSubmit = (e) => {
        e.preventDefault();
        setIsEditing(false);
        
        let m = 0, s = 0;
        if (editStr.includes(':')) {
            const parts = editStr.split(':');
            m = parseInt(parts[0], 10) || 0;
            s = parseInt(parts[1], 10) || 0;
        } else {
            const val = parseFloat(editStr.replace(',', '.'));
            if (!isNaN(val)) {
                m = Math.floor(val);
                s = Math.round((val % 1) * 60);
            }
        }
        
        let totalSecs = (m * 60) + s;
        if (totalSecs <= 0) totalSecs = isBreak ? breakSeconds : focusSeconds; 
        
        if (isBreak) {
            setBreakSeconds(totalSecs);
        } else {
            setFocusSeconds(totalSecs);
        }
        setTimeLeft(totalSecs);
    };

    const formatTime = (seconds) => {
        if (seconds < 0) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getProgressPct = () => {
        const total = isBreak ? breakSeconds : focusSeconds;
        if (total === 0) return 0;
        return ((total - timeLeft) / total) * 100;
    };

    return (
        <div className={`pd-pomodoro ${isActive ? 'active' : ''} ${isBreak ? 'break' : ''}`}>
            <div className="pd-pomodoro-header">
                <span className="pd-pomodoro-title">
                    {isBreak ? '☕ Break Time' : '🍅 Focus Session'}
                </span>
                <span className="pd-pomodoro-stats">
                    {initialTimeSpent > 0 ? `${initialTimeSpent}m total` : '0m total'}
                </span>
            </div>
            
            <div className="pd-pomodoro-display">
                <div className="pd-pomodoro-time" onClick={handleEditClick}>
                    {isEditing ? (
                        <form onSubmit={handleTimeSubmit} style={{ margin: 0, display: 'flex', justifyContent: 'center' }}>
                            <input 
                                type="text" 
                                autoFocus 
                                className="pd-pomodoro-input"
                                value={editStr} 
                                onChange={e => setEditStr(e.target.value)} 
                                onBlur={handleTimeSubmit}
                                style={{ width: '100%', textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '2px solid rgba(255,255,255,0.3)', color: 'inherit', outline: 'none', padding: 0 }}
                                placeholder="00:00"
                            />
                        </form>
                    ) : (
                        <span title="Click to edit time" style={{cursor: isActive ? 'default' : 'pointer'}}>
                            {formatTime(timeLeft)}
                        </span>
                    )}
                </div>
                {!isEditing && (
                    <div className="pd-pomodoro-controls">
                        <button 
                            className={`pd-pomodoro-btn ${isActive ? 'pause' : 'play'}`}
                            onClick={toggleTimer}
                        >
                            {isActive ? 'Pause' : 'Start Focus'}
                        </button>
                        <button 
                            className="pd-pomodoro-btn reset"
                            onClick={resetTimer}
                        >
                            Reset
                        </button>
                    </div>
                )}
            </div>
            
            <div className="pd-pomodoro-progress-bg">
                <div 
                    className="pd-pomodoro-progress-fill" 
                    style={{ width: `${getProgressPct()}%` }}
                />
            </div>
        </div>
    );
}
