import type { PluginObj } from "@babel/core";
import * as t from "@babel/types";
import * as path from "path";

export interface PointrBabelPluginOptions {
  root?: string | undefined;
  disabled?: boolean | undefined;
  propName?: string | undefined;
}

/**
 * Extracts a readable string representation of JSX element tag name.
 */
function getJSXTagName(
  nameNode: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName
): string {
  if (t.isJSXIdentifier(nameNode)) {
    return nameNode.name;
  }
  if (t.isJSXMemberExpression(nameNode)) {
    return `${getJSXTagName(nameNode.object)}.${nameNode.property.name}`;
  }
  if (t.isJSXNamespacedName(nameNode)) {
    return `${nameNode.namespace.name}:${nameNode.name.name}`;
  }
  return "Unknown";
}

/**
 * Babel AST plugin that automatically attaches source location metadata
 * to React Native JSX elements at compile time in development mode.
 */
export function pointrBabelPlugin(
  _api?: any,
  pluginOptions?: PointrBabelPluginOptions
): PluginObj {
  return {
    name: "pointr-react-native-babel",
    visitor: {
      JSXOpeningElement(nodePath, state) {
        const opts: PointrBabelPluginOptions = {
          ...pluginOptions,
          ...(state.opts as PointrBabelPluginOptions),
        };

        // Dev-only check
        const isProd =
          process.env.NODE_ENV === "production" ||
          process.env.BABEL_ENV === "production";
        if (isProd || opts.disabled) {
          return;
        }

        const filename = state.filename || state.file?.opts?.filename;
        if (!filename || filename.includes("node_modules")) {
          return;
        }

        const propName = opts.propName || "pointrSource";

        // Prevent duplicate injection
        const hasPointrSource = nodePath.node.attributes.some(
          (attr) =>
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name) &&
            attr.name.name === propName
        );
        if (hasPointrSource) {
          return;
        }

        const loc = nodePath.node.loc;
        if (!loc) {
          return;
        }

        const componentName = getJSXTagName(nodePath.node.name);

        // Skip React fragments
        if (
          componentName === "React.Fragment" ||
          componentName === "Fragment" ||
          componentName === ""
        ) {
          return;
        }

        const rootDir = opts.root || process.cwd();
        const relativePath = path
          .relative(rootDir, filename)
          .replace(/\\/g, "/");

        // Build source object AST: { file: "...", line: 1, column: 0, component: "..." }
        const sourceObject = t.objectExpression([
          t.objectProperty(t.identifier("file"), t.stringLiteral(relativePath)),
          t.objectProperty(
            t.identifier("line"),
            t.numericLiteral(loc.start.line)
          ),
          t.objectProperty(
            t.identifier("column"),
            t.numericLiteral(loc.start.column)
          ),
          t.objectProperty(
            t.identifier("component"),
            t.stringLiteral(componentName)
          ),
        ]);

        // Inject pointrSource={...}
        const pointrAttr = t.jsxAttribute(
          t.jsxIdentifier(propName),
          t.jsxExpressionContainer(sourceObject)
        );

        nodePath.node.attributes.push(pointrAttr);
      },
    },
  };
}

/**
 * Utility helper to inject Pointr Babel plugin into an existing Babel/Metro config.
 */
export function withPointrBabel(
  babelConfig: Record<string, any> | ((api: any) => Record<string, any>),
  options?: PointrBabelPluginOptions
): any {
  if (typeof babelConfig === "function") {
    return (api: any) => {
      const config = babelConfig(api);
      const plugins = Array.isArray(config.plugins) ? [...config.plugins] : [];
      plugins.push([pointrBabelPlugin, options || {}]);
      return {
        ...config,
        plugins,
      };
    };
  }

  const plugins = Array.isArray(babelConfig.plugins)
    ? [...babelConfig.plugins]
    : [];
  plugins.push([pointrBabelPlugin, options || {}]);
  return {
    ...babelConfig,
    plugins,
  };
}

export default pointrBabelPlugin;
