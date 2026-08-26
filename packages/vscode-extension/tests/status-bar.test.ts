import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStatusBarItem } = vi.hoisted(() => {
  return {
    mockStatusBarItem: {
      text: "",
      tooltip: "" as any,
      command: "",
      backgroundColor: undefined as any,
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    },
  };
});

vi.mock("vscode", () => {
  return {
    window: {
      createStatusBarItem: vi.fn().mockReturnValue(mockStatusBarItem),
    },
    StatusBarAlignment: { Right: 2, Left: 1 },
    ThemeColor: class {
      constructor(public id: string) {}
    },
    MarkdownString: class {
      constructor(public value: string) {}
    },
  };
});

import { StatusBarManager } from "../src/status-bar";
import { PointrPayload } from "../src/types";

describe("StatusBarManager", () => {
  beforeEach(() => {
    mockStatusBarItem.text = "";
    mockStatusBarItem.tooltip = "";
    mockStatusBarItem.command = "";
    mockStatusBarItem.backgroundColor = undefined;
    vi.clearAllMocks();
  });

  it("initializes in disconnected state and shows item", () => {
    const manager = new StatusBarManager();
    expect(mockStatusBarItem.show).toHaveBeenCalled();
    expect(mockStatusBarItem.text).toContain("Offline");

    manager.dispose();
    expect(mockStatusBarItem.dispose).toHaveBeenCalled();
  });

  it("updates status to connecting and connected", () => {
    const manager = new StatusBarManager();

    manager.updateStatus("connecting");
    expect(mockStatusBarItem.text).toContain("Connecting");
    expect(mockStatusBarItem.command).toBe("pointr.connect");

    manager.updateStatus("connected", 3335);
    expect(mockStatusBarItem.text).toContain(":3335");
    expect(mockStatusBarItem.command).toBe("pointr.openLatest");

    manager.dispose();
  });

  it("updates text and tooltip when target is captured", () => {
    const manager = new StatusBarManager();
    manager.updateStatus("connected", 3333);

    const payload: PointrPayload = {
      source: { file: "src/components/Header.tsx", line: 15, column: 2 },
      dom: { tagName: "HEADER", cssSelector: "header.nav" },
    };

    manager.notifyTargetCaptured(payload);
    expect(mockStatusBarItem.text).toContain("<header>");
    expect(mockStatusBarItem.text).toContain("Header.tsx:15");

    manager.dispose();
  });
});
