import { parse } from "@vue/compiler-sfc";
import MagicString from "magic-string";
import { getRelativePath } from "../utils";

export function transformVue(
  code: string,
  id: string,
  rootDir: string = process.cwd()
): { code: string; map: any } | null {
  const cleanId = id.split("?")[0] ?? "";
  if (!cleanId.endsWith(".vue")) {
    return null;
  }

  try {
    const { descriptor, errors } = parse(code, { filename: id });
    if (errors.length > 0 || !descriptor.template || !descriptor.template.ast) {
      return null;
    }

    const s = new MagicString(code);
    const relativePath = getRelativePath(id, rootDir);

    function walkNode(node: any) {
      if (!node || typeof node !== "object") return;

      // ElementTypes in Vue: 0 = ELEMENT, 1 = COMPONENT, 2 = SLOT, 3 = TEMPLATE
      if (node.type === 1 /* NodeTypes.ELEMENT */ && node.tag && node.loc) {
        const isElementOrComponent = node.tagType === 0 || node.tagType === 1;
        const isNotSpecialWrapper =
          node.tag !== "template" && node.tag !== "slot";

        if (isElementOrComponent && isNotSpecialWrapper) {
          const hasAttr =
            node.props &&
            node.props.some(
              (p: any) =>
                (p.type === 6 && p.name === "data-pointr-source") ||
                (p.type === 7 &&
                  p.name === "bind" &&
                  p.arg?.content === "data-pointr-source") ||
                p.name === "data-pointr-source" ||
                p.rawName === "data-pointr-source"
            );

          if (!hasAttr) {
            const line = node.loc.start.line;
            const column = node.loc.start.column;
            const sourceAttr = ` data-pointr-source="${relativePath}:${line}:${column}"`;
            const insertPos = node.loc.start.offset + 1 + node.tag.length;
            s.appendLeft(insertPos, sourceAttr);
          }
        }
      }

      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(walkNode);
      }
      if (node.branches && Array.isArray(node.branches)) {
        node.branches.forEach(walkNode);
      }
    }

    walkNode(descriptor.template.ast);

    return {
      code: s.toString(),
      map: s.generateMap({ hires: true, source: id }),
    };
  } catch (err) {
    console.warn(`[Pointr] Failed to transform Vue in ${id}:`, err);
    return null;
  }
}
