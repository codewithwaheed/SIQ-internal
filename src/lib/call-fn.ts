import { supabase } from "@/integrations/supabase/client";
import { getAccessToken } from "@/lib/get-access-token";
import { fnUrl } from "@/lib/functions-url";

/** Non-stream Edge Function calls (auto-attaches Authorization & apikey). */
export async function callFn<T = any>(
    name: string,
    options?: {
        method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
        body?: any;
        headers?: Record<string, string>;
    },
): Promise<{ data: T | null; error: any }> {
    const token = await getAccessToken().catch(() => null);
    const headers: Record<string, string> = {
        ...(options?.headers || {}),
    };

    if (token) headers.Authorization = `Bearer ${token}`;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (anon) headers.apikey = anon;

    return supabase.functions.invoke<T>(name, {
        ...options,
        headers,
    });
}

/** Streaming calls (e.g., chat-with-ai) with auth headers attached. */
export async function callFnStream(
    path: string,
    init: {
        method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
        body?: unknown;
        signal?: AbortSignal;
    } = {},
): Promise<Response> {
    const token = await getAccessToken().catch(() => null);
    const headers = new Headers();

    if (token) headers.set("Authorization", `Bearer ${token}`);
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (anon) headers.set("apikey", anon);

    let body: BodyInit | null = null;
    if (init.body instanceof FormData) {
        body = init.body;
    } else if (init.body !== undefined) {
        headers.set("Content-Type", "application/json");
        body = JSON.stringify(init.body);
    }

    return fetch(fnUrl(path), {
        method: init.method ?? "POST",
        headers,
        body,
        signal: init.signal,
    });
}
