/**
 * Lightweight markdown renderer for task descriptions.
 * Supports: code blocks (```), checklists (- [ ] / - [x]), and tables (| ... |).
 * Falls back to plain text paragraphs for everything else.
 */
export default function MarkdownPreview({ text, className = '' }) {
    if (!text || !text.trim()) return null;

    const blocks = parseBlocks(text);

    return (
        <div className={`md-preview ${className}`}>
            {blocks.map((block, i) => renderBlock(block, i))}
        </div>
    );
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
                const match = lines[i].match(/^\s*-\s*\[([ xX])\]\s*(.*)/);
                checkItems.push({
                    checked: match[1].toLowerCase() === 'x',
                    label: match[2],
                });
                i++;
            }
            blocks.push({ type: 'checklist', items: checkItems });
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

function renderBlock(block, key) {
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
                        <label key={idx} className={`md-check-item ${item.checked ? 'checked' : ''}`}>
                            <span className={`md-checkbox ${item.checked ? 'md-checkbox--checked' : ''}`}>
                                {item.checked && (
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.5">
                                        <path d="M2 5l2.5 2.5L8 3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </span>
                            <span className={item.checked ? 'md-check-done' : ''}>{item.label}</span>
                        </label>
                    ))}
                </div>
            );

        case 'table': {
            const rows = block.lines
                .filter(l => !/^\s*\|[-:| ]+\|\s*$/.test(l)) // filter separator row
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
                                    <th key={ci}>{cell}</th>
                                ))}
                            </tr>
                        </thead>
                        {body.length > 0 && (
                            <tbody>
                                {body.map((row, ri) => (
                                    <tr key={ri}>
                                        {row.map((cell, ci) => (
                                            <td key={ci}>{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        )}
                    </table>
                </div>
            );
        }

        case 'text':
        default:
            return <p key={key} className="md-text">{block.content}</p>;
    }
}
