import {type CfsDataModelManager, CfsPluginManager} from 'cfs-lib';
import {CfsPackageManagerProvider} from 'cfs-package-manager';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
/**
 * Helper function to get a new instance of the CfsPluginManager
 *
 * @param {CfsDataModelManager} dmManager - Datamodel manager
 * @param {string[]} [dirs] - List of dirs to be added in the search paths
 * @param {CfsPackageManagerProvider} [pkgManager] - Package manager
 * @returns {CfsPluginManager} - CfsPluginManager
 */
export function getPluginManager(
  dmManager: CfsDataModelManager,
  dirs?: string[],
  pkgManager?: CfsPackageManagerProvider
): CfsPluginManager {
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
    pluginManager = new CfsPluginManager(dmManager, pkgManager, {
      pluginsCustomSearchPaths: existingSearchPaths
    });
  } catch (error) {
    throw new Error(
      `CfsPluginManager could not be instantiated.\n${error}`
    );
  }

  return pluginManager;
}
