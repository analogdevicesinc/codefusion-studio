import fs from 'node:fs';
import path from 'node:path';

export function checkIfFileExists(filename: string | undefined) {
  if (!filename) {
    return false;
  }

  const filepath = path.isAbsolute(filename)
    ? filename
    : path.resolve(process.cwd(), filename);

  return fs.existsSync(filepath);
}

export function readJsonFile(filename: string) {
  try {
    const fileContent = fs.readFileSync(filename, 'utf8');
    return JSON.parse(fileContent);
  } catch {
    throw new Error(
      `The file: ${filename} is not a valid JSON file.`
    );
  }
}

/**
 * Returns a new object with the first letter of each top-level property lowercased.
 * Does not modify nested properties.
 * @param obj The object whose top-level property names will be lowercased.
 * @returns A new object with lowercased first letters for top-level property names.
 */
export function lowercaseFirstLetterProps<
  T extends Record<string, unknown>
>(obj: T): T {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj))
    return obj;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const newKey = key.charAt(0).toLowerCase() + key.slice(1);
    result[newKey] = obj[key];
  }

  return result as T;
}
