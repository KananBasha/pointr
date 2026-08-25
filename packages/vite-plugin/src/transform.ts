import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import * as t from '@babel/types';

// Workaround for babel interop issues
const traverse = typeof _traverse === 'function' ? _traverse : (_traverse as any).default;
const generate = typeof _generate === 'function' ? _generate : (_generate as any).default;

export function transform(code: string, id: string) {
  // Only process JSX/TSX
  if (!id.match(/\.[jt]sx$/)) {
    return null;
  }

  const relativePath = id.replace(process.cwd(), '').replace(/^\/+/, '');

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      sourceFilename: id,
    });

    traverse(ast, {
      JSXOpeningElement(path: any) {
        // Skip fragments (which would actually be JSXOpeningFragment, but we only visit JSXOpeningElement)
        const line = path.node.loc?.start.line || 0;
        const column = path.node.loc?.start.column || 0;
        const sourceString = `${relativePath}:${line}:${column}`;

        const hasAttr = path.node.attributes.some(
          (attr: any) =>
            t.isJSXAttribute(attr) &&
            attr.name.name === 'data-pointr-source'
        );

        if (!hasAttr) {
          path.node.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier('data-pointr-source'),
              t.stringLiteral(sourceString)
            )
          );
        }
      },
    });

    const output = generate(ast, { sourceMaps: true, sourceFileName: id }, code);
    
    return {
      code: output.code,
      map: output.map,
    };
  } catch (err) {
    console.warn(`[Pointr] Failed to transform ${id}:`, err);
    return null;
  }
}
