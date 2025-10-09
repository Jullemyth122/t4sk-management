// src/helpers/normalize.ts
export function normalizeApiResponse<T = any>(res: any): { data: T | T[] | null; meta?: any } {
    if (res == null) return { data: null };
    if (Array.isArray(res)) return { data: res as T[] , meta: { total: res.length } };
    if (res && typeof res === 'object' && 'data' in res) return { data: res.data as T, meta: res.meta };
    return { data: res as T };
}
