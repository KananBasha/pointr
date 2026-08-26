import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import * as t from "@babel/types";
import { getRelativePath } from "../utils";

// Workaround for babel interop issues
const traverse =
  typeof _traverse === "function" ? _traverse : (_traverse as any).default;
const generate =
  typeof _generate === "function" ? _generate : (_generate as any).default;

export function transformJSX(
  code: string,
  id: string,
  rootDir: string = process.cwd()
): { code: string; map: any } | null {
  const cleanId = id.split("?")[0] ?? "";
  if (!cleanId.match(/\.[jt]sx$/)) {
    return null;
  }

  const relativePath = getRelativePath(id, rootDir);

  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
      sourceFilename: id,
    });

    traverse(ast, {
      JSXOpeningElement(path: any) {
        // Skip fragments
        const line = path.node.loc?.start.line || 0;
        const column = path.node.loc?.start.column || 0;
        const sourceString = `${relativePath}:${line}:${column}`;

        const hasAttr = path.node.attributes.some(
          (attr: any) =>
            t.isJSXAttribute(attr) && attr.name.name === "data-pointr-source"
        );

        if (!hasAttr) {
          path.node.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier("data-pointr-source"),
              t.stringLiteral(sourceString)
            )
          );
        }
      },
    });

    const output = generate(
      ast,
      { sourceMaps: true, sourceFileName: id },
      code
    );

    return {
      code: output.code,
      map: output.map,
    };
  } catch (err) {
    console.warn(`[Pointr] Failed to transform JSX in ${id}:`, err);
    return null;
  }
}
