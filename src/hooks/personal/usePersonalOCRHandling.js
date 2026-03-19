import { useCallback } from "react";
import { processImageForTasks } from "../../config/ocr";
import { tryParseEmbeddedJson } from "../../utils/dashboardUtils";

export function usePersonalOCRHandling({ dispatchSet, currentUserEmail }) {
    const handleUpload = useCallback(async (input) => {
        const file = (input instanceof File) ? input : input?.target?.files?.[0];
        if (!file) return;
        dispatchSet('loading', true);
        dispatchSet('ocrError', null);
        dispatchSet('ocrRaw', null);
        dispatchSet('ocrResult', null);

        try {
            const res = await processImageForTasks(file, {
                context: 'Extract tasks and UI suggestions for board import',
                candidateEmails: currentUserEmail ? [currentUserEmail] : [],
                excludedEmails: []
            });

            console.log('OCR raw result:', res);
            dispatchSet('ocrRaw', res);

            let parsed = res;
            if (res && res.raw && typeof res.raw === 'string') {
                parsed = tryParseEmbeddedJson(res.raw) || res;
            } else if (typeof res === 'string') {
                parsed = tryParseEmbeddedJson(res) || res;
            }
            dispatchSet('ocrResult', parsed);
        } catch (err) {
            console.error('OCR failed', err);
            dispatchSet('ocrError', err?.message || String(err));
        } finally {
            dispatchSet('loading', false);
        }
    }, [dispatchSet, currentUserEmail]);

    return { handleUpload };
}
