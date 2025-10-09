// src/utils/prioritization.js
/**
 * computePriority
 *
 * Returns an object:
 *  { complexity: 'easy'|'medium'|'hard',
 *    priorityLabel: 'low'|'medium'|'high',
 *    priorityRank: number  }
 *
 * priorityRank is a numeric value suitable for sorting (higher -> more important/urgent).
 *
 * Options:
 *  - complexityMode: 'auto'|'manual' (default: 'auto')
 *  - complexity: if complexityMode === 'manual' you may pass 'easy'|'medium'|'hard' (or numeric)
 *
 * Heuristics:
 *  - complexity (auto) derived from effort (<=2 easy, <=5 medium, >5 hard) and keywords in title/description.
 *  - urgency contribution derived from dueDate over a 7-day window (0..99).
 *  - baseRank: low=1, medium=2, high=3 -> finalRank = baseRank*100 + urgency (0..99)
 *
 * This avoids the old floating "score" and gives a simple numeric rank for ordering in Firestore queries.
 */
export function computePriority({
    dueDate = null,
    priorityLabel = "medium",
    effort = 3,
    dependencies = [],
    createdAt = null,
    complexity = null,
    complexityMode = "auto",
    title = "",
    description = "",
} = {}) {
    // normalize priority label
    const pl = String(priorityLabel || "medium").toLowerCase();
    const priorityLabelNorm = pl === "low" || pl === "high" ? pl : "medium";

    // compute urgency (0..99) based on due date within 7 day window, overdue => 99
    let urgency = 0;
    if (dueDate) {
        let dueMs;
        try {
        dueMs = (dueDate && typeof dueDate.toMillis === "function") ? dueDate.toMillis() : new Date(dueDate).getTime();
        } catch (e) {
        dueMs = new Date(dueDate).getTime();
        }
        const now = Date.now();
        const msLeft = dueMs - now;
        const weekMs = 7 * 24 * 3600 * 1000;
        if (msLeft <= 0) urgency = 99;
        else urgency = Math.max(0, Math.min(99, Math.round((1 - (msLeft / weekMs)) * 99)));
    }

    // determine complexity: manual or auto heuristics
    let complexityResolved = "medium";
    if (String(complexityMode || "auto") === "manual" && (complexity !== null && complexity !== undefined && complexity !== "")) {
        const c = String(complexity).toLowerCase();
        if (["easy", "e", "1"].includes(c)) complexityResolved = "easy";
        else if (["hard", "h", "3", "8"].includes(c)) complexityResolved = "hard";
        else complexityResolved = "medium";
    } else {
        // auto heuristics: effort primarily, plus keywords
        const eff = Number.isFinite(Number(effort)) ? Number(effort) : 3;
        if (eff <= 2) complexityResolved = "easy";
        else if (eff <= 5) complexityResolved = "medium";
        else complexityResolved = "hard";

        const text = `${title || ""} ${description || ""}`.toLowerCase();
        if (/\b(quick|small|trivial|min(or)?|simple|tiny|low effort)\b/.test(text)) complexityResolved = "easy";
        if (/\b(complex|large|major|refactor|research|integration|hard|architect)\b/.test(text)) complexityResolved = "hard";
    }

    // base priority numeric
    const baseMap = { low: 1, medium: 2, high: 3 };
    const baseRank = baseMap[priorityLabelNorm] || 2;

    // blocked dependencies slightly reduce priority: multiply urgency down a bit (but keep rank semantics)
    const blockedFactor = (dependencies && dependencies.length > 0) ? 0.7 : 1.0;
    const urgencyAdjusted = Math.round(urgency * blockedFactor);

    // final priorityRank: baseRank * 100 + urgencyAdjusted (0..99)
    const priorityRank = (baseRank * 100) + urgencyAdjusted;

    return {
        complexity: complexityResolved,
        priorityLabel: priorityLabelNorm,
        priorityRank: Number(priorityRank),
    };
}
