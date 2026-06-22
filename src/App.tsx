import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { AppShell } from './components/layout/AppShell';
import { CallPopup } from './components/calls/CallPopup';
import { Login } from './screens/Login';
import { Contacts } from './screens/Contacts';
import { ContactDetail } from './screens/ContactDetail';
import { Tasks } from './screens/Tasks';
import { Settings } from './screens/Settings';

type DeepLinkEvent = { type: string; id?: string };

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('euricio-token');
    if (token) setIsAuthenticated(true);
  }, []);

  // Deep-Link-Navigation: Fenster fokussieren und Route wechseln
  useEffect(() => {
    if (!isAuthenticated) return;
    const unlisten = listen<DeepLinkEvent>('deep-link-event', (event) => {
      const { type, id } = event.payload;
      if (type === 'open_contact' && id) {
        window.location.hash = `/contacts/${id}`;
      } else if (type === 'open_task' && id) {
        window.location.hash = `/tasks`;
      } else if (type === 'trigger_sync') {
        window.dispatchEvent(new CustomEvent('manual-sync'));
      }
    });
    return () => { unlisten.then(fn => fn()); };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/contacts" replace />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppShell>
      <CallPopup />
    </BrowserRouter>
  );
}
