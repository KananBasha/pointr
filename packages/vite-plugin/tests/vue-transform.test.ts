import { describe, it, expect } from "vitest";
import { transformVue } from "../src/transformers/vue";
import { transform } from "../src/transform";

describe("Pointr Vue SFC Transformer", () => {
  it("injects data-pointr-source into Vue template HTML elements", () => {
    const code = `<template>
  <div class="container">
    <h1>Hello Vue</h1>
  </div>
</template>`;

    const result = transformVue(code, "/src/App.vue");
    expect(result).not.toBeNull();
    expect(result?.code).toContain('data-pointr-source="src/App.vue:2:3"');
    expect(result?.code).toContain('data-pointr-source="src/App.vue:3:5"');
  });

  it("handles components vs native tags in Vue template", () => {
    const code = `<template>
  <main>
    <CustomHeader title="Welcome" />
    <my-component :count="42"></my-component>
  </main>
</template>`;

    const result = transformVue(code, "/src/views/Home.vue");
    expect(result?.code).toContain(
      '<main data-pointr-source="src/views/Home.vue:2:3">'
    );
    expect(result?.code).toContain(
      '<CustomHeader data-pointr-source="src/views/Home.vue:3:5" title="Welcome" />'
    );
    expect(result?.code).toContain(
      '<my-component data-pointr-source="src/views/Home.vue:4:5" :count="42">'
    );
  });

  it("handles nested elements and directives (v-if, v-for, v-model)", () => {
    const code = `<template>
  <div>
    <ul v-if="items.length > 0">
      <li v-for="(item, index) in items" :key="index">
        <input v-model="item.text" />
      </li>
    </ul>
    <p v-else>No items found</p>
  </div>
</template>`;

    const result = transformVue(code, "/src/components/ItemList.vue");
    expect(result?.code).toContain(
      '<ul data-pointr-source="src/components/ItemList.vue:3:5" v-if="items.length > 0">'
    );
    expect(result?.code).toContain(
      '<li data-pointr-source="src/components/ItemList.vue:4:7" v-for="(item, index) in items"'
    );
    expect(result?.code).toContain(
      '<input data-pointr-source="src/components/ItemList.vue:5:9" v-model="item.text" />'
    );
    expect(result?.code).toContain(
      '<p data-pointr-source="src/components/ItemList.vue:8:5" v-else>No items found</p>'
    );
  });

  it("skips <template> and <slot> wrappers while tagging their children", () => {
    const code = `<template>
  <div class="card">
    <template v-if="hasHeader">
      <header>Header content</header>
    </template>
    <slot name="body" />
  </div>
</template>`;

    const result = transformVue(code, "/src/components/Card.vue");
    expect(result?.code).not.toContain("<template data-pointr-source");
    expect(result?.code).not.toContain("<slot data-pointr-source");
    expect(result?.code).toContain(
      '<header data-pointr-source="src/components/Card.vue:4:7">Header content</header>'
    );
  });

  it("preserves script setup and style blocks", () => {
    const code = `<template>
  <button @click="count++">Count: {{ count }}</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const count = ref(0);
</script>

<style scoped>
button { color: red; }
</style>`;

    const result = transformVue(code, "/src/Counter.vue");
    expect(result?.code).toContain(
      '<button data-pointr-source="src/Counter.vue:2:3" @click="count++">'
    );
    expect(result?.code).toContain("import { ref } from 'vue';");
    expect(result?.code).toContain("button { color: red; }");
  });

  it("does not duplicate existing data-pointr-source attributes", () => {
    const code = `<template>
  <div data-pointr-source="existing.vue:1:1">
    <span>Item</span>
  </div>
</template>`;

    const result = transformVue(code, "/src/Existing.vue");
    expect(result?.code).toContain(
      '<div data-pointr-source="existing.vue:1:1">'
    );
    expect(result?.code).not.toContain(
      'data-pointr-source="src/Existing.vue:2:3"'
    );
    expect(result?.code).toContain(
      '<span data-pointr-source="src/Existing.vue:3:5">'
    );
  });

  it("routes correctly via unified transform router", () => {
    const code = `<template><section><h1>Hello</h1></section></template>`;
    const result = transform(code, "/src/App.vue");
    expect(result?.code).toContain('data-pointr-source="src/App.vue:1:11"');
    expect(result?.code).toContain('data-pointr-source="src/App.vue:1:20"');
  });

  it("returns null for non-vue files or files without template", () => {
    expect(transformVue("const x = 1;", "/src/app.ts")).toBeNull();
    expect(
      transformVue("<script setup>const x = 1;</script>", "/src/app.vue")
    ).toBeNull();
  });
});
