import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, FolderGit2, Terminal, FileText } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <FolderGit2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">VaultRepo</h1>
                <p className="text-xs text-slate-400">Privacy-first version control</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <nav className="flex gap-1 bg-slate-900/50 p-1 rounded-xl">
                {[
                  { id: 'repositories', icon: FolderGit2, label: 'Repos' },
                  { id: 'files', icon: FileText, label: 'Files' },
                  { id: 'cli', icon: Terminal, label: 'CLI' },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => onTabChange(id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === id
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </nav>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white truncate max-w-[150px]">
                    {user?.email}
                  </p>
                  <p className="text-xs text-slate-400">Online</p>
                </div>
                <button
                  onClick={signOut}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
