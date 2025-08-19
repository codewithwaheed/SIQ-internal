-- Add tags and encryption metadata to documents table
ALTER TABLE public.documents 
ADD COLUMN tags TEXT[], 
ADD COLUMN encryption_key_hash TEXT,
ADD COLUMN encryption_iv TEXT,
ADD COLUMN is_encrypted BOOLEAN DEFAULT false;