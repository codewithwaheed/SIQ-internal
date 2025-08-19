import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify admin role
    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || userRole?.role !== "admin") {
      throw new Error("Admin access required");
    }

    const url = new URL(req.url);
    const sourceId = url.searchParams.get("sourceId");
    const action = url.searchParams.get("action") || "sync";

    // Handle different actions
    if (action === "list-sources") {
      const { data: sources, error } = await supabase
        .from("external_sources")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          sources: sources || [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "sync-logs") {
      const { data: logs, error } = await supabase
        .from("sync_logs")
        .select(
          `
          *,
          external_sources!inner(name, source_type)
        `,
        )
        .order("sync_started_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          logs: logs || [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "sync") {
      // Get sources to sync
      let sourcesToSync = [];

      if (sourceId) {
        // Sync specific source
        const { data: source, error } = await supabase
          .from("external_sources")
          .select("*")
          .eq("id", sourceId)
          .eq("is_active", true)
          .single();

        if (error) throw new Error("Source not found");
        sourcesToSync = [source];
      } else {
        // Sync all due sources
        const { data: sources, error } = await supabase
          .from("external_sources")
          .select("*")
          .eq("is_active", true)
          .or(
            "next_sync_at.is.null,next_sync_at.lte." + new Date().toISOString(),
          );

        if (error) throw error;
        sourcesToSync = sources || [];
      }

      console.log(`Starting sync for ${sourcesToSync.length} sources`);

      // Process each source
      const results = [];
      for (const source of sourcesToSync) {
        try {
          const result = await syncExternalSource(source);
          results.push({ sourceId: source.id, ...result });
        } catch (error) {
          console.error(`Error syncing source ${source.id}:`, error);
          results.push({
            sourceId: source.id,
            success: false,
            error: error.message,
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Sync initiated for ${sourcesToSync.length} sources`,
          results,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Error in sync-external-sources function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

async function syncExternalSource(source: any) {
  console.log(`Syncing source: ${source.name} (${source.source_type})`);

  // Create sync log entry
  const { data: syncLog, error: logError } = await supabase
    .from("sync_logs")
    .insert({
      source_id: source.id,
      status: "running",
    })
    .select()
    .single();

  if (logError) {
    throw new Error(`Failed to create sync log: ${logError.message}`);
  }

  try {
    // Update source status
    await supabase
      .from("external_sources")
      .update({
        sync_status: "running",
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", source.id);

    let documents = [];

    // Handle different source types
    switch (source.source_type) {
      case "nist":
        documents = await scrapeNISTContent(source);
        break;
      case "mitre":
        documents = await scrapeMITREContent(source);
        break;
      case "cve":
        documents = await scrapeCVEContent(source);
        break;
      case "rss":
        documents = await scrapeRSSFeed(source);
        break;
      default:
        documents = await scrapeGenericContent(source);
    }

    console.log(`Found ${documents.length} documents from ${source.name}`);

    let processedCount = 0;
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Process each document
    for (const doc of documents) {
      try {
        processedCount++;

        // Generate content hash for deduplication
        const contentHash = await generateContentHash(doc.content);

        // Check if document already exists
        const { data: existing } = await supabase
          .from("master_knowledge_base")
          .select("id, content_hash, version_number")
          .eq("source_id", doc.sourceId)
          .single();

        if (existing) {
          if (existing.content_hash === contentHash) {
            // Content unchanged, skip
            skippedCount++;
            continue;
          } else {
            // Content changed, update with new version
            await updateExistingDocument(
              existing.id,
              doc,
              contentHash,
              existing.version_number + 1,
            );
            updatedCount++;
          }
        } else {
          // New document, insert
          await insertNewDocument(doc, source, contentHash);
          addedCount++;
        }
      } catch (error) {
        console.error(`Error processing document:`, error);
      }
    }

    // Calculate next sync time
    const nextSyncAt = calculateNextSyncTime(source.sync_frequency);

    // Update source and sync log
    await supabase
      .from("external_sources")
      .update({
        sync_status: "completed",
        next_sync_at: nextSyncAt,
      })
      .eq("id", source.id);

    await supabase
      .from("sync_logs")
      .update({
        status: "completed",
        sync_completed_at: new Date().toISOString(),
        documents_processed: processedCount,
        documents_added: addedCount,
        documents_updated: updatedCount,
        documents_skipped: skippedCount,
      })
      .eq("id", syncLog.id);

    return {
      success: true,
      processed: processedCount,
      added: addedCount,
      updated: updatedCount,
      skipped: skippedCount,
    };
  } catch (error) {
    console.error(`Sync failed for source ${source.id}:`, error);

    // Update source and sync log with error
    await supabase
      .from("external_sources")
      .update({ sync_status: "failed" })
      .eq("id", source.id);

    await supabase
      .from("sync_logs")
      .update({
        status: "failed",
        sync_completed_at: new Date().toISOString(),
        error_message: error.message,
      })
      .eq("id", syncLog.id);

    throw error;
  }
}

async function scrapeNISTContent(source: any) {
  console.log("Scraping NIST content...");

  try {
    // For NIST, we'll scrape their cybersecurity framework pages
    const response = await fetch(source.base_url);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const documents = [];

    // Look for publication links and content
    const links = doc.querySelectorAll(
      'a[href*="/publications/"], a[href*="csrc.nist.gov"]',
    );

    for (const link of links) {
      const href = link.getAttribute("href");
      const title = link.textContent?.trim();

      if (title && href && title.length > 10) {
        documents.push({
          title: `NIST: ${title}`,
          content: await fetchPageContent(
            href.startsWith("http") ? href : `https://www.nist.gov${href}`,
          ),
          sourceId: `nist-${generateId(href)}`,
          sourceUrl: href.startsWith("http")
            ? href
            : `https://www.nist.gov${href}`,
          tags: ["nist", "cybersecurity", "framework"],
        });
      }
    }

    return documents.slice(0, 10); // Limit to 10 documents per sync
  } catch (error) {
    console.error("Error scraping NIST:", error);
    return [];
  }
}

async function scrapeMITREContent(source: any) {
  console.log("Scraping MITRE ATT&CK content...");

  try {
    // MITRE ATT&CK has a structured API we can use
    const response = await fetch(
      "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json",
    );
    const attackData = await response.json();

    const documents = [];

    // Process techniques
    const techniques = attackData.objects.filter(
      (obj: any) => obj.type === "attack-pattern",
    );

    for (const technique of techniques.slice(0, 20)) {
      // Limit to 20 techniques
      documents.push({
        title: `MITRE ATT&CK: ${technique.name}`,
        content: `${technique.description}\n\nTactic: ${technique.kill_chain_phases?.map((p: any) => p.phase_name).join(", ")}\n\nExternal ID: ${technique.external_references?.find((r: any) => r.source_name === "mitre-attack")?.external_id}`,
        sourceId: `mitre-${technique.external_references?.find((r: any) => r.source_name === "mitre-attack")?.external_id}`,
        sourceUrl: technique.external_references?.find((r: any) => r.url)?.url,
        tags: ["mitre", "attack", "tactics", "techniques"],
      });
    }

    return documents;
  } catch (error) {
    console.error("Error scraping MITRE:", error);
    return [];
  }
}

async function scrapeCVEContent(source: any) {
  console.log("Scraping CVE content...");

  try {
    // Use NVD API for recent CVEs
    const response = await fetch(
      "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20",
    );
    const cveData = await response.json();

    const documents = [];

    for (const cve of cveData.vulnerabilities || []) {
      const cveItem = cve.cve;
      documents.push({
        title: `CVE: ${cveItem.id}`,
        content: `${cveItem.descriptions?.find((d: any) => d.lang === "en")?.value}\n\nSeverity: ${cve.impact?.baseMetricV3?.cvssV3?.baseSeverity}\nScore: ${cve.impact?.baseMetricV3?.cvssV3?.baseScore}`,
        sourceId: `cve-${cveItem.id}`,
        sourceUrl: `https://nvd.nist.gov/vuln/detail/${cveItem.id}`,
        tags: ["cve", "vulnerability", "security"],
      });
    }

    return documents;
  } catch (error) {
    console.error("Error scraping CVE:", error);
    return [];
  }
}

async function scrapeRSSFeed(source: any) {
  console.log("Scraping RSS feed...");

  try {
    const response = await fetch(source.base_url);
    const xml = await response.text();

    // Parse RSS feed (simplified parser)
    const items = xml.match(/<item>(.*?)<\/item>/gs) || [];
    const documents = [];

    for (const item of items.slice(0, 10)) {
      const title = item.match(/<title>(.*?)<\/title>/s)?.[1]?.trim();
      const description = item
        .match(/<description>(.*?)<\/description>/s)?.[1]
        ?.trim();
      const link = item.match(/<link>(.*?)<\/link>/s)?.[1]?.trim();

      if (title && description) {
        documents.push({
          title: title,
          content: description,
          sourceId: `rss-${generateId(link || title)}`,
          sourceUrl: link,
          tags: ["rss", "news", "updates"],
        });
      }
    }

    return documents;
  } catch (error) {
    console.error("Error scraping RSS:", error);
    return [];
  }
}

async function scrapeGenericContent(source: any) {
  console.log("Scraping generic content...");

  try {
    const content = await fetchPageContent(source.base_url);

    return [
      {
        title: source.name,
        content: content,
        sourceId: `generic-${source.id}`,
        sourceUrl: source.base_url,
        tags: ["generic", "scraped"],
      },
    ];
  } catch (error) {
    console.error("Error scraping generic content:", error);
    return [];
  }
}

async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    // Extract main content (remove scripts, styles, nav, footer)
    const elementsToRemove = doc.querySelectorAll(
      "script, style, nav, footer, header, .navigation",
    );
    elementsToRemove.forEach((el) => el.remove());

    const mainContent =
      doc.querySelector("main") ||
      doc.querySelector("article") ||
      doc.querySelector("body");
    return mainContent?.textContent?.trim() || "No content found";
  } catch (error) {
    console.error("Error fetching page content:", error);
    return "Error fetching content";
  }
}

async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function insertNewDocument(doc: any, source: any, contentHash: string) {
  const { data: docRecord, error } = await supabase
    .from("master_knowledge_base")
    .insert({
      title: doc.title,
      description: `Auto-imported from ${source.name}`,
      content_type: source.content_type,
      framework_category: source.framework_category,
      file_name: `${doc.sourceId}.txt`,
      file_path: "", // No physical file for scraped content
      file_type: "text/plain",
      file_size: doc.content.length,
      tags: doc.tags || [],
      content_extracted: doc.content,
      source_type: "external",
      source_url: doc.sourceUrl,
      source_id: doc.sourceId,
      content_hash: contentHash,
      version_number: 1,
      last_synced_at: new Date().toISOString(),
      processing_status: "completed",
      processed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert document: ${error.message}`);
  }

  // Generate embeddings for the new document
  if (openAIApiKey) {
    EdgeRuntime.waitUntil(
      generateEmbeddingsForDocument(docRecord.id, doc.content),
    );
  }
}

async function updateExistingDocument(
  docId: string,
  doc: any,
  contentHash: string,
  newVersion: number,
) {
  const { error } = await supabase
    .from("master_knowledge_base")
    .update({
      content_extracted: doc.content,
      content_hash: contentHash,
      version_number: newVersion,
      last_synced_at: new Date().toISOString(),
      processing_status: "completed",
      processed_at: new Date().toISOString(),
    })
    .eq("id", docId);

  if (error) {
    throw new Error(`Failed to update document: ${error.message}`);
  }

  // Clear old embeddings and generate new ones
  await supabase
    .from("master_knowledge_embeddings")
    .delete()
    .eq("master_document_id", docId);

  if (openAIApiKey) {
    EdgeRuntime.waitUntil(generateEmbeddingsForDocument(docId, doc.content));
  }
}

async function generateEmbeddingsForDocument(
  documentId: string,
  content: string,
) {
  try {
    const { error } = await supabase.functions.invoke("generate-embeddings", {
      body: {
        documentId,
        text: content,
        tableType: "master_knowledge_base",
      },
    });

    if (error) {
      console.error("Error generating embeddings:", error);
    }
  } catch (error) {
    console.error("Error calling generate-embeddings function:", error);
  }
}

function calculateNextSyncTime(frequency: string): string {
  const now = new Date();
  switch (frequency) {
    case "hourly":
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    case "daily":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case "weekly":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
}

function generateId(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}
