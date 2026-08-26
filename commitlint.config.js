module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'plugin',    // @pointr/vite-plugin
        'overlay',   // @pointr/overlay
        'mcp',       // @pointr/mcp-server
        'packager',  // @pointr/context-packager
        'init',      // @pointr/init
        'demo',      // apps/demo
        'landing',   // apps/landing
        'vscode',    // packages/vscode-extension
        'chrome',    // apps/chrome-extension
        'docs',      // documentation
        'ci',        // GitHub Actions / DevOps
        'release',   // versioning / changesets
        'deps',      // dependency updates
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'body-max-line-length': [1, 'always', 100],
  },
};

