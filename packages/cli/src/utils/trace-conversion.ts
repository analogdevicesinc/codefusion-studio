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

import {
  CfsShellEnvProvider,
  checkIfFileExists,
  convertTrace
} from 'cfs-lib';
import path from 'node:path';

import type {CliTaskProvider} from '../providers/cli-task-provider.js';
import type {CliConfig} from '../types/cli-config.js';

/**
 * Merge `additionalEnv` into `env` in place. `PATH` values are prepended to
 * the existing `PATH` so tool discovery paths remain available; all other
 * keys overwrite.
 * @param env - Environment to merge into.
 * @param additionalEnv - Environment variables to merge.
 */
export function mergeEnvironmentWithPathPrepend(
  env: Record<string, string>,
  additionalEnv: Record<string, string>
): void {
  for (const [key, value] of Object.entries(additionalEnv)) {
    if (key.toUpperCase() === 'PATH') {
      const composedPath = String(env.PATH ?? '');
      env.PATH = composedPath
        ? `${value}${path.delimiter}${composedPath}`
        : value;
      continue;
    }

    env[key] = value;
  }
}

/**
 * Build the shell environment used to run tasks and tools: installed tool
 * paths, `cfs.environment` variables, `additionalEnv` and finally the user
 * config environment (last wins, `PATH` is prepended).
 * @param params - Environment build parameters.
 * @param params.taskProvider - Task provider with infrastructure components.
 * @param params.userConfig - Optional CLI user configuration.
 * @param params.additionalEnv - Extra variables (e.g. task-level env) applied
 * after `cfs.environment`.
 * @returns The resolved shell environment.
 */
export async function buildShellEnvironment(params: {
  taskProvider: CliTaskProvider;
  userConfig: CliConfig | undefined;
  additionalEnv?: Record<string, string>;
}): Promise<Record<string, string>> {
  const {taskProvider, userConfig, additionalEnv} = params;

  const installedTools = await taskProvider
    .getToolManager()
    .getInstalledTools();
  const shellEnvOptions = await taskProvider.buildShellEnvOptions();
  const cfsEnvVars = await taskProvider.getCfsEnvironmentVariables();

  const env = new CfsShellEnvProvider().getBaseShellEnvironment(
    installedTools,
    {
      ...shellEnvOptions,
      // cfs.environment vars are applied first; additional env wins.
      additionalEnv: {...cfsEnvVars, ...additionalEnv}
    }
  );

  if (userConfig?.env) {
    mergeEnvironmentWithPathPrepend(env, userConfig.env);
  }

  return env;
}

/**
 * Convert a captured Zephyr CTF trace to TEF using the Zephyr build output
 * of the given project.
 * @param params - Conversion parameters.
 * @param params.ctfFile - Path to the captured CTF trace.
 * @param params.tefFile - Output path for the TEF file. Defaults to the CTF
 * path with a `.tef` extension.
 * @param params.env - Shell environment; must contain `ZEPHYR_BASE`.
 * @param params.projectPath - Project folder containing the `build` output.
 * @param params.cwd - Working directory for the conversion. Defaults to
 * `projectPath`.
 * @param params.verbose - Stream conversion output when `true`.
 * @param params.log - Logger for progress messages.
 * @param params.warn - Logger for warnings.
 * @returns Path to the generated TEF file.
 * @throws Error when `ZEPHYR_BASE` is missing or the conversion fails.
 */
export async function convertCtfToTef(params: {
  ctfFile: string;
  tefFile?: string;
  env: Record<string, string>;
  projectPath: string;
  cwd?: string;
  verbose: boolean;
  log: (message: string) => void;
  warn: (message: string) => void;
}): Promise<string> {
  const {ctfFile, tefFile, env, projectPath, verbose, log, warn} =
    params;

  // ZEPHYR_BASE needs to be set for the conversion to resolve the Zephyr tooling.
  if (!env.ZEPHYR_BASE) {
    throw new Error(
      'Zephyr base directory is not set. Please set the ZEPHYR_BASE environment variable.'
    );
  }

  const buildDir = path.resolve(projectPath, 'build');
  const zephyrElfPath = path.resolve(
    buildDir,
    'zephyr',
    'zephyr.elf'
  );

  const buildDirExists = checkIfFileExists(buildDir);
  if (!buildDirExists) {
    warn(
      `Build directory not found at ${buildDir}. Trace conversion may fail. Please verify that the build output is present.`
    );
  }

  const zephyrElfExists = checkIfFileExists(zephyrElfPath);
  if (!zephyrElfExists) {
    warn(
      `Zephyr ELF file not found at ${zephyrElfPath}. Trace conversion may fail. Please verify that the ELF file is present.`
    );
  }

  log(
    `Performing post-processing of the .ctf file. This may take a few moments...`
  );

  try {
    return await convertTrace(ctfFile, env, {
      cwd: params.cwd ?? projectPath,
      ...(tefFile && {outputPath: tefFile}),
      ...(buildDirExists && {buildDir}),
      ...(zephyrElfExists && {zephyrElfPath}),
      ...(verbose && {
        onStdout: (chunk: string) => process.stdout.write(chunk),
        onStderr: (chunk: string) => process.stderr.write(chunk)
      })
    });
  } catch (error) {
    const stderrOutput =
      error instanceof Error &&
      'stderr' in error &&
      typeof error.stderr === 'string'
        ? error.stderr
        : '';

    if (!verbose && stderrOutput.trim()) {
      log('Post-processing error output:');
      log(stderrOutput.trim());
    }

    throw new Error(
      `Post-processing failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
