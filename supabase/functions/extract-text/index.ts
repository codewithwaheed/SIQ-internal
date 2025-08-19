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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[EXTRACT-TEXT] Text extraction request started');
    const { filePath, fileType } = await req.json();
    
    if (!filePath || !fileType) {
      throw new Error('Missing required parameters: filePath, fileType');
    }

    console.log('Extracting text from:', { filePath, fileType });

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('user-documents')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      throw new Error('Failed to download file from storage');
    }

    let extractedText = '';

    if (fileType === 'application/pdf') {
      console.log('Processing PDF file...');
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to string and try to extract readable text
      let text = '';
      try {
        // Try UTF-8 first
        text = new TextDecoder('utf-8').decode(uint8Array);
      } catch {
        // Fallback to latin1 if UTF-8 fails
        text = new TextDecoder('latin1').decode(uint8Array);
      }
      
      console.log('Raw PDF size:', text.length);
      
      // Advanced PDF text extraction patterns
      const extractionMethods = [
        // Method 1: Extract text from BT...ET blocks (text objects)
        () => {
          const btEtPattern = /BT\s+(.*?)\s+ET/gs;
          const matches = text.match(btEtPattern) || [];
          return matches.map(match => {
            // Remove BT/ET and extract text commands
            const content = match.replace(/^BT\s+|\s+ET$/g, '');
            // Look for text show commands: (text) Tj or [(text)] TJ
            const textCommands = content.match(/\([^)]*\)\s*Tj?|\[[^\]]*\]\s*TJ/g) || [];
            return textCommands.map(cmd => {
              // Extract text from parentheses or brackets
              const textMatch = cmd.match(/\(([^)]*)\)|"([^"]*)"/);
              return textMatch ? textMatch[1] || textMatch[2] : '';
            }).join(' ');
          }).join(' ');
        },
        
        // Method 2: Direct text string extraction
        () => {
          const stringPattern = /\(([^)]{2,})\)/g;
          const matches = [];
          let match;
          while ((match = stringPattern.exec(text)) !== null) {
            const str = match[1];
            // Filter out binary/control strings
            if (/^[a-zA-Z0-9\s.,!?;:\-'"]+$/.test(str) && str.length > 2) {
              matches.push(str);
            }
          }
          return matches.join(' ');
        },
        
        // Method 3: Stream content extraction
        () => {
          const streamPattern = /stream\s*([\s\S]*?)\s*endstream/gi;
          const streams = [];
          let match;
          while ((match = streamPattern.exec(text)) !== null) {
            const streamContent = match[1];
            // Look for readable text in streams
            const readableText = streamContent.match(/[a-zA-Z0-9\s.,!?;:\-'"]{3,}/g);
            if (readableText) {
              streams.push(...readableText);
            }
          }
          return streams.join(' ');
        }
      ];
      
      // Try each extraction method
      for (const method of extractionMethods) {
        try {
          const result = method();
          if (result && result.length > 50) {
            extractedText = result;
            console.log('Extraction method successful, text length:', extractedText.length);
            break;
          }
        } catch (err) {
          console.log('Extraction method failed:', err.message);
        }
      }
      
      // Clean up the extracted text
      if (extractedText) {
        extractedText = extractedText
          .replace(/\\[rnt]/g, ' ') // Replace escape sequences
          .replace(/\s+/g, ' ') // Normalize whitespace
          .replace(/[^\x20-\x7E\s]/g, '') // Remove non-printable characters
          .trim();
      }

    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // For DOCX files - basic extraction
      // DOCX is essentially a ZIP file with XML content
      try {
        // Convert to text - this is very basic
        // For proper DOCX parsing, you'd need a library like mammoth
        const arrayBuffer = await fileData.arrayBuffer();
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const content = decoder.decode(arrayBuffer);
        
        // Try to extract text from XML content
        const xmlMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
        if (xmlMatches) {
          extractedText = xmlMatches
            .map(match => match.replace(/<w:t[^>]*>|<\/w:t>/g, ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        
        // Fallback: look for any readable text
        if (!extractedText) {
          extractedText = content
            .replace(/[^\x20-\x7E\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 10000); // Limit to first 10k chars
        }
        
      } catch (docxError) {
        console.error('DOCX parsing error:', docxError);
        throw new Error('Failed to parse DOCX file');
      }

    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Clean up extracted text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .trim();

    if (!extractedText || extractedText.length < 10) {
      throw new Error('No meaningful text could be extracted from the document');
    }

    console.log('Text extraction completed, length:', extractedText.length);

    return new Response(JSON.stringify({
      success: true,
      extractedText,
      textLength: extractedText.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-text function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});