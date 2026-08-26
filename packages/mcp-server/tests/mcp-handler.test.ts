import { describe, it, expect, beforeEach } from "vitest";
import { store } from "../src/store.js";
import { createServer } from "../src/index.js";
import { PointrPayload } from "../src/types.js";

describe("mcp-handler", () => {
  beforeEach(() => {
    store.clear();
  });

  const dummyPayload = {
    source: { file: "a", line: 1, column: 1, snippet: "" },
    componentTree: [],
    dom: {
      tagName: "div",
      cssSelector: "div",
      xpath: "/div",
      attributes: {},
      textContent: "",
    },
    styles: { computed: {}, designTokens: {}, tailwindClasses: [] },
    screenshot: { base64: "", width: 0, height: 0 },
    meta: { timestamp: "", url: "", intent: "", pointrVersion: "" },
    markdown: "",
  } as PointrPayload;

  it("store ring buffer works", () => {
    for (let i = 0; i < 11; i++) {
      store.push({
        ...dummyPayload,
        dom: { ...dummyPayload.dom, cssSelector: `s${i}` },
      });
    }
    expect(store.getAll().length).toBe(10);
    expect(store.getLatest()?.dom.cssSelector).toBe("s10");
  });

  it("auto-discovery works", async () => {
    const { server, port } = await createServer();
    expect(port).toBeGreaterThanOrEqual(3333);
    expect(port).toBeLessThanOrEqual(3340);
    server.close();
  });
});
