// src/dashboard/PersonalDashboard.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';

import PersonalSidebar from './Pcomponent/PersonalSidebar';
import PersonalBoardLayout from './Pcomponent/PersonalBoardLayout';

import '../scss/personal-dashboard.scss';

import PersonalCalendar from './Pcomponent/PersonalCalendar';
import PersonalStatistics from './Pcomponent/PersonalStatistics';

const INITIAL_LISTS = [
    {
        id: 'list-1',
        name: 'To Do',
        color: '#f59e0b',
        cards: [
            {
                id: 'c1',
                title: 'Design new landing page wireframes',
                priority: 'high',
                dueDate: '2026-02-20',
                tags: ['Design', 'UI'],
                subtasksCompleted: 2,
                subtasksTotal: 5,
                description: 'Create low-fi wireframes for the new landing page redesign.',
            },
            {
                id: 'c2',
                title: 'Research competitor pricing models',
                priority: 'medium',
                dueDate: '2026-02-25',
                tags: ['Research'],
                subtasksCompleted: 0,
                subtasksTotal: 3,
                description: 'Analyze competitor pricing and compile comparison doc.',
            },
            {
                id: 'c3',
                title: 'Set up CI/CD pipeline for staging',
                priority: 'high',
                dueDate: '2026-02-18',
                tags: ['DevOps'],
                subtasksCompleted: 1,
                subtasksTotal: 4,
                description: 'Configure GitHub Actions for automated deployment to staging.',
            },
        ],
    },
    {
        id: 'list-2',
        name: 'In Progress',
        color: '#6366f1',
        cards: [
            {
                id: 'c4',
                title: 'Build authentication flow with Firebase',
                priority: 'high',
                dueDate: '2026-02-19',
                tags: ['Backend', 'Auth'],
                subtasksCompleted: 4,
                subtasksTotal: 6,
                description: 'Implement sign-up, login, and password reset using Firebase Auth.',
            },
            {
                id: 'c5',
                title: 'Create reusable component library',
                priority: 'medium',
                dueDate: '2026-03-01',
                tags: ['Frontend', 'UI'],
                subtasksCompleted: 3,
                subtasksTotal: 8,
                description: 'Build Button, Card, Modal, and Input components.',
            },
        ],
    },
    {
        id: 'list-3',
        name: 'Done',
        color: '#10b981',
        cards: [
            {
                id: 'c6',
                title: 'Set up project repository and tooling',
                priority: 'low',
                dueDate: '2026-02-10',
                tags: ['Setup'],
                subtasksCompleted: 3,
                subtasksTotal: 3,
                description: 'Init repo, ESLint, Prettier, Vite config.',
            },
            {
                id: 'c7',
                title: 'Configure database schema',
                priority: 'medium',
                dueDate: '2026-02-12',
                tags: ['Backend'],
                subtasksCompleted: 5,
                subtasksTotal: 5,
                description: 'Design and deploy Firestore collections.',
            },
            {
                id: 'c8',
                title: 'Write project README documentation',
                priority: 'low',
                dueDate: '2026-02-14',
                tags: ['Docs'],
                subtasksCompleted: 2,
                subtasksTotal: 2,
                description: 'Comprehensive README with setup instructions.',
            },
        ],
    },
];

export default function PersonalDashboard() {
    const { currentUser } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [viewMode, setViewMode] = useState('board'); // 'board' | 'list'
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'calendar' | 'stats'
    
    // Local State for Static Functionality
    const [lists, setLists] = useState(INITIAL_LISTS);

    const handleAddList = () => {
        const name = window.prompt("Enter list name:");
        if (!name) return;

        const newList = {
            id: `list-${Date.now()}`,
            name,
            color: '#64748b', // Default slate color
            cards: []
        };
        setLists([...lists, newList]);
    };

    const handleAddTask = (listId) => {
        const title = window.prompt("Enter task title:");
        if (!title) return;

        const newTask = {
            id: `c-${Date.now()}`,
            title,
            priority: 'medium',
            dueDate: new Date().toISOString().split('T')[0],
            tags: [],
            subtasksCompleted: 0,
            subtasksTotal: 0,
            description: '',
        };

        setLists(lists.map(list => {
            if (list.id === listId) {
                return { ...list, cards: [...list.cards, newTask] };
            }
            return list;
        }));
    };

    // Calculate total stats for header
    const totalTasks = lists.reduce((acc, list) => acc + list.cards.length, 0);
    const totalLists = lists.length;

    return (
        <div className={`pd-root ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <PersonalSidebar
                user={currentUser}
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            <main className="pd-main">
                {/* Header */}
                <header className="pd-header">
                    <div className="pd-header-left">
                        <button
                            className="pd-sidebar-toggle"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        >
                            <span className="pd-hamburger" />
                        </button>
                        <div className="pd-header-title-group">
                            <h1 className="pd-board-title">
                                {activeTab === 'dashboard' && 'My Tasks'}
                                {activeTab === 'calendar' && 'Calendar'}
                                {activeTab === 'stats' && 'Statistics'}
                            </h1>
                            {activeTab === 'dashboard' && (
                                <span className="pd-board-meta">{totalTasks} tasks · {totalLists} lists</span>
                            )}
                        </div>
                    </div>

                    <div className="pd-header-right">
                        {activeTab === 'dashboard' && (
                            <>
                                <div className="pd-view-switcher">
                                    <button
                                        className={`pd-view-btn ${viewMode === 'board' ? 'active' : ''}`}
                                        title="Board View"
                                        onClick={() => setViewMode('board')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                            <rect x="1" y="1" width="4" height="14" rx="1" />
                                            <rect x="6" y="1" width="4" height="10" rx="1" />
                                            <rect x="11" y="1" width="4" height="12" rx="1" />
                                        </svg>
                                    </button>
                                    <button
                                        className={`pd-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                                        title="List View"
                                        onClick={() => setViewMode('list')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                            <rect x="1" y="2" width="14" height="2.5" rx="1" />
                                            <rect x="1" y="6.5" width="14" height="2.5" rx="1" />
                                            <rect x="1" y="11" width="14" height="2.5" rx="1" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="pd-header-divider" />
                                <button className="pd-header-action" title="Filter">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M1.5 3h13M3.5 8h9M5.5 13h5" strokeLinecap="round" />
                                    </svg>
                                    <span>Filter</span>
                                </button>
                            </>
                        )}

                        <div className="pd-user-chip">
                            <div className="pd-chip-avatar">
                                {currentUser?.photoURL ? (
                                    <img src={currentUser.photoURL} alt="" />
                                ) : (
                                    <span>{currentUser?.displayName?.[0] || 'U'}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="pd-board-area">
                    {activeTab === 'dashboard' && (
                        <PersonalBoardLayout
                            viewMode={viewMode}
                            lists={lists} 
                            onAddList={handleAddList}
                            onAddTask={handleAddTask}
                        />
                    )}
                    {activeTab === 'calendar' && (
                        <PersonalCalendar lists={lists} />
                    )}
                    {activeTab === 'stats' && (
                        <PersonalStatistics lists={lists} />
                    )}
                </div>
            </main>
        </div>
    );
}

