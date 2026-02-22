let _dispatchCount = 0;
let _dispatchTimer = null;
const _keyCounts = {};

export function reducer(state, action) {
    switch (action.type) {
        case 'SET_KEYS':
            return { ...state, ...action.payload };
        case 'SET_KEY': {
            const { key, value } = action.payload;
            const newVal = (typeof value === 'function') ? value(state[key]) : value;
            if (newVal === state[key]) return state;

            // Debug: track dispatch frequency
            _dispatchCount++;
            _keyCounts[key] = (_keyCounts[key] || 0) + 1;
            if (!_dispatchTimer) {
                _dispatchTimer = setTimeout(() => {
                    if (_dispatchCount > 50) {
                        console.warn('[REDUCER DEBUG] High dispatch count:', _dispatchCount, 'Key counts:', JSON.stringify(_keyCounts));
                    }
                    _dispatchCount = 0;
                    Object.keys(_keyCounts).forEach(k => delete _keyCounts[k]);
                    _dispatchTimer = null;
                }, 1000);
            }

            return { ...state, [key]: newVal };
        }
        default:
            return state;
    }
}