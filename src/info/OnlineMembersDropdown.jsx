import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext'; // Assuming this exists based on BusinessInfo props

/* Icons */
const IconBell = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
const IconUser = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>; // Fallback avatar

const OnlineMembersDropdown = ({ members = [], presenceData = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { theme } = useTheme(); // Use theme context if available/needed for conditional rendering logic, though SCSS handles most

    const onlineCount = members.filter(m => presenceData[m.uid]?.state === 'online').length;

    // Sort: Online first, then offline
    const sortedMembers = [...members].sort((a, b) => {
        const aOnline = presenceData[a.uid]?.state === 'online';
        const bOnline = presenceData[b.uid]?.state === 'online';
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;
        return (a.name || "").localeCompare(b.name || "");
    });

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Pagination
    const ITEMS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    
    const totalPages = Math.ceil(sortedMembers.length / ITEMS_PER_PAGE);
    const paginatedMembers = sortedMembers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePrev = (e) => {
        e.stopPropagation();
        if (currentPage > 1) setCurrentPage(p => p - 1);
    };

    const handleNext = (e) => {
        e.stopPropagation();
        if (currentPage < totalPages) setCurrentPage(p => p + 1);
    };

    return (
        <div className="online-members-dropdown-container" ref={dropdownRef}>
            <button 
                className={`online-members-btn ${isOpen ? 'active' : ''}`} 
                onClick={() => setIsOpen(!isOpen)}
                title="Team Members"
                aria-label="Team Members"
            >
                <IconUser />
                {onlineCount > 0 && (
                    <span className="badge">{onlineCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="dropdown-menu">
                    <div className="dropdown-header">
                        <h4>Team Members</h4>
                        <span className="count">{onlineCount} online / {members.length} total</span>
                    </div>
                    <div className="dropdown-body">
                        {sortedMembers.length === 0 ? (
                            <div className="empty-state">
                                <p>No members found.</p>
                            </div>
                        ) : (
                            <>
                                <ul className="members-list">
                                    {paginatedMembers.map(member => {
                                        const isOnline = presenceData[member.uid]?.state === 'online';
                                        return (
                                            <li key={member.uid} className={`member-item ${isOnline ? 'online' : 'offline'}`}>
                                                <div className="avatar">
                                                    {member.photoURL ? (
                                                        <img src={member.photoURL} alt={member.name} />
                                                    ) : (
                                                        <div className="avatar-placeholder">
                                                            {(member.name || "?").charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className={`status-dot ${isOnline ? 'active' : 'inactive'}`}></span>
                                                </div>
                                                <div className="info">
                                                    <span className="name">{member.name || member.email || "Unknown User"}</span>
                                                    <span className="role">
                                                        {isOnline ? "Online" : "Offline"} • {member.roleName || "Member"}
                                                    </span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                                
                                {totalPages > 1 && (
                                    <div className="dropdown-footer">
                                        <button 
                                            className="nav-btn" 
                                            disabled={currentPage === 1} 
                                            onClick={handlePrev}
                                            title="Previous"
                                        >
                                            &lt;
                                        </button>
                                        <span className="page-indicator">
                                            {currentPage} / {totalPages}
                                        </span>
                                        <button 
                                            className="nav-btn" 
                                            disabled={currentPage === totalPages} 
                                            onClick={handleNext}
                                            title="Next"
                                        >
                                            &gt;
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnlineMembersDropdown;
