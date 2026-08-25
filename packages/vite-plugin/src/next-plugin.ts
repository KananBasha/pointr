export function withPointr(nextConfig: any = {}) {
  return {
    ...nextConfig,
    webpack(config: any, options: any) {
      if (options.dev) {
        // Just stub for now as we don't have a webpack plugin built yet
        // The instructions ask for the Next.js wrapper but pointr() is a Vite plugin.
        // For Babel transform in Webpack, we would inject a loader.
      }
      
      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, options);
      }
      
      return config;
    },
  };
}
