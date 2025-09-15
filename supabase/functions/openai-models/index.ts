import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    });
    console.log("OpenAI models list response status:", res);
    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: `OpenAI models list failed: ${await res.text()}`,
        }),
        { status: 500, headers: corsHeaders },
      );
    }
    const data = await res.json();
    const models: Array<{ id: string }> = data?.data || [];
    const names = models.map((m) => m.id).sort();
    const embedding = names.filter((n) => n.includes("embedding"));
    console.log("Available models:", names, embedding);
    return new Response(
      JSON.stringify({ models: names, embedding_models: embedding }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: corsHeaders },
    );
  }
});
