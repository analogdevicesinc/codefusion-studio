const fs = require('node:fs');
const path = require('node:path');

const mode = process.argv[2];
const cwd = process.cwd();

if (mode === 'print-success') {
  console.log(
    `runner:${path.basename(cwd)}:${process.env.TASK_LABEL}`
  );
  process.exit(0);
}

if (mode === 'fail') {
  fs.writeFileSync(
    path.join(cwd, 'fail-task-ran.txt'),
    process.env.TASK_LABEL || 'unknown'
  );
  console.error(`runner-error:${process.env.TASK_LABEL}`);
  process.exit(3);
}

console.error(`unknown-mode:${mode}`);
process.exit(2);
