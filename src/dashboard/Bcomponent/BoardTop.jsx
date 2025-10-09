import React from 'react';

export default function BoardTop({
    selectedBoard,
    editingBoard,
    setEditingBoard,
    boardDraft,
    setBoardDraft,
    handleUpdateBoard,
    handleRefreshBoard,
    canEditBoardValue,
}) {
    if (!selectedBoard) return null;

    // console.log(selectedBoard)
    return (
        <>
        {editingBoard ? (
            <div className="board-edit-panel">
            <input value={boardDraft.name} onChange={(e)=>setBoardDraft((p)=>({...p, name: e.target.value}))} />
            <input value={boardDraft.description} onChange={(e)=>setBoardDraft((p)=>({...p, description: e.target.value}))} />
            <div className="board-edit-actions">
                <button className="bd-btn" onClick={()=>handleUpdateBoard(selectedBoard.id, { name: boardDraft.name, description: boardDraft.description })}>Save</button>
                <button onClick={()=>setEditingBoard(false)}>Cancel</button>
                <button onClick={()=>handleRefreshBoard(selectedBoard.id)}>Refresh</button>
            </div>
            </div>
        ) : (
            <div className="board-top">
            <div>
                <h2>{selectedBoard.name}</h2>
                <div className="bd-sub">{selectedBoard.description || ''}</div>
            </div>
            {canEditBoardValue && (
                <div style={{ marginLeft: 12 }}>
                <button className="bd-btn" onClick={() => { setEditingBoard(true); setBoardDraft({ name: selectedBoard.name || '', description: selectedBoard.description || '' }); }}>Edit Board</button>
                </div>
            )}
            </div>
        )}
        </>
    );
}
