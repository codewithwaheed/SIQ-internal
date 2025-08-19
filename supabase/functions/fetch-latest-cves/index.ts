import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { days = 7, limit = 20 } = await req.json().catch(() => ({}));

    console.log(`[LATEST-CVES] Fetching CVEs from last ${days} days (limit: ${limit})`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const startDateStr = startDate.toISOString().split('T')[0] + 'T00:00:00.000';
    const endDateStr = endDate.toISOString().split('T')[0] + 'T23:59:59.999';

    // First, try to get from our cache
    const cachedCVEs = await getCachedCVEs(startDateStr, endDateStr, limit);
    
    if (cachedCVEs.length > 0) {
      console.log(`[LATEST-CVES] Found ${cachedCVEs.length} cached CVEs`);
      return new Response(JSON.stringify({
        success: true,
        cves: cachedCVEs,
        cached: true,
        total: cachedCVEs.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch from NVD API
    const cves = await fetchLatestCVEsFromNVD(startDateStr, endDateStr, limit);

    // Store in cache
    await storeCVEsInCache(cves);

    // Log the fetch operation
    await logCVEFetch(cves.length, days);

    console.log(`[LATEST-CVES] Successfully fetched ${cves.length} CVEs from NVD`);

    return new Response(JSON.stringify({
      success: true,
      cves,
      cached: false,
      total: cves.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[LATEST-CVES] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Unable to fetch latest CVEs at the moment. Please try again later.',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getCachedCVEs(startDate: string, endDate: string, limit: number) {
  try {
    const { data, error } = await supabase
      .from('cve_cache')
      .select(`
        cve_id,
        description,
        published_date,
        modified_date,
        cvss_v3_score,
        cvss_v3_severity,
        cvss_v2_score,
        cvss_v2_severity,
        cwe_list,
        reference_urls
      `)
      .gte('published_date', startDate)
      .lte('published_date', endDate)
      .order('published_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[LATEST-CVES] Error fetching cached CVEs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn('[LATEST-CVES] Exception fetching cached CVEs:', error);
    return [];
  }
}

async function fetchLatestCVEsFromNVD(startDate: string, endDate: string, limit: number) {
  try {
    const nvdApiKey = Deno.env.get('NVD_API_KEY');
    
    const headers: Record<string, string> = {
      'User-Agent': 'SentrIQ-CVE-Lookup/1.0',
    };
    
    if (nvdApiKey) {
      headers['apiKey'] = nvdApiKey;
    }

    console.log(`[LATEST-CVES] Calling NVD API for date range: ${startDate} to ${endDate}`);
    
    // NVD API expects ISO format with timezone
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${startDate}&pubEndDate=${endDate}&resultsPerPage=${Math.min(limit, 2000)}`;

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(30000), // 30 second timeout for bulk requests
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('NVD API rate limit exceeded. Please try again later.');
      } else if (response.status === 403) {
        throw new Error('NVD API access denied. API key may be required.');
      }
      throw new Error(`NVD API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.vulnerabilities) {
      return [];
    }

    // Process and format CVE data
    const cves = data.vulnerabilities.slice(0, limit).map((vuln: any) => {
      const cve = vuln.cve;

      // Extract CVSS scores
      let cvssV3Score, cvssV3Severity, cvssV2Score, cvssV2Severity;
      
      if (cve.metrics?.cvssMetricV31?.length > 0) {
        const metric = cve.metrics.cvssMetricV31[0];
        cvssV3Score = metric.cvssData.baseScore;
        cvssV3Severity = metric.cvssData.baseSeverity;
      } else if (cve.metrics?.cvssMetricV30?.length > 0) {
        const metric = cve.metrics.cvssMetricV30[0];
        cvssV3Score = metric.cvssData.baseScore;
        cvssV3Severity = metric.cvssData.baseSeverity;
      }

      if (cve.metrics?.cvssMetricV2?.length > 0) {
        const metric = cve.metrics.cvssMetricV2[0];
        cvssV2Score = metric.cvssData.baseScore;
        cvssV2Severity = metric.baseSeverity;
      }

      // Extract CWE information
      const cweList = cve.weaknesses?.map((w: any) => 
        w.description?.map((d: any) => d.value).join(', ')
      ).filter(Boolean) || [];

      // Extract references
      const references = cve.references?.map((ref: any) => ref.url) || [];

      return {
        cve_id: cve.id,
        description: cve.descriptions?.find((d: any) => d.lang === 'en')?.value || 'No description available',
        published_date: cve.published,
        modified_date: cve.lastModified,
        cvss_v3_score: cvssV3Score,
        cvss_v3_severity: cvssV3Severity,
        cvss_v2_score: cvssV2Score,
        cvss_v2_severity: cvssV2Severity,
        cwe_list: cweList,
        reference_urls: references.slice(0, 10), // Limit references to avoid data bloat
      };
    });

    return cves;

  } catch (error) {
    console.error(`[LATEST-CVES] Error fetching from NVD:`, error);
    throw error;
  }
}

async function storeCVEsInCache(cves: any[]) {
  if (cves.length === 0) return;

  try {
    const cveRecords = cves.map(cve => ({
      ...cve,
      cached_at: new Date().toISOString(),
      raw_data: cve
    }));

    const { error } = await supabase
      .from('cve_cache')
      .upsert(cveRecords, {
        onConflict: 'cve_id'
      });

    if (error) {
      console.warn('[LATEST-CVES] Error storing CVEs in cache:', error);
    } else {
      console.log(`[LATEST-CVES] Cached ${cves.length} CVEs`);
    }
  } catch (error) {
    console.warn('[LATEST-CVES] Exception storing CVEs in cache:', error);
  }
}

async function logCVEFetch(count: number, days: number) {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        action: 'CVE_BULK_FETCH',
        description: `Fetched ${count} CVEs from last ${days} days`,
        metadata: {
          cve_count: count,
          days_range: days,
          timestamp: new Date().toISOString(),
          source: 'NVD_API'
        }
      });
  } catch (error) {
    console.warn('[LATEST-CVES] Error logging CVE fetch:', error);
  }
}