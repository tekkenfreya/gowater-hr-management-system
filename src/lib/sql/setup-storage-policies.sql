-- =============================================
-- Storage Bucket RLS Policies Setup
-- =============================================
-- This script sets up Row Level Security policies for the 'files' storage bucket
-- Run this in Supabase SQL Editor after creating the 'files' bucket
-- =============================================

-- Enable RLS on storage.objects (should already be enabled by default)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Clean up: Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;

-- =============================================
-- INSERT Policy: Allow authenticated users to upload files
-- =============================================
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'files');

-- =============================================
-- SELECT Policy: Allow anyone to read files (public bucket)
-- =============================================
CREATE POLICY "Allow public to read files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'files');

-- =============================================
-- UPDATE Policy: Allow authenticated users to update files
-- =============================================
CREATE POLICY "Allow users to update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'files');

-- =============================================
-- DELETE Policy: Allow authenticated users to delete files
-- =============================================
CREATE POLICY "Allow users to delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'files');

-- =============================================
-- Verification: View created policies
-- =============================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%files%';

-- =============================================
-- Expected Result:
-- You should see 4 policies listed:
-- 1. Allow authenticated users to upload files (INSERT)
-- 2. Allow public to read files (SELECT)
-- 3. Allow users to update own files (UPDATE)
-- 4. Allow users to delete own files (DELETE)
-- =============================================
