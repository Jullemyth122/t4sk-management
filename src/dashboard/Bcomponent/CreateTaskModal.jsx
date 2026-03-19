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
    const [description, setDescription] = useState('');
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
                description,
                startDate,
                dueDate,
                priority,
                weight,
                subtasks
            });
            // Reset and close
            setTitle('');
            setDescription('');
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
                    <div className="modal-header-info">
                        <span className="modal-context">IN LIST</span>
                        <span className="modal-list-badge">{listName}</span>
                    </div>
                    <button className="close-btn" onClick={onClose} title="Close">&times;</button>
                </div>
                
                <div className="modal-body-layout">
                    {/* Left/Main Column: Title, Description, Subtasks */}
                    <div className="modal-main-column">
                        <input 
                            className="task-title-input"
                            type="text" 
                            placeholder="Task title" 
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            autoFocus
                        />
                        
                        <div className="desc-wrapper">
                            <label className="section-label">Description</label>
                            <textarea
                                className="task-desc-input"
                                placeholder="Add a more detailed description..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="subtasks-section">
                            <div className="section-label">
                                <span>Subtasks</span>
                                {subtasks.length > 0 && <span className="subtask-badge">{subtasks.length}</span>}
                            </div>
                            
                            <div className="subtask-list">
                                {subtasks.length === 0 ? (
                                    <div className="empty-subtasks">No subtasks added yet. Break down this task below.</div>
                                ) : (
                                    subtasks.map((st, i) => (
                                        <div key={st.id} className="subtask-row">
                                            <div className="subtask-bullet"></div>
                                            <div className="subtask-text">{st.text}</div>
                                            <div className="subtask-weight-badge">
                                                {st.weight > 0 ? st.weight : getProjectedWeight(subtasks, i)}%
                                            </div>
                                            <button 
                                                className="subtask-remove-btn" 
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
                                    className="subtask-text-input"
                                    placeholder="Add a subtask..."
                                    value={tempSubtaskText}
                                    onChange={e => setTempSubtaskText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                                <div className="subtask-weight-group">
                                    <input 
                                        type="number"
                                        className="subtask-weight-input"
                                        placeholder="%"
                                        min="0" max="100"
                                        title="Weight Percentage"
                                        value={tempSubtaskWeight}
                                        onChange={e => setTempSubtaskWeight(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                    />
                                    <button className="subtask-add-btn" onClick={handleAddSubtask} title="Add Subtask">
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right/Sidebar Column: Metadata fields */}
                    <div className="modal-sidebar-column">
                        <div className="sidebar-section">
                            <h4 className="section-label">Details</h4>
                            
                            <div className="sidebar-field">
                                <label>Priority</label>
                                <CustomSelect
                                    options={priorityOptions}
                                    value={priority}
                                    onChange={setPriority}
                                    searchable={false}
                                    width="100%"
                                />
                            </div>

                            <div className="sidebar-field">
                                <label>Weight %</label>
                                <input 
                                    type="number" 
                                    className="sidebar-input"
                                    placeholder="Auto"
                                    min="0" max="100"
                                    value={weight}
                                    onChange={e => setWeight(e.target.value)}
                                />
                            </div>

                            <div className="sidebar-field">
                                <label>Start Date</label>
                                <input 
                                    type="date" 
                                    className="sidebar-input date-input"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                />
                            </div>

                            <div className="sidebar-field">
                                <label>Due Date</label>
                                <input 
                                    type="date" 
                                    className="sidebar-input date-input"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                />
                            </div>
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