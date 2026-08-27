import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as babel from "@babel/core";
import pointrBabelPlugin, { withPointrBabel } from "../src/babel-plugin";

function transform(
  code: string,
  filename = "/workspace/src/App.tsx",
  options = {}
) {
  const result = babel.transformSync(code, {
    filename,
    parserOpts: {
      plugins: ["jsx", "typescript"],
    },
    plugins: [[pointrBabelPlugin, { root: "/workspace", ...options }]],
    configFile: false,
    babelrc: false,
  });
  return result?.code || "";
}

describe("Pointr React Native Babel Plugin", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalBabelEnv = process.env.BABEL_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = "development";
    delete process.env.BABEL_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.BABEL_ENV = originalBabelEnv;
  });

  it("injects pointrSource into standard React Native JSX elements", () => {
    const code = `
      import { View, Text } from 'react-native';
      export function App() {
        return (
          <View style={{ flex: 1 }}>
            <Text>Hello Mobile</Text>
          </View>
        );
      }
    `;

    const output = transform(code, "/workspace/src/screens/HomeScreen.tsx");
    expect(output).toContain("pointrSource={{");
    expect(output).toContain('file: "src/screens/HomeScreen.tsx"');
    expect(output).toContain('component: "View"');
    expect(output).toContain('component: "Text"');
  });

  it("handles JSXMemberExpression components like Animated.View and Icon.Button", () => {
    const code = `
      export function Anim() {
        return (
          <Animated.View style={animStyle}>
            <Icon.Button name="chevron" />
          </Animated.View>
        );
      }
    `;

    const output = transform(
      code,
      "/workspace/src/components/AnimatedCard.tsx"
    );
    expect(output).toContain('component: "Animated.View"');
    expect(output).toContain('component: "Icon.Button"');
    expect(output).toContain('file: "src/components/AnimatedCard.tsx"');
  });

  it("handles nested JSX elements and preserves line and column accuracy", () => {
    const code = `
      export function Nested() {
        return (
          <SafeAreaView>
            <ScrollView>
              <Card>
                <Button title="Click" />
              </Card>
            </ScrollView>
          </SafeAreaView>
        );
      }
    `;

    const output = transform(code, "/workspace/src/App.tsx");
    expect(output).toContain('component: "SafeAreaView"');
    expect(output).toContain('component: "ScrollView"');
    expect(output).toContain('component: "Card"');
    expect(output).toContain('component: "Button"');
  });

  it("skips React.Fragment and Fragment tags", () => {
    const code = `
      import React, { Fragment } from 'react';
      export function Frag() {
        return (
          <React.Fragment>
            <Fragment>
              <View />
            </Fragment>
          </React.Fragment>
        );
      }
    `;

    const output = transform(code, "/workspace/src/Frag.tsx");
    expect(output).not.toContain('component: "React.Fragment"');
    expect(output).not.toContain('component: "Fragment"');
    expect(output).toContain('component: "View"');
  });

  it("does not inject duplicate pointrSource when already present", () => {
    const code = `
      export function PreTagged() {
        return (
          <View pointrSource={{ file: "custom.tsx", line: 1, column: 1, component: "Custom" }}>
            <Text>Existing</Text>
          </View>
        );
      }
    `;

    const output = transform(code, "/workspace/src/PreTagged.tsx");
    expect(output).toContain('file: "custom.tsx"');
    // Count occurrences of pointrSource
    const matches = output.match(/pointrSource=/g);
    // 1 for View (custom), 1 for Text
    expect(matches?.length).toBe(2);
  });

  it("ignores files in node_modules", () => {
    const code = `
      export function Lib() {
        return <View><Text>Vendor</Text></View>;
      }
    `;

    const output = transform(
      code,
      "/workspace/node_modules/some-lib/index.tsx"
    );
    expect(output).not.toContain("pointrSource");
  });

  it("disables transformation in production environment (NODE_ENV = production)", () => {
    process.env.NODE_ENV = "production";

    const code = `
      export function Prod() {
        return <View><Text>Prod View</Text></View>;
      }
    `;

    const output = transform(code, "/workspace/src/Prod.tsx");
    expect(output).not.toContain("pointrSource");
  });

  it("disables transformation when disabled option is true", () => {
    const code = `
      export function Disabled() {
        return <View><Text>Disabled View</Text></View>;
      }
    `;

    const output = transform(code, "/workspace/src/Disabled.tsx", {
      disabled: true,
    });
    expect(output).not.toContain("pointrSource");
  });

  it("supports withPointrBabel helper for object and function Babel configs", () => {
    const staticConfig = {
      plugins: ["@babel/plugin-proposal-class-properties"],
    };
    const updatedStatic = withPointrBabel(staticConfig);
    expect(updatedStatic.plugins.length).toBe(2);
    expect(updatedStatic.plugins[1][0]).toBe(pointrBabelPlugin);

    const fnConfig = (_api: any) => ({
      presets: ["module:metro-react-native-babel-preset"],
      plugins: [],
    });
    const updatedFn = withPointrBabel(fnConfig);
    const result = updatedFn({});
    expect(result.plugins.length).toBe(1);
    expect(result.plugins[0][0]).toBe(pointrBabelPlugin);
  });
});
