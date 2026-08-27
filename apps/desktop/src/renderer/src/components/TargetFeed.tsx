import React, { useState, useMemo } from "react";
import {
  GlobeIcon,
  SmartphoneIcon,
  SearchIcon,
  FilterIcon,
  TargetIcon,
  TrashIcon,
  ChevronRightIcon,
} from "./Icons";
import { PointrTargetPayload } from "../types";

interface TargetFeedProps {
  targets: PointrTargetPayload[];
  selectedTarget: PointrTargetPayload | null;
  onSelectTarget: (target: PointrTargetPayload) => void;
  onDeleteTarget: (idOrIndex: string | number) => void;
}

type PlatformFilter = "all" | "web" | "mobile";

export const TargetFeed: React.FC<TargetFeedProps> = ({
  targets,
  selectedTarget,
  onSelectTarget,
  onDeleteTarget,
}) => {
  const [filter, setFilter] = useState<PlatformFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTargets = useMemo(() => {
    return targets.filter((target) => {
      // Platform filter
      if (filter === "web" && target.platform === "mobile") return false;
      if (
        filter === "mobile" &&
        target.platform !== "mobile" &&
        target.platform !== "ios" &&
        target.platform !== "android"
      ) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const comp = (
          target.source?.component ||
          target.dom?.tagName ||
          ""
        ).toLowerCase();
        const file = (target.source?.file || "").toLowerCase();
        const intent = (target.meta?.intent || "").toLowerCase();
        return comp.includes(q) || file.includes(q) || intent.includes(q);
      }

      return true;
    });
  }, [targets, filter, searchQuery]);

  const isSelected = (target: PointrTargetPayload, index: number) => {
    if (!selectedTarget) return false;
    if (target.id && selectedTarget.id) {
      return target.id === selectedTarget.id;
    }
    return target === selectedTarget;
  };

  const getPlatformDetails = (target: PointrTargetPayload) => {
    const isMobile =
      target.platform === "mobile" ||
      target.platform === "ios" ||
      target.platform === "android";
    if (isMobile) {
      const os = target.device?.os ? target.device.os.toUpperCase() : "MOBILE";
      return {
        isMobile: true,
        label: os,
        icon: <SmartphoneIcon className="w-3.5 h-3.5 text-[#f59e0b]" />,
        color: "text-[#f59e0b]",
        badgeBg: "bg-[#f59e0b]/10 border-[#f59e0b]/30",
      };
    }
    return {
      isMobile: false,
      label: "WEB",
      icon: <GlobeIcon className="w-3.5 h-3.5 text-[#3b82f6]" />,
      color: "text-[#3b82f6]",
      badgeBg: "bg-[#3b82f6]/10 border-[#3b82f6]/30",
    };
  };

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return "--:--:--";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "--:--:--";
    }
  };

  return (
    <aside className="w-80 md:w-96 flex flex-col bg-[#0a0b10] border-r border-[#1f2233] h-full select-none">
      {/* Feed Header */}
      <div className="p-3 border-b border-[#1f2233] bg-[#0d0e15] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TargetIcon className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span className="text-[11px] font-mono font-black text-[#f8fafc] uppercase tracking-wider">
              TARGET FEED
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-[#181924] text-[#94a3b8] px-2 py-0.5 rounded border border-[#25283b]">
            {filteredTargets.length} / {targets.length}
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <SearchIcon className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search component, file, intent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12131c] border border-[#1f2233] focus:border-[#f59e0b] text-[#f8fafc] text-xs font-mono pl-8 pr-3 py-1.5 rounded outline-none placeholder-[#64748b] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-[10px] font-mono text-[#94a3b8] hover:text-[#f8fafc]"
            >
              ✕
            </button>
          )}
        </div>

        {/* Platform filter tabs */}
        <div className="flex items-center p-0.5 bg-[#12131c] border border-[#1f2233] rounded">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
              filter === "all"
                ? "bg-[#f59e0b] text-[#070709]"
                : "text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#181924]"
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setFilter("web")}
            className={`flex-1 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
              filter === "web"
                ? "bg-[#3b82f6] text-[#070709]"
                : "text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#181924]"
            }`}
          >
            WEB
          </button>
          <button
            onClick={() => setFilter("mobile")}
            className={`flex-1 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
              filter === "mobile"
                ? "bg-[#f59e0b] text-[#070709]"
                : "text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#181924]"
            }`}
          >
            MOBILE
          </button>
        </div>
      </div>

      {/* Target Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#181a24]">
        {filteredTargets.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center h-full text-[#64748b] space-y-4">
            <div className="relative w-14 h-14 rounded-full border border-[#1f2233] flex items-center justify-center bg-[#0d0e15]">
              <div className="absolute inset-0 rounded-full border-t border-[#f59e0b] animate-radar opacity-60" />
              <TargetIcon className="w-6 h-6 text-[#323752]" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-mono font-bold text-[#94a3b8] uppercase">
                {targets.length === 0
                  ? "Awaiting Target Captures"
                  : "No Matching Targets"}
              </p>
              <p className="text-[11px] font-mono text-[#64748b] max-w-[200px] leading-relaxed">
                {targets.length === 0
                  ? "Alt+Click elements in Web browser or hold 2 fingers in Mobile app"
                  : "Adjust filters or search query to view captured elements"}
              </p>
            </div>
          </div>
        ) : (
          filteredTargets.map((target, idx) => {
            const selected = isSelected(target, idx);
            const plat = getPlatformDetails(target);
            const compName =
              target.source?.component ||
              target.dom?.tagName ||
              target.nativeNode?.componentName ||
              "TargetNode";

            return (
              <div
                key={target.id || idx}
                onClick={() => onSelectTarget(target)}
                className={`p-3 cursor-pointer transition-all relative group ${
                  selected
                    ? "bg-[#12131c] border-l-2 border-l-[#f59e0b]"
                    : "hover:bg-[#0e0f17] border-l-2 border-l-transparent"
                }`}
              >
                {/* Top Row: Component & Platform */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5 truncate pr-2">
                    <span className="font-mono text-xs font-bold text-[#f8fafc] group-hover:text-[#f59e0b] transition-colors truncate">
                      &lt;{compName}&gt;
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center space-x-1 ${plat.badgeBg} ${plat.color}`}
                    >
                      {plat.icon}
                      <span>{plat.label}</span>
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTarget(target.id || idx);
                      }}
                      title="Delete target"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#ef4444] text-[#64748b] rounded transition-opacity"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Source File Location */}
                <div className="flex items-center justify-between text-[10px] font-mono text-[#94a3b8] truncate">
                  <span className="truncate pr-2 text-[#cbd5e1]">
                    {target.source?.file
                      ? `${target.source.file}:${target.source.line}`
                      : target.dom?.cssSelector || "Unknown source"}
                  </span>
                  <span className="text-[#64748b] flex-shrink-0">
                    {formatTimestamp(target.meta?.timestamp)}
                  </span>
                </div>

                {/* Intent Quote if present */}
                {target.meta?.intent && (
                  <div className="mt-2 bg-[#070709] border border-[#1f2233] rounded px-2 py-1 text-[10px] font-mono text-[#f59e0b] italic truncate">
                    💬 "{target.meta.intent}"
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
