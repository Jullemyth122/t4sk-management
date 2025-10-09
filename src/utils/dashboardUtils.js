// Helper: parse embedded JSON in model responses
export function tryParseEmbeddedJson(rawStr) {
    if (!rawStr || typeof rawStr !== 'string') return null;
    // Normalize CRLF to LF
    let s = rawStr.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // If fenced code block exists (```json ... ```), use it
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fence && fence[1]) s = fence[1].trim();

    // Unescape common escapes
    s = s.replace(/\\"/g, '"').replace(/\\n/g, '\n');

    // Try direct parse
    try {
        return JSON.parse(s);
    } catch (err) {
        // Try to find the first JSON object or array block
        const firstObj = s.indexOf('{');
        const lastObj = s.lastIndexOf('}');
        const firstArr = s.indexOf('[');
        const lastArr = s.lastIndexOf(']');
        if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
            try {
                return JSON.parse(s.slice(firstObj, lastObj + 1));
            } catch (e) { /* fallthrough */ }
        }
        if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
            try {
                return JSON.parse(s.slice(firstArr, lastArr + 1));
            } catch (e) { /* fallthrough */ }
        }
        return null;
    }
}

export const parseISODateToDate = (d) => {
    if (!d) return null;
    try {
        if (d instanceof Date && !Number.isNaN(d.getTime())) return d;
        if (d && typeof d.toDate === 'function') return d.toDate();
        if (d && typeof d.toMillis === 'function') return new Date(d.toMillis());
        const parsed = new Date(d);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    } catch (e) { }
    return null;
};

export const deriveListName = (ocrResult) => {
    const s = (ocrResult.listNameSuggestion || ocrResult.listName || ocrResult.title || '').toString().trim();
    if (s) return s.slice(0, 120);
    const up = (ocrResult.uploadPrompt || '').toString().trim();
    if (up) return up.slice(0, 120);
    const firstItemTitle = (ocrResult.arrays && Array.isArray(ocrResult.arrays.documentList) && ocrResult.arrays.documentList[0] && (ocrResult.arrays.documentList[0].title || ocrResult.arrays.documentList[0].text || ocrResult.arrays.documentList[0].description));
    if (firstItemTitle) return String(firstItemTitle).split('\n')[0].slice(0, 120);
    return 'Imported Tasks';
};

// clamp integer helper
export const clampInt = (v, min = 0, max = 100) => {
    const n = Number.isFinite(Number(v)) ? Math.round(Number(v)) : null;
    if (n === null) return null;
    return Math.max(min, Math.min(max, n));
};

// normalize numeric array to integer array summing to targetSum (handles rounding)
export function normalizeToTargetSum(vals, targetSum = 100) {
    const totalRaw = (vals || []).reduce((s, v) => s + (Number.isFinite(Number(v)) ? Number(v) : 0), 0);
    const count = vals.length || 0;
    if (count === 0) return [];

    if (totalRaw === 0) {
        // equal split
        const base = Math.floor(targetSum / count);
        const out = Array(count).fill(base);
        let rem = targetSum - base * count;
        let i = 0;
        while (rem > 0) {
            out[i % count] += 1;
            rem -= 1;
            i += 1;
        }
        return out;
    }

    const scaled = vals.map(v => (Number.isFinite(Number(v)) ? (v / totalRaw) * targetSum : 0));
    const floored = scaled.map(v => Math.floor(v));
    let sumFloor = floored.reduce((s, x) => s + x, 0);
    const fractions = scaled.map((v, i) => ({ idx: i, frac: v - Math.floor(v) }));
    fractions.sort((a, b) => b.frac - a.frac);
    let rem = targetSum - sumFloor;
    let j = 0;
    while (rem > 0 && j < fractions.length) {
        floored[fractions[j].idx] += 1;
        rem -= 1;
        j += 1;
    }
    return floored.map(x => Math.max(0, Math.min(100, Math.round(x))));
}

// infer due date from item text/labels: daily -> +1 day, weekly -> +7 days, monthly -> +30 days
export function inferDueDateFromItem(item) {
    try {
        const combined = (
            (Array.isArray(item.labels) ? item.labels.join(' ') : '') + ' ' +
            (item.description || '') + ' ' +
            (item.text || '') + ' ' +
            (item.strings || '')
        ).toLowerCase();

        const now = new Date();
        if (combined.includes('daily') || combined.includes('daily')) {
            const d = new Date(now);
            d.setDate(d.getDate() + 1);
            return d;
        }
        if (combined.includes('weekly') || combined.includes('week')) {
            const d = new Date(now);
            d.setDate(d.getDate() + 7);
            return d;
        }
        if (combined.includes('monthly') || combined.includes('month')) {
            const d = new Date(now);
            d.setDate(d.getDate() + 30);
            return d;
        }
        // if explicit dueDate string present, try to parse it
        if (item.dueDate) {
            const parsed = new Date(item.dueDate);
            if (!Number.isNaN(parsed.getTime())) return parsed;
        }
    } catch (e) {
        // ignore and return null if anything fails
    }
    return null;
}
