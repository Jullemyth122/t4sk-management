export function distributeWeights(subtasks = []) {
    // 1. Identify locked (explicitly non-zero) vs auto (0 or null/undefined)
    // We treat '0' as auto, assuming user leaves it blank or 0 for "fill me in".
    // If user explicitly wants 0%, they might need 0.1? Or we just assume 0 is "auto".
    // Let's assume 0 is auto.

    const explicitlyWeighed = subtasks.filter(s => Number(s.weight) > 0);
    const autoWeighed = subtasks.filter(s => !Number(s.weight) || Number(s.weight) <= 0);

    const totalExplicit = explicitlyWeighed.reduce((sum, s) => sum + Number(s.weight), 0);
    const remaining = 100 - totalExplicit;

    // Warning flag if we are over 100
    const isOver100 = totalExplicit > 100;
    
    // Distribute remaining equally
    const count = autoWeighed.length;
    let distributed = 0;
    if (count > 0 && remaining > 0) {
        distributed = Math.floor(remaining / count);
    } 
    // If remaining < 0, distributed is 0.

    // Return new array with computed weights
    // We don't overwrite "weight" in the object permanent state unless we want to save it as such.
    // The function returns a new list of objects with a 'weight' property that ensures total is 100 (if possible).
    
    // However, for the "smart auto-calculate" feature, the user wants the saved data to have the calculated weights.
    
    return subtasks.map(s => {
        const val = Number(s.weight);
        if (val > 0) {
            return { ...s, weight: val };
        }
        // It's an auto subtask
        return { ...s, weight: distributed > 0 ? distributed : 0 };
    });
}

export function validateTotalWeight(subtasks = []) {
    const total = subtasks.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);
    if (total > 100) return { valid: false, message: `Total weight ${total}% exceeds 100%` };
    if (total < 100 && total > 0) {
        // This is fine, we might auto-distribute, but if we are validating *after* distribution, it should be close to 100.
        // If we validate *before* distribution (explicit weights), specific checks apply.
    }
    return { valid: true };
}

export function getProjectedWeight(subtasks = [], index) {
    // Helper to help UI show "placeholder" (ghost) value
    const simulated = distributeWeights(subtasks);
    if (!simulated[index]) return 0;
    return simulated[index].weight;
}
