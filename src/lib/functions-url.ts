// Build a functions URL from your Supabase URL, safely handling slashes.
const base = (import.meta.env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/, "");
if (!base) {
    // Optional: helpful console warning in dev
    // eslint-disable-next-line no-console
    console.warn(
        "VITE_SUPABASE_URL is missing. Edge Functions calls may fail.",
    );
}

/** Usage: fnUrl("chat-with-ai") -> "<supabaseUrl>/functions/v1/chat-with-ai" */
export function fnUrl(path: string) {
    return `${base}/functions/v1/${path.replace(/^\/+/, "")}`;
}
