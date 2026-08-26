import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionRoot = path.join(__dirname, "..");

describe("Pointr Chrome Extension Manifest & Assets", () => {
  it("has a valid Manifest V3 configuration", () => {
    const manifestPath = path.join(extensionRoot, "manifest.json");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe("Pointr — Visual Context for AI Coding Agents");
    expect(manifest.version).toBe("0.1.0");
    expect(manifest.permissions).toContain("activeTab");
    expect(manifest.permissions).toContain("scripting");
    expect(manifest.permissions).toContain("storage");
    expect(manifest.permissions).toContain("tabs");

    expect(manifest.host_permissions).toContain("http://localhost/*");
    expect(manifest.host_permissions).toContain("http://127.0.0.1/*");

    expect(manifest.background.service_worker).toBe(
      "background/service-worker.js"
    );
    expect(manifest.action.default_popup).toBe("popup/index.html");
  });

  it("contains all referenced icon assets", () => {
    const sizes = [16, 48, 128];
    sizes.forEach((size) => {
      const iconPath = path.join(extensionRoot, "icons", `icon-${size}.png`);
      expect(fs.existsSync(iconPath)).toBe(true);
      const stat = fs.statSync(iconPath);
      expect(stat.size).toBeGreaterThan(0);
    });

    const svgPath = path.join(extensionRoot, "icons", "icon.svg");
    expect(fs.existsSync(svgPath)).toBe(true);
  });

  it("contains background service worker file with proper MV3 event hooks", () => {
    const swPath = path.join(extensionRoot, "background", "service-worker.js");
    expect(fs.existsSync(swPath)).toBe(true);
    const content = fs.readFileSync(swPath, "utf-8");
    expect(content).toContain("chrome.runtime.onMessage");
    expect(content).toContain("isLocalDevUrl");
    expect(content).toContain("checkMcpHealth");
    expect(content).toContain("TARGET_CAPTURED");
    expect(content).toContain("GET_STATUS");
    expect(content).toContain("return true;"); // for async sendResponse
  });

  it("contains content script overlay injector with React Fiber and Vue traversal", () => {
    const csPath = path.join(extensionRoot, "content", "overlay-injector.js");
    expect(fs.existsSync(csPath)).toBe(true);
    const content = fs.readFileSync(csPath, "utf-8");
    expect(content).toContain("__reactFiber$");
    expect(content).toContain("_debugSource");
    expect(content).toContain("__vnode");
    expect(content).toContain("data-pointr-source");
    expect(content).toContain("/context");
    expect(content).toContain("formatPayloadMarkdown");
  });

  it("contains popup UI files without inline scripts adhering to MV3 CSP", () => {
    const htmlPath = path.join(extensionRoot, "popup", "index.html");
    const cssPath = path.join(extensionRoot, "popup", "popup.css");
    const jsPath = path.join(extensionRoot, "popup", "popup.js");

    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(cssPath)).toBe(true);
    expect(fs.existsSync(jsPath)).toBe(true);

    const htmlContent = fs.readFileSync(htmlPath, "utf-8");
    expect(htmlContent).toContain('<script src="popup.js">');
    // Ensure no inline script tags in HTML (CSP rule)
    expect(htmlContent).not.toMatch(
      /<script(?![^>]*src=)[^>]*>[\s\S]+?<\/script>/i
    );
    // Ensure no inline onclick= or onchange=
    expect(htmlContent).not.toMatch(/\son[a-z]+=["']/i);
  });

  it("contains comprehensive README documentation for loading unpacked", () => {
    const readmePath = path.join(extensionRoot, "README.md");
    expect(fs.existsSync(readmePath)).toBe(true);
    const readme = fs.readFileSync(readmePath, "utf-8");
    expect(readme).toContain("chrome://extensions");
    expect(readme).toContain("Load unpacked");
    expect(readme).toContain("React Fiber");
  });
});
