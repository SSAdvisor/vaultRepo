import { useState, useEffect, useCallback } from 'react';
import { supabase, Repository, File, FileVersion } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useRepositories() {
  const { user } = useAuth();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRepositories = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setRepositories(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  const createRepository = async (name: string, description: string, isPublic: boolean) => {
    if (!user) return { error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('repositories')
      .insert({
        name: name.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
        description,
        is_public: isPublic,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    setRepositories((prev) => [data, ...prev]);
    return { data };
  };

  const deleteRepository = async (id: string) => {
    const { error } = await supabase.from('repositories').delete().eq('id', id);

    if (error) {
      return { error: error.message };
    }

    setRepositories((prev) => prev.filter((r) => r.id !== id));
    return {};
  };

  return {
    repositories,
    loading,
    error,
    createRepository,
    deleteRepository,
    refresh: fetchRepositories,
  };
}

export function useFiles(repositoryId: string | null) {
  const { user } = useAuth();
  const [files, setFiles] = useState<(File & { file_versions?: FileVersion[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!repositoryId || !user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('files')
      .select('*, file_versions(*)')
      .eq('repository_id', repositoryId)
      .order('path')
      .order('filename');

    if (error) {
      setError(error.message);
    } else {
      setFiles(data || []);
    }
    setLoading(false);
  }, [repositoryId, user]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const createFile = async (
    path: string,
    filename: string,
    content: string,
    isPublic: boolean,
    message: string
  ) => {
    if (!user || !repositoryId) return { error: 'Not authenticated' };

    const { data: file, error: fileError } = await supabase
      .from('files')
      .insert({
        repository_id: repositoryId,
        path: path || '/',
        filename,
        is_public: isPublic,
      })
      .select()
      .single();

    if (fileError) {
      return { error: fileError.message };
    }

    const { error: versionError } = await supabase.from('file_versions').insert({
      file_id: file.id,
      content,
      size_bytes: new Blob([content]).size,
      version_number: 1,
      message: message || 'Initial commit',
      author_id: user.id,
    });

    if (versionError) {
      return { error: versionError.message };
    }

    await fetchFiles();
    return { data: file };
  };

  const updateFile = async (fileId: string, content: string, message: string) => {
    if (!user) return { error: 'Not authenticated' };

    const file = files.find((f) => f.id === fileId);
    if (!file) return { error: 'File not found' };

    const latestVersion = file.versions?.sort((a, b) => b.version_number - a.version_number)[0];
    const nextVersion = (latestVersion?.version_number || 0) + 1;

    const { error: versionError } = await supabase.from('file_versions').insert({
      file_id: fileId,
      content,
      size_bytes: new Blob([content]).size,
      version_number: nextVersion,
      message: message || `Update to version ${nextVersion}`,
      author_id: user.id,
    });

    if (versionError) {
      return { error: versionError.message };
    }

    await fetchFiles();
    return {};
  };

  const toggleFilePrivacy = async (fileId: string, isPublic: boolean) => {
    const { error } = await supabase
      .from('files')
      .update({ is_public: isPublic, updated_at: new Date().toISOString() })
      .eq('id', fileId);

    if (error) {
      return { error: error.message };
    }

    await fetchFiles();
    return {};
  };

  const deleteFile = async (fileId: string) => {
    const { error } = await supabase.from('files').delete().eq('id', fileId);

    if (error) {
      return { error: error.message };
    }

    await fetchFiles();
    return {};
  };

  return {
    files,
    loading,
    error,
    createFile,
    updateFile,
    toggleFilePrivacy,
    deleteFile,
    refresh: fetchFiles,
  };
}

export function useClone() {
  const { user } = useAuth();

  const cloneRepository = async (repositoryId: string, newName: string) => {
    if (!user) return { error: 'Not authenticated' };

    // Get the original repository
    const { data: originalRepo, error: repoError } = await supabase
      .from('repositories')
      .select('*, files(*)')
      .eq('id', repositoryId)
      .single();

    if (repoError) {
      return { error: repoError.message };
    }

    // Create new repository
    const { data: newRepo, error: createError } = await supabase
      .from('repositories')
      .insert({
        name: newName.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
        description: originalRepo.description,
        is_public: originalRepo.is_public,
        owner_id: user.id,
      })
      .select()
      .single();

    if (createError) {
      return { error: createError.message };
    }

    // Clone files (only public files if not the owner)
    const filesToClone = originalRepo.files?.filter((f: File) => f.is_public || originalRepo.owner_id === user.id) || [];

    for (const file of filesToClone) {
      const { data: newFile, error: fileError } = await supabase
        .from('files')
        .insert({
          repository_id: newRepo.id,
          path: file.path,
          filename: file.filename,
          is_public: file.is_public,
        })
        .select()
        .single();

      if (fileError) continue;

      // Get the latest version content
      const { data: versions } = await supabase
        .from('file_versions')
        .select('*')
        .eq('file_id', file.id)
        .order('version_number', { ascending: false })
        .limit(1);

      if (versions && versions.length > 0) {
        await supabase.from('file_versions').insert({
          file_id: newFile.id,
          content: versions[0].content,
          size_bytes: versions[0].size_bytes,
          version_number: 1,
          message: `Cloned from ${originalRepo.name}`,
          author_id: user.id,
        });
      }
    }

    return { data: newRepo };
  };

  return { cloneRepository };
}
