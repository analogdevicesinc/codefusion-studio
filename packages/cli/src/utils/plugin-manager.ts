import {CfsPluginManager} from 'cfs-lib';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function getPluginManager(dirs?: string[]) {
  // default search paths
  const searchPaths = new Set([
    `${os.homedir()}/cfs/plugins`,
    path.resolve('../../Plugins')
  ]);

  if (Array.isArray(dirs)) {
    for (const dir of dirs) {
      searchPaths.add(dir);
    }
  }

  const existingSearchPaths = [...searchPaths].filter(
    (pluginDir) =>
      fs.existsSync(pluginDir) &&
      fs.lstatSync(pluginDir).isDirectory()
  );

  let pluginManager;

  try {
    pluginManager = new CfsPluginManager(existingSearchPaths);
  } catch (error) {
    throw new Error(
      `CfsPluginManager could not be instantiated.\n${error}`
    );
  }

  return pluginManager;
}
