import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { Layout } from './components/Layout';
import { DashboardView } from './views/DashboardView';
import { DockerView } from './views/DockerView';
import { ProcessManagerView } from './views/ProcessManagerView';
import { AppStoreView } from './views/AppStoreView';
import { FileExplorerView } from './views/FileExplorerView';
import { ShareManagerView } from './views/ShareManagerView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';
import { PublicShareView } from './views/PublicShareView';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(api.getToken()));
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [shareToken, setShareToken] = useState<string | null>(null);

  // Check URL hash for public share links: e.g. /#/share/<token> or /share/<token>
  useEffect(() => {
    const parseUrl = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname;

      if (hash.startsWith('#/share/')) {
        const token = hash.replace('#/share/', '').split('?')[0];
        setShareToken(token);
      } else if (pathname.startsWith('/share/')) {
        const token = pathname.replace('/share/', '').split('?')[0];
        setShareToken(token);
      } else {
        setShareToken(null);
      }
    };

    parseUrl();
    window.addEventListener('hashchange', parseUrl);
    window.addEventListener('popstate', parseUrl);

    // Listen for unauthorized events
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('hashchange', parseUrl);
      window.removeEventListener('popstate', parseUrl);
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  // If visiting public share link
  if (shareToken) {
    return <PublicShareView token={shareToken} />;
  }

  // If not logged in
  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const handleLogout = () => {
    api.removeToken();
    setIsAuthenticated(false);
  };

  return (
    <Layout
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      onLogout={handleLogout}
    >
      {currentTab === 'dashboard' && <DashboardView onNavigateTab={setCurrentTab} />}
      {currentTab === 'docker' && <DockerView onNavigateToAppStore={() => setCurrentTab('appstore')} />}
      {currentTab === 'processes' && <ProcessManagerView />}
      {currentTab === 'appstore' && <AppStoreView onDeployed={() => setCurrentTab('docker')} />}
      {currentTab === 'files' && <FileExplorerView />}
      {currentTab === 'shares' && <ShareManagerView />}
      {currentTab === 'settings' && <SettingsView />}
    </Layout>
  );
};

export default App;
