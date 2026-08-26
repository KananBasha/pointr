import { describe, it, expect } from "vitest";
import { transformSvelte } from "../src/transformers/svelte";
import { transform } from "../src/transform";

describe("Pointr Svelte Transformer", () => {
  it("injects data-pointr-source into Svelte template HTML elements", () => {
    const code = `<script>
  let name = 'Svelte';
</script>

<main class="app">
  <h1>Hello {name}</h1>
</main>`;

    const result = transformSvelte(code, "/src/App.svelte");
    expect(result).not.toBeNull();
    expect(result?.code).toContain(
      '<main data-pointr-source="src/App.svelte:5:1" class="app">'
    );
    expect(result?.code).toContain(
      '<h1 data-pointr-source="src/App.svelte:6:3">Hello {name}</h1>'
    );
  });

  it("handles components and nested elements in Svelte", () => {
    const code = `<script>
  import Header from './Header.svelte';
  import Button from './Button.svelte';
</script>

<div>
  <Header title="Dashboard" />
  <section>
    <Button on:click={() => {}}>Submit</Button>
  </section>
</div>`;

    const result = transformSvelte(code, "/src/routes/Dashboard.svelte");
    expect(result?.code).toContain(
      '<div data-pointr-source="src/routes/Dashboard.svelte:6:1">'
    );
    expect(result?.code).toContain(
      '<Header data-pointr-source="src/routes/Dashboard.svelte:7:3" title="Dashboard" />'
    );
    expect(result?.code).toContain(
      '<section data-pointr-source="src/routes/Dashboard.svelte:8:3">'
    );
    expect(result?.code).toContain(
      '<Button data-pointr-source="src/routes/Dashboard.svelte:9:5" on:click'
    );
  });

  it("handles control flow blocks (if, each, await, key)", () => {
    const code = `<script>
  let items = ['a', 'b'];
  let promise = Promise.resolve(42);
</script>

{#if items.length > 0}
  <ul>
    {#each items as item}
      <li>{item}</li>
    {/each}
  </ul>
{:else}
  <p>Empty</p>
{/if}

{#await promise}
  <span>Loading...</span>
{:then value}
  <strong>{value}</strong>
{/await}`;

    const result = transformSvelte(code, "/src/List.svelte");
    expect(result?.code).toContain(
      '<ul data-pointr-source="src/List.svelte:7:3">'
    );
    expect(result?.code).toContain(
      '<li data-pointr-source="src/List.svelte:9:7">{item}</li>'
    );
    expect(result?.code).toContain(
      '<p data-pointr-source="src/List.svelte:13:3">Empty</p>'
    );
    expect(result?.code).toContain(
      '<span data-pointr-source="src/List.svelte:17:3">Loading...</span>'
    );
    expect(result?.code).toContain(
      '<strong data-pointr-source="src/List.svelte:19:3">{value}</strong>'
    );
  });

  it("handles dynamic svelte:element and svelte:component", () => {
    const code = `<script>
  let tag = 'h2';
  let MyComp = null;
</script>

<svelte:element data-pointr-source="custom.svelte:1:1" this={tag}>Dynamic</svelte:element>
<svelte:component this={MyComp}>Comp</svelte:component>`;

    const result = transformSvelte(code, "/src/Dynamic.svelte");
    expect(result?.code).toContain(
      '<svelte:element data-pointr-source="custom.svelte:1:1" this={tag}>'
    );
    expect(result?.code).toContain(
      '<svelte:component data-pointr-source="src/Dynamic.svelte:7:1" this={MyComp}>Comp</svelte:component>'
    );
  });

  it("skips special svelte tags like <svelte:head> and <slot>", () => {
    const code = `<svelte:head>
  <title>My App</title>
</svelte:head>

<div class="layout">
  <slot />
  <footer class="footer">Footer</footer>
</div>`;

    const result = transformSvelte(code, "/src/Layout.svelte");
    expect(result?.code).not.toContain("<svelte:head data-pointr-source");
    expect(result?.code).not.toContain("<slot data-pointr-source");
    expect(result?.code).toContain(
      '<div data-pointr-source="src/Layout.svelte:5:1" class="layout">'
    );
    expect(result?.code).toContain(
      '<footer data-pointr-source="src/Layout.svelte:7:3" class="footer">Footer</footer>'
    );
  });

  it("routes correctly via unified transform router", () => {
    const code = `<nav><a href="/">Home</a></nav>`;
    const result = transform(code, "/src/Nav.svelte");
    expect(result?.code).toContain('data-pointr-source="src/Nav.svelte:1:1"');
    expect(result?.code).toContain('data-pointr-source="src/Nav.svelte:1:6"');
  });

  it("returns null for non-svelte files", () => {
    expect(transformSvelte("export const foo = 1;", "/src/lib.ts")).toBeNull();
  });
});
