/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

interface ParsedConfigOptions {
  [name: string]: string[] | string;
}

export function parseConfigurationOptions(
  output: string
): ParsedConfigOptions {
  const result: ParsedConfigOptions = {};
  const lines = output.split('\n');

  const startIndex = lines.findIndex(
    (line) => line.trim() === 'Configuration Options:'
  );
  if (startIndex === -1) return result;

  let i = startIndex + 1;
  while (i < lines.length) {
    const line = lines[i];

    if (!line.startsWith(' ') || line.startsWith('   ')) {
      // Indented lines are textarea values (handled below)
      // Non-indented lines mean we've left the options block
      if (!line.startsWith(' ')) break;
      i++;
      continue;
    }

    const trimmed = line.trimStart();

    // textarea: "Name:" followed by indented lines
    if (trimmed.endsWith(':')) {
      const name = trimmed.slice(0, -1);
      const values: string[] = [];
      i++;
      while (i < lines.length && lines[i].startsWith('   ')) {
        values.push(lines[i].trim());
        i++;
      }
      result[name] = values;
      continue;
    }

    // array or boolean: "Name: val1, val2" or "Name: True/False"
    const colonIdx = trimmed.indexOf(': ');
    if (colonIdx !== -1) {
      const name = trimmed.slice(0, colonIdx);
      const valuesStr = trimmed.slice(colonIdx + 2);
      if (valuesStr === 'True/False') {
        result[name] = ['True', 'False'];
      } else {
        result[name] = valuesStr.split(', ');
      }
      i++;
      continue;
    }

    // simple string property: just "Name"
    result[trimmed] = '';
    i++;
  }

  return result;
}
