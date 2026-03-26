import React, { useState, useCallback } from 'react';

export default function AIVerifyModal({
  isOpen,
  onClose,
  aiResult,
  setAiResult,
  onApply,
  isApplying,
  applyText = "Create Generated Board",
  title = "Verify Generated Board",
  isOcrMode = false
}) {
  const [expandedLists, setExpandedLists] = useState({});

  const toggleListExpand = useCallback((lIdx) => {
    setExpandedLists(prev => ({ ...prev, [lIdx]: !prev[lIdx] }));
  }, []);

  const updateBoardName = useCallback((value) => {
    setAiResult((prev) => {
      if (!prev) return prev;
      return { ...prev, boardName: value };
    });
  }, [setAiResult]);

  const updateList = useCallback((lIdx, field, value) => {
    setAiResult((prev) => {
      if (!prev || !prev.lists) return prev;
      const newLists = [...prev.lists];
      newLists[lIdx] = { ...newLists[lIdx], [field]: value };
      return { ...prev, lists: newLists };
    });
  }, [setAiResult]);

  const updateCard = useCallback((lIdx, cIdx, field, value) => {
    setAiResult((prev) => {
      if (!prev || !prev.lists) return prev;
      const newLists = [...prev.lists];
      const newItems = isOcrMode ? [...(newLists[lIdx].items || [])] : [...(newLists[lIdx].cards || [])];
      newItems[cIdx] = { ...newItems[cIdx], [field]: value };
      if (isOcrMode) {
        newLists[lIdx] = { ...newLists[lIdx], items: newItems };
      } else {
        newLists[lIdx] = { ...newLists[lIdx], cards: newItems };
      }
      return { ...prev, lists: newLists };
    });
  }, [setAiResult, isOcrMode]);

  const updateSubtask = useCallback((lIdx, cIdx, sIdx, field, value) => {
    setAiResult((prev) => {
      if (!prev || !prev.lists) return prev;
      const newLists = [...prev.lists];
      const newItems = isOcrMode ? [...(newLists[lIdx].items || [])] : [...(newLists[lIdx].cards || [])];
      const newSubtasks = [...(newItems[cIdx].subtasks || [])];
      newSubtasks[sIdx] = { ...newSubtasks[sIdx], [field]: value };
      newItems[cIdx] = { ...newItems[cIdx], subtasks: newSubtasks };
      if (isOcrMode) {
        newLists[lIdx] = { ...newLists[lIdx], items: newItems };
      } else {
        newLists[lIdx] = { ...newLists[lIdx], cards: newItems };
      }
      return { ...prev, lists: newLists };
    });
  }, [setAiResult, isOcrMode]);

  if (!isOpen || !aiResult) return null;

  return (
    <div className="ocr-verify-overlay" style={{ zIndex: 9999 }}>
      <div className="ocr-verify-modal">
        <div className="ocr-verify-header">
          <div>
            <h3 className="ocr-verify-title">{title}</h3>
            <p className="ocr-verify-subtitle">Review the extracted lists and tasks before confirming.</p>
          </div>
          <button
            className="ocr-verify-close"
            onClick={onClose}
            title="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="ocr-verify-body">
          {!isOcrMode && (
              <div style={{ marginBottom: '1.5rem', background: 'var(--pd-bg-elevated)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pd-border)' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--pd-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Board Name</label>
                <input 
                  className="ocr-edit-input" 
                  value={aiResult.boardName || ''} 
                  onChange={(e) => updateBoardName(e.target.value)} 
                  placeholder="Board Name"
                  style={{ width: '100%', fontSize: '1rem', padding: '0.5rem', fontWeight: 600 }}
                />
              </div>
          )}

          {(aiResult.lists || []).length === 0 ? (
            <div className="ocr-verify-empty">No lists or tasks were generated.</div>
          ) : (
            (aiResult.lists || []).map((list, lIdx) => {
              const isExpanded = !expandedLists[lIdx];
              const itemsList = isOcrMode ? list.items : list.cards;
              return (
                <div className="ocr-verify-list" key={lIdx}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: isExpanded ? '1rem' : 0 }}>
                    <button 
                      onClick={() => toggleListExpand(lIdx)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--pd-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                    <h4 className="ocr-verify-list-name" style={{ margin: 0, flex: 1, paddingBottom: 0, borderBottom: 'none' }}>
                      <span className="list-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="3" y="3" width="7" height="18" rx="1.5" />
                          <rect x="13" y="3" width="8" height="11" rx="1.5" opacity="0.7" />
                        </svg>
                      </span>
                      <input 
                        className="ocr-edit-input list-title-input" 
                        value={list.name || ''} 
                        onChange={(e) => updateList(lIdx, 'name', e.target.value)} 
                        placeholder="List Name"
                      />
                      <span className="task-count">{(itemsList || []).length || 0} tasks</span>
                    </h4>
                  </div>

                  {isExpanded && (
                    <div className="ocr-verify-tasks">
                      {(itemsList || []).map((card, cIdx) => (
                        <div className="ocr-verify-task" key={cIdx}>
                          <div className="task-header">
                            <input 
                              className="ocr-edit-input task-title-input" 
                              value={card.title || ''} 
                              onChange={(e) => updateCard(lIdx, cIdx, 'title', e.target.value)} 
                              placeholder="Task Title"
                            />
                            <div className="task-badges">
                              <select 
                                className={`ocr-edit-input task-badge priority-${(card.priorityScale || 'Medium').toLowerCase()}`} 
                                value={card.priorityScale || 'Medium'} 
                                onChange={(e) => updateCard(lIdx, cIdx, 'priorityScale', e.target.value)}
                              >
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                              <span className="task-badge weight">
                                Effort <input 
                                  type="number" 
                                  className="ocr-edit-input weight-input" 
                                  value={card.effort || 0} 
                                  onChange={(e) => updateCard(lIdx, cIdx, 'effort', parseInt(e.target.value, 10))} 
                                />
                              </span>
                              <span className="task-badge date">
                                Start <input 
                                  type="date" 
                                  className="ocr-edit-input date-input" 
                                  value={card.startDate || ''} 
                                  onChange={(e) => updateCard(lIdx, cIdx, 'startDate', e.target.value)} 
                                />
                              </span>
                              <span className="task-badge date">
                                Due <input 
                                  type="date" 
                                  className="ocr-edit-input date-input" 
                                  value={card.dueDate || ''} 
                                  onChange={(e) => updateCard(lIdx, cIdx, 'dueDate', e.target.value)} 
                                />
                              </span>
                            </div>
                          </div>
                          
                          <textarea 
                            className="ocr-edit-input task-desc-input" 
                            value={card.description || ''} 
                            onChange={(e) => updateCard(lIdx, cIdx, 'description', e.target.value)} 
                            placeholder="Task Description"
                          />

                          {Array.isArray(card.subtasks) && card.subtasks.length > 0 && (
                            <div className="task-subtasks">
                              {card.subtasks.map((st, sIdx) => (
                                <div className="subtask-row" key={sIdx}>
                                  <input 
                                    type="checkbox" 
                                    checked={!!st.completed} 
                                    onChange={(e) => updateSubtask(lIdx, cIdx, sIdx, 'completed', e.target.checked)} 
                                  />
                                  <input 
                                    type="text" 
                                    className={`ocr-edit-input subtask-text ${st.completed ? 'completed' : ''}`} 
                                    value={st.text || ''} 
                                    onChange={(e) => updateSubtask(lIdx, cIdx, sIdx, 'text', e.target.value)} 
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="ocr-verify-footer">
          <button
            className="action-btn danger"
            onClick={() => Object.keys(expandedLists).length < (aiResult.lists?.length || 0) 
              ? setExpandedLists(aiResult.lists.reduce((acc, _, i) => ({...acc, [i]: true}), {})) 
              : setExpandedLists({})}
          >
            {Object.keys(expandedLists).length < (aiResult.lists?.length || 0) ? "Collapse All Lists" : "Expand All Lists"}
          </button>
          <div className="footer-right">
            <button
              className="action-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="action-btn primary pulse"
              onClick={onApply}
              disabled={isApplying}
            >
              {isApplying ? <span className="spinner"></span> : applyText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
