-- Fix infinite recursion by using SECURITY DEFINER functions

-- Drop the problematic policies
DROP POLICY IF EXISTS "select_own_repos" ON repositories;
DROP POLICY IF EXISTS "select_repo_collaborators" ON collaborators;
DROP POLICY IF EXISTS "insert_repo_collaborators" ON collaborators;
DROP POLICY IF EXISTS "delete_repo_collaborators" ON collaborators;

-- Create security definer functions that bypass RLS
CREATE OR REPLACE FUNCTION is_repo_collaborator(repo_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM collaborators 
    WHERE repository_id = repo_id 
    AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_repo_owner_or_collaborator(repo_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM repositories 
    WHERE id = repo_id 
    AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM collaborators 
    WHERE repository_id = repo_id 
    AND user_id = auth.uid()
  );
$$;

-- Recreate the policies using the helper functions
CREATE POLICY "select_own_repos" ON repositories FOR SELECT
  TO authenticated USING (
    auth.uid() = owner_id 
    OR is_public = true 
    OR is_repo_collaborator(id)
  );

-- Collaborators policies using the helper function
CREATE POLICY "select_repo_collaborators" ON collaborators FOR SELECT
  TO authenticated USING (
    is_repo_owner_or_collaborator(repository_id) 
    OR user_id = auth.uid()
  );

CREATE POLICY "insert_repo_collaborators" ON collaborators FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM repositories WHERE repositories.id = collaborators.repository_id AND repositories.owner_id = auth.uid())
  );

CREATE POLICY "delete_repo_collaborators" ON collaborators FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM repositories WHERE repositories.id = collaborators.repository_id AND repositories.owner_id = auth.uid())
  );