import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { TargetFeed } from "./components/TargetFeed";
import { TargetDetail } from "./components/TargetDetail";
import { ServerControls } from "./components/ServerControls";
import { usePointrEvents } from "./hooks/usePointrEvents";

export function App() {
  const {
    status,
    targets,
    selectedTarget,
    logs,
    autoOpenEditor,
    selectTarget,
    clearHistory,
    deleteTarget,
    startServer,
    stopServer,
    restartServer,
    changePort,
    copyMarkdown,
    openInEditor,
    toggleAutoOpen,
    clearLogs,
    injectMockTarget,
  } = usePointrEvents();

  const [activeDrawer, setActiveDrawer] = useState<"none" | "server" | "logs">(
    "none"
  );

  // Handle global keyboard accelerators
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes modals
      if (e.key === "Escape") {
        if (activeDrawer !== "none") {
          setActiveDrawer("none");
        }
      }

      // Cmd/Ctrl + Shift + P toggles Server Controls
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key === "P" || e.key === "p")
      ) {
        e.preventDefault();
        setActiveDrawer((prev) => (prev === "server" ? "none" : "server"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDrawer]);

  return (
    <div className="flex h-screen w-screen flex-col bg-[#070709] text-[#f8fafc] font-mono bg-hud-grid overflow-hidden">
      {/* Top HUD Header */}
      <Header
        status={status}
        targetCount={targets.length}
        autoOpenEditor={autoOpenEditor}
        onToggleAutoOpen={toggleAutoOpen}
        onClearHistory={clearHistory}
        onOpenServerControls={() => setActiveDrawer("server")}
        onOpenLogs={() => setActiveDrawer("logs")}
        onInjectMock={injectMockTarget}
        activeDrawer={activeDrawer}
      />

      {/* Main Split Layout: Left Feed, Right Inspector */}
      <div className="flex flex-1 overflow-hidden relative">
        <TargetFeed
          targets={targets}
          selectedTarget={selectedTarget}
          onSelectTarget={selectTarget}
          onDeleteTarget={deleteTarget}
        />

        <TargetDetail
          target={selectedTarget}
          onCopyMarkdown={copyMarkdown}
          onOpenInEditor={openInEditor}
        />
      </div>

      {/* Server Controls & Live Logs Modal Drawer */}
      <ServerControls
        status={status}
        logs={logs}
        isOpen={activeDrawer !== "none"}
        onClose={() => setActiveDrawer("none")}
        onStartServer={startServer}
        onStopServer={stopServer}
        onRestartServer={restartServer}
        onChangePort={changePort}
        onClearLogs={clearLogs}
      />
    </div>
  );
}

export default App;
