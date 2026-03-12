import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clearNotifications } from '../services/accountService';
import '../scss/notifications.scss';

const BELL_COOLDOWN_MS = 3 * 60 * 1; // 3 minutes

const IconBell = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const NotificationDropdown = ({ notifications = [], uid }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const prevCountRef = useRef(notifications.length);
    const lastBellTimeRef = useRef(null);

    // Play bell sound when new notifications arrive, with a 3-minute cooldown
    useEffect(() => {
        const currentCount = notifications.length;
        const prevCount = prevCountRef.current;

        if (currentCount > prevCount) {
            const now = Date.now();
            const timeSinceLast = lastBellTimeRef.current ? now - lastBellTimeRef.current : Infinity;

            if (timeSinceLast >= BELL_COOLDOWN_MS) {
                const audio = new Audio('./service-bell.wav');
                audio.play().catch(() => {
                    // Browser may block autoplay before user interaction — silently ignore
                });
                lastBellTimeRef.current = now;
            }
        }

        prevCountRef.current = currentCount;
    }, [notifications.length]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleClear = async () => {
        await clearNotifications(uid);
    };

    return (
        <div className="notification-dropdown-container" ref={dropdownRef}>
            <button
                className={`notification-btn ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Notifications"
                aria-label="Notifications"
            >
                <IconBell />
                {notifications.length > 0 && (
                    <span className="badge">
                        {notifications.length > 99 ? '99+' : notifications.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="dropdown-menu">
                    <div className="dropdown-header">
                        <h4>Notifications</h4>
                        {notifications.length > 0 && (
                            <button onClick={handleClear}>
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className="dropdown-body">
                        {notifications.length === 0 ? (
                            <div className="empty-state">
                                No new notifications
                            </div>
                        ) : (
                            <ul className="notif-list">
                                {[...notifications].reverse().map((notif, idx) => (
                                    <li key={notif.id || idx} className="notif-item">
                                        <Link 
                                            to={notif.link || '#'} 
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <div className="notif-top">
                                                <strong>{notif.title}</strong>
                                                <span>
                                                    {notif.createdAt?.seconds 
                                                        ? new Date(notif.createdAt.seconds * 1000).toLocaleDateString() 
                                                        : ''}
                                                </span>
                                            </div>
                                            <p>{notif.message}</p>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
