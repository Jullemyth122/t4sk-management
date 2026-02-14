import React, { useEffect, useMemo } from 'react';

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
}) {

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

            <div className="bd-create">
                <input value={newBoardName} onChange={(e)=>setNewBoardName(e.target.value)} placeholder="New board name" className="bd-input" />
                <button onClick={handleCreateBoard} className="bd-btn" disabled={!canCreateBoard}>Create</button>
            </div>
        </div>
    );
}