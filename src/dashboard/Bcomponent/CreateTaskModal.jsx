import React, { useState } from 'react';
import CustomSelect from './CustomSelect';
import { getProjectedWeight, validateTotalWeight } from '../utils/subtaskUtils';

export default function CreateTaskModal({ 
    isOpen, 
    onClose, 
    listName, 
    onCreate, 
    isLocked = false 
}) {
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('medium');
    const [weight, setWeight] = useState('');
    
    // Subtask States
    const [subtasks, setSubtasks] = useState([]);
    const [tempSubtaskText, setTempSubtaskText] = useState('');
    const [tempSubtaskWeight, setTempSubtaskWeight] = useState('');

    const priorityOptions = [
        { value: 'low', label: 'Easy' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'Hard' },
    ];

    if (!isOpen) return null;

    // Subtask Handlers
    const handleAddSubtask = () => {
        const text = tempSubtaskText.trim();
        const w = Number(tempSubtaskWeight) || 0;
        
        if (text) {
            const newSubList = [...subtasks, { id: Date.now(), text, weight: w, completed: false }];
            const validCheck = validateTotalWeight(newSubList);
            
            if (!validCheck.valid) {
                alert(validCheck.message);
                return;
            }
            
            setSubtasks(newSubList);
            setTempSubtaskText('');
            setTempSubtaskWeight('');
        }
    };

    const handleRemoveSubtask = (index) => {
        setSubtasks(subtasks.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddSubtask();
        }
    };

    // Main creation handler
    const handleSubmit = async () => {
        if (!title.trim()) {
            alert('Title is required to create a task.');
            return;
        }

        try {
            await onCreate({
                title,
                startDate,
                dueDate,
                priority,
                weight,
                subtasks
            });
            // Reset and close
            setTitle('');
            setStartDate('');
            setDueDate('');
            setPriority('medium');
            setWeight('');
            setSubtasks([]);
            onClose();
        } catch (err) {
            alert(err.message || 'Failed to create task.');
        }
    };

    return (
        <div className="create-task-modal-overlay">
            <div className="create-task-modal">
                <div className="modal-header">
                    <h3>Create Task in "{listName}"</h3>
                    <button className="close-btn" onClick={onClose} title="Close">&times;</button>
                </div>
                
                <div className="modal-body">
                    {/* Left Column: Task Metadata */}
                    <div className="form-column">
                        <div className="form-group">
                            <label>Task Title *</label>
                            <input 
                                type="text" 
                                placeholder="What needs to be done?" 
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                autoFocus
                            />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Start Date</label>
                                <input 
                                    type="date" 
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Due Date</label>
                                <input 
                                    type="date" 
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                            <div className="form-group">
                                <label>Priority</label>
                                <CustomSelect
                                    options={priorityOptions}
                                    value={priority}
                                    onChange={setPriority}
                                    searchable={false}
                                    width="100%"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>List Weight %</label>
                                <input 
                                    type="number" 
                                    placeholder="Auto"
                                    min="0"
                                    max="100"
                                    value={weight}
                                    onChange={e => setWeight(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Subtasks */}
                    <div className="form-column subtasks-container">
                        <div className="subtasks-header">
                            <h4>Subtasks ({subtasks.length})</h4>
                        </div>
                        
                        <div className="subtask-list">
                            {subtasks.length === 0 ? (
                                <div className="empty-subtasks">No subtasks added.</div>
                            ) : (
                                subtasks.map((st, i) => (
                                    <div key={st.id} className="mini-subtask-item">
                                        <div className="mini-subtask-text">• {st.text}</div>
                                        <div className="mini-subtask-meta">
                                            ({st.weight > 0 ? st.weight : getProjectedWeight(subtasks, i)}%)
                                        </div>
                                        <button 
                                            className="remove-btn" 
                                            onClick={() => handleRemoveSubtask(i)}
                                            title="Remove subtask"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="subtask-add-row">
                            <input 
                                type="text"
                                placeholder="Add a subtask..."
                                value={tempSubtaskText}
                                onChange={e => setTempSubtaskText(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <input 
                                type="number"
                                placeholder="%"
                                min="0" max="100"
                                title="Weight Percentage"
                                value={tempSubtaskWeight}
                                onChange={e => setTempSubtaskWeight(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button className="add-btn" onClick={handleAddSubtask} title="Add Subtask">
                                +
                            </button>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Cancel</button>
                    <button 
                        className="btn-create" 
                        onClick={handleSubmit} 
                        disabled={isLocked || !title.trim()}
                    >
                        Create Task
                    </button>
                </div>
            </div>
        </div>
    );
}
