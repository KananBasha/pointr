import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { PointrSource } from "./types";

let lineDecorationType: vscode.TextEditorDecorationType | null = null;
let activeHighlightTimer: NodeJS.Timeout | null = null;

/**
 * Lazily creates or returns the text editor decoration type used for highlighting.
 */
export function getLineDecorationType(): vscode.TextEditorDecorationType {
  if (!lineDecorationType) {
    lineDecorationType = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      backgroundColor: new vscode.ThemeColor(
        "editor.findMatchHighlightBackground"
      ),
      overviewRulerColor: new vscode.ThemeColor(
        "editorOverviewRuler.findMatchForeground"
      ),
      overviewRulerLane: vscode.OverviewRulerLane.Center,
      border: "1px solid rgba(59, 130, 246, 0.5)",
      borderRadius: "2px",
    });
  }
  return lineDecorationType;
}

/**
 * Resolves a given file path against open workspace folders.
 * Handles both absolute and workspace-relative paths.
 */
export async function resolveFilePath(
  rawFilePath: string,
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined = vscode
    .workspace.workspaceFolders
): Promise<vscode.Uri | null> {
  if (!rawFilePath) return null;

  // Clean leading/trailing slashes or query strings/hashes if present
  const cleanPath = rawFilePath.split("?")[0]?.split("#")[0]?.trim() ?? "";
  if (!cleanPath) return null;

  // Check if it's already an existing absolute path
  if (path.isAbsolute(cleanPath)) {
    if (fs.existsSync(cleanPath)) {
      return vscode.Uri.file(cleanPath);
    }
  }

  if (!workspaceFolders || workspaceFolders.length === 0) {
    // If no workspace open, try absolute if possible
    if (path.isAbsolute(cleanPath)) {
      return vscode.Uri.file(cleanPath);
    }
    return null;
  }

  // 1. Try directly resolving against each workspace folder root
  for (const folder of workspaceFolders) {
    const candidate = path.join(folder.uri.fsPath, cleanPath);
    if (fs.existsSync(candidate)) {
      return vscode.Uri.file(candidate);
    }
  }

  // 2. Try stripping leading repo folder or package folder prefix if matching
  const normalizedClean = cleanPath.replace(/^[/\\]+/, "");
  for (const folder of workspaceFolders) {
    const candidate = path.join(folder.uri.fsPath, normalizedClean);
    if (fs.existsSync(candidate)) {
      return vscode.Uri.file(candidate);
    }
  }

  // 3. Fallback: Search workspace for matching file by basename
  const baseName = path.basename(cleanPath);
  try {
    const matches = await vscode.workspace.findFiles(
      `**/${baseName}`,
      "**/node_modules/**",
      5
    );
    if (matches.length > 0) {
      // Find the best match ending with the clean path suffix
      const bestMatch = matches.find((m) =>
        m.fsPath
          .replace(/\\/g, "/")
          .endsWith(normalizedClean.replace(/\\/g, "/"))
      );
      return bestMatch ?? matches[0] ?? null;
    }
  } catch (err) {
    console.warn("[Pointr] Failed to search workspace for file:", err);
  }

  return null;
}

/**
 * Applies a temporary highlight decoration to a specific line in the text editor.
 */
export function highlightLine(
  editor: vscode.TextEditor,
  lineNumberZeroBased: number,
  durationMs: number = 2000
): void {
  const decoration = getLineDecorationType();

  // Clear previous timer
  if (activeHighlightTimer) {
    clearTimeout(activeHighlightTimer);
    activeHighlightTimer = null;
  }

  const lineCount = editor.document.lineCount;
  const targetLine = Math.min(
    Math.max(0, lineNumberZeroBased),
    Math.max(0, lineCount - 1)
  );
  const lineText = editor.document.lineAt(targetLine).text;
  const lineRange = new vscode.Range(
    targetLine,
    0,
    targetLine,
    lineText.length
  );

  editor.setDecorations(decoration, [lineRange]);

  if (durationMs > 0) {
    activeHighlightTimer = setTimeout(() => {
      try {
        editor.setDecorations(decoration, []);
      } catch {
        // Editor might have closed
      }
      activeHighlightTimer = null;
    }, durationMs);
  }
}

/**
 * Clears active line highlight decorations in the editor.
 */
export function clearAllHighlights(editor?: vscode.TextEditor): void {
  if (activeHighlightTimer) {
    clearTimeout(activeHighlightTimer);
    activeHighlightTimer = null;
  }

  const decoration = getLineDecorationType();
  if (editor) {
    editor.setDecorations(decoration, []);
  } else {
    for (const visibleEditor of vscode.window.visibleTextEditors) {
      visibleEditor.setDecorations(decoration, []);
    }
  }
}

/**
 * Disposes the decoration type when extension is deactivated.
 */
export function disposeDecorations(): void {
  if (activeHighlightTimer) {
    clearTimeout(activeHighlightTimer);
    activeHighlightTimer = null;
  }
  if (lineDecorationType) {
    lineDecorationType.dispose();
    lineDecorationType = null;
  }
}

/**
 * Opens a source location in VS Code / Cursor, centers on the line, and highlights it.
 */
export async function openSourceLocation(
  source: PointrSource,
  options: { highlightDuration?: number; preserveFocus?: boolean } = {}
): Promise<vscode.TextEditor | null> {
  if (!source || !source.file) {
    return null;
  }

  const uri = await resolveFilePath(source.file);
  if (!uri) {
    vscode.window.showWarningMessage(
      `Pointr: Could not locate source file "${source.file}" in workspace.`
    );
    return null;
  }

  try {
    const document = await vscode.workspace.openTextDocument(uri);
    const line1 = source.line ?? 1;
    const col1 = source.column ?? 1;

    const zeroBasedLine = Math.max(0, line1 - 1);
    const zeroBasedCol = Math.max(0, col1 - 1);
    const position = new vscode.Position(zeroBasedLine, zeroBasedCol);
    const selectionRange = new vscode.Range(position, position);

    const editor = await vscode.window.showTextDocument(document, {
      selection: selectionRange,
      preserveFocus: options.preserveFocus ?? false,
      preview: false,
    });

    editor.revealRange(selectionRange, vscode.TextEditorRevealType.InCenter);

    const highlightDuration = options.highlightDuration ?? 2000;
    highlightLine(editor, zeroBasedLine, highlightDuration);

    return editor;
  } catch (err) {
    vscode.window.showErrorMessage(
      `Pointr: Error opening file "${source.file}": ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}
