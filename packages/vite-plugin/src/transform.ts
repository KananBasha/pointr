import { transformJSX } from "./transformers/jsx";
import { transformVue } from "./transformers/vue";
import { transformSvelte } from "./transformers/svelte";

export { transformJSX } from "./transformers/jsx";
export { transformVue } from "./transformers/vue";
export { transformSvelte } from "./transformers/svelte";

export function transform(
  code: string,
  id: string,
  rootDir: string = process.cwd()
): { code: string; map: any } | null {
  const cleanId = id.split("?")[0] ?? "";

  if (cleanId.match(/\.[jt]sx$/)) {
    return transformJSX(code, id, rootDir);
  }

  if (cleanId.endsWith(".vue")) {
    return transformVue(code, id, rootDir);
  }

  if (cleanId.endsWith(".svelte")) {
    return transformSvelte(code, id, rootDir);
  }

  return null;
}
