/**
 * Lightweight markdown renderer for task descriptions.
 * Supports: code blocks (```), inline code (`), bold (**), italic (*),
 * strikethrough (~~), checklists (- [ ] / - [x]), smart tokens ((/code), (/table)),
 * and tables (| ... |).
 * Falls back to plain text paragraphs for everything else.
 */
export default function MarkdownPreview({ text, className = '', onToggleCheckbox }) {
    if (!text || !text.trim()) return null;

    const blocks = parseBlocks(text);

    return (
        <div className={`md-preview ${className}`}>
            {blocks.map((block, i) => renderBlock(block, i, onToggleCheckbox))}
        </div>
    );
}

/** Parse inline markdown: `code`, **bold**, *italic*, ~~strikethrough~~ */
function renderInline(text) {
    if (!text) return text;
    const parts = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        // Inline code: `...`
        let match = remaining.match(/^(.*?)`([^`]+)`/);
        if (match) {
            if (match[1]) parts.push(match[1]);
            parts.push(<code key={key++} className="md-inline-code">{match[2]}</code>);
            remaining = remaining.slice(match[0].length);
            continue;
        }
        // Bold: **...**
        match = remaining.match(/^(.*?)\*\*(.+?)\*\*/);
        if (match) {
            if (match[1]) parts.push(match[1]);
            parts.push(<strong key={key++}>{match[2]}</strong>);
            remaining = remaining.slice(match[0].length);
            continue;
        }
        // Strikethrough: ~~...~~
        match = remaining.match(/^(.*?)~~(.+?)~~/);
        if (match) {
            if (match[1]) parts.push(match[1]);
            parts.push(<del key={key++}>{match[2]}</del>);
            remaining = remaining.slice(match[0].length);
            continue;
        }
        // Italic: *...*
        match = remaining.match(/^(.*?)\*(.+?)\*/);
        if (match) {
            if (match[1]) parts.push(match[1]);
            parts.push(<em key={key++}>{match[2]}</em>);
            remaining = remaining.slice(match[0].length);
            continue;
        }
        // No more inline tokens
        parts.push(remaining);
        break;
    }

    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

function parseBlocks(text) {
    const lines = text.split('\n');
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Code block: starts with ```
        if (line.trim().startsWith('```')) {
            const lang = line.trim().slice(3).trim();
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            blocks.push({ type: 'code', lang, content: codeLines.join('\n') });
            i++; // skip closing ```
            continue;
        }

        // Checklist item: - [ ] or - [x]
        if (/^\s*-\s*\[([ xX])\]\s*/.test(line)) {
            const checkItems = [];
            while (i < lines.length && /^\s*-\s*\[([ xX])\]\s*/.test(lines[i])) {
                const match = lines[i].match(/^(\s*)-\s*\[([ xX])\]\s*(.*)/);
                const rawLabel = match[3];
                const checkIndent = match[1].length;
                const lineIdx = i;

                // Extract subtask marker if present
                let processedLabel = rawLabel;
                const markerMatch = rawLabel.match(/^<!-- subtask:(\d+) -->\s*(.*)/);
                if (markerMatch) {
                    processedLabel = markerMatch[2];
                }

                // Detect (/code) or (/table) smart token
                let childType = null;
                let childContent = '';
                const codeToken = processedLabel.match(/^\s*\(\/code\)\s*(.*)/i);
                const tableToken = processedLabel.match(/^\s*\(\/table\)\s*(.*)/i);

                if (codeToken) {
                    childType = 'code';
                    const firstLineCode = codeToken[1] || '';
                    const childLines = firstLineCode.trim() ? [firstLineCode.trim()] : [];
                    i++;
                    let baseIndent = -1;
                    // Consume indented child lines (deeper than the checkbox)
                    while (i < lines.length) {
                        const childLine = lines[i];
                        const childLineIndent = (childLine.match(/^(\s*)/) || ['', ''])[1].length;
                        if (/^\s*-\s*\[([ xX])\]/.test(childLine)) break;
                        if (childLine.trim() === '' && i + 1 < lines.length && /^\s*-\s*\[([ xX])\]/.test(lines[i + 1])) break;
                        if (childLine.trim() !== '' && childLineIndent <= checkIndent) break;

                        if (childLine.trim() === '') {
                            childLines.push('');
                        } else {
                            if (baseIndent === -1) {
                                baseIndent = childLineIndent;
                            }
                            // Strip baseIndent to preserve relative formatting
                            childLines.push(childLine.slice(Math.min(baseIndent, childLineIndent)));
                        }
                        i++;
                    }
                    childContent = childLines.join('\n');
                    processedLabel = '(/code)';
                } else if (tableToken) {
                    childType = 'table';
                    const firstLineTable = (tableToken[1] || '').trim();
                    const childLines = firstLineTable ? [firstLineTable] : [];
                    i++;
                    // Consume indented child lines (table rows)
                    while (i < lines.length) {
                        const childLine = lines[i];
                        const trimmed = childLine.trim();
                        const childLineIndent = (childLine.match(/^(\s*)/) || ['', ''])[1].length;
                        if (/^\s*-\s*\[([ xX])\]/.test(childLine)) break;
                        if (trimmed !== '' && childLineIndent <= checkIndent && !(trimmed.startsWith('|'))) break;
                        if (trimmed === '' && i + 1 < lines.length && /^\s*-\s*\[([ xX])\]/.test(lines[i + 1])) break;
                        if (trimmed === '') { i++; continue; }
                        childLines.push(trimmed);
                        i++;
                    }
                    childContent = childLines;
                    processedLabel = '(/table)';
                } else {
                    i++;
                }

                checkItems.push({
                    checked: match[2].toLowerCase() === 'x',
                    label: processedLabel,
                    indent: checkIndent,
                    lineIndex: lineIdx,
                    linkedSubtaskIndex: markerMatch ? parseInt(markerMatch[1], 10) : -1,
                    childType,
                    childContent
                });
            }
            if (checkItems.length > 0) {
                blocks.push({ type: 'checklist', items: checkItems });
            }
            continue;
        }

        // Table: starts with |
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            const tableLines = [];
            while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                tableLines.push(lines[i]);
                i++;
            }
            blocks.push({ type: 'table', lines: tableLines });
            continue;
        }

        // Empty line
        if (line.trim() === '') {
            i++;
            continue;
        }

        // Plain text paragraph
        const paraLines = [];
        while (
            i < lines.length &&
            lines[i].trim() !== '' &&
            !lines[i].trim().startsWith('```') &&
            !/^\s*-\s*\[([ xX])\]/.test(lines[i]) &&
            !(lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|'))
        ) {
            paraLines.push(lines[i]);
            i++;
        }
        if (paraLines.length > 0) {
            blocks.push({ type: 'text', content: paraLines.join('\n') });
        }
    }

    return blocks;
}

function renderTableFromLines(tableLines, key) {
    const rows = tableLines
        .filter(l => !/^\s*\|[-:| ]+\|\s*$/.test(l))
        .map(l =>
            l.trim().slice(1, -1).split('|').map(cell => cell.trim())
        );
    if (rows.length === 0) return null;
    const header = rows[0];
    const body = rows.slice(1);

    return (
        <div key={key} className="md-table-wrap">
            <table className="md-table">
                <thead>
                    <tr>
                        {header.map((cell, ci) => (
                            <th key={ci}>{renderInline(cell)}</th>
                        ))}
                    </tr>
                </thead>
                {body.length > 0 && (
                    <tbody>
                        {body.map((row, ri) => (
                            <tr key={ri}>
                                {row.map((cell, ci) => (
                                    <td key={ci}>{renderInline(cell)}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                )}
            </table>
        </div>
    );
}

function renderBlock(block, key, onToggleCheckbox) {
    switch (block.type) {
        case 'code':
            return (
                <div key={key} className="md-code-block">
                    {block.lang && <span className="md-code-lang">{block.lang}</span>}
                    <pre><code>{block.content}</code></pre>
                </div>
            );

        case 'checklist':
            return (
                <div key={key} className="md-checklist">
                    {block.items.map((item, idx) => (
                        <div key={idx} className="md-check-wrapper" style={{ marginLeft: `${item.indent * 8}px` }}>
                            <label
                                className={`md-check-item ${item.checked ? 'checked' : ''} ${onToggleCheckbox ? 'interactive' : ''} ${item.linkedSubtaskIndex >= 0 ? 'linked' : ''}`}
                                style={{ cursor: onToggleCheckbox ? 'pointer' : 'default' }}
                                onClick={(e) => {
                                    if (onToggleCheckbox) {
                                        e.preventDefault();
                                        onToggleCheckbox(item.lineIndex, !item.checked);
                                    } else {
                                        e.preventDefault();
                                    }
                                }}
                            >
                                <span className={`md-checkbox ${item.checked ? 'md-checkbox--checked' : ''}`}>
                                    {item.checked && (
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.5">
                                            <path d="M2 5l2.5 2.5L8 3" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </span>
                                {item.linkedSubtaskIndex >= 0 && (
                                    <span className="md-link-icon" title="Linked to Subtask">
                                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M6.5 9.5l3-3" strokeLinecap="round" />
                                            <path d="M9 7l1.5-1.5a2.12 2.12 0 0 0-3-3L6 4" strokeLinecap="round" />
                                            <path d="M7 9l-1.5 1.5a2.12 2.12 0 0 1-3-3L4 6" strokeLinecap="round" />
                                        </svg>
                                    </span>
                                )}
                                {item.childType ? (
                                    <span className="md-check-token">{item.childType === 'code' ? '⟨/⟩ Code' : '⊞ Table'}</span>
                                ) : (
                                    <span className={item.checked ? 'md-check-done' : ''}>{renderInline(item.label)}</span>
                                )}
                            </label>
                            {/* Render embedded code block */}
                            {item.childType === 'code' && item.childContent && (
                                <div className="md-code-block md-check-child">
                                    <pre><code>{item.childContent}</code></pre>
                                </div>
                            )}
                            {/* Render embedded table */}
                            {item.childType === 'table' && Array.isArray(item.childContent) && item.childContent.length > 0 && (
                                <div className="md-check-child">
                                    {renderTableFromLines(item.childContent, `${idx}-tbl`)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            );

        case 'table':
            return renderTableFromLines(block.lines, key);

        case 'text':
        default:
            return <p key={key} className="md-text">{renderInline(block.content)}</p>;
    }
}
