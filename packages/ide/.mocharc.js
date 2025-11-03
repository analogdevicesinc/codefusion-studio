 const grep = process.env.TEST_TAG || undefined;
module.exports = {
  timeout: 300000,
  bail: false,
  extension: ["js","ts"],
  grep: grep,
  require: ["ts-node/register"],
  watchExtensions: ["ts"],
  recursive: true,
  reporter: "../../custom-mocha-reporter.cjs",
  reporterOption: {
    output: "coverage/test-results.json"
  },
  retries: 2,
  "node-option": [
    "loader=ts-node/esm",
    "experimental-specifier-resolution=node"
  ]
};
