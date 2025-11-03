import type {Config} from '@oclif/core';

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

/**
 * Get data model search paths included in user custom configuration.
 * @param config - The configuration object from oclif
 * @returns Array containing all data model search paths
 */
export function getDataModelSearchPaths(config: Config): string[] {
  const searchPaths: Set<string> = new Set<string>();

  try {
    const configPath = path.join(config.configDir, 'config.json');

    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const userConfig = JSON.parse(configContent);
      if (
        userConfig.dataModelSearchPaths &&
        Array.isArray(userConfig.dataModelSearchPaths)
      ) {
        // validate each path before adding
        for (const p of userConfig.dataModelSearchPaths as string[]) {
          if (typeof p === 'string' && p.trim() !== '') {
            const resolvedPath = path.isAbsolute(p)
              ? p
              : path.resolve(process.cwd(), p);
            if (fs.existsSync(resolvedPath)) {
              searchPaths.add(resolvedPath);
            } else {
              console.warn(
                `Warning: Search path "${resolvedPath}" does not exist.`
              );
            }
          }
        }
      }
    }
  } catch {
    // Silently continue if config file doesn't exist or can't be read
  }

  return [...searchPaths];
}
