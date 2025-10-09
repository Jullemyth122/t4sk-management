import React, { useMemo } from 'react';

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

}) {

    console.log(boardPage, boardsTotalPages, boardsPerPage)
    return (
        <div className="bd-section bd-boards-pane">
            <div className="bd-boards-head"><h3>Boards</h3><span className="count">{boards.length}</span></div>

            <div className="boards-controls">
                <input className="boards-search" placeholder="Search boards..." value={boardQuery} onChange={(e)=>{ setBoardQuery(e.target.value); gotoBoardPage(1); }} aria-label="Search boards" />
            </div>

            <div className="boards-controls-right">
                <label className="boards-perpage">
                    <select value={boardsPerPage} onChange={(e)=>{ setBoardsPerPage(Number(e.target.value)); gotoBoardPage(1); }}>
                        <option value={4}>4 / page</option>
                        <option value={6}>6 / page</option>
                        <option value={9}>9 / page</option>
                    </select>
                </label>

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

            <div className="boards-pagination" aria-label="Boards pagination">
                <button className="pag-btn" onClick={()=>gotoBoardPage(boardPage-1)} disabled={boardPage===1}>Prev</button>
                    {Array.from({ length: Math.min(5, boardsTotalPages) }).map((_, idx)=>{
                        const half = Math.floor(Math.min(5, boardsTotalPages)/2);
                        let start = Math.max(1, Math.min(boardPage-half, boardsTotalPages - Math.min(5, boardsTotalPages) + 1));
                        const pageNum = start + idx;
                        return (<button key={pageNum} className={`pag-page ${pageNum===boardPage?"active":""}`} onClick={()=>gotoBoardPage(pageNum)}>{pageNum}</button>);
                    })}
                <button className="pag-btn" onClick={()=>gotoBoardPage(boardPage+1)} disabled={boardPage===boardsTotalPages}>Next</button>
            </div>

            <div className="bd-create">
                <input value={newBoardName} onChange={(e)=>setNewBoardName(e.target.value)} placeholder="New board name" className="bd-input" />
                <button onClick={handleCreateBoard} className="bd-btn" disabled={!canCreateBoard}>Create</button>
            </div>
        </div>
    );
}