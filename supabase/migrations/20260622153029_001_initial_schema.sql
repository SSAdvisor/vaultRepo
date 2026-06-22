-- Repositories: similar to git repos but simpler
CREATE TABLE repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, name)
);

-- Files: individual files with privacy control
CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  path text NOT NULL,
  filename text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(repository_id, path, filename)
);

-- File versions: version history for each file
CREATE TABLE file_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  content text,
  size_bytes integer NOT NULL DEFAULT 0,
  version_number integer NOT NULL DEFAULT 1,
  message text,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Repository collaborators: users who can access private repos
CREATE TABLE collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'read',
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(repository_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- Repository policies
CREATE POLICY "select_own_repos" ON repositories FOR SELECT
  TO authenticated USING (auth.uid() = owner_id OR is_public = true OR 
    EXISTS (SELECT 1 FROM collaborators WHERE repository_id = repositories.id AND user_id = auth.uid()));
CREATE POLICY "insert_own_repos" ON repositories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update_own_repos" ON repositories FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "delete_own_repos" ON repositories FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- Files policies (respects file-level privacy)
CREATE POLICY "select_accessible_files" ON files FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM repositories WHERE repositories.id = files.repository_id 
      AND (repositories.owner_id = auth.uid() OR files.is_public = true OR
        EXISTS (SELECT 1 FROM collaborators WHERE repository_id = repositories.id AND user_id = auth.uid()))));
CREATE POLICY "insert_own_files" ON files FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM repositories WHERE repositories.id = files.repository_id AND repositories.owner_id = auth.uid()));
CREATE POLICY "update_own_files" ON files FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM repositories WHERE repositories.id = files.repository_id AND repositories.owner_id = auth.uid()));
CREATE POLICY "delete_own_files" ON files FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM repositories WHERE repositories.id = files.repository_id AND repositories.owner_id = auth.uid()));

-- File versions policies
CREATE POLICY "select_accessible_versions" ON file_versions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM files WHERE files.id = file_versions.file_id 
      AND (files.is_public = true OR
        EXISTS (SELECT 1 FROM repositories WHERE repositories.id = files.repository_id 
          AND (repositories.owner_id = auth.uid() OR
            EXISTS (SELECT 1 FROM collaborators WHERE repository_id = repositories.id AND user_id = auth.uid()))))));
CREATE POLICY "insert_own_versions" ON file_versions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM files JOIN repositories ON repositories.id = files.repository_id 
      WHERE files.id = file_versions.file_id AND repositories.owner_id = auth.uid()));

-- Collaborators policies
CREATE POLICY "select_repo_collaborators" ON collaborators FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM repositories WHERE repositories.id = collaborators.repository_id 
      AND repositories.owner_id = auth.uid()) OR user_id = auth.uid());
CREATE POLICY "insert_repo_collaborators" ON collaborators FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM repositories WHERE repositories.id = collaborators.repository_id AND repositories.owner_id = auth.uid()));
CREATE POLICY "delete_repo_collaborators" ON collaborators FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM repositories WHERE repositories.id = collaborators.repository_id AND repositories.owner_id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_repositories_owner ON repositories(owner_id);
CREATE INDEX idx_files_repository ON files(repository_id);
CREATE INDEX idx_files_public ON files(repository_id, is_public);
CREATE INDEX idx_file_versions_file ON file_versions(file_id);
CREATE INDEX idx_collaborators_repo ON collaborators(repository_id);
CREATE INDEX idx_collaborators_user ON collaborators(user_id);