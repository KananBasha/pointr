import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import fs from "fs";

// Mock vscode module
vi.mock("vscode", () => {
  const mockDecoration = { dispose: vi.fn() };
  return {
    window: {
      createTextEditorDecorationType: vi.fn().mockReturnValue(mockDecoration),
      showTextDocument: vi.fn(),
      showWarningMessage: vi.fn(),
      showErrorMessage: vi.fn(),
      showInformationMessage: vi.fn(),
      visibleTextEditors: [],
    },
    workspace: {
      workspaceFolders: [
        {
          uri: { fsPath: path.resolve(__dirname, "../../..") },
          name: "root",
          index: 0,
        },
      ],
      openTextDocument: vi.fn(),
      findFiles: vi.fn().mockResolvedValue([]),
    },
    Uri: {
      file: (p: string) => ({
        fsPath: p,
        scheme: "file",
        toString: () => `file://${p}`,
      }),
    },
    Position: class {
      constructor(public line: number, public character: number) {}
    },
    Range: class {
      constructor(
        public start: any,
        public end: any,
        public startCharacter?: number,
        public endCharacter?: number
      ) {}
    },
    ThemeColor: class {
      constructor(public id: string) {}
    },
    OverviewRulerLane: { Center: 2 },
    TextEditorRevealType: { InCenter: 2 },
  };
});

import { resolveFilePath, openSourceLocation } from "../src/file-opener";
import * as vscode from "vscode";

describe("file-opener", () => {
  const monorepoRoot = path.resolve(__dirname, "../../..");

  it("resolves existing relative file paths in workspace", async () => {
    const relativePath = "package.json";
    const uri = await resolveFilePath(relativePath);
    expect(uri).not.toBeNull();
    expect(uri?.fsPath).toBe(path.join(monorepoRoot, "package.json"));
  });

  it("resolves nested workspace file paths", async () => {
    const relativePath = "packages/mcp-server/package.json";
    const uri = await resolveFilePath(relativePath);
    expect(uri).not.toBeNull();
    expect(uri?.fsPath).toBe(path.join(monorepoRoot, relativePath));
  });

  it("handles query params or hashes in source paths", async () => {
    const rawPath = "package.json?t=123456#L10";
    const uri = await resolveFilePath(rawPath);
    expect(uri).not.toBeNull();
    expect(uri?.fsPath).toBe(path.join(monorepoRoot, "package.json"));
  });

  it("returns null for empty or non-existent files", async () => {
    const emptyUri = await resolveFilePath("");
    expect(emptyUri).toBeNull();

    const nonExistentUri = await resolveFilePath(
      "non/existent/file/path/here.xyz"
    );
    expect(nonExistentUri).toBeNull();
  });

  it("opens text document and reveals range on valid source", async () => {
    const mockDoc = {
      lineCount: 50,
      lineAt: vi
        .fn()
        .mockReturnValue({ text: "export default function App() {" }),
    };
    const mockEditor = {
      document: mockDoc,
      revealRange: vi.fn(),
      setDecorations: vi.fn(),
    };

    (vscode.workspace.openTextDocument as any).mockResolvedValue(mockDoc);
    (vscode.window.showTextDocument as any).mockResolvedValue(mockEditor);

    const editor = await openSourceLocation({
      file: "package.json",
      line: 5,
      column: 3,
    });

    expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
    expect(vscode.window.showTextDocument).toHaveBeenCalled();
    expect(mockEditor.revealRange).toHaveBeenCalled();
    expect(mockEditor.setDecorations).toHaveBeenCalled();
    expect(editor).toBe(mockEditor);
  });
});
