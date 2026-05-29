const fs = require('node:fs');
const path = require('node:path');

const mode = process.argv[2];
const cwd = process.cwd();
const payload = {
  cwd,
  label: process.env.TASK_LABEL,
  config: process.env.RESOLVED_CONFIG,
  env: process.env.RESOLVED_ENV,
  folder: process.env.RESOLVED_FOLDER,
  home: process.env.RESOLVED_HOME,
  separator: process.env.RESOLVED_SEPARATOR
};

if (mode === 'capture') {
  const outputFile = path.join(
    cwd,
    process.env.TASK_OUTPUT_FILE || 'task-output.json'
  );

  fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2));
  console.log(`captured:${payload.label}`);
  process.exit(0);
}

if (mode === 'print-success') {
  console.log(`runner:${path.basename(cwd)}:${payload.label}`);
  process.exit(0);
}

if (mode === 'fail') {
  console.error(`runner-error:${payload.label}`);
  process.exit(3);
}

console.error(`unknown-mode:${mode}`);
process.exit(2);
