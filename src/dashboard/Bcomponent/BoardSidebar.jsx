import React, { useState, useEffect, useMemo } from 'react';

export default function BoardSidebar({
    boards,
    boardQuery,
    setBoardQuery,
    boardView,
    setBoardView,
    visibleBoards,
    boardPage,
    boardsTotalPages,
    boardsPerPage,
    setBoardsPerPage,
    gotoBoardPage,
    selectedBoardId,
    setSelectedBoardId,
    newBoardName,
    setNewBoardName,
    handleCreateBoard,
    canEditBoardValue,
    canCreateBoard = false, // new prop (fallback false)
    boardSort,
    setBoardSort,
    aiGenerating,
    genProgressText,
    aiUsageCount,
    isGenUnlimited,
    genLimitMax,
    handleGenerateBoard,
    isOwner,
}) {

    const [genPrompt, setGenPrompt] = useState('');

    return (
        <div className="bd-section bd-boards-pane">
            {/* <div className="bd-boards-head"><h3>Boards</h3><span className="count">{boards.length}</span></div> */}


            <div className="boards-controls">
                <input className="boards-search" placeholder="Search boards..." value={boardQuery} onChange={(e)=>{ setBoardQuery(e.target.value); gotoBoardPage(1); }} aria-label="Search boards" />
            </div>

            <div className="boards-filters">
                <select
                    className="filter-select"
                    value={boardSort}
                    onChange={(e) => setBoardSort(e.target.value)}
                    aria-label="Sort boards"
                >
                    <option value="recent">Recent</option>
                    <option value="alpha">A-Z</option>
                </select>

                <div className="view-toggle" role="tablist" aria-label="Board view">
                    <button className={`view-btn ${boardView==="list"?"active":""}`} title="List view" onClick={()=>setBoardView("list")}>☰</button>
                    <button className={`view-btn ${boardView==="grid"?"active":""}`} title="Grid view" onClick={()=>setBoardView("grid")}>▦</button>
                </div>
            </div>

            {boardView === "list" ? (
                <div className="boards-list">
                    {visibleBoards.map((b)=> (
                        <button key={b.id} onClick={()=>setSelectedBoardId(b.id)} className={`board-item ${b.id===selectedBoardId?"active":""}`}>
                            <div className="board-name">{b.name}</div>
                        </button>
                    ))}
                    {visibleBoards.length===0 && <div className="muted small">No boards found.</div>}
                </div>
            ) : (
                <div className="board-grid">
                    {visibleBoards.map((b)=> (
                        <button key={b.id} onClick={()=>setSelectedBoardId(b.id)} className={`board-card ${b.id===selectedBoardId?"active":""}`}>
                            <div className="card-title">{b.name}</div>
                            <div className="card-desc">{b.description||"—"}</div>
                        </button>
                    ))}
                    {visibleBoards.length===0 && <div className="muted small">No boards found.</div>}
                </div>
            )}

            <div className="boards-pagination">
                <div className="pagination-controls">
                    <button
                        className="pag-icon-btn"
                        onClick={() => gotoBoardPage(boardPage - 1)}
                        disabled={boardPage === 1}
                        title="Previous Page"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    <span className="pag-info">
                        <span className="current">{boardPage}</span>
                        <span className="sep">/</span>
                        <span className="total">{boardsTotalPages || 1}</span>
                    </span>

                    <button
                        className="pag-icon-btn"
                        onClick={() => gotoBoardPage(boardPage + 1)}
                        disabled={boardPage === boardsTotalPages || boardsTotalPages === 0}
                        title="Next Page"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>

            {canCreateBoard &&
                <div className="bd-create">
                    <input value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} placeholder="New board name" className="bd-input" />
                    <button onClick={handleCreateBoard} className="bd-btn" disabled={!canCreateBoard}>Create</button>
                </div>
            }

            {/* AI Generative Board */}
            {!isOwner ? (
                <div className="bd-gen-board-locked" style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.1)', border: '1px dashed var(--bd-border-subtle)', borderRadius: '8px', color: 'var(--bd-text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0110 0v4"></path>
                    </svg>
                    <span>Generative AI (Owner only)</span>
                </div>
            ) : (
                <div className="bd-create bd-gen-board" style={{ flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--bd-border-subtle)', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--bd-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Generative Task</div>
                    <textarea
                        className="bd-input"
                        placeholder="e.g. Setup marketing campaign for new shoes"
                        value={genPrompt}
                        onChange={e => setGenPrompt(e.target.value)}
                        disabled={aiGenerating}
                        rows={3}
                        style={{ width: '100%', resize: 'none', fontFamily: 'inherit' }}
                    />
                    <button
                        className="bd-btn"
                        onClick={() => { handleGenerateBoard(genPrompt); setGenPrompt(''); }}
                        disabled={aiGenerating || !genPrompt.trim()}
                        style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                    >
                        {aiGenerating ? (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                                    <circle cx="12" cy="12" r="10" strokeDasharray="32"></circle>
                                </svg>
                                Generating...
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                    <path d="M2 17l10 5 10-5" />
                                    <path d="M2 12l10 5 10-5" />
                                </svg>
                                Generate Board
                            </>
                        )}
                    </button>
                    {aiGenerating && genProgressText && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--task-modalbtnBG)', textAlign: 'center', animation: 'pulse-op 1.5s infinite', marginTop: '2px' }}>
                            {genProgressText}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}