import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { SyncStatusBar } from './SyncStatusBar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </main>
        <SyncStatusBar />
      </div>
    </div>
  );
}
