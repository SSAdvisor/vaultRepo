-- Change default file visibility to public
ALTER TABLE files ALTER COLUMN is_public SET DEFAULT true;

-- Add comment documenting secret file patterns
COMMENT ON TABLE files IS 'Files with is_public=false are hidden from non-owners. Secret-like filenames (env, secrets, credentials, keys, etc.) should default to private.';