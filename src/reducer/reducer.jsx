export function reducer(state, action) {
    switch (action.type) {
        case 'SET_KEYS':
            return { ...state, ...action.payload };
        case 'SET_KEY': {
            const { key, value } = action.payload;
            const newVal = (typeof value === 'function') ? value(state[key]) : value;
            return { ...state, [key]: newVal };
        }
        default:
            return state;
    }
}