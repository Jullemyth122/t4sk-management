import { useEffect, useRef } from 'react';

export default function useMounted() {
    const ref = useRef(true);
    useEffect(() => () => { ref.current = false; }, []);
    return ref;
}