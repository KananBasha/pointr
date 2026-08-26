export function getRelativePath(
  id: string,
  rootDir: string = process.cwd()
): string {
  // Strip any query strings (e.g. from Vite / HMR / Vue SFC loader)
  const cleanId = id.split("?")[0] ?? "";
  const normalizedRoot = rootDir.replace(/\\/g, "/").replace(/\/$/, "");
  const normalizedId = cleanId.replace(/\\/g, "/");

  if (normalizedRoot && normalizedId.startsWith(normalizedRoot)) {
    return normalizedId.slice(normalizedRoot.length).replace(/^\/+/, "");
  }
  return normalizedId.replace(/^\/+/, "");
}

export function getLineAndColumn(
  code: string,
  offset: number
): { line: number; column: number } {
  let line = 1;
  let lastLineBreak = -1;
  const max = Math.min(offset, code.length);
  for (let i = 0; i < max; i++) {
    if (code[i] === "\n") {
      line++;
      lastLineBreak = i;
    }
  }
  const column = offset - lastLineBreak;
  return { line, column };
}
