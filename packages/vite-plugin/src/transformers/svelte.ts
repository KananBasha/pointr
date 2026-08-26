import { parse } from "svelte/compiler";
import MagicString from "magic-string";
import { getRelativePath, getLineAndColumn } from "../utils";

const IGNORED_SVELTE_TAGS = new Set([
  "svelte:head",
  "svelte:options",
  "svelte:window",
  "svelte:document",
  "svelte:body",
  "svelte:fragment",
  "slot",
]);

const TARGET_NODE_TYPES = new Set([
  "Element",
  "InlineComponent",
  "Component",
  "SvelteElement",
  "SvelteComponent",
  "TitleElement",
]);

export function transformSvelte(
  code: string,
  id: string,
  rootDir: string = process.cwd()
): { code: string; map: any } | null {
  const cleanId = id.split("?")[0] ?? "";
  if (!cleanId.endsWith(".svelte")) {
    return null;
  }

  try {
    const ast = parse(code, { filename: id });
    if (!ast) {
      return null;
    }

    const s = new MagicString(code);
    const relativePath = getRelativePath(id, rootDir);

    function walkNode(node: any) {
      if (!node || typeof node !== "object") return;

      const isTargetType = TARGET_NODE_TYPES.has(node.type);

      if (isTargetType && node.name && !IGNORED_SVELTE_TAGS.has(node.name)) {
        const hasAttr =
          node.attributes &&
          Array.isArray(node.attributes) &&
          node.attributes.some(
            (attr: any) => attr.name === "data-pointr-source"
          );

        if (!hasAttr && typeof node.start === "number") {
          const { line, column } = getLineAndColumn(code, node.start);
          const sourceAttr = ` data-pointr-source="${relativePath}:${line}:${column}"`;
          const insertPos = node.start + 1 + node.name.length;
          s.appendLeft(insertPos, sourceAttr);
        }
      }

      for (const key of Object.keys(node)) {
        if (key === "loc") continue;
        const val = node[key];
        if (val && typeof val === "object") {
          if (Array.isArray(val)) {
            val.forEach((item) => {
              if (item && typeof item === "object" && item.type) {
                walkNode(item);
              }
            });
          } else if (val.type) {
            walkNode(val);
          }
        }
      }
    }

    // ast.html in Svelte 4, ast.fragment or ast.html in Svelte 5
    const rootFragment = (ast as any).html || (ast as any).fragment;
    if (rootFragment) {
      walkNode(rootFragment);
    }

    // Also check root-level modules/heads if present in AST top-level
    for (const key of Object.keys(ast)) {
      if (
        key !== "html" &&
        key !== "fragment" &&
        key !== "instance" &&
        key !== "module" &&
        key !== "css" &&
        key !== "js"
      ) {
        const val = (ast as any)[key];
        if (val && typeof val === "object") {
          walkNode(val);
        }
      }
    }

    return {
      code: s.toString(),
      map: s.generateMap({ hires: true, source: id }),
    };
  } catch (err) {
    console.warn(`[Pointr] Failed to transform Svelte in ${id}:`, err);
    return null;
  }
}
