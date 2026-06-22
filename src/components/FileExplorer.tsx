import { useState } from 'react';
import { Repository, File, FileVersion } from '../lib/supabase';
import { useFiles } from '../hooks/useRepositories';
import {
  FileText,
  Folder,
  Plus,
  Globe,
  Lock,
  Trash2,
  History,
  ChevronLeft,
  Eye,
  EyeOff,
  Edit3,
  X,
  Loader2,
  Copy,
  AlertTriangle,
} from 'lucide-react';

interface FileExplorerProps {
  repository: Repository;
  onBack: () => void;
}

// Patterns for files that commonly contain secrets
const SECRET_FILE_PATTERNS = [
  /\.env$/i,
  /\.env\./i,
  /secret/i,
  /credential/i,
  /password/i,
  /api[-_]?key/i,
  /private[-_]?key/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /token/i,
  /auth/i,
];

function isSecretFilename(filename: string): boolean {
  return SECRET_FILE_PATTERNS.some(pattern => pattern.test(filename));
}

export function FileExplorer({ repository, onBack }: FileExplorerProps) {
  const {
    files,
    loading,
    createFile,
    updateFile,
    toggleFilePrivacy,
    deleteFile,
  } = useFiles(repository.id);
  const [showCreate, setShowCreate] = useState(false);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [viewingVersion, setViewingVersion] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [filename, setFilename] = useState('');
  const [path, setPath] = useState('/');
  const [message, setMessage] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect secret files and suggest private visibility
  const handleFilenameChange = (newFilename: string) => {
    setFilename(newFilename);
    if (isSecretFilename(newFilename)) {
      setIsPublic(false);
    }
  };

  const groupedFiles = files.reduce(
    (acc, file) => {
      const folder = file.path || '/';
      if (!acc[folder]) acc[folder] = [];
      acc[folder].push(file);
      return acc;
    },
    {} as Record<string, File[]>
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createFile(path, filename, content, isPublic, message);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    resetForm();
    setShowCreate(false);
    setSubmitting(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFile) return;

    setSubmitting(true);
    setError(null);

    const result = await updateFile(editingFile.id, content, message);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    resetForm();
    setEditingFile(null);
    setSubmitting(false);
  };

  const handleTogglePrivacy = async (file: File) => {
    await toggleFilePrivacy(file.id, !file.is_public);
  };

  const handleDelete = async (file: File) => {
    if (!confirm(`Delete "${file.filename}"? This cannot be undone.`)) return;
    await deleteFile(file.id);
  };

  const handleCopy = async (file: File) => {
    const versions = (file as any).file_versions as FileVersion[] | undefined;
    const latestContent = versions?.sort((a, b) => b.version_number - a.version_number)[0]?.content;
    if (latestContent) {
      await navigator.clipboard.writeText(latestContent);
      alert('Content copied to clipboard!');
    }
  };

  const startEditing = (file: File) => {
    const versions = (file as any).file_versions as FileVersion[] | undefined;
    const latestContent = versions?.sort((a, b) => b.version_number - a.version_number)[0]?.content || '';
    setEditingFile(file);
    setContent(latestContent);
    setMessage('');
    setError(null);
  };

  const resetForm = () => {
    setContent('');
    setFilename('');
    setPath('/');
    setMessage('');
    setIsPublic(true);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{repository.name}</h2>
              {repository.is_public ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                  <Globe className="w-3 h-3" />
                  Public
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                  <Lock className="w-3 h-3" />
                  Private
                </span>
              )}
            </div>
            {repository.description && (
              <p className="text-slate-400 mt-1">{repository.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
        >
          <Plus className="w-5 h-5" />
          New File
        </button>
      </div>

      {/* Privacy Notice */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-white">Privacy Control Active</h4>
            <p className="text-sm text-slate-400 mt-1">
              Files marked as <span className="text-emerald-400">Public</span> can be seen and copied
              by anyone with access to this repository. Files marked as{' '}
              <span className="text-amber-400">Private</span> are only visible to you and will not be
              included when others clone this repository.
            </p>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">Create New File</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Filename</label>
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => handleFilenameChange(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="index.ts"
                    required
                  />
                  {isSecretFilename(filename) && (
                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Secret file detected - visibility set to Private
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Path</label>
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="/src"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono text-sm min-h-[200px]"
                  placeholder="File content..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Commit Message
                </label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Initial commit"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-white">File Visibility</p>
                  <p className="text-xs text-slate-400">
                    {isPublic
                      ? 'Anyone can view and copy this file'
                      : 'Only you can see this file'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isPublic
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {isPublic ? 'Public' : 'Private'}
                </button>
              </div>
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                  className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !filename || !content}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Edit: {editingFile.filename}</h3>
              <button
                onClick={() => setEditingFile(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono text-sm min-h-[200px]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Commit Message
                </label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Updated content..."
                  required
                />
              </div>
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFile(null)}
                  className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {viewingVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                History: {viewingVersion.filename}
              </h3>
              <button
                onClick={() => setViewingVersion(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {((viewingVersion as any).file_versions as FileVersion[])
                ?.sort((a, b) => b.version_number - a.version_number)
                .map((version) => (
                  <div
                    key={version.id}
                    className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded">
                          v{version.version_number}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(version.created_at).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {(version.size_bytes / 1024).toFixed(2)} KB
                      </span>
                    </div>
                    {version.message && (
                      <p className="text-sm text-slate-300 mb-2">{version.message}</p>
                    )}
                    <pre className="text-xs text-slate-400 bg-slate-800/50 rounded-lg p-3 overflow-x-auto font-mono">
                      {version.content || '(empty)'}
                    </pre>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* File List */}
      {files.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700/50">
          <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No files yet</h3>
          <p className="text-slate-400 mb-6">Add your first file to start version tracking</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create File
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFiles).map(([folder, folderFiles]) => (
            <div key={folder}>
              <div className="flex items-center gap-2 mb-3">
                <Folder className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-400">{folder}</span>
                <span className="text-xs text-slate-500">({folderFiles.length} files)</span>
              </div>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                        File
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Visibility
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Versions
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Updated
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {folderFiles.map((file) => {
                      const versions = (file as any).file_versions as FileVersion[];
                      const versionCount = versions?.length || 0;

                      return (
                        <tr key={file.id} className="hover:bg-slate-700/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-slate-500" />
                              <span className="text-sm font-medium text-white">
                                {file.filename}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleTogglePrivacy(file)}
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                                file.is_public
                                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                              }`}
                            >
                              {file.is_public ? (
                                <>
                                  <Eye className="w-3 h-3" />
                                  Public
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3" />
                                  Private
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setViewingVersion(file)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-700/50 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition-all"
                            >
                              <History className="w-3 h-3" />
                              {versionCount} version{versionCount !== 1 ? 's' : ''}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-400">
                              {new Date(file.updated_at).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEditing(file)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCopy(file)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                                title="Copy content"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(file)}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
