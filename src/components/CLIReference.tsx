import { useState } from 'react';
import { Terminal, Copy, Check, ChevronRight, Search, Book, Lock, Globe } from 'lucide-react';

interface Command {
  name: string;
  syntax: string;
  description: string;
  example?: string;
  category: string;
  privacy?: 'public' | 'private' | 'both';
}

const commands: Command[] = [
  // Repository commands
  {
    name: 'repo init',
    syntax: 'vr init <name> [--public|--private]',
    description: 'Create a new repository with the specified name',
    example: 'vr init my-project --private',
    category: 'Repository',
  },
  {
    name: 'repo list',
    syntax: 'vr list [--all|--mine]',
    description: 'List repositories. Use --mine for only your repos, --all for public repos',
    example: 'vr list --mine',
    category: 'Repository',
  },
  {
    name: 'repo info',
    syntax: 'vr info <repo-name>',
    description: 'Display repository details including privacy settings',
    example: 'vr info my-project',
    category: 'Repository',
  },
  {
    name: 'repo delete',
    syntax: 'vr delete <repo-name>',
    description: 'Delete a repository and all its files (irreversible)',
    example: 'vr delete old-project',
    category: 'Repository',
  },

  // Clone operations
  {
    name: 'clone',
    syntax: 'vr clone <repo> [new-name]',
    description: 'Clone a repository. Private files are excluded unless you own the repo',
    example: 'vr clone my-project my-project-backup',
    category: 'Clone',
    privacy: 'private',
  },

  // File operations
  {
    name: 'file add',
    syntax: 'vr add <filename> [--public|--private]',
    description: 'Add a new file to the repository with specified visibility',
    example: 'vr add config.json --private',
    category: 'File',
    privacy: 'both',
  },
  {
    name: 'file edit',
    syntax: 'vr edit <filename>',
    description: 'Edit a file and create a new version',
    example: 'vr edit README.md',
    category: 'File',
  },
  {
    name: 'file show',
    syntax: 'vr show <filename> [--version N]',
    description: 'Display file content. Use --version for specific version',
    example: 'vr show app.js --version 3',
    category: 'File',
  },
  {
    name: 'file history',
    syntax: 'vr history <filename>',
    description: 'Show version history for a file',
    example: 'vr history main.py',
    category: 'File',
  },
  {
    name: 'file privacy',
    syntax: 'vr privacy <filename> --public|--private',
    description: 'Change file visibility. Private files are hidden from non-owners',
    example: 'vr privacy secrets.env --private',
    category: 'File',
    privacy: 'private',
  },
  {
    name: 'file remove',
    syntax: 'vr rm <filename>',
    description: 'Remove a file from the repository',
    example: 'vr rm old-file.txt',
    category: 'File',
  },

  // Version control
  {
    name: 'commit',
    syntax: 'vr commit -m "message"',
    description: 'Commit staged changes with a descriptive message',
    example: 'vr commit -m "Add authentication module"',
    category: 'Version',
  },
  {
    name: 'log',
    syntax: 'vr log [filename]',
    description: 'Show commit history for the repo or a specific file',
    example: 'vr log main.py',
    category: 'Version',
  },
  {
    name: 'diff',
    syntax: 'vr diff <filename> [--version N]',
    description: 'Show differences between versions',
    example: 'vr diff config.yaml --version 2',
    category: 'Version',
  },

  // Sync operations
  {
    name: 'push',
    syntax: 'vr push',
    description: 'Push local changes to the remote repository',
    example: 'vr push',
    category: 'Sync',
  },
  {
    name: 'pull',
    syntax: 'vr pull',
    description: 'Pull latest changes from the remote repository',
    example: 'vr pull',
    category: 'Sync',
  },

  // Access control
  {
    name: 'collab add',
    syntax: 'vr collab add <email>',
    description: 'Add a collaborator to a private repository',
    example: 'vr collab add teammate@email.com',
    category: 'Access',
    privacy: 'private',
  },
  {
    name: 'collab remove',
    syntax: 'vr collab remove <email>',
    description: 'Remove a collaborator from the repository',
    example: 'vr collab remove user@email.com',
    category: 'Access',
    privacy: 'private',
  },
  {
    name: 'collab list',
    syntax: 'vr collab list',
    description: 'List all collaborators for the repository',
    example: 'vr collab list',
    category: 'Access',
  },
];

const categories = ['Repository', 'File', 'Clone', 'Version', 'Sync', 'Access'];

export function CLIReference() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const filteredCommands = commands.filter((cmd) => {
    const matchesSearch =
      !search ||
      cmd.name.toLowerCase().includes(search.toLowerCase()) ||
      cmd.syntax.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = !selectedCategory || cmd.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const copyCommand = async (syntax: string) => {
    await navigator.clipboard.writeText(syntax);
    setCopiedCommand(syntax);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">CLI Reference</h2>
          <p className="text-slate-400">Command-line interface for VaultRepo</p>
        </div>
      </div>

      {/* Intro */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-800/30 rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Getting Started</h3>
            <p className="text-slate-400 text-sm">
              VaultRepo CLI uses the <code className="px-1.5 py-0.5 bg-slate-700 rounded text-emerald-400">vr</code> command prefix.
              Commands are organized by category and designed to be intuitive. Unlike git,
              privacy is controlled at the file level with <code className="px-1.5 py-0.5 bg-slate-700 rounded text-amber-400">--private</code> and <code className="px-1.5 py-0.5 bg-slate-700 rounded text-emerald-400">--public</code> flags.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="Search commands..."
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !selectedCategory
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Commands List */}
      <div className="space-y-3">
        {filteredCommands.map((cmd, index) => (
          <div
            key={index}
            className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden hover:border-slate-600 transition-all"
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs font-medium rounded">
                    {cmd.category}
                  </span>
                  {cmd.privacy && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${
                        cmd.privacy === 'private'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {cmd.privacy === 'private' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                      {cmd.privacy === 'private' ? 'Privacy' : 'Visibility'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <code className="flex-1 px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-lg text-emerald-400 font-mono text-sm">
                  {cmd.syntax}
                </code>
                <button
                  onClick={() => copyCommand(cmd.syntax)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all shrink-0"
                  title="Copy command"
                >
                  {copiedCommand === cmd.syntax ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>

              <p className="text-slate-400 text-sm mb-2">{cmd.description}</p>

              {cmd.example && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <ChevronRight className="w-4 h-4" />
                  <span>Example: </span>
                  <code className="text-slate-300 font-mono">{cmd.example}</code>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-5 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Book className="w-5 h-5 text-emerald-400" />
            Command Comparison: Git vs VaultRepo
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                  Operation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                  Git
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                  VaultRepo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {[
                { op: 'Init repo', git: 'git init', vr: 'vr init <name>' },
                { op: 'Clone', git: 'git clone <url>', vr: 'vr clone <repo>' },
                { op: 'Add file', git: 'git add <file>', vr: 'vr add <file> --private/--public' },
                { op: 'Commit', git: 'git commit -m "msg"', vr: 'vr commit -m "msg"' },
                { op: 'History', git: 'git log', vr: 'vr log' },
                { op: 'Diff', git: 'git diff', vr: 'vr diff' },
                { op: 'Push', git: 'git push', vr: 'vr push' },
                { op: 'Pull', git: 'git pull', vr: 'vr pull' },
                { op: 'Set privacy', git: 'N/A', vr: 'vr privacy <file> --private' },
                { op: 'Add collaborator', git: 'GitHub UI only', vr: 'vr collab add <email>' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-white">{row.op}</td>
                  <td className="px-4 py-3 text-sm text-slate-400 font-mono">{row.git}</td>
                  <td className="px-4 py-3 text-sm text-emerald-400 font-mono">{row.vr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="bg-amber-500/10 rounded-xl border border-amber-500/20 p-5">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-white mb-1">Privacy Control</h4>
            <p className="text-sm text-slate-400">
              Unlike git where the entire repository is either public or private, VaultRepo allows
              file-level privacy control. Private files are completely hidden from other users—they
              cannot see, copy, or include them in clones unless they own the repository.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
