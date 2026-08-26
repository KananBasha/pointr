import { transform } from "./transform";

export default function pointrLoader(this: any, source: string) {
  const callback = this.async();
  try {
    const result = transform(source, this.resourcePath);
    if (result) {
      callback(null, result.code, result.map);
    } else {
      callback(null, source);
    }
  } catch (err) {
    callback(err);
  }
}
