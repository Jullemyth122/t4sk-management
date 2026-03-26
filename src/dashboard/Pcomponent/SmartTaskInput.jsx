import React, { useState, useRef, useEffect } from 'react';

// Nova-style slash commands
const COMMAND_GROUPS = [
    {
        title: 'Formatting',
        items: [
            { id: 'code', label: 'Code', hint: '`hello`', icon: '< >' },
        ]
    },
    {
        title: 'Tasks',
        items: [
            { id: 'todo', label: 'Tasks', hint: '- [ ] todo\n- [x] done', icon: '☑️' }
        ]
    },
    {
        title: 'Tables',
        items: [
            { id: 'table', label: 'Tables', hint: '| Header 1 | Header 2 |\n|----------|----------|\n| cell     | cell     |', icon: '🪟' }
        ]
    }
];

export default function SmartTaskInput({ 
    value, 
    onChange, 
    onSubmit, 
    onCancel, 
    placeholder = "Type '/' for commands...",
    autoFocus = false,
    className = "",
    minRows = 1
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [filterText, setFilterText] = useState('');
    const inputRef = useRef(null);
    const menuRef = useRef(null);

    const flatItems = React.useMemo(() => {
        const items = [];
        COMMAND_GROUPS.forEach(g => {
            g.items.forEach(i => {
                if (i.label.toLowerCase().includes(filterText.toLowerCase()) || i.id.toLowerCase().includes(filterText.toLowerCase())) {
                    items.push(i);
                }
            });
        });
        return items;
    }, [filterText]);

    const handleInput = (e) => {
        const val = e.target.value;
        const cursorPosition = e.target.selectionStart;
        if (onChange) onChange(val);

        // Check if we just typed '/'
        const textBeforeCursor = val.slice(0, cursorPosition);
        const slashMatch = textBeforeCursor.match(/(?:\s|^)\/([a-zA-Z0-9_]*)$/);

        if (slashMatch) {
            setFilterText(slashMatch[1]);
            setSelectedIndex(0);
            if (!menuOpen) setMenuOpen(true);
        } else {
            setMenuOpen(false);
        }
    };

    const insertCommand = (command) => {
        const cursorPosition = inputRef.current.selectionStart;
        const textBefore = value.slice(0, cursorPosition);
        const textAfter = value.slice(cursorPosition);
        
        const slashIndex = textBefore.lastIndexOf('/');
        let newText = value;
        let cleanedBefore = textBefore;

        if (slashIndex !== -1) {
            cleanedBefore = textBefore.slice(0, slashIndex);
            newText = cleanedBefore + textAfter; 
        }

        // Detect if we're on an empty checkbox line (e.g. user typed `- [ ] /code`)
        const lastNewline = cleanedBefore.lastIndexOf('\n');
        const currentLineBefore = cleanedBefore.slice(lastNewline + 1);
        const isOnEmptyCheckbox = /^\s*-\s*\[[ xX]\]\s*$/.test(currentLineBefore);
        const checkboxIndent = currentLineBefore.match(/^(\s*)/)[1];
        const childIndent = checkboxIndent + '    '; // 4 spaces deeper

        if (isOnEmptyCheckbox && (command.id === 'code' || command.id === 'table')) {
            // Keep the checkbox, add the smart token
            const lineStart = cleanedBefore.slice(0, lastNewline + 1);
            const checkboxLine = currentLineBefore.trimEnd();
            
            switch (command.id) {
                case 'code':
                    newText = lineStart + checkboxLine + ' (/code)\n' + childIndent + '\n' + textAfter;
                    break;
                case 'table':
                    newText = lineStart + checkboxLine + ' (/table)\n' + childIndent + '| Header 1 | Header 2 |\n' + childIndent + '|----------|----------|\n' + childIndent + '| cell     | cell     |\n' + textAfter;
                    break;
            }
        } else {
            switch (command.id) {
                case 'todo':
                    newText = newText + '\n- [ ] ';
                    break;
                case 'code':
                    newText = newText + '\n```\n\n```';
                    break;
                case 'table':
                    newText = newText + '\n| Header 1 | Header 2 |\n|----------|----------|\n| cell     | cell     |';
                    break;
                default:
                    break;
            }
        }

        if (onChange) onChange(newText);
        setMenuOpen(false);
        setFilterText('');
        
        setTimeout(() => {
            if (inputRef.current) {
                if (isOnEmptyCheckbox && command.id === 'code') {
                    // Place cursor on the empty line inside code content
                    const tokenPos = newText.indexOf('(/code)\n');
                    if (tokenPos !== -1) {
                        const pos = tokenPos + 8 + childIndent.length;
                        inputRef.current.setSelectionRange(pos, pos);
                    } else {
                        inputRef.current.setSelectionRange(newText.length, newText.length);
                    }
                } else if (command.id === 'code') {
                    const codeStart = newText.lastIndexOf('```\n');
                    if (codeStart !== -1) {
                        const pos = codeStart + 4;
                        inputRef.current.setSelectionRange(pos, pos);
                    } else {
                        inputRef.current.setSelectionRange(newText.length, newText.length);
                    }
                } else {
                    inputRef.current.setSelectionRange(newText.length, newText.length);
                }
            }
        }, 10);
    };

    const handleKeyDown = (e) => {
        if (menuOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % flatItems.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + flatItems.length) % flatItems.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (flatItems[selectedIndex]) {
                    insertCommand(flatItems[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setMenuOpen(false);
            }
            return;
        }

        if (e.key === 'Tab') {
            e.preventDefault();
            const start = inputRef.current.selectionStart;
            const end = inputRef.current.selectionEnd;
            const newText = value.substring(0, start) + '    ' + value.substring(end);
            if (onChange) onChange(newText);
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.setSelectionRange(start + 4, start + 4);
                }
            }, 10);
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            if (onSubmit) {
                e.preventDefault();
                if (value.trim()) onSubmit(value.trim());
                return;
            }

            const start = inputRef.current.selectionStart;
            const textBefore = value.substring(0, start);
            const lines = textBefore.split('\n');
            const currentLine = lines[lines.length - 1];

            const match = currentLine.match(/^(\s*(?:-\s\[[ x]\]\s|-\s|\*\s))/i);

            if (match) {
                e.preventDefault();
                const prefix = match[1];

                if (currentLine === prefix.trimEnd() || currentLine === prefix) {
                    const newText = value.substring(0, start - currentLine.length) + '\n' + value.substring(inputRef.current.selectionEnd);
                    if (onChange) onChange(newText);
                    setTimeout(() => {
                        if (inputRef.current) {
                            const newPos = start - currentLine.length + 1;
                            inputRef.current.setSelectionRange(newPos, newPos);
                        }
                    }, 10);
                    return;
                }

                const newPrefix = prefix.replace(/\[x\]/i, '[ ]');
                const newText = value.substring(0, start) + '\n' + newPrefix + value.substring(inputRef.current.selectionEnd);
                if (onChange) onChange(newText);
                setTimeout(() => {
                    if (inputRef.current) {
                        const newPos = start + 1 + newPrefix.length;
                        inputRef.current.setSelectionRange(newPos, newPos);
                    }
                }, 10);
                return;
            }
        } else if (e.key === 'Escape' && onCancel) {
            onCancel();
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target) && !inputRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (menuOpen && menuRef.current) {
            const activeEl = menuRef.current.querySelector('.nova-menu-item.active');
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex, menuOpen]);

    return (
        <div className={`nova-smart-input-wrapper ${className}`}>
            <textarea
                ref={inputRef}
                autoFocus={autoFocus}
                className="nova-textarea"
                placeholder={placeholder}
                value={value}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                rows={minRows}
            />
            {menuOpen && (
                <div className="nova-dropdown-menu" ref={menuRef}>
                    <div className="nova-menu-header">
                        <span>Start typing</span>
                        <button type="button" onClick={() => setMenuOpen(false)}>×</button>
                    </div>
                    
                    <div className="nova-menu-sub-header">
                        <span>Type <strong>/</strong> to insert content</span>
                        <div className="nova-menu-shortcut-hint">/task /table /code</div>
                    </div>

                    <div className="nova-menu-list">
                        {COMMAND_GROUPS.map((group, gIdx) => {
                            const visibleItems = group.items.filter(i => flatItems.includes(i));
                            if (visibleItems.length === 0) return null;

                            return (
                                <div key={gIdx} className="nova-menu-group">
                                    <div className="nova-group-title">{group.title}</div>
                                    {visibleItems.map(item => {
                                        const isSelected = flatItems[selectedIndex]?.id === item.id;
                                        return (
                                            <div
                                                key={item.id}
                                                className={`nova-menu-item ${isSelected ? 'active' : ''}`}
                                                onClick={() => insertCommand(item)}
                                                onMouseEnter={() => setSelectedIndex(flatItems.indexOf(item))}
                                            >
                                                <div className="nova-item-icon">{item.icon}</div>
                                                <div className="nova-item-content">
                                                    <div className="nova-item-label">{item.label}</div>
                                                    {item.hint && (
                                                        <div className="nova-item-hint">
                                                            {item.hint.split('\n').map((line, i) => (
                                                                <div key={i}>{line}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
