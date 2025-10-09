/**
 * useSafeAsync
 * Small helper wrapper that runs async work and indicates if the result was cancelled
 * (component unmounted) so callers know not to set state.
 *
 * Usage:
 *   const mountedRef = useMounted(); // returns a ref whose .current is false after unmount
 *   const { runSafe } = useSafeAsync(mountedRef);
 *
 *   const { cancelled, result, error } = await runSafe(() => fetchSomething());
 *   if (cancelled) return; // component unmounted
 *   if (error) setError(error.message)
 *   else setState(result)
 */
export default function useSafeAsync(mountedRef) {
    const runSafe = async (asyncFn) => {
        if (typeof asyncFn !== 'function') {
            return { cancelled: false, result: undefined, error: new Error('asyncFn must be a function') };
        }
        try {
            const result = await asyncFn();
            if (mountedRef && mountedRef.current === false) {
                return { cancelled: true, result: undefined, error: undefined };
            }
            return { cancelled: false, result, error: undefined };
        } catch (error) {
            if (mountedRef && mountedRef.current === false) {
                return { cancelled: true, result: undefined, error };
            }
            return { cancelled: false, result: undefined, error };
        }
    };
    return { runSafe };
}
