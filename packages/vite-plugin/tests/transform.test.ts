import { describe, it, expect } from "vitest";
import { transform } from "../src/transform";
import { pointr } from "../src/index";

describe("Pointr Vite Plugin Transform", () => {
  it("injects data-pointr-source into JSX elements", () => {
    const code = `
      function App() {
        return <div className="test">Hello</div>;
      }
    `;
    const result = transform(code, "/src/App.tsx");
    expect(result?.code).toContain('data-pointr-source="src/App.tsx:3:15"');
  });

  it("handles fragments correctly", () => {
    const code = `
      function App() {
        return <><div>Hello</div></>;
      }
    `;
    const result = transform(code, "/src/App.tsx");
    expect(result?.code).toContain('data-pointr-source="src/App.tsx:3:17"');
    expect(result?.code).not.toContain('data-pointr-source="src/App.tsx:3:15"'); // fragment opening
  });

  it("handles nested elements", () => {
    const code = `
      function App() {
        return (
          <div>
            <span>nested</span>
          </div>
        );
      }
    `;
    const result = transform(code, "/src/App.tsx");
    expect(result?.code).toContain('data-pointr-source="src/App.tsx:4:10"');
    expect(result?.code).toContain('data-pointr-source="src/App.tsx:5:12"');
  });

  it("preserves spread attributes", () => {
    const code = `
      function App(props) {
        return <div {...props}>Hello</div>;
      }
    `;
    const result = transform(code, "/src/App.tsx");
    expect(result?.code).toContain("{...props}");
    expect(result?.code).toContain('data-pointr-source="src/App.tsx:3:15"');
  });

  it("handles native vs component elements", () => {
    const code = `
      function App() {
        return <MyComponent><div /></MyComponent>;
      }
    `;
    const result = transform(code, "/src/App.tsx");
    expect(result?.code).toContain('data-pointr-source="src/App.tsx:3:15"'); // MyComponent
    expect(result?.code).toContain('data-pointr-source="src/App.tsx:3:28"'); // div
  });
});

describe("Pointr Vite Plugin Config", () => {
  it("does not transform in production", () => {
    const plugin = pointr() as any;
    plugin.configResolved({ command: "build" });
    expect(plugin.transform("<div />", "/src/App.tsx")).toBeNull();
    expect(
      plugin.transform("<template><div></div></template>", "/src/App.vue")
    ).toBeNull();
    expect(plugin.transform("<div></div>", "/src/App.svelte")).toBeNull();
  });

  it("transforms JSX, Vue, and Svelte in dev mode", () => {
    const plugin = pointr() as any;
    plugin.configResolved({ command: "serve" });

    const jsxResult = plugin.transform("<div />", "/src/App.tsx");
    expect(jsxResult?.code).toContain('data-pointr-source="src/App.tsx:1:0"');

    const vueResult = plugin.transform(
      "<template><div>Hello</div></template>",
      "/src/App.vue"
    );
    expect(vueResult?.code).toContain('data-pointr-source="src/App.vue:1:11"');

    const svelteResult = plugin.transform(
      "<div>Hello</div>",
      "/src/App.svelte"
    );
    expect(svelteResult?.code).toContain(
      'data-pointr-source="src/App.svelte:1:1"'
    );
  });
});
