import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { RepositoryList } from './components/RepositoryList';
import { FileExplorer } from './components/FileExplorer';
import { CLIReference } from './components/CLIReference';
import { Repository } from './lib/supabase';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('repositories');
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const handleSelectRepository = (repo: Repository) => {
    setSelectedRepo(repo);
    setActiveTab('files');
  };

  const handleBackFromFiles = () => {
    setSelectedRepo(null);
    setActiveTab('repositories');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'files') {
      setSelectedRepo(null);
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === 'repositories' && (
        <RepositoryList onSelectRepository={handleSelectRepository} />
      )}
      {activeTab === 'files' && selectedRepo ? (
        <FileExplorer repository={selectedRepo} onBack={handleBackFromFiles} />
      ) : activeTab === 'files' ? (
        <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700/50">
          <p className="text-slate-400">Select a repository to view files</p>
        </div>
      ) : null}
      {activeTab === 'cli' && <CLIReference />}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
