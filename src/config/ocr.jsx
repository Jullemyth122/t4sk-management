// src/services/ai/ocr.jsx
import { model } from './firebase.js'; // adjust path if needed

// -------------------- helpers --------------------
async function fileToBase64Str(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result || ''; // "data:<mime>;base64,AAAA..."
      const commaIdx = dataUrl.indexOf(',');
      const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
      resolve({ base64, mimeType: file.type || 'image/jpeg' });
    };
    reader.readAsDataURL(file);
  });
}

function parseLooseJSON(text) {
  if (!text || typeof text !== 'string') return null;
  // strip triple-fence
  text = text.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/i, '').trim();
  try { return JSON.parse(text); } catch (e) { /* fallthrough */ }

  // try to find first balanced {...}
  const firstOpen = text.indexOf('{');
  if (firstOpen === -1) return null;
  let depth = 0;
  for (let i = firstOpen; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(firstOpen, i + 1);
        try { return JSON.parse(candidate); } catch (e) { break; }
      }
    }
  }
  return null;
}

const clampInt = (v, min = 0, max = 100) => {
  const n = Number.isFinite(Number(v)) ? Math.round(Number(v)) : null;
  if (n === null) return null;
  return Math.max(min, Math.min(max, n));
};

function normalizeToTargetSum(vals, targetSum = 100) {
  const totalRaw = (vals || []).reduce((s, v) => s + (Number.isFinite(Number(v)) ? Number(v) : 0), 0);
  const count = vals.length || 0;
  if (count === 0) return [];
  if (totalRaw === 0) {
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

function roundToStepWithSumNormalized(arr, targetSum = 100, step = 5) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const s = arr.reduce((a, b) => a + (Number.isFinite(Number(b)) ? Number(b) : 0), 0);
  if (s === 0) return Array(arr.length).fill(0);
  const actualStep = (typeof step === 'number' && step > 1) ? step : 1;
  const rounded = arr.map(v => {
    const n = Number.isFinite(Number(v)) ? Number(v) : 0;
    return Math.max(0, Math.min(100, Math.round(n / actualStep) * actualStep));
  });
  let sumRounded = rounded.reduce((a, b) => a + b, 0);
  let diff = targetSum - sumRounded;
  const residues = arr.map((v, i) => {
    const n = Number.isFinite(Number(v)) ? Number(v) : 0;
    const frac = n - Math.round(n / actualStep) * actualStep;
    return { idx: i, frac, original: n, rounded: rounded[i] };
  });
  while (diff !== 0) {
    if (diff > 0) {
      residues.sort((a, b) => {
        const aDiff = (a.original - a.rounded);
        const bDiff = (b.original - b.rounded);
        if (aDiff === bDiff) return a.rounded - b.rounded;
        return bDiff - aDiff;
      });
      const cand = residues.find(r => rounded[r.idx] + actualStep <= 100);
      if (!cand) break;
      rounded[cand.idx] += actualStep;
      sumRounded += actualStep;
      diff -= actualStep;
    } else {
      residues.sort((a, b) => {
        if (a.rounded === b.rounded) return (a.original - a.rounded) - (b.original - b.rounded);
        return b.rounded - a.rounded;
      });
      const cand = residues.find(r => rounded[r.idx] - actualStep >= 0);
      if (!cand) break;
      rounded[cand.idx] -= actualStep;
      sumRounded -= actualStep;
      diff += actualStep;
    }
  }
  let finalSum = rounded.reduce((a, b) => a + b, 0);
  let rem = targetSum - finalSum;
  let i = 0;
  while (rem !== 0 && i < rounded.length * 2) {
    const idx = i % rounded.length;
    if (rem > 0 && rounded[idx] < 100) {
      rounded[idx] += (actualStep > 1 ? actualStep : 1);
      rem -= (actualStep > 1 ? actualStep : 1);
    } else if (rem < 0 && rounded[idx] > 0) {
      rounded[idx] -= (actualStep > 1 ? actualStep : 1);
      rem += (actualStep > 1 ? actualStep : 1);
    }
    i++;
  }
  return rounded.map(v => Math.max(0, Math.min(100, Math.round(v))));
}

function inferDueDateFromLabels(labels = [], strings = '') {
  const txt = (strings || '').toLowerCase();
  const lowLabels = (labels || []).map(s => (s || '').toString().toLowerCase());
  const tokens = [...lowLabels, txt];
  const today = new Date();
  const addDays = (d) => {
    const out = new Date(today);
    out.setDate(out.getDate() + d);
    return out.toISOString().slice(0, 10);
  };
  if (tokens.some(t => /\b(daily|every day|each day)\b/.test(t))) return addDays(1);
  if (tokens.some(t => /\b(weekly|every week|each week)\b/.test(t))) return addDays(7);
  if (tokens.some(t => /\b(monthly|every month|each month)\b/.test(t))) return addDays(30);
  if (tokens.some(t => /\b(quarterly|every quarter)\b/.test(t))) return addDays(90);
  const isoMatch = strings.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];
  const dmMatch = strings.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (dmMatch) {
    const d = Number(dmMatch[1]), m = Number(dmMatch[2]), yRaw = dmMatch[3];
    let year = Number(yRaw);
    if (year < 100) year += (year >= 70 ? 1900 : 2000);
    try {
      const candidate = new Date(year, m - 1, d);
      if (!Number.isNaN(candidate.getTime())) return candidate.toISOString().slice(0, 10);
    } catch (e) { /* ignore */ }
  }
  return null;
}

function inferWeight(item, globalKeywords = []) {
  if (item.weight !== undefined && item.weight !== null) {
    const w = clampInt(item.weight);
    if (w !== null) return w;
  }
  if (item.effort !== undefined && item.effort !== null && Number.isFinite(Number(item.effort))) {
    const e = Math.max(1, Math.min(10, Math.round(Number(item.effort))));
    return clampInt(e * 10);
  }
  if (item.priorityScale && typeof item.priorityScale === 'string') {
    const ps = item.priorityScale.toLowerCase();
    if (ps === 'easy') return 10;
    if (ps === 'medium') return 45;
    if (ps === 'hard') return 75;
    if (ps === 'high') return 90;
  }
  const text = ((item.title || '') + ' ' + (item.description || '') + ' ' + (globalKeywords || []).join(' ')).toLowerCase();
  let score = 50;
  const easyWords = ['email', 'emails', 'responding', 'phone', 'call', 'admin', 'administration', 'routine', 'daily'];
  if (easyWords.some(w => text.includes(w))) score -= 25;
  const harderWords = ['plan', 'planning', 'prepare', 'preparation', 'research', 'training', 'evaluation', 'run an event', 'oversee', 'overseeing', 'organis(e|z)'];
  if (harderWords.some(w => text.includes(w))) score += 20;
  const veryHardWords = ['complex', 'integration', 'infrastructure', 'migration', 'audit', 'major', 'design', 'architect'];
  if (veryHardWords.some(w => text.includes(w))) score += 30;
  if (text.includes('urgent') || text.includes('asap') || text.includes('priority')) score += 15;
  if (text.includes('daily')) score -= 10;
  if (text.includes('weekly')) score -= 5;
  if (text.includes('monthly')) score += 0;
  return clampInt(Math.round(score));
}

function normalizePriority(item, globalKeywords = []) {
  if (item.priority && typeof item.priority === 'string') {
    const p = (item.priority || '').toLowerCase();
    if (['low', 'medium', 'high'].includes(p)) return p;
  }
  if (item.priorityScale && typeof item.priorityScale === 'string') {
    const ps = item.priorityScale.toLowerCase();
    if (ps === 'easy') return 'low';
    if (ps === 'medium') return 'medium';
    if (ps === 'hard' || ps === 'high') return 'high';
  }
  const text = ((item.title || '') + ' ' + (item.description || '') + ' ' + (globalKeywords || []).join(' ')).toLowerCase();
  if (text.includes('urgent') || text.includes('important')) return 'high';
  return null;
}

function levenshtein(a = '', b = '') {
  const A = String(a || ''), B = String(b || '');
  const al = A.length, bl = B.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const dp = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) dp[i][0] = i;
  for (let j = 0; j <= bl; j++) dp[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[al][bl];
}

// keep '@' in tokens (canonicalize emails & uid tokens)
function normalizeTokenForEmail(tok = '') {
  if (!tok) return '';
  return String(tok).trim().toLowerCase().replace(/[()\[\]<>,"'`]/g, '').replace(/\s+/g, '');
}

function findBestCandidateForToken(token, candidateEmails = []) {
  if (!token) return null;
  const norm = normalizeTokenForEmail(token);
  if (!norm) return null;
  if (!candidateEmails || candidateEmails.length === 0) return null;
  if (norm.includes('@')) {
    const exact = candidateEmails.find(c => c === norm);
    if (exact) return exact;
  }
  const tokenLocal = norm.split('@')[0] || norm;
  let best = null;
  let bestScore = Infinity;
  for (const candidate of candidateEmails) {
    const candNorm = normalizeTokenForEmail(candidate);
    const candLocal = (candNorm.split('@')[0] || candNorm);
    const localDist = levenshtein(tokenLocal, candLocal);
    const fullDist = levenshtein(norm, candNorm);
    const score = localDist + (fullDist * 0.2);
    if (score < bestScore) {
      bestScore = score;
      best = candNorm;
    }
  }
  if (!best) return null;
  const candLen = Math.max(1, (best || '').length);
  if (bestScore <= 2 || (bestScore / candLen) <= 0.25) return best;
  return null;
}

// Helper: detect if many items contain the exact same non-empty assignee list (order-insensitive)
function detectRepeatedGlobalAssigneeList(intermediateItems) {
  const lists = intermediateItems
    .map(it => (Array.isArray(it.assignees) ? it.assignees.map(x => normalizeTokenForEmail(x)).filter(Boolean) : []))
    .filter(l => l.length > 0)
    .map(l => Array.from(new Set(l)).sort().join('|')); // canonical sorted signature
  if (lists.length === 0) return null;
  const first = lists[0];
  const allSame = lists.every(sig => sig === first);
  if (!allSame) return null;
  // return tokens (sorted unique)
  return first.split('|').map(x => x.trim()).filter(Boolean);
}

// -------------------- main exported function --------------------
export async function processImageForTasks(imageFile, details = {}, options = {}) {
  const context = (details.context || '').trim();
  const candidateEmailsRaw = Array.isArray(details.candidateEmails) ? details.candidateEmails : [];
  const candidateMapRaw = (details.candidateMap && typeof details.candidateMap === 'object') ? details.candidateMap : {};
  const excludedTokensRaw = Array.isArray(details.excludedTokens) ? details.excludedTokens : [];
  const fallbackPoolRaw = Array.isArray(details.fallbackPool) ? details.fallbackPool : [];

  // canonical candidateEmails (emails preferred; tokens normalized)
  const candidateEmails = Array.from(new Set(candidateEmailsRaw.map(e => normalizeTokenForEmail(e)).filter(Boolean)));

  // normalized candidateMap: tokenNormalized -> emailNormalized
  const candidateMap = {};
  Object.keys(candidateMapRaw || {}).forEach(k => {
    const v = candidateMapRaw[k];
    const kn = normalizeTokenForEmail(k);
    const vn = (v && typeof v === 'string') ? normalizeTokenForEmail(v) : null;
    if (kn && vn) candidateMap[kn] = vn;
  });

  // excluded normalized tokens set (owner, higher-level tokens)
  const excludedSet = new Set((excludedTokensRaw || []).map(x => normalizeTokenForEmail(x)).filter(Boolean));

  // remove excluded candidates from candidateEmails and candidateMap
  const filteredCandidateEmails = candidateEmails.filter(e => !excludedSet.has(e));
  Object.keys(candidateMap).forEach(k => {
    if (excludedSet.has(k) || excludedSet.has(candidateMap[k])) delete candidateMap[k];
  });

  // options controlling assignee behavior
  const maxAssigneesPerItem = (typeof details.maxAssigneesPerItem === 'number') ? Math.max(1, Math.floor(details.maxAssigneesPerItem)) : 1;
  const normalizedFallbackPool = Array.from(new Set(fallbackPoolRaw.map(x => normalizeTokenForEmail(x)).filter(Boolean))).filter(x => !excludedSet.has(x));
  const forceOnePerTask = !!details.forceOnePerTask;

  // original long prompt (kept)
  const originalPrompt = `
    CONTEXT:
    ${context}

    INSTRUCTIONS (RETURN JSON ONLY):
    Analyze the provided image and return a VALID JSON object only (no explanation, no code fences). The JSON must follow this schema exactly:

    {
      "listNameSuggestion": string | null,
      "strings": string,
      "keywords": string[],
      "arrays": {
        "documentList": [
          {
            "title": string,
            "description": string | null,
            "startDate": string | null,      // ISO 8601 date "YYYY-MM-DD" or null
            "dueDate": string | null,        // ISO 8601 date "YYYY-MM-DD" or null
            "priorityScale": string | null,  // one of: "easy","medium","hard","high" or null
            "priority": string | null,       // normalized: "low"|"medium"|"high" or null
            "weight": number | null,         // integer 0..100 or null; prefer multiples of 5 when possible
            "assignees": [ string ],         // emails or "uid:xxxxx" or empty array
            "labels": [ string ],
            "effort": number | null          // numeric estimate 1..10 or null
          }
        ]
      },
      "designSuggestions": string[],
      "uploadPrompt": string | null
    }

    RULES & GUIDANCE:
    - Return strictly valid JSON ONLY and follow the schema. Use null for fields you truly cannot infer.
    - Dates: If you can extract explicit dates (YYYY-MM-DD or dd/mm/yyyy or mm/dd/yyyy), return them as ISO (YYYY-MM-DD) in startDate/dueDate. If only words like "daily/weekly/monthly" appear, prefer null for explicit dates (client will infer), OR you may set approximate dates if the text clearly implies a schedule.
    - Weight guidance: If you include "weight", prefer small realistic contribution percentages (e.g., 5, 10, 15, 20...). Prefer multiples of 5. Keep the list balanced — do not assign many items 70-90% each. If you cannot infer a model weight confidently, return null.
    - If you can infer both startDate and dueDate explicitly, return both. If you only infer one (e.g., dueDate) you may leave the other null and the client will derive a reasonable start/due when importing.
    - If you can judge task difficulty, set priorityScale to one of: easy, medium, hard, high (lower-case). If you can map directly to "low/medium/high" set priority as well; else priority may be null.
    - If you can estimate effort (1-10), include it.
    - Assignees: return emails where possible or "uid:xxxxx" if identifiable. Use an empty array if not present.
    - Labels: return any tokens like "weekly", "invoice", "meeting" as labels array entries.
    - Only include numbers where confident. Use null for unknowns.

    EXAMPLES (model should follow these patterns):
    - If text says "weekly report" -> labels: ["weekly"], priorityScale: null, startDate: null, dueDate: null
    - If text says "due 2025-10-05" -> dueDate: "2025-10-05"
    - If text says "start 2025-10-01 due 2025-10-05" -> startDate: "2025-10-01", dueDate: "2025-10-05"
    - If text says "complex planning and research" -> priorityScale: "hard", effort: 7, weight: 70
    - If you return weight values, prefer realistic small values (e.g. 5,10,15,20) and ensure they will make sense when summed across the list.

    Return ONLY the JSON object now.
  `;

  const candidateBlock = filteredCandidateEmails.length
    ? `\nCANDIDATE_EMAILS (prefer/correct to these if OCR is noisy):\n${filteredCandidateEmails.join('\n')}\n\n`
    : '\n';
  const promptText = originalPrompt.replace(/\nReturn ONLY the JSON object now\.\s*$/, `${candidateBlock}Return ONLY the JSON object now.`);

  // build payload and call model
  const { base64, mimeType } = await fileToBase64Str(imageFile);
  const parts = [{ text: promptText }, { inlineData: { mimeType, data: base64 } }];

  try {
    const result = await model.generateContent(parts, { generationConfig: { responseMimeType: 'application/json' } });

    // extract candidate text
    const candidates = result?.response?.candidates;
    let rawText = null;
    if (Array.isArray(candidates) && candidates.length > 0) {
      const cp = candidates[0]?.content?.parts || [];
      for (const p of cp) {
        if (p.text && typeof p.text === 'string') { rawText = p.text; break; }
      }
    }
    if (!rawText && typeof result.response?.text === 'function') rawText = await result.response.text();
    if (!rawText) return { raw: result };

    let parsed = parseLooseJSON(rawText);
    if (!parsed) {
      const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (fenceMatch) parsed = parseLooseJSON(fenceMatch[1]);
    }
    if (!parsed) return { raw: rawText };

    // Post-process parsed result - normalize items
    const globalKeywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
    if (!parsed.arrays) parsed.arrays = {};
    const docList = Array.isArray(parsed.arrays.documentList) ? parsed.arrays.documentList : [];

    const intermediate = docList.map((it) => {
      const item = { ...(it || {}) };
      item.title = item.title ? String(item.title).trim() : null;
      item.description = item.description ? String(item.description).trim() : null;
      if (item.effort !== undefined && item.effort !== null && Number.isFinite(Number(item.effort))) {
        const e = Math.round(Number(item.effort));
        item.effort = Math.max(1, Math.min(10, e));
      } else item.effort = item.effort === null ? null : null;
      if (item.priorityScale && typeof item.priorityScale === 'string') {
        const ps = item.priorityScale.toLowerCase();
        item.priorityScale = ['easy', 'medium', 'hard', 'high'].includes(ps) ? ps : null;
      } else item.priorityScale = null;
      item.labels = Array.isArray(item.labels) ? item.labels.map(s => String(s).trim()).filter(Boolean) : [];
      item.assignees = Array.isArray(item.assignees) ? item.assignees.map(s => String(s).trim()).filter(Boolean) : [];
      const providedDue = item.dueDate ? String(item.dueDate).trim() : null;
      let parsedDue = null;
      if (providedDue) {
        const isoMatch = providedDue.match(/\d{4}-\d{2}-\d{2}/);
        if (isoMatch) parsedDue = isoMatch[0];
        else {
          const dm = providedDue.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
          if (dm) {
            let d = Number(dm[1]), m = Number(dm[2]), y = Number(dm[3]);
            if (y < 100) y += (y >= 70 ? 1900 : 2000);
            try {
              const dt = new Date(y, m - 1, d);
              if (!Number.isNaN(dt.getTime())) parsedDue = dt.toISOString().slice(0, 10);
            } catch (e) { parsedDue = null; }
          }
        }
      }
      item._parsedDue = parsedDue || null;

      const providedStart = item.startDate ? String(item.startDate).trim() : null;
      let parsedStart = null;
      if (providedStart) {
        const isoMatch2 = providedStart.match(/\d{4}-\d{2}-\d{2}/);
        if (isoMatch2) parsedStart = isoMatch2[0];
        else {
          const dm2 = providedStart.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
          if (dm2) {
            let d = Number(dm2[1]), m = Number(dm2[2]), y = Number(dm2[3]);
            if (y < 100) y += (y >= 70 ? 1900 : 2000);
            try {
              const dt = new Date(y, m - 1, d);
              if (!Number.isNaN(dt.getTime())) parsedStart = dt.toISOString().slice(0, 10);
            } catch (e) { parsedStart = null; }
          }
        }
      }
      item._parsedStart = parsedStart || null;

      item._rawWeight = (item.weight !== undefined && item.weight !== null && Number.isFinite(Number(item.weight))) ? clampInt(Number(item.weight)) : null;
      item._originalPriority = (item.priority && typeof item.priority === 'string') ? String(item.priority).toLowerCase() : null;
      return item;
    });

    // compute weights and normalize
    const rawWeights = intermediate.map((it) => {
      if (it._rawWeight !== null) return it._rawWeight;
      const inferred = inferWeight(it, globalKeywords);
      return inferred !== null ? Math.max(5, Math.round(inferred / 5) * 5) : 5;
    });
    const sumRaw = rawWeights.reduce((s, v) => s + (Number.isFinite(Number(v)) ? Number(v) : 0), 0);
    let normalized = [];
    if (sumRaw === 0) normalized = normalizeToTargetSum(rawWeights.map(() => 1), 100);
    else normalized = normalizeToTargetSum(rawWeights, 100);
    const preferredStep = 5;
    normalized = roundToStepWithSumNormalized(normalized, 100, preferredStep);
    if ((normalized.reduce((a, b) => a + b, 0)) !== 100) {
      normalized = normalizeToTargetSum(normalized, 100);
      normalized = roundToStepWithSumNormalized(normalized, 100, preferredStep);
    }

    // finalization: dates/priority and assignee pool building
    const today = new Date();
    const missingDueCount = intermediate.filter(it => !it._parsedDue).length;
    const windowDays = Math.min(30, Math.max(3, Math.ceil((missingDueCount || 1) * 1.5)));
    let missIndex = 0;

    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

    // Build globalDetected set (emails found in header/strings and in item text and OCR-provided assignees),
    // filtering excluded tokens at source.
    const globalDetected = new Set();
    if (parsed.strings && typeof parsed.strings === 'string') {
      const foundGlobal = Array.from((String(parsed.strings).match(emailRegex) || [])).map(e => normalizeTokenForEmail(e));
      foundGlobal.forEach(e => { if (e && !excludedSet.has(e)) globalDetected.add(e); });
    }
    intermediate.forEach(it => {
      const textBlob = `${it.title || ''} ${it.description || ''} ${it.text || ''}`;
      const found = Array.from((String(textBlob).match(emailRegex) || [])).map(e => normalizeTokenForEmail(e));
      found.forEach(e => { if (e && !excludedSet.has(e)) globalDetected.add(e); });
      if (Array.isArray(it.assignees)) {
        it.assignees.forEach(a => {
          if (!a) return;
          const norm = normalizeTokenForEmail(a);
          if (norm && !excludedSet.has(norm)) globalDetected.add(norm);
        });
      }
    });

    // Detect if OCR returned the same non-empty assignee list duplicated on every item (order-insensitive)
    const repeatedGlobalList = detectRepeatedGlobalAssigneeList(intermediate); // tokens normalized

    // Build orderedPool: prefer candidateEmails (mapped to email when candidateMap supplies mapping),
    // then candidateMap values, then repeatedGlobalList, then other detected tokens.
    const orderedPool = [];

    // helper: map token -> canonical email (only emails returned; if not mappable and not an email, returns null)
    const mapTokenToEmail = (tok) => {
      if (!tok) return null;
      const n = normalizeTokenForEmail(tok);
      if (!n) return null;
      // candidateMap mappings (uid->email or token->email)
      if (candidateMap[n] && candidateMap[n].includes('@')) return candidateMap[n];
      // direct email-like token
      if (n.includes('@')) return n;
      // fallback: nothing
      return null;
    };

    // 1) filteredCandidateEmails in order (map to emails)
    filteredCandidateEmails.forEach(tok => {
      const mapped = mapTokenToEmail(tok);
      if (mapped && !excludedSet.has(mapped) && !orderedPool.includes(mapped)) orderedPool.push(mapped);
    });

    // 2) any candidateMap values (may include email values)
    Object.keys(candidateMap).forEach(k => {
      const mapped = candidateMap[k];
      if (mapped && mapped.includes('@') && !excludedSet.has(mapped) && !orderedPool.includes(mapped)) orderedPool.push(mapped);
    });

    // 3) if orderedPool empty and repeatedGlobalList present, include mapping of repeatedGlobalList tokens
    if (orderedPool.length === 0 && repeatedGlobalList && repeatedGlobalList.length > 0) {
      repeatedGlobalList.forEach(tok => {
        const mapped = mapTokenToEmail(tok) || (tok.includes('@') ? tok : null);
        if (mapped && !excludedSet.has(mapped) && !orderedPool.includes(mapped)) orderedPool.push(mapped);
      });
    }

    // 4) include other detected emails (globalDetected)
    Array.from(globalDetected).forEach(tok => {
      const mapped = mapTokenToEmail(tok) || (tok.includes('@') ? tok : null) || null;
      if (mapped && !excludedSet.has(mapped) && !orderedPool.includes(mapped)) orderedPool.push(mapped);
    });

    // normalize orderedPool
    const normalizedOrderedPool = orderedPool.map(tok => normalizeTokenForEmail(tok)).filter(Boolean).filter(tok => !excludedSet.has(tok));

    const totalItems = intermediate.length || 0;
    let rrIndex = 0;

    const finalized = intermediate.map((it, idx) => {
      const item = { ...(it || {}) };

      let w = clampInt(normalized[idx] ?? 0);
      item.weight = (w === null || w === undefined) ? null : Number(w);

      // due/start
      let dueIso = item._parsedDue || null;
      if (!dueIso) {
        const inferred = inferDueDateFromLabels(item.labels || [], parsed.strings || '');
        if (inferred) dueIso = inferred;
      }
      if (!dueIso) {
        const slot = missIndex++;
        const spacing = Math.max(1, Math.floor(windowDays / Math.max(1, missingDueCount || 1)));
        const daysOut = (slot * spacing) + 1;
        const due = new Date(today);
        due.setDate(due.getDate() + daysOut);
        dueIso = due.toISOString().slice(0, 10);
      }
      let dueDateObj = dueIso ? new Date(dueIso) : null;

      let startIso = item._parsedStart || null;
      let startDateObj = startIso ? new Date(startIso) : null;
      if (!startDateObj && dueDateObj) {
        const eff = (item.effort && Number.isFinite(Number(item.effort))) ? Number(item.effort) : null;
        const daysSpan = eff !== null ? Math.max(1, Math.round(Math.min(7, Math.ceil(eff / 2)))) : 1;
        const s = new Date(dueDateObj); s.setDate(s.getDate() - daysSpan); startDateObj = s;
      }

      if (dueDateObj && startDateObj) {
        const sd = new Date(startDateObj); sd.setHours(0, 0, 0, 0);
        const dd = new Date(dueDateObj); dd.setHours(0, 0, 0, 0);
        if (sd.getTime() === dd.getTime()) { dd.setDate(dd.getDate() + 1); dueDateObj = dd; }
        if (dueDateObj && (new Date(dueDateObj).getTime() < new Date(startDateObj).getTime())) {
          const newDue = new Date(startDateObj); newDue.setDate(newDue.getDate() + 1); dueDateObj = newDue;
        }
      }

      const toIso = (d) => { if (!d) return null; try { const dt = new Date(d); if (Number.isNaN(dt.getTime())) return null; return dt.toISOString().slice(0, 10); } catch (e) { return null; } };
      item.startDate = toIso(startDateObj);
      item.dueDate = toIso(dueDateObj);

      item.priority = normalizePriority(item, globalKeywords) || (item._originalPriority || null);
      item.weight = (item.weight === null || item.weight === undefined) ? null : clampInt(item.weight);

      delete item._rawWeight;
      delete item._parsedDue;
      delete item._parsedStart;
      delete item._originalPriority;

      item.title = item.title || null;
      item.description = item.description || null;
      item.priorityScale = item.priorityScale || null;
      item.effort = (item.effort === null || item.effort === undefined) ? null : Number(item.effort);
      item.labels = item.labels || [];

      // ---------------- ASSIGNEE SELECTION ----------------
      // Prepare per-item explicit (normalized) but filter excluded tokens
      const explicitList = Array.isArray(it.assignees) ? it.assignees.map(x => normalizeTokenForEmail(x)).filter(Boolean) : [];
      const explicitUnique = Array.from(new Set(explicitList)).filter(x => !excludedSet.has(x));

      // If a repeated global list was detected AND the explicit list matches that repeated list we treat it as global (do NOT honor as per-item)
      const explicitMatchesRepeatedGlobal = repeatedGlobalList && repeatedGlobalList.length > 0
        && explicitUnique.length === repeatedGlobalList.length
        && explicitUnique.every((x) => repeatedGlobalList.includes(x));

      if (explicitUnique.length > 0 && !explicitMatchesRepeatedGlobal) {
        // honor distinct per-item explicit values
        // BUT map tokens to emails only (candidateMap or if token already email). We will NOT return raw UIDs.
        const mapped = explicitUnique
          .map(tok => mapTokenToEmail(tok))
          .filter(Boolean) // only keep mappable emails
          .map(e => normalizeTokenForEmail(e))
          .filter(e => !excludedSet.has(e));

        item.assignees = mapped.slice(0, maxAssigneesPerItem).map(tok => (tok.includes('@') ? tok.toLowerCase() : tok));
      } else {
        // No safe per-item explicit -> use normalizedOrderedPool / fallback / round-robin / one-to-one rules
        let chosen = null;
        if (normalizedOrderedPool.length >= totalItems && totalItems > 0) {
          // one-to-one by index (preferred when we have at least as many tokens as items)
          chosen = normalizedOrderedPool[idx % normalizedOrderedPool.length];
        } else if (normalizedOrderedPool.length === 1) {
          // single candidate -> assign to all
          chosen = normalizedOrderedPool[0];
        } else if (normalizedOrderedPool.length > 1) {
          // round-robin by index (deterministic)
          chosen = normalizedOrderedPool[idx % normalizedOrderedPool.length];
        } else if (forceOnePerTask && normalizedFallbackPool.length > 0) {
          chosen = normalizedFallbackPool[idx % normalizedFallbackPool.length];
        } else {
          chosen = null;
        }

        if (chosen) {
          // Map chosen token to canonical email when available (candidateMap or direct email)
          const mappedEmail = candidateMap[chosen] || candidateMap[normalizeTokenForEmail(chosen)] || (chosen.includes('@') ? chosen : null);
          const finalTok = normalizeTokenForEmail(mappedEmail || chosen);
          if (finalTok && !excludedSet.has(finalTok)) {
            item.assignees = [(finalTok.includes('@') ? finalTok.toLowerCase() : finalTok)];
          } else {
            item.assignees = [];
          }
        } else {
          item.assignees = [];
        }
      }

      if (Array.isArray(item.assignees) && item.assignees.length > maxAssigneesPerItem) {
        item.assignees = item.assignees.slice(0, maxAssigneesPerItem);
      }

      return item;
    });

    if (finalized.length === 1) finalized[0].weight = 100;

    parsed.arrays.documentList = finalized;
    parsed.listNameSuggestion = parsed.listNameSuggestion ?? null;
    parsed.strings = parsed.strings ?? '';
    parsed.keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
    parsed.designSuggestions = Array.isArray(parsed.designSuggestions) ? parsed.designSuggestions : [];
    parsed.uploadPrompt = parsed.uploadPrompt ?? null;

    return parsed;
  } catch (err) {
    console.error('generateContent failed', err);
    throw err;
  }
}
