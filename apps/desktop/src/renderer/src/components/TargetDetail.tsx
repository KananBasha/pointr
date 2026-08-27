import React, { useState } from "react";
import {
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  GlobeIcon,
  SmartphoneIcon,
  LayersIcon,
  CodeIcon,
  TerminalIcon,
  SparklesIcon,
  ChevronRightIcon,
} from "./Icons";
import { PointrTargetPayload } from "../types";

interface TargetDetailProps {
  target: PointrTargetPayload | null;
  onCopyMarkdown: (markdown?: string) => Promise<boolean>;
  onOpenInEditor: (
    file: string,
    line: number,
    col: number,
    editor?: "vscode" | "cursor"
  ) => Promise<void>;
}

type InspectorTab = "deep" | "styles" | "hierarchy" | "markdown" | "raw_json";

export const TargetDetail: React.FC<TargetDetailProps> = ({
  target,
  onCopyMarkdown,
  onOpenInEditor,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>("deep");
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [styleFilter, setStyleFilter] = useState("");

  if (!target) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-[#070709] p-8 text-center select-none">
        <div className="hud-card p-8 rounded-lg max-w-md border border-[#1f2233] space-y-4 bg-[#0d0e15]">
          <div className="w-12 h-12 rounded bg-[#12131c] border border-[#25283b] flex items-center justify-center mx-auto text-[#f59e0b]">
            <TerminalIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-black text-[#f8fafc] uppercase tracking-wider">
              NO TARGET SELECTED
            </h3>
            <p className="font-mono text-xs text-[#94a3b8] mt-1.5 leading-relaxed">
              Select a target from the live feed on the left, or trigger an
              element capture from your running Web or React Native application.
            </p>
          </div>
          <div className="pt-2 border-t border-[#1f2233] flex justify-center text-[10px] font-mono text-[#64748b] space-x-3">
            <span>WEB: ALT+CLICK</span>
            <span>•</span>
            <span>MOBILE: 2-FINGER HOLD</span>
          </div>
        </div>
      </main>
    );
  }

  const isMobile =
    target.platform === "mobile" ||
    target.platform === "ios" ||
    target.platform === "android";
  const compName =
    target.source?.component ||
    target.dom?.tagName ||
    target.nativeNode?.componentName ||
    "TargetElement";
  const filePath = target.source?.file || "";
  const lineNum = target.source?.line || 1;
  const colNum = target.source?.column || 1;

  const handleCopyMd = async () => {
    const success = await onCopyMarkdown(target.markdown);
    if (success) {
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 1800);
    }
  };

  const handleCopyFilePath = async () => {
    if (!filePath) return;
    const fullLoc = `${filePath}:${lineNum}:${colNum}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(fullLoc);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 1500);
    }
  };

  // Compile styles for inspection
  const computedStyles = target.styles?.computed || {};
  const flattenedStyles =
    (target.styles?.flattened as Record<string, string | number>) || {};
  const designTokens = target.styles?.designTokens || {};
  const tailwindClasses = target.styles?.tailwindClasses || [];

  const allStylesMap: Record<string, string | number> = {
    ...computedStyles,
    ...flattenedStyles,
  };

  const filteredStyles = Object.entries(allStylesMap).filter(([key, val]) => {
    if (!styleFilter.trim()) return true;
    const q = styleFilter.toLowerCase();
    return (
      key.toLowerCase().includes(q) || String(val).toLowerCase().includes(q)
    );
  });

  return (
    <main className="flex-1 flex flex-col h-full bg-[#070709] overflow-hidden">
      {/* Top Inspector Header */}
      <div className="border-b border-[#1f2233] bg-[#0a0b10] p-4 flex flex-wrap items-center justify-between gap-3 select-none">
        {/* Component Tag & Source Location */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm md:text-base font-black text-[#f8fafc]">
              &lt;<span className="text-[#f59e0b]">{compName}</span>&gt;
            </span>

            {/* Platform Badge */}
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center space-x-1 ${
                isMobile
                  ? "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30"
                  : "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30"
              }`}
            >
              {isMobile ? (
                <SmartphoneIcon className="w-3 h-3" />
              ) : (
                <GlobeIcon className="w-3 h-3" />
              )}
              <span>
                {isMobile
                  ? target.device?.os
                    ? target.device.os.toUpperCase()
                    : "REACT NATIVE"
                  : "WEB DOM"}
              </span>
            </span>

            {target.device?.screenWidth && (
              <span className="text-[10px] font-mono text-[#64748b] bg-[#12131c] px-2 py-0.5 rounded border border-[#1f2233]">
                {target.device.screenWidth}×{target.device.screenHeight}
              </span>
            )}
          </div>

          {/* Clickable File Location */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyFilePath}
              title="Click to copy file location"
              className="font-mono text-xs text-[#94a3b8] hover:text-[#f8fafc] flex items-center space-x-1 bg-[#12131c] hover:bg-[#181924] px-2 py-0.5 rounded border border-[#1f2233] transition-colors"
            >
              <span>
                {filePath
                  ? `${filePath}:${lineNum}:${colNum}`
                  : "Unknown Source Path"}
              </span>
              {copiedPath ? (
                <CheckIcon className="w-3 h-3 text-[#10b981]" />
              ) : (
                <CopyIcon className="w-3 h-3 text-[#64748b]" />
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Open in Cursor */}
          <button
            onClick={() => onOpenInEditor(filePath, lineNum, colNum, "cursor")}
            className="flex items-center space-x-1.5 bg-[#12131c] hover:bg-[#181924] text-[#cbd5e1] hover:text-[#f8fafc] border border-[#25283b] px-3 py-1.5 rounded text-xs font-mono font-bold transition-all"
            title="Open file at exact line in Cursor"
          >
            <ExternalLinkIcon className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>CURSOR</span>
          </button>

          {/* Open in VS Code */}
          <button
            onClick={() => onOpenInEditor(filePath, lineNum, colNum, "vscode")}
            className="flex items-center space-x-1.5 bg-[#12131c] hover:bg-[#181924] text-[#cbd5e1] hover:text-[#f8fafc] border border-[#25283b] px-3 py-1.5 rounded text-xs font-mono font-bold transition-all"
            title="Open file at exact line in VS Code"
          >
            <ExternalLinkIcon className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>VS CODE</span>
          </button>

          {/* Copy Markdown for AI */}
          <button
            onClick={handleCopyMd}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded text-xs font-mono font-black transition-all ${
              copiedMarkdown
                ? "bg-[#10b981] text-[#070709] shadow-sm"
                : "bg-[#f59e0b] hover:bg-[#d97706] text-[#070709]"
            }`}
          >
            {copiedMarkdown ? (
              <>
                <CheckIcon className="w-4 h-4" />
                <span>COPIED FOR AI</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-4 h-4" />
                <span>COPY CONTEXT</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab Navigation Bar */}
      <div className="border-b border-[#1f2233] bg-[#0d0e15] px-4 flex items-center space-x-1 overflow-x-auto select-none">
        <button
          onClick={() => setActiveTab("deep")}
          className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold border-b-2 transition-all ${
            activeTab === "deep"
              ? "border-[#f59e0b] text-[#f59e0b] bg-[#12131c]"
              : "border-transparent text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#12131c]/50"
          }`}
        >
          <TerminalIcon className="w-3.5 h-3.5" />
          <span>DEEP INSPECTOR</span>
        </button>

        <button
          onClick={() => setActiveTab("styles")}
          className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold border-b-2 transition-all ${
            activeTab === "styles"
              ? "border-[#f59e0b] text-[#f59e0b] bg-[#12131c]"
              : "border-transparent text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#12131c]/50"
          }`}
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>STYLES & TOKENS</span>
          <span className="text-[10px] bg-[#181924] text-[#cbd5e1] px-1.5 py-0.2 rounded ml-1">
            {Object.keys(allStylesMap).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("hierarchy")}
          className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold border-b-2 transition-all ${
            activeTab === "hierarchy"
              ? "border-[#f59e0b] text-[#f59e0b] bg-[#12131c]"
              : "border-transparent text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#12131c]/50"
          }`}
        >
          <LayersIcon className="w-3.5 h-3.5" />
          <span>HIERARCHY</span>
          <span className="text-[10px] bg-[#181924] text-[#cbd5e1] px-1.5 py-0.2 rounded ml-1">
            {target.componentTree?.length ||
              target.nativeNode?.hierarchy?.length ||
              1}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("markdown")}
          className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold border-b-2 transition-all ${
            activeTab === "markdown"
              ? "border-[#f59e0b] text-[#f59e0b] bg-[#12131c]"
              : "border-transparent text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#12131c]/50"
          }`}
        >
          <CodeIcon className="w-3.5 h-3.5" />
          <span>AI MARKDOWN</span>
        </button>

        <button
          onClick={() => setActiveTab("raw_json")}
          className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold border-b-2 transition-all ${
            activeTab === "raw_json"
              ? "border-[#f59e0b] text-[#f59e0b] bg-[#12131c]"
              : "border-transparent text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#12131c]/50"
          }`}
        >
          <span>RAW JSON</span>
        </button>
      </div>

      {/* Tab Contents Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* User Intent Callout Banner (Always shown if intent exists) */}
        {target.meta?.intent && (
          <div className="border border-[#f59e0b]/40 bg-[#f59e0b]/5 rounded p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-black text-[#f59e0b] tracking-wider uppercase flex items-center space-x-1.5">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>USER PROMPT & INTENT FOR AI AGENT</span>
              </span>
              <span className="text-[10px] font-mono text-[#94a3b8]">
                {target.meta.pointrVersion
                  ? `v${target.meta.pointrVersion}`
                  : ""}
              </span>
            </div>
            <p className="font-mono text-sm text-[#f8fafc] leading-relaxed font-semibold">
              "{target.meta.intent}"
            </p>
          </div>
        )}

        {/* TAB 1: Deep Inspector */}
        {activeTab === "deep" && (
          <div className="space-y-6">
            {/* Source & Code Snippet Box */}
            <div className="hud-card p-4 rounded border border-[#1f2233]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-mono font-black text-[#f8fafc] uppercase tracking-wider flex items-center space-x-2">
                  <CodeIcon className="w-4 h-4 text-[#f59e0b]" />
                  <span>JSX / Component Source Snippet</span>
                </div>
                <span className="text-[10px] font-mono text-[#94a3b8] bg-[#070709] px-2 py-0.5 rounded border border-[#1f2233]">
                  {filePath}:{lineNum}
                </span>
              </div>
              <pre className="bg-[#070709] border border-[#1f2233] p-3 rounded text-xs font-mono text-[#10b981] overflow-x-auto">
                {target.source?.snippet || `<${compName} />`}
              </pre>
            </div>

            {/* Geometry & Device Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Layout Geometry */}
              <div className="hud-card p-4 rounded border border-[#1f2233]">
                <div className="text-xs font-mono font-black text-[#f8fafc] uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-[#3b82f6] rounded-sm" />
                  <span>Layout Geometry</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[#070709] p-2.5 rounded border border-[#1f2233]">
                    <span className="text-[#64748b] text-[10px] block">
                      WIDTH × HEIGHT
                    </span>
                    <span className="font-bold text-[#f8fafc]">
                      {target.styles?.layout?.width ||
                        target.nativeNode?.bounds?.width ||
                        "--"}
                      px ×{" "}
                      {target.styles?.layout?.height ||
                        target.nativeNode?.bounds?.height ||
                        "--"}
                      px
                    </span>
                  </div>
                  <div className="bg-[#070709] p-2.5 rounded border border-[#1f2233]">
                    <span className="text-[#64748b] text-[10px] block">
                      POSITION (X, Y)
                    </span>
                    <span className="font-bold text-[#f8fafc]">
                      X:{" "}
                      {target.styles?.layout?.left ??
                        target.nativeNode?.bounds?.x ??
                        "--"}
                      , Y:{" "}
                      {target.styles?.layout?.top ??
                        target.nativeNode?.bounds?.y ??
                        "--"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Device / Runtime Platform */}
              <div className="hud-card p-4 rounded border border-[#1f2233]">
                <div className="text-xs font-mono font-black text-[#f8fafc] uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-[#10b981] rounded-sm" />
                  <span>Platform & Runtime</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[#070709] p-2.5 rounded border border-[#1f2233]">
                    <span className="text-[#64748b] text-[10px] block">
                      RUNTIME TARGET
                    </span>
                    <span className="font-bold text-[#f8fafc] uppercase">
                      {target.platform || "web"}
                    </span>
                  </div>
                  <div className="bg-[#070709] p-2.5 rounded border border-[#1f2233]">
                    <span className="text-[#64748b] text-[10px] block">
                      OS / USER AGENT
                    </span>
                    <span className="font-bold text-[#f8fafc] truncate block">
                      {target.device?.os ||
                        (target.meta?.url ? "Browser / DOM" : "Local")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* DOM or Native Node Info */}
            {target.dom && (
              <div className="hud-card p-4 rounded border border-[#1f2233]">
                <div className="text-xs font-mono font-black text-[#f8fafc] uppercase tracking-wider mb-3">
                  DOM Selector & XPath
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <span className="text-[#64748b] text-[10px] block">
                      CSS SELECTOR
                    </span>
                    <div className="bg-[#070709] p-2 rounded border border-[#1f2233] text-[#cbd5e1] select-all">
                      {target.dom.cssSelector}
                    </div>
                  </div>
                  {target.dom.xpath && (
                    <div>
                      <span className="text-[#64748b] text-[10px] block">
                        XPATH
                      </span>
                      <div className="bg-[#070709] p-2 rounded border border-[#1f2233] text-[#94a3b8] select-all">
                        {target.dom.xpath}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Styles & Design Tokens */}
        {activeTab === "styles" && (
          <div className="space-y-6">
            {/* Tailwind Classes (if available) */}
            {tailwindClasses.length > 0 && (
              <div className="hud-card p-4 rounded border border-[#1f2233]">
                <div className="text-xs font-mono font-black text-[#f8fafc] uppercase tracking-wider mb-3">
                  Tailwind CSS Utility Classes ({tailwindClasses.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tailwindClasses.map((cls, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-mono bg-[#181924] text-[#3b82f6] px-2 py-1 rounded border border-[#25283b]"
                    >
                      {cls}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Design Tokens Map */}
            {Object.keys(designTokens).length > 0 && (
              <div className="hud-card p-4 rounded border border-[#1f2233]">
                <div className="text-xs font-mono font-black text-[#f8fafc] uppercase tracking-wider mb-3">
                  Design Tokens
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  {Object.entries(designTokens).map(([token, val], idx) => (
                    <div
                      key={idx}
                      className="bg-[#070709] p-2.5 rounded border border-[#1f2233] flex justify-between items-center"
                    >
                      <span className="text-[#f59e0b] font-bold">{token}</span>
                      <span className="text-[#94a3b8]">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Computed Styles Table */}
            <div className="hud-card p-4 rounded border border-[#1f2233] space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono font-black text-[#f8fafc] uppercase tracking-wider">
                  Computed Styles / StyleSheet Properties
                </div>
                <input
                  type="text"
                  placeholder="Filter style keys/values..."
                  value={styleFilter}
                  onChange={(e) => setStyleFilter(e.target.value)}
                  className="bg-[#070709] border border-[#1f2233] focus:border-[#f59e0b] text-[#f8fafc] text-xs font-mono px-2.5 py-1 rounded outline-none w-48"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1f2233] text-[#64748b] text-[10px] uppercase">
                      <th className="py-2 px-3">Property</th>
                      <th className="py-2 px-3">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181a24]">
                    {filteredStyles.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="py-6 text-center text-[#64748b]"
                        >
                          No style rules found matching filter
                        </td>
                      </tr>
                    ) : (
                      filteredStyles.map(([prop, val], idx) => (
                        <tr key={idx} className="hover:bg-[#070709]/80">
                          <td className="py-2 px-3 text-[#3b82f6] font-bold">
                            {prop}
                          </td>
                          <td className="py-2 px-3 text-[#cbd5e1] select-all">
                            {String(val)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Component Hierarchy Breadcrumb */}
        {activeTab === "hierarchy" && (
          <div className="space-y-6">
            <div className="hud-card p-4 rounded border border-[#1f2233]">
              <div className="text-xs font-mono font-black text-[#f8fafc] uppercase tracking-wider mb-4">
                Component Tree Trail
              </div>

              {/* Breadcrumb Visual Trail */}
              <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-[#070709] rounded border border-[#1f2233]">
                {target.componentTree?.map((node, idx) => {
                  const isLast =
                    idx === (target.componentTree?.length || 0) - 1;
                  return (
                    <React.Fragment key={idx}>
                      <span
                        className={`text-xs font-mono px-2 py-1 rounded border ${
                          isLast
                            ? "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/40 font-black"
                            : "bg-[#12131c] text-[#cbd5e1] border-[#25283b]"
                        }`}
                      >
                        &lt;{node.name}&gt;
                      </span>
                      {!isLast && (
                        <ChevronRightIcon className="w-3.5 h-3.5 text-[#64748b]" />
                      )}
                    </React.Fragment>
                  );
                }) ||
                  target.nativeNode?.hierarchy?.map((name, idx) => {
                    const isLast =
                      idx === (target.nativeNode?.hierarchy?.length || 0) - 1;
                    return (
                      <React.Fragment key={idx}>
                        <span
                          className={`text-xs font-mono px-2 py-1 rounded border ${
                            isLast
                              ? "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/40 font-black"
                              : "bg-[#12131c] text-[#cbd5e1] border-[#25283b]"
                          }`}
                        >
                          &lt;{name}&gt;
                        </span>
                        {!isLast && (
                          <ChevronRightIcon className="w-3.5 h-3.5 text-[#64748b]" />
                        )}
                      </React.Fragment>
                    );
                  })}
              </div>

              {/* Hierarchy Nodes Detailed Cards */}
              <div className="space-y-3">
                {target.componentTree?.map((node, idx) => (
                  <div
                    key={idx}
                    className="bg-[#070709] p-3 rounded border border-[#1f2233] text-xs font-mono space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#f8fafc] text-sm">
                        &lt;<span className="text-[#f59e0b]">{node.name}</span>
                        &gt;
                      </span>
                      {node.file && (
                        <span className="text-[10px] text-[#94a3b8]">
                          {node.file}
                        </span>
                      )}
                    </div>

                    {node.hooks && node.hooks.length > 0 && (
                      <div className="flex items-center space-x-1.5 pt-1">
                        <span className="text-[10px] text-[#64748b]">
                          HOOKS:
                        </span>
                        {node.hooks.map((h, hIdx) => (
                          <span
                            key={hIdx}
                            className="text-[10px] bg-[#12131c] text-[#10b981] px-1.5 py-0.2 rounded border border-[#25283b]"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    )}

                    {node.props && Object.keys(node.props).length > 0 && (
                      <div className="pt-2 border-t border-[#181a24]">
                        <span className="text-[10px] text-[#64748b] block mb-1">
                          PROPS:
                        </span>
                        <pre className="bg-[#0a0b10] p-2 rounded text-[11px] text-[#cbd5e1] overflow-x-auto">
                          {JSON.stringify(node.props, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AI Agent Markdown Preview */}
        {activeTab === "markdown" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-black text-[#94a3b8] uppercase tracking-wider">
                Formatted AI Assistant Context Payload
              </span>
              <button
                onClick={handleCopyMd}
                className="flex items-center space-x-1 bg-[#12131c] hover:bg-[#181924] text-[#f59e0b] border border-[#25283b] px-2.5 py-1 rounded text-xs font-mono font-bold"
              >
                {copiedMarkdown ? (
                  <CheckIcon className="w-3.5 h-3.5 text-[#10b981]" />
                ) : (
                  <CopyIcon className="w-3.5 h-3.5" />
                )}
                <span>{copiedMarkdown ? "COPIED" : "COPY MARKDOWN"}</span>
              </button>
            </div>
            <pre className="hud-card p-4 rounded border border-[#1f2233] text-xs font-mono text-[#cbd5e1] overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
              {target.markdown}
            </pre>
          </div>
        )}

        {/* TAB 5: Raw JSON Payload */}
        {activeTab === "raw_json" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-black text-[#94a3b8] uppercase tracking-wider">
                Raw MCP Context Payload (JSON)
              </span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    JSON.stringify(target, null, 2)
                  );
                  setCopiedMarkdown(true);
                  setTimeout(() => setCopiedMarkdown(false), 1500);
                }}
                className="flex items-center space-x-1 bg-[#12131c] hover:bg-[#181924] text-[#3b82f6] border border-[#25283b] px-2.5 py-1 rounded text-xs font-mono font-bold"
              >
                <CopyIcon className="w-3.5 h-3.5" />
                <span>COPY JSON</span>
              </button>
            </div>
            <pre className="bg-[#0a0b10] p-4 rounded border border-[#1f2233] text-xs font-mono text-[#34d399] overflow-x-auto whitespace-pre-wrap select-all">
              {JSON.stringify(target, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
};
