// Centralized helpers for calling Supabase Edge Functions (streaming + non-streaming)
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(
    /\/+$/,
    "",
);
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const LOCAL_FN_PORT = (import.meta.env.VITE_SUPABASE_FUNCTIONS_PORT || "")
    .trim(); // e.g. "9999"

/** Choose the correct base depending on how you're running locally */
function resolveFnBase(): string {
    // If you're using: `supabase functions serve chat-with-ai` → port 9999 (no /functions/v1)
    if (LOCAL_FN_PORT) {
        return `http://127.0.0.1:${Number(LOCAL_FN_PORT) || 9999}/`;
    }

    // If you're using `supabase start` (full stack) or in prod → use the gateway
    if (SUPABASE_URL) return `${SUPABASE_URL}/functions/v1/`;

    // Safe fallback to local full stack
    return "http://127.0.0.1:54321/functions/v1/";
}

/** If we’re going through the gateway (/functions/v1), apikey is required. On :9999 it is not. */
function needsApiKey(base: string): boolean {
    return base.includes("/functions/v1/");
}

async function buildHeaders(extra?: HeadersInit): Promise<HeadersInit> {
    const session = (await supabase.auth.getSession()).data.session;
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(extra as Record<string, string>),
    };

    if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
    }

    const base = resolveFnBase();
    if (needsApiKey(base) && SUPABASE_ANON_KEY) {
        headers.apikey = SUPABASE_ANON_KEY;
    }

    return headers;
}

function buildUrl(
    base: string,
    name: string,
    searchParams?: Record<string, string | number | boolean | undefined>,
) {
    const qp = searchParams &&
        Object.entries(searchParams)
            .filter(([, v]) => v !== undefined && v !== null && v !== "")
            .map(([k, v]) =>
                `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
            )
            .join("&");

    const path = name.replace(/^\/+/, "");
    return qp ? `${base}${path}?${qp}` : `${base}${path}`;
}

export async function callFn(
    name: string,
    init?: RequestInit & {
        searchParams?: Record<string, string | number | boolean | undefined>;
    },
): Promise<Response> {
    const base = resolveFnBase();
    const url = buildUrl(base, name, init?.searchParams);
    const headers = await buildHeaders(init?.headers);
    return fetch(url, { ...init, headers });
}

/** Same as callFn; kept separate to make streaming intent explicit at callsite */
export async function callFnStream(
    name: string,
    init?: RequestInit & {
        searchParams?: Record<string, string | number | boolean | undefined>;
    },
): Promise<Response> {
    return callFn(name, init);
}
