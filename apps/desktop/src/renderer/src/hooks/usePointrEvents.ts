import { useState, useEffect, useCallback, useRef } from "react";
import { PointrTargetPayload, ServerStatus } from "../types";

const INITIAL_STATUS: ServerStatus = {
  running: true,
  managed: false,
  port: 3333,
  pid: undefined,
  uptime: 0,
  payloadCount: 0,
};

// Initial mock target for preview / first boot
const SEED_TARGET: PointrTargetPayload = {
  id: "seed-target-1",
  platform: "web",
  source: {
    file: "src/components/UserProfileHeader.tsx",
    line: 48,
    column: 12,
    component: "UserProfileHeader",
    snippet:
      '<button className="btn-action" onClick={handleSaveProfile}>\n  <SaveIcon className="w-4 h-4 mr-2" />\n  Save Changes\n</button>',
  },
  dom: {
    tagName: "BUTTON",
    cssSelector: "header.profile-card > div.actions-row > button.btn-action",
    xpath: "/html/body/div[1]/header/div[2]/button[1]",
    attributes: {
      class:
        "btn-action bg-amber-500 hover:bg-amber-600 text-black font-bold px-4 py-2 rounded",
      "data-pointr-source": "src/components/UserProfileHeader.tsx:48:12",
    },
    textContent: "Save Changes",
  },
  componentTree: [
    {
      name: "App",
      file: "src/App.tsx",
      props: {},
      hooks: ["useState", "useEffect"],
    },
    {
      name: "DashboardLayout",
      file: "src/layouts/DashboardLayout.tsx",
      props: { theme: "dark" },
      hooks: [],
    },
    {
      name: "UserProfileView",
      file: "src/views/UserProfileView.tsx",
      props: { userId: "usr_94829" },
      hooks: ["useUser"],
    },
    {
      name: "UserProfileHeader",
      file: "src/components/UserProfileHeader.tsx",
      props: { editable: true },
      hooks: ["useState", "useCallback"],
    },
    { name: "button", props: { className: "btn-action" } },
  ],
  styles: {
    computed: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgb(245, 158, 11)",
      color: "rgb(7, 7, 9)",
      fontWeight: "700",
      fontSize: "14px",
      padding: "8px 16px",
      borderRadius: "4px",
      border: "1px solid rgb(217, 119, 6)",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
      cursor: "pointer",
    },
    designTokens: {
      "--color-primary": "#f59e0b",
      "--color-text-on-primary": "#070709",
      "--radius-btn": "4px",
      "--spacing-btn-x": "16px",
      "--spacing-btn-y": "8px",
    },
    tailwindClasses: [
      "bg-amber-500",
      "hover:bg-amber-600",
      "text-black",
      "font-bold",
      "px-4",
      "py-2",
      "rounded",
    ],
  },
  meta: {
    timestamp: new Date().toISOString(),
    url: "http://localhost:5173/settings/profile",
    intent:
      "Update button styling to use tech-brutalist border and amber highlight on hover",
    pointrVersion: "2.5.0",
  },
  markdown: `# 🎯 Pointr Target: <UserProfileHeader>

**Source Location**: \`src/components/UserProfileHeader.tsx:48:12\`
**Platform**: \`web\` | **URL**: \`http://localhost:5173/settings/profile\`
**Component**: \`<UserProfileHeader>\` (\`BUTTON\`)

## 🌳 Component Hierarchy
- \`<App>\` (\`src/App.tsx\`)
- \`<DashboardLayout>\` (\`src/layouts/DashboardLayout.tsx\`)
- \`<UserProfileView>\` (\`src/views/UserProfileView.tsx\`)
- \`<UserProfileHeader>\` (\`src/components/UserProfileHeader.tsx:48:12\`)

## 🎨 Computed Styles & Design Tokens
\`\`\`css
display: inline-flex;
align-items: center;
background-color: #f59e0b;
color: #070709;
font-weight: 700;
padding: 8px 16px;
border-radius: 4px;
\`\`\`

## 💬 Developer Intent
> "Update button styling to use tech-brutalist border and amber highlight on hover"
`,
};

export function usePointrEvents() {
  const [status, setStatus] = useState<ServerStatus>(INITIAL_STATUS);
  const [targets, setTargets] = useState<PointrTargetPayload[]>([SEED_TARGET]);
  const [selectedTarget, setSelectedTarget] =
    useState<PointrTargetPayload | null>(SEED_TARGET);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] [Supervisor] Pointr Companion Dashboard initialized`,
    `[${new Date().toLocaleTimeString()}] [Supervisor] MCP event listener active on port 3333`,
  ]);
  const [autoOpenEditor, setAutoOpenEditor] = useState<boolean>(() => {
    try {
      return localStorage.getItem("pointr_auto_open_editor") === "true";
    } catch {
      return false;
    }
  });

  const autoOpenRef = useRef(autoOpenEditor);
  autoOpenRef.current = autoOpenEditor;

  // Handle incoming new target payload
  const handleNewPayload = useCallback((payload: PointrTargetPayload) => {
    const enrichedPayload: PointrTargetPayload = {
      ...payload,
      id:
        payload.id ||
        `target-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      meta: {
        ...payload.meta,
        timestamp: payload.meta?.timestamp || new Date().toISOString(),
      },
    };

    setTargets((prev: PointrTargetPayload[]) => [
      enrichedPayload,
      ...prev.slice(0, 49),
    ]);
    setSelectedTarget(enrichedPayload);

    setStatus((prev: ServerStatus) => ({
      ...prev,
      payloadCount: prev.payloadCount + 1,
    }));

    setLogs((prev: string[]) => [
      `[${new Date().toLocaleTimeString()}] [Hub] Captured target <${
        payload.source?.component || payload.dom?.tagName || "Target"
      }> from ${payload.platform || "web"} (${payload.source?.file}:${
        payload.source?.line
      })`,
      ...prev.slice(0, 499),
    ]);

    // Auto-open in editor if enabled
    if (autoOpenRef.current && enrichedPayload.source?.file) {
      if (window.pointrDesktop?.openInEditor) {
        window.pointrDesktop.openInEditor(
          enrichedPayload.source.file,
          enrichedPayload.source.line || 1,
          enrichedPayload.source.column || 1
        );
      }
    }
  }, []);

  // Subscribe to Electron IPC or Web Fallbacks
  useEffect(() => {
    let cleanupPayload: (() => void) | undefined;
    let cleanupCaptured: (() => void) | undefined;
    let cleanupStatus: (() => void) | undefined;
    let cleanupLog: (() => void) | undefined;

    if (window.pointrDesktop) {
      // Electron environment
      if (window.pointrDesktop.getServerStatus) {
        window.pointrDesktop
          .getServerStatus()
          .then(setStatus)
          .catch(() => {});
      }

      if (window.pointrDesktop.getServerLogs) {
        window.pointrDesktop
          .getServerLogs()
          .then((existingLogs: string[]) => {
            if (Array.isArray(existingLogs) && existingLogs.length > 0) {
              setLogs(existingLogs);
            }
          })
          .catch(() => {});
      }

      if (window.pointrDesktop.onPayloadReceived) {
        cleanupPayload =
          window.pointrDesktop.onPayloadReceived(handleNewPayload);
      } else if (window.pointrDesktop.onTargetCaptured) {
        cleanupCaptured =
          window.pointrDesktop.onTargetCaptured(handleNewPayload);
      }

      if (window.pointrDesktop.onServerStatusChanged) {
        cleanupStatus = window.pointrDesktop.onServerStatusChanged(
          (newStatus: ServerStatus) => {
            setStatus(newStatus);
          }
        );
      }

      if (window.pointrDesktop.onLogMessage) {
        cleanupLog = window.pointrDesktop.onLogMessage((logLine: string) => {
          setLogs((prev: string[]) => [logLine, ...prev.slice(0, 499)]);
        });
      }
    } else {
      // Browser / Standalone preview mode: Poll MCP server or connect to SSE
      const pollServer = async () => {
        try {
          const res = await fetch(
            `http://127.0.0.1:${status.port}/context/history`
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              setTargets(data.reverse());
              setSelectedTarget(
                (current: PointrTargetPayload | null) => current || data[0]
              );
            }
          }
        } catch {
          // Server offline or not reached
        }
      };

      pollServer();
      const interval = setInterval(pollServer, 4000);
      return () => clearInterval(interval);
    }

    return () => {
      cleanupPayload?.();
      cleanupCaptured?.();
      cleanupStatus?.();
      cleanupLog?.();
    };
  }, [handleNewPayload, status.port]);

  // Actions
  const selectTarget = useCallback((target: PointrTargetPayload) => {
    setSelectedTarget(target);
  }, []);

  const clearHistory = useCallback(() => {
    setTargets([]);
    setSelectedTarget(null);
    setLogs((prev: string[]) => [
      `[${new Date().toLocaleTimeString()}] [Inspector] Target history cleared`,
      ...prev,
    ]);
  }, []);

  const deleteTarget = useCallback((idOrIndex: string | number) => {
    setTargets((prev: PointrTargetPayload[]) => {
      const next = prev.filter((t: PointrTargetPayload, idx: number) =>
        t.id !== undefined ? t.id !== idOrIndex : idx !== idOrIndex
      );
      return next;
    });
    setSelectedTarget((curr: PointrTargetPayload | null) => {
      if (!curr) return null;
      if (curr.id !== undefined && curr.id === idOrIndex) return null;
      return curr;
    });
  }, []);

  const startServer = useCallback(
    async (port?: number) => {
      const targetPort = port || status.port;
      if (window.pointrDesktop?.startServer) {
        const newStatus = await window.pointrDesktop.startServer(targetPort);
        setStatus(newStatus);
      } else {
        setStatus((prev: ServerStatus) => ({
          ...prev,
          running: true,
          port: targetPort,
        }));
      }
    },
    [status.port]
  );

  const stopServer = useCallback(async () => {
    if (window.pointrDesktop?.stopServer) {
      await window.pointrDesktop.stopServer();
      setStatus((prev: ServerStatus) => ({
        ...prev,
        running: false,
        pid: undefined,
      }));
    } else {
      setStatus((prev: ServerStatus) => ({
        ...prev,
        running: false,
        pid: undefined,
      }));
    }
  }, []);

  const restartServer = useCallback(
    async (port?: number) => {
      const targetPort = port || status.port;
      if (window.pointrDesktop?.restartServer) {
        const newStatus = await window.pointrDesktop.restartServer(targetPort);
        setStatus(newStatus);
      } else {
        setStatus((prev: ServerStatus) => ({
          ...prev,
          running: true,
          port: targetPort,
        }));
      }
    },
    [status.port]
  );

  const changePort = useCallback(async (newPort: number) => {
    if (window.pointrDesktop?.setPort) {
      const newStatus = await window.pointrDesktop.setPort(newPort);
      setStatus(newStatus);
    } else {
      setStatus((prev: ServerStatus) => ({ ...prev, port: newPort }));
    }
  }, []);

  const copyMarkdown = useCallback(
    async (markdown?: string) => {
      const textToCopy = markdown || selectedTarget?.markdown || "";
      if (!textToCopy) return false;

      if (window.pointrDesktop?.copyToClipboard) {
        await window.pointrDesktop.copyToClipboard(textToCopy);
        return true;
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
        return true;
      }
      return false;
    },
    [selectedTarget]
  );

  const openInEditor = useCallback(
    async (
      file: string,
      line = 1,
      col = 1,
      editor: "vscode" | "cursor" = "vscode"
    ) => {
      if (window.pointrDesktop?.openInEditor) {
        await window.pointrDesktop.openInEditor(file, line, col, editor);
      } else {
        // Fallback to URL protocol
        const protocol = editor === "cursor" ? "cursor" : "vscode";
        const uri = `${protocol}://file/${file}:${line}:${col}`;
        window.open(uri);
      }
    },
    []
  );

  const toggleAutoOpen = useCallback((enabled: boolean) => {
    setAutoOpenEditor(enabled);
    try {
      localStorage.setItem("pointr_auto_open_editor", String(enabled));
    } catch {}
    if (window.pointrDesktop?.setAutoOpenInEditor) {
      window.pointrDesktop.setAutoOpenInEditor(enabled);
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const injectMockTarget = useCallback(
    (platform: "web" | "mobile" = "mobile") => {
      const mockMobile: PointrTargetPayload = {
        id: `mock-mobile-${Date.now()}`,
        platform: "mobile",
        device: {
          os: "ios",
          version: "17.4",
          isTesting: true,
          screenWidth: 393,
          screenHeight: 852,
          pixelRatio: 3,
        },
        source: {
          file: "packages/app/features/profile/AvatarCard.tsx",
          line: 34,
          column: 8,
          component: "AvatarCard",
          snippet:
            '<View style={styles.avatarWrapper}>\n  <Image source={{ uri: user.photoUrl }} style={styles.avatar} />\n  <Badge text="PRO" />\n</View>',
        },
        nativeNode: {
          componentName: "AvatarCard",
          bounds: { x: 24, y: 140, width: 345, height: 96 },
          hierarchy: [
            "RootApp",
            "NavigationContainer",
            "ProfileStack",
            "ProfileScreen",
            "AvatarCard",
            "View",
          ],
        },
        styles: {
          flattened: {
            backgroundColor: "#12131c",
            borderRadius: 8,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#1f2233",
          },
          layout: {
            width: 345,
            height: 96,
            top: 140,
            left: 24,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          intent:
            "Adjust avatar frame padding and add electric amber border highlight on active state",
          pointrVersion: "2.5.0-rn",
        },
        markdown: `# 🎯 Pointr Mobile Target: <AvatarCard>

**Source Location**: \`packages/app/features/profile/AvatarCard.tsx:34:8\`
**Platform**: \`iOS 17.4 (Expo Go / React Native)\` | **Viewport**: \`393x852\`

## 📱 Component Hierarchy
- \`<RootApp>\`
- \`<NavigationContainer>\`
- \`<ProfileStack>\`
- \`<ProfileScreen>\`
- \`<AvatarCard>\`

## 🎨 Computed StyleSheet
\`\`\`json
{
  "backgroundColor": "#12131c",
  "borderRadius": 8,
  "padding": 16,
  "flexDirection": "row",
  "alignItems": "center",
  "borderWidth": 1,
  "borderColor": "#1f2233"
}
\`\`\`

## 💬 Developer Intent
> "Adjust avatar frame padding and add electric amber border highlight on active state"
`,
      };

      const mockWeb: PointrTargetPayload = {
        id: `mock-web-${Date.now()}`,
        platform: "web",
        source: {
          file: "apps/landing/src/components/HeroCta.tsx",
          line: 22,
          column: 6,
          component: "HeroCta",
          snippet:
            '<button className="btn-primary" onClick={triggerOnboarding}>\n  Launch Pointr HUD\n</button>',
        },
        dom: {
          tagName: "BUTTON",
          cssSelector:
            "section.hero-section > div.cta-container > button.btn-primary",
          xpath: "/html/body/main/section[1]/div[2]/button",
          attributes: {
            class:
              "btn-primary bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 font-mono font-black",
          },
          textContent: "Launch Pointr HUD",
        },
        componentTree: [
          { name: "LandingPage", file: "apps/landing/src/App.tsx", props: {} },
          {
            name: "HeroSection",
            file: "apps/landing/src/components/HeroSection.tsx",
            props: {},
          },
          {
            name: "HeroCta",
            file: "apps/landing/src/components/HeroCta.tsx",
            props: { primary: true },
          },
        ],
        styles: {
          computed: {
            backgroundColor: "rgb(245, 158, 11)",
            color: "rgb(7, 7, 9)",
            fontWeight: "900",
            fontSize: "15px",
            padding: "12px 24px",
            borderRadius: "2px",
          },
          designTokens: {
            "--primary-amber": "#f59e0b",
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          url: "https://pointr.dev",
          intent:
            "Refactor hero CTA to trigger immediate desktop IPC connection check",
          pointrVersion: "2.5.0",
        },
        markdown: `# 🎯 Pointr Web Target: <HeroCta>

**Source Location**: \`apps/landing/src/components/HeroCta.tsx:22:6\`
**Platform**: \`web\` | **URL**: \`https://pointr.dev\`

## 💬 Developer Intent
> "Refactor hero CTA to trigger immediate desktop IPC connection check"
`,
      };

      handleNewPayload(platform === "mobile" ? mockMobile : mockWeb);
    },
    [handleNewPayload]
  );

  return {
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
  };
}
