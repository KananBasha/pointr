import React, { useState, useRef, useEffect } from "react";
import {
  PlayIcon,
  SquareIcon,
  RefreshIcon,
  TerminalIcon,
  CopyIcon,
  TrashIcon,
  CheckIcon,
  XIcon,
  ActivityIcon,
  ServerIcon,
} from "./Icons";
import { ServerStatus } from "../types";

interface ServerControlsProps {
  status: ServerStatus;
  logs: string[];
  isOpen: boolean;
  onClose: () => void;
  onStartServer: (port?: number) => Promise<void>;
  onStopServer: () => Promise<void>;
  onRestartServer: (port?: number) => Promise<void>;
  onChangePort: (port: number) => Promise<void>;
  onClearLogs: () => void;
}

const AVAILABLE_PORTS = [3333, 3334, 3335, 3336, 3337, 3338, 3339, 3340];

export const ServerControls: React.FC<ServerControlsProps> = ({
  status,
  logs,
  isOpen,
  onClose,
  onStartServer,
  onStopServer,
  onRestartServer,
  onChangePort,
  onClearLogs,
}) => {
  const [selectedPort, setSelectedPort] = useState<number>(status.port || 3333);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [logFilter, setLogFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status.port) {
      setSelectedPort(status.port);
    }
  }, [status.port]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  if (!isOpen) return null;

  const handleStart = async () => {
    setIsProcessing(true);
    await onStartServer(selectedPort);
    setIsProcessing(false);
  };

  const handleStop = async () => {
    setIsProcessing(true);
    await onStopServer();
    setIsProcessing(false);
  };

  const handleRestart = async () => {
    setIsProcessing(true);
    await onRestartServer(selectedPort);
    setIsProcessing(false);
  };

  const handlePortSelect = async (port: number) => {
    setSelectedPort(port);
    if (status.running) {
      setIsProcessing(true);
      await onChangePort(port);
      setIsProcessing(false);
    }
  };

  const handleCopyLogs = () => {
    const fullLogText = logs.join("\n");
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullLogText);
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 1500);
    }
  };

  const filteredLogs = logs.filter((line) => {
    if (!logFilter.trim()) return true;
    return line.toLowerCase().includes(logFilter.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#0a0b10] border border-[#1f2233] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden hud-corner-bracket">
        {/* Modal Header */}
        <div className="border-b border-[#1f2233] bg-[#0d0e15] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ServerIcon className="w-4 h-4 text-[#f59e0b]" />
            <span className="font-mono text-sm font-black text-[#f8fafc] uppercase tracking-wider">
              MCP SERVER SUPERVISOR & LIVE LOGS
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#64748b] hover:text-[#f8fafc] rounded transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Status & Process Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Status */}
            <div className="hud-card p-3.5 rounded border border-[#1f2233]">
              <span className="text-[10px] font-mono text-[#64748b] uppercase block">
                SERVER STATE
              </span>
              <div className="flex items-center space-x-2 mt-1">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    status.running
                      ? "bg-[#10b981] animate-pulse-glow"
                      : "bg-[#ef4444]"
                  }`}
                />
                <span className="font-mono text-xs font-bold text-[#f8fafc]">
                  {status.running ? "ACTIVE & LISTENING" : "SERVER STOPPED"}
                </span>
              </div>
            </div>

            {/* Port & Mode */}
            <div className="hud-card p-3.5 rounded border border-[#1f2233]">
              <span className="text-[10px] font-mono text-[#64748b] uppercase block">
                PORT / MODE
              </span>
              <div className="font-mono text-xs font-bold text-[#f8fafc] mt-1">
                HTTP :{status.port} (
                {status.managed ? "Managed Process" : "External Process"})
              </div>
            </div>

            {/* PID & Process ID */}
            <div className="hud-card p-3.5 rounded border border-[#1f2233]">
              <span className="text-[10px] font-mono text-[#64748b] uppercase block">
                PROCESS ID
              </span>
              <div className="font-mono text-xs font-bold text-[#f8fafc] mt-1">
                {status.pid
                  ? `PID ${status.pid}`
                  : "None (Standalone / External)"}
              </div>
            </div>
          </div>

          {/* Controls & Port Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Server Action Buttons */}
            <div className="hud-card p-4 rounded border border-[#1f2233] space-y-3">
              <div className="text-xs font-mono font-black text-[#f8fafc] uppercase tracking-wider">
                Lifecycle Operations
              </div>
              <div className="flex flex-wrap gap-2">
                {!status.running ? (
                  <button
                    onClick={handleStart}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center space-x-2 bg-[#10b981] hover:bg-[#059669] text-[#070709] px-4 py-2 rounded text-xs font-mono font-black transition-all"
                  >
                    <PlayIcon className="w-3.5 h-3.5" />
                    <span>START SERVER</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center space-x-2 bg-[#ef4444] hover:bg-[#dc2626] text-[#070709] px-4 py-2 rounded text-xs font-mono font-black transition-all"
                  >
                    <SquareIcon className="w-3.5 h-3.5" />
                    <span>STOP SERVER</span>
                  </button>
                )}

                <button
                  onClick={handleRestart}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center space-x-2 bg-[#12131c] hover:bg-[#181924] text-[#f8fafc] border border-[#25283b] px-4 py-2 rounded text-xs font-mono font-bold transition-all"
                >
                  <RefreshIcon className="w-3.5 h-3.5 text-[#f59e0b]" />
                  <span>RESTART</span>
                </button>
              </div>
            </div>

            {/* Port Selector */}
            <div className="hud-card p-4 rounded border border-[#1f2233] space-y-3">
              <div className="text-xs font-mono font-black text-[#f8fafc] uppercase tracking-wider">
                Port Allocation (3333 - 3340)
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {AVAILABLE_PORTS.map((port) => (
                  <button
                    key={port}
                    onClick={() => handlePortSelect(port)}
                    className={`py-1.5 text-xs font-mono font-bold rounded border transition-colors ${
                      selectedPort === port
                        ? "bg-[#f59e0b] text-[#070709] border-[#f59e0b]"
                        : "bg-[#070709] text-[#94a3b8] border-[#1f2233] hover:text-[#f8fafc] hover:bg-[#12131c]"
                    }`}
                  >
                    :{port}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Streaming Logs Section */}
          <div className="hud-card p-4 rounded border border-[#1f2233] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <TerminalIcon className="w-4 h-4 text-[#3b82f6]" />
                <span className="text-xs font-mono font-black text-[#f8fafc] uppercase tracking-wider">
                  Live Console Stream
                </span>
                <span className="text-[10px] font-mono text-[#64748b]">
                  ({logs.length} events)
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Filter log output..."
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="bg-[#070709] border border-[#1f2233] focus:border-[#3b82f6] text-[#f8fafc] text-xs font-mono px-2 py-1 rounded outline-none w-36 md:w-48"
                />

                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
                    autoScroll
                      ? "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30"
                      : "bg-[#12131c] text-[#64748b] border-[#1f2233]"
                  }`}
                >
                  AUTO-SCROLL: {autoScroll ? "ON" : "OFF"}
                </button>

                <button
                  onClick={onClearLogs}
                  title="Clear log history"
                  className="p-1 bg-[#12131c] hover:bg-[#181924] text-[#64748b] hover:text-[#ef4444] rounded border border-[#1f2233]"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleCopyLogs}
                  className="flex items-center space-x-1 bg-[#12131c] hover:bg-[#181924] text-[#cbd5e1] hover:text-[#f8fafc] px-2 py-1 rounded border border-[#1f2233] text-xs font-mono"
                >
                  {copiedLogs ? (
                    <CheckIcon className="w-3 h-3 text-[#10b981]" />
                  ) : (
                    <CopyIcon className="w-3 h-3" />
                  )}
                  <span>{copiedLogs ? "COPIED" : "COPY"}</span>
                </button>
              </div>
            </div>

            {/* Terminal Window */}
            <div
              ref={logContainerRef}
              className="bg-[#070709] border border-[#1f2233] p-3 rounded h-64 overflow-y-auto font-mono text-xs text-[#cbd5e1] space-y-1 select-text"
            >
              {filteredLogs.length === 0 ? (
                <div className="text-[#64748b] text-center py-12">
                  No log messages to display.
                </div>
              ) : (
                filteredLogs.map((line, idx) => {
                  const isError =
                    line.includes("[ERROR]") ||
                    line.includes("error") ||
                    line.includes("ERR");
                  const isSuccess =
                    line.includes("[Supervisor]") ||
                    line.includes("Connected") ||
                    line.includes("Active");
                  return (
                    <div
                      key={idx}
                      className={`leading-relaxed ${
                        isError
                          ? "text-[#ef4444]"
                          : isSuccess
                          ? "text-[#10b981]"
                          : "text-[#cbd5e1]"
                      }`}
                    >
                      {line}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#1f2233] bg-[#0d0e15] px-5 py-3 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#12131c] hover:bg-[#181924] text-[#f8fafc] border border-[#25283b] rounded text-xs font-mono font-bold transition-colors"
          >
            CLOSE [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
