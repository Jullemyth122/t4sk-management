/**
 * Subtask ↔ Description Bidirectional Sync Helpers
 * 
 * Linked subtasks are marked in the description markdown with a hidden HTML comment:
 *   - [ ] <!-- subtask:0 --> Subtask Title
 * 
 * This marker is invisible in the MarkdownPreview but allows us to:
 * 1. Know which description checkbox maps to which subtask index
 * 2. Sync checked state bidirectionally
 * 3. Sync text edits bidirectionally
 * 4. Auto-check parent when all nested children are checked
 */

const MARKER_RE = /<!-- subtask:(\d+) -->/;

// ─── Query helpers ───

/** Check if a subtask index is already linked in the description */
export function isSubtaskLinked(description, subtaskIndex) {
    if (!description) return false;
    return description.includes(`<!-- subtask:${subtaskIndex} -->`);
}

/** Get the line index in description for a given subtask index */
export function getLinkedLineIndex(description, subtaskIndex) {
    if (!description) return -1;
    const lines = description.split('\n');
    const marker = `<!-- subtask:${subtaskIndex} -->`;
    return lines.findIndex(l => l.includes(marker));
}

/** Extract the subtask index from a description line, or -1 */
export function getSubtaskIndexFromLine(line) {
    const m = line.match(MARKER_RE);
    return m ? parseInt(m[1], 10) : -1;
}

/** Strip the marker from a line to get the visible text */
export function stripMarker(line) {
    return line.replace(/\s*<!-- subtask:\d+ -->\s*/, ' ').trim();
}

/** Get just the label text from a linked description line */
export function getLabelFromLinkedLine(line) {
    const m = line.match(/^\s*-\s*\[[ xX]\]\s*<!-- subtask:\d+ -->\s*(.*)/);
    return m ? m[1].trim() : null;
}

// ─── Link / Unlink ───

/** Insert a linked checkbox for a subtask into the description (appends) */
export function linkSubtaskToDescription(description, subtaskIndex, subtaskText, isChecked) {
    const check = isChecked ? 'x' : ' ';
    const newLine = `- [${check}] <!-- subtask:${subtaskIndex} --> ${subtaskText}`;
    if (!description || !description.trim()) return newLine;
    return description + '\n' + newLine;
}

/** Remove a linked subtask marker line from description */
export function unlinkSubtaskFromDescription(description, subtaskIndex) {
    if (!description) return description;
    const lines = description.split('\n');
    const marker = `<!-- subtask:${subtaskIndex} -->`;
    // Remove the parent line + any indented children directly below it
    const parentIdx = lines.findIndex(l => l.includes(marker));
    if (parentIdx === -1) return description;
    
    const parentLine = lines[parentIdx];
    const parentIndent = parentLine.match(/^(\s*)/)[1].length;
    
    let endIdx = parentIdx + 1;
    while (endIdx < lines.length) {
        const childLine = lines[endIdx];
        // If this is a checkbox line that is MORE indented than parent, it's a child
        if (/^\s*-\s*\[[ xX]\]/.test(childLine)) {
            const childIndent = childLine.match(/^(\s*)/)[1].length;
            if (childIndent > parentIndent) {
                endIdx++;
                continue;
            }
        }
        break;
    }
    
    lines.splice(parentIdx, endIdx - parentIdx);
    return lines.join('\n');
}

// ─── Sync: Subtask → Description ───

/** When a subtask checkbox is toggled, update the linked description line */
export function syncSubtaskToggleToDescription(description, subtaskIndex, newChecked) {
    if (!description) return description;
    const lines = description.split('\n');
    const marker = `<!-- subtask:${subtaskIndex} -->`;
    const lineIdx = lines.findIndex(l => l.includes(marker));
    if (lineIdx === -1) return description;

    if (newChecked) {
        lines[lineIdx] = lines[lineIdx].replace(/\[ \]/, '[x]');
    } else {
        lines[lineIdx] = lines[lineIdx].replace(/\[[xX]\]/, '[ ]');
    }
    return lines.join('\n');
}

/** When a subtask text is edited, update the linked description line text */
export function syncSubtaskTextToDescription(description, subtaskIndex, newText) {
    if (!description) return description;
    const lines = description.split('\n');
    const marker = `<!-- subtask:${subtaskIndex} -->`;
    const lineIdx = lines.findIndex(l => l.includes(marker));
    if (lineIdx === -1) return description;

    // Replace the text after the marker
    lines[lineIdx] = lines[lineIdx].replace(
        /(^\s*-\s*\[[ xX]\]\s*<!-- subtask:\d+ -->\s*).*/,
        `$1${newText}`
    );
    return lines.join('\n');
}

// ─── Sync: Description → Subtask ───

// ── Helper: get indent level for a line ──
function getIndent(line) {
    return (line.match(/^(\s*)/) || ['', ''])[1].length;
}

// ── Helper: is this line a checkbox? ──
function isCheckbox(line) {
    return /^\s*-\s*\[[ xX]\]/.test(line);
}

// ── Helper: is this checkbox checked? ──
function isChecked(line) {
    return /^\s*-\s*\[[xX]\]/.test(line);
}

// ── Helper: set checked state on a line ──
function setChecked(line, checked) {
    if (checked) return line.replace(/\[ \]/, '[x]');
    return line.replace(/\[[xX]\]/, '[ ]');
}

/** 
 * When a description checkbox is toggled: 
 * 1. Toggle the clicked line
 * 2. CASCADE DOWN: set all descendant children to the same checked state
 * 3. CASCADE UP: walk up through ALL ancestor levels, auto-checking each
 *    ancestor if all its direct children are checked, unchecking otherwise
 * Returns { description, subtaskUpdates: [{ index, field, value }] }
 */
export function syncDescriptionToggleToSubtask(description, lineIndex, newChecked) {
    if (!description) return { description, subtaskUpdates: [] };
    
    const lines = description.split('\n');
    const updates = [];

    // ── Step 1: Toggle the clicked line ──
    lines[lineIndex] = setChecked(lines[lineIndex], newChecked);
    const clickedIndent = getIndent(lines[lineIndex]);

    // ── Step 2: CASCADE DOWN — set all descendants to same state ──
    for (let j = lineIndex + 1; j < lines.length; j++) {
        if (!isCheckbox(lines[j])) continue;
        const childIndent = getIndent(lines[j]);
        if (childIndent <= clickedIndent) break; // out of scope
        lines[j] = setChecked(lines[j], newChecked);
        // If a descendant is linked, push subtask update
        const si = getSubtaskIndexFromLine(lines[j]);
        if (si >= 0) {
            updates.push({ index: si, field: 'completed', value: newChecked });
        }
    }

    // If the clicked line itself is linked, push its update too
    const clickedSubtaskIdx = getSubtaskIndexFromLine(lines[lineIndex]);
    if (clickedSubtaskIdx >= 0) {
        updates.push({ index: clickedSubtaskIdx, field: 'completed', value: newChecked });
    }

    // ── Step 3: CASCADE UP — bubble through all ancestor levels ──
    let currentLineIdx = lineIndex;

    while (true) {
        const currentIndent = getIndent(lines[currentLineIdx]);
        
        // Find the parent (nearest checkbox line above with less indent)
        let parentLineIdx = -1;
        for (let j = currentLineIdx - 1; j >= 0; j--) {
            if (!isCheckbox(lines[j])) continue;
            if (getIndent(lines[j]) < currentIndent) {
                parentLineIdx = j;
                break;
            }
        }

        if (parentLineIdx === -1) break; // reached the top level

        const parentIndent = getIndent(lines[parentLineIdx]);

        // Check if ALL direct children of this parent are checked
        // (direct children = checkboxes at exactly parentIndent + N where N > 0,
        //  but only the ones at the shallowest child depth)
        let allDirectChildrenChecked = true;
        let hasDirectChildren = false;
        let directChildIndent = -1;

        for (let j = parentLineIdx + 1; j < lines.length; j++) {
            if (!isCheckbox(lines[j])) continue;
            const ci = getIndent(lines[j]);
            if (ci <= parentIndent) break; // out of parent scope
            // Identify the direct child indent level (first child depth)
            if (directChildIndent === -1) directChildIndent = ci;
            // Only evaluate direct children, skip deeper descendants
            if (ci === directChildIndent) {
                hasDirectChildren = true;
                if (!isChecked(lines[j])) {
                    allDirectChildrenChecked = false;
                }
            }
        }

        if (hasDirectChildren) {
            const shouldBeChecked = allDirectChildrenChecked;
            const parentAlreadyChecked = isChecked(lines[parentLineIdx]);

            if (shouldBeChecked !== parentAlreadyChecked) {
                lines[parentLineIdx] = setChecked(lines[parentLineIdx], shouldBeChecked);
                const parentSi = getSubtaskIndexFromLine(lines[parentLineIdx]);
                if (parentSi >= 0) {
                    updates.push({ index: parentSi, field: 'completed', value: shouldBeChecked });
                }
            }
        }

        // Continue bubbling up from this parent
        currentLineIdx = parentLineIdx;
    }

    return { description: lines.join('\n'), subtaskUpdates: updates };
}

/**
 * When the description text is edited (in Edit mode), scan for linked lines
 * whose text has changed and return subtask text updates.
 * Returns: [{ index, field: 'text', value: newText }]
 */
export function syncDescriptionTextToSubtasks(description, subtasks) {
    if (!description || !subtasks) return [];
    const lines = description.split('\n');
    const updates = [];

    for (const line of lines) {
        const si = getSubtaskIndexFromLine(line);
        if (si < 0 || si >= subtasks.length) continue;
        const descLabel = getLabelFromLinkedLine(line);
        if (descLabel !== null && descLabel !== subtasks[si].text) {
            updates.push({ index: si, field: 'text', value: descLabel });
        }
    }

    return updates;
}

/**
 * After subtask indices change (e.g. deletion), re-index all markers.
 * oldIndex was removed; shift all markers > oldIndex down by 1.
 */
export function reindexMarkersAfterDelete(description, deletedIndex) {
    if (!description) return description;
    const lines = description.split('\n');
    const result = [];
    
    for (const line of lines) {
        const si = getSubtaskIndexFromLine(line);
        if (si === deletedIndex) {
            // Remove the marker but keep the line as a normal checkbox
            result.push(line.replace(/\s*<!-- subtask:\d+ -->\s*/, ' '));
        } else if (si > deletedIndex) {
            // Shift index down
            result.push(line.replace(`<!-- subtask:${si} -->`, `<!-- subtask:${si - 1} -->`));
        } else {
            result.push(line);
        }
    }
    
    return result.join('\n');
}
