import { useState } from "react";
import Sidebar from "./Sidebar";
import SyncStatusBar from "./SyncStatusBar";
import Contacts from "../../screens/Contacts";
import Tasks from "../../screens/Tasks";
import Settings from "../../screens/Settings";
import CallPopup, { useCallListener } from "../calls/CallPopup";

interface SessionInfo {
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  access_token: string;
  expires_at: string;
}

interface AppShellProps {
  session: SessionInfo;
  onLogout: () => void;
}

export type Screen = "contacts" | "tasks" | "settings";

export default function AppShell({ session, onLogout }: AppShellProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>("contacts");
  const { activeCall, startCall, endCall } = useCallListener();

  function renderScreen() {
    switch (currentScreen) {
      case "contacts":
        return (
          <Contacts
            session={session}
            onCall={(phone, name) => startCall(phone, name)}
          />
        );
      case "tasks":
        return <Tasks session={session} />;
      case "settings":
        return <Settings session={session} onLogout={onLogout} />;
      default:
        return <Contacts session={session} onCall={startCall} />;
    }
  }

  return (
    <div style={styles.shell}>
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        session={session}
      />
      <div style={styles.main}>
        <div style={styles.content}>{renderScreen()}</div>
        <SyncStatusBar accessToken={session.access_token} />
      </div>

      {/* Call-Popup — zeigt sich über allem */}
      {activeCall && (
        <CallPopup
          phone={activeCall.phone}
          name={activeCall.name}
          direction={activeCall.direction}
          onClose={endCall}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    background: "#f3f4f6",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
  },
};
