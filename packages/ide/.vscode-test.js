const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig([
  {
    label: 'unitTests',
    files: 'out/tests/unit/**/*.test.js',
    workspaceFolder: './sampleWorkspace',
    mocha: {
      ui: 'bdd',
      timeout: 60000
    }
  }
]);
