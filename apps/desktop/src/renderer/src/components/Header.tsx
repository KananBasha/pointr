import React, { useState, useEffect } from "react";
import {
  TargetIcon,
  ServerIcon,
  TerminalIcon,
  TrashIcon,
  SparklesIcon,
  SlidersIcon,
} from "./Icons";
import { ServerStatus } from "../types";

interface HeaderProps {
  status: ServerStatus;
  targetCount: number;
  autoOpenEditor: boolean;
  onToggleAutoOpen: (enabled: boolean) => void;
  onClearHistory: () => void;
  onOpenServerControls: () => void;
  onOpenLogs: () => void;
  onInjectMock: (platform: "web" | "mobile") => void;
  activeDrawer: "none" | "server" | "logs";
}

export const Header: React.FC<HeaderProps> = ({
  status,
  targetCount,
  autoOpenEditor,
  onToggleAutoOpen,
  onClearHistory,
  onOpenServerControls,
  onOpenLogs,
  onInjectMock,
  activeDrawer,
}) => {
  const [uptimeSeconds, setUptimeSeconds] = useState(status.uptime || 0);

  useEffect(() => {
    if (!status.running) return;
    const interval = setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status.running]);

  const formatUptime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <header className="h-12 bg-[#0a0b10] border-b border-[#1f2233] px-4 flex items-center justify-between select-none z-30 relative">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-[#12131c] px-2.5 py-1 rounded border border-[#25283b]">
          <TargetIcon className="w-4 h-4 text-[#f59e0b]" />
          <span className="font-mono text-xs font-black tracking-wider text-[#f8fafc] uppercase">
            POINTR <span className="text-[#f59e0b]">HUD</span>
          </span>
          <span className="text-[9px] font-mono font-bold bg-[#181924] text-[#94a3b8] px-1.5 py-0.2 rounded border border-[#25283b]">
            v2.5
          </span>
        </div>

        {/* Server Status Badge */}
        <div className="flex items-center space-x-2 bg-[#0d0e15] border border-[#1f2233] px-2.5 py-1 rounded">
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                status.running
                  ? "bg-[#10b981] animate-pulse-glow"
                  : "bg-[#ef4444]"
              }`}
            />
            <span className="text-[10px] font-mono font-bold text-[#cbd5e1] tracking-wide">
              {status.running ? `ONLINE :${status.port}` : "OFFLINE"}
            </span>
          </div>

          {status.running && status.pid && (
            <span className="text-[9px] font-mono text-[#64748b] border-l border-[#1f2233] pl-2">
              PID:{status.pid}
            </span>
          )}

          {status.running && (
            <span className="text-[9px] font-mono text-[#94a3b8] border-l border-[#1f2233] pl-2">
              UP {formatUptime(uptimeSeconds)}
            </span>
          )}
        </div>

        {/* Target Counter */}
        <div className="hidden sm:flex items-center space-x-1 bg-[#0d0e15] border border-[#1f2233] px-2 py-1 rounded text-[10px] font-mono">
          <span className="text-[#64748b]">CAPTURES:</span>
          <span className="font-bold text-[#f59e0b]">{targetCount}</span>
        </div>
      </div>

      {/* Center / Right Quick Actions */}
      <div className="flex items-center space-x-2.5">
        {/* Auto Open Toggle */}
        <button
          onClick={() => onToggleAutoOpen(!autoOpenEditor)}
          title="Auto-open captured source location in VS Code / Cursor"
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all border ${
            autoOpenEditor
              ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/40 shadow-sm"
              : "bg-[#12131c] text-[#64748b] border-[#1f2233] hover:text-[#cbd5e1]"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              autoOpenEditor ? "bg-[#10b981]" : "bg-[#64748b]"
            }`}
          />
          <span className="hidden md:inline">AUTO-OPEN IDE</span>
          <span className="text-[9px] uppercase font-bold px-1 bg-[#070709] rounded border border-[#25283b]">
            {autoOpenEditor ? "ON" : "OFF"}
          </span>
        </button>

        {/* Quick Mock Payload Generator */}
        <div className="hidden lg:flex items-center space-x-1 bg-[#12131c] p-0.5 rounded border border-[#1f2233]">
          <button
            onClick={() => onInjectMock("mobile")}
            className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded text-[#94a3b8] hover:text-[#f59e0b] hover:bg-[#181924] transition-colors"
            title="Simulate incoming React Native / Expo target"
          >
            <SparklesIcon className="w-3 h-3 text-[#f59e0b]" />
            <span>+ MOBILE</span>
          </button>
          <button
            onClick={() => onInjectMock("web")}
            className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded text-[#94a3b8] hover:text-[#3b82f6] hover:bg-[#181924] transition-colors"
            title="Simulate incoming Web target"
          >
            <SparklesIcon className="w-3 h-3 text-[#3b82f6]" />
            <span>+ WEB</span>
          </button>
        </div>

        {/* Clear Targets */}
        {targetCount > 0 && (
          <button
            onClick={onClearHistory}
            title="Clear target history"
            className="p-1.5 bg-[#12131c] hover:bg-[#1f2130] text-[#94a3b8] hover:text-[#ef4444] rounded border border-[#1f2233] transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Server Logs Toggle */}
        <button
          onClick={onOpenLogs}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors ${
            activeDrawer === "logs"
              ? "bg-[#3b82f6] text-[#070709] border-[#3b82f6]"
              : "bg-[#12131c] text-[#cbd5e1] border-[#1f2233] hover:bg-[#181924]"
          }`}
        >
          <TerminalIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">LOGS</span>
        </button>

        {/* Server Controls Toggle */}
        <button
          onClick={onOpenServerControls}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors ${
            activeDrawer === "server"
              ? "bg-[#f59e0b] text-[#070709] border-[#f59e0b]"
              : "bg-[#12131c] text-[#f8fafc] border-[#1f2233] hover:bg-[#181924]"
          }`}
        >
          <SlidersIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">SERVER</span>
        </button>
      </div>
    </header>
  );
};
