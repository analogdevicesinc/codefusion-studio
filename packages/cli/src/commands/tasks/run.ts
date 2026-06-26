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

import type {Task} from 'cfs-types';

import {Args, Command, Flags} from '@oclif/core';
import {CfsShellEnvProvider, checkIfFileExists} from 'cfs-lib';
import {spawn} from 'node:child_process';
import {type WriteStream, createWriteStream} from 'node:fs';
import path from 'node:path';

import type {CliConfig} from '../../types/cli-config.js';

import {CliTaskProvider} from '../../providers/cli-task-provider.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {captureSerialOutput} from '../../utils/serial-capture.js';
import {readUserConfig} from '../../utils/utils.js';

const CTF_TRACE_START_TAG = Buffer.from('_zpl_ctf_start__');

// Generate a timestamp string for uniquely naming Zephyr output files
function timeStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}-${d.getHours()}${d.getMinutes()}${d.getSeconds()}`;
}

export default class Run extends Command {
  static aliases = ['task:run', 'tasks:run'];

  static args = {
    task: Args.string({
      description: 'The task to run.',
      required: true
    })
  };

  static description =
    'Run a task by label from a workspace/project context. By default, uses the current directory.';

  static override examples = [
    '<%= config.bin %> tasks run build',
    '<%= config.bin %> tasks run build --workspace my-workspace --project project1',
    '<%= config.bin %> tasks run build --workspace my-workspace',
    '<%= config.bin %> tasks run flash_run_JLink  -w my-workspace --capture --port COM4 --project m4'
  ];

  static override flags = {
    workspace: Flags.string({
      char: 'w',
      summary:
        'The workspace path used for task discovery. Defaults to the current directory',
      required: false,
      default: process.cwd()
    }),
    project: Flags.string({
      char: 'p',
      summary:
        'The project id to run the task from (resolved relative to the workspace path)',
      required: false
    }),
    verbose: Flags.boolean({
      char: 'v',
      summary: 'Enable verbose output',
      required: false,
      default: false
    }),
    capture: Flags.boolean({
      char: 'c',
      summary:
        'Capture serial port output after task execution. Capturing will continue until the process is terminated',
      required: false,
      dependsOn: ['port', 'project']
    }),
    port: Flags.string({
      summary:
        'Specify the serial port name (e.g., COM3, /dev/ttyUSB0). Used with --capture',
      required: false,
      dependsOn: ['capture']
    }),
    zephyrTraceFile: Flags.string({
      char: 'z',
      summary:
        'Trace Extended File for Zephyr-specific output (used with --capture)',
      required: false,
      default: `zephyr_trace-${timeStamp()}.tef`
    })
  };

  private buffer = Buffer.alloc(0);
  private ctfWriteStream: WriteStream | undefined;
  private zephyrData = false;
  private zephyrMessagePrinted = false;

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Run);
    const workspacePath = path.resolve(
      flags.workspace ?? process.cwd()
    );

    // Convert the trace file path to an absolute path
    flags.zephyrTraceFile = path.resolve(flags.zephyrTraceFile);

    const isWorkspaceRoot = checkIfFileExists(
      path.join(workspacePath, '.cfs')
    );

    const discoveryPath =
      isWorkspaceRoot && flags.project
        ? path.join(workspacePath, flags.project)
        : workspacePath;

    // Load user config
    const userConfig = readUserConfig(this.config) as
      | CliConfig
      | undefined;

    // Get package manager (async operation happens here, not in provider)
    const packageManager = await getPackageManager({
      acceptUndefined: true
    });

    // Create task provider with all infrastructure
    const taskProvider = new CliTaskProvider(
      discoveryPath,
      packageManager,
      userConfig
    );

    // Discover tasks
    const tasks = await taskProvider.fetchTasks(flags.project);

    // Find and execute task(s)
    const matchingTasks = this.findTasks(tasks, args.task);

    for (const task of matchingTasks) {
      const taskWorkspacePath =
        this.resolveTaskWorkspacePathForExecution(
          workspacePath,
          discoveryPath,
          task
        );

      await this.executeTask({
        task,
        workspacePath: taskWorkspacePath,
        taskProvider,
        userConfig,
        verbose: flags.verbose,
        capture: flags.capture ?? false,
        port: flags.port,
        project: flags.project,
        zephyrTraceFile: flags.zephyrTraceFile
      });
    }
  }

  /**
   * Execute a task: resolve variables, merge platform overrides, spawn process.
   * @param params - Task execution parameters.
   * @param params.task - Task definition to execute.
   * @param params.workspacePath - Absolute path to the workspace folder.
   * @param params.taskProvider - Task provider with infrastructure components.
   * @param params.userConfig - Optional CLI user configuration.
   * @returns Promise that resolves when task execution completes.
   */
  private async executeTask(params: {
    task: Task.Definition;
    workspacePath: string;
    taskProvider: CliTaskProvider;
    userConfig: CliConfig | undefined;
    verbose: boolean;
    capture: boolean;
    port?: string;
    project?: string;
    zephyrTraceFile: string;
  }): Promise<void> {
    const {
      task,
      workspacePath,
      taskProvider,
      userConfig,
      verbose,
      capture,
      port,
      project,
      zephyrTraceFile
    } = params;

    // Get infrastructure components from provider
    const variableResolver = taskProvider.getVariableResolver();
    const toolManager = taskProvider.getToolManager();

    // Set task's cwd as workspace folder for correct variable resolution.
    const taskCwd = task.options?.cwd ?? workspacePath;
    taskProvider.setVariableResolverWorkspaceFolder(taskCwd);

    const configResolver = taskProvider.getConfigResolver();
    configResolver.addProjectSettings(taskCwd);

    // Resolve variables in the task
    await variableResolver.resolveObjectVariables(
      task as unknown as Record<string, unknown>
    );

    // Merge platform overrides
    const {command, options} = this.resolvePlatformOverrides(task);
    const finalCommand =
      await variableResolver.resolveStringVariables(command);

    // Build base shell environment with tool paths and env vars
    const installedTools = await toolManager.getInstalledTools();
    const shellEnvOptions = await taskProvider.buildShellEnvOptions();
    const cfsEnvVars =
      await taskProvider.getCfsEnvironmentVariables();

    const shellEnvProvider = new CfsShellEnvProvider();
    const taskEnv = shellEnvProvider.getBaseShellEnvironment(
      installedTools,
      {
        ...shellEnvOptions,
        // cfs.environment vars are applied first; task-level env wins.
        additionalEnv: {...cfsEnvVars, ...options?.env}
      }
    );

    // Merge environments: base shell env (+ task env) → user config env (last wins).
    // PATH keys are prepended so tool discovery paths remain available.
    if (userConfig?.env) {
      this.mergeEnvironmentWithPathPrepend(taskEnv, userConfig.env);
    }

    // Spawn task process
    await this.spawnTask({
      label: task.label,
      command: finalCommand,
      workspacePath,
      options,
      taskEnv,
      verbose,
      capture,
      port,
      project,
      zephyrTraceFile
    });
  }

  /**
   * Find task(s) by label (case-insensitive). Throws error if none found.
   * @param tasks - Array of task definitions to search.
   * @param label - Task label to find.
   * @returns Matching task definitions.
   */
  private findTasks(
    tasks: Task.Definition[],
    label: string | undefined
  ): Task.Definition[] {
    if (!label) {
      this.error(
        'No tasks found for the specified workspace/project.'
      );
    }

    const matchingTasks = tasks.filter(
      (t) =>
        (t.userFriendlyName ?? t.label).toLowerCase() ===
        label.toLowerCase()
    );

    if (matchingTasks.length === 0) {
      const available = tasks
        .map((t) => t.userFriendlyName ?? t.label)
        .join(', ');
      this.error(
        `Task "${label}" not found. Available tasks: ${available || 'none'}`
      );
    }

    return matchingTasks;
  }

  /**
   * Flush any buffered serial output to the console or the CTF file.
   * @returns void
   */
  private flushBuffer(): void {
    if (this.zephyrData) {
      // Flush any remaining lookahead bytes to the file before closing.
      if (this.buffer.length > 0) {
        this.ctfWriteStream?.write(this.buffer);
        this.buffer = Buffer.alloc(0);
      }
    } else if (this.buffer.length > 0) {
      process.stdout.write(this.buffer);
      this.buffer = Buffer.alloc(0);
    }

    if (this.ctfWriteStream) {
      this.ctfWriteStream.end();
      this.ctfWriteStream = undefined;
    }
  }

  /**
   * Handle serial port data appropriately. If the Zephyr CTF start string is detected,
   * switch to writing all output to the Zephyr output file (if specified) instead of the console.
   * @param data - Data from the serial port.
   * @param zephyrTraceFile - Path to the Zephyr output file.
   * @returns void
   */
  private handleData(data: Buffer, zephyrTraceFile: string): void {
    // Accumulate incoming data so that we detect the CTF start tag, even if
    // it is split across two data chunks.
    this.buffer = Buffer.concat([this.buffer, data]);

    const ctfStartLen = CTF_TRACE_START_TAG.length;

    for (;;) {
      const idx = this.buffer.indexOf(CTF_TRACE_START_TAG);

      if (idx === -1) {
        // No complete start tag found — flush the safe prefix and retain the
        // last (ctfStartLen - 1) bytes as a lookahead for a split tag.
        const safeLength = Math.max(
          0,
          this.buffer.length - (ctfStartLen - 1)
        );
        if (safeLength > 0) {
          const safe = this.buffer.subarray(0, safeLength);
          if (this.zephyrData) {
            this.ctfWriteStream?.write(safe);
          } else {
            process.stdout.write(safe);
          }

          this.buffer = this.buffer.subarray(safeLength);
        }

        break;
      }

      const before = this.buffer.subarray(0, idx);

      if (this.zephyrData) {
        // The Zephyr flash_run task seems to cause several resets during flashing,
        // which can result in multiple start tags being emitted.
        // A second (or subsequent) CTF start tag means there has been a reset.
        // Destroy the current stream and open a fresh one so
        // the output file contains only data from the latest boot.
        this.ctfWriteStream?.destroy();
        this.ctfWriteStream = createWriteStream(zephyrTraceFile);
        this.ctfWriteStream.on('error', (err: Error) => {
          this.error(
            `Unable to create ${zephyrTraceFile}: ${err.message}`
          );
        });

        this.log(
          'Zephyr board reset detected — discarding previous trace data.'
        );
      } else {
        // First occurrence — flush any pre-CTF bytes to stdout, then switch
        // to file mode.
        if (before.length > 0) {
          process.stdout.write(before);
        }

        this.zephyrData = true;
        this.ctfWriteStream = createWriteStream(zephyrTraceFile);
        this.ctfWriteStream.on('error', (err: Error) => {
          this.error(
            `Unable to create ${zephyrTraceFile}: ${err.message}`
          );
        });

        if (!this.zephyrMessagePrinted) {
          // Only print the message once.
          this.log(
            `Zephyr CTF start tag detected. Redirecting output to ${zephyrTraceFile}.`
          );
          this.zephyrMessagePrinted = true;
        }
      }

      this.buffer = this.buffer.subarray(idx + ctfStartLen);
      // Loop to handle any additional start tags within the same chunk.
    }
  }

  /**
   * Handle task failure: stop serial capture, log stderr, and throw an error.
   * @param params - Failure handling parameters.
   * @param params.label - Task label for the error message.
   * @param params.exitCode - Exit code from the task process.
   * @param params.captureHandle - Active capture handle to stop, if any.
   * @param params.verbose - Whether verbose output is enabled.
   * @param params.stderrOutput - Accumulated stderr output from the task.
   * @returns Never returns; always throws.
   */
  private async handleTaskFailure(params: {
    label: string;
    exitCode: number;
    captureHandle: {stop: () => Promise<void>} | undefined;
    verbose: boolean;
    stderrOutput: string;
  }): Promise<never> {
    const {label, exitCode, captureHandle, verbose, stderrOutput} =
      params;

    // Clean up serial port on task failure. Swallow any stop() error so the
    // original task failure message is always shown.
    if (captureHandle) {
      try {
        await captureHandle.stop();
      } catch {
        // Ignore port-close errors — the task failure is the primary error.
      }

      this.flushBuffer();
    }

    if (!verbose && stderrOutput.trim()) {
      this.log('Task error output:');
      this.log(stderrOutput.trim());
    }

    this.error(`Task "${label}" failed with exit code ${exitCode}`, {
      exit: exitCode
    });
  }

  private mergeEnvironmentWithPathPrepend(
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

  private async processZephyrFile(params: {
    options: Task.Definition['options'] | undefined;
    taskEnv: Record<string, string>;
    verbose: boolean;
    workspacePath: string;
    ctfFile: string;
    zephyrTraceFile: string;
  }): Promise<void> {
    const {
      options,
      taskEnv,
      verbose,
      workspacePath,
      ctfFile,
      zephyrTraceFile
    } = params;
    const envFile =
      process.platform === 'win32'
        ? 'zephyr-env.cmd'
        : 'zephyr-env.sh';

    // ZEPHYR_BASE needs to be set so we can source the zephyr-env script
    if (!taskEnv.ZEPHYR_BASE) {
      this.error(
        'Zephyr base directory is not set. Please set the ZEPHYR_BASE environment variable.'
      );
    }

    const zephyrEnvPath = path.join(taskEnv.ZEPHYR_BASE, envFile);

    // Construct the command: execute zephyr-env.sh and west zpl-prepare-trace <zephyrTraceFile>
    const cwd = options?.cwd ?? workspacePath;
    const shell =
      process.platform === 'win32'
        ? (process.env.COMSPEC ?? 'cmd.exe')
        : '/bin/bash';
    const shellArgs =
      process.platform === 'win32' ? ['/d', '/c'] : ['-c'];

    const buildDir = path.resolve(workspacePath, 'build');
    const zephyrElfPath = path.resolve(
      workspacePath,
      'build',
      'zephyr',
      'zephyr.elf'
    );

    const buildDirExists = checkIfFileExists(buildDir);
    if (!buildDirExists) {
      this.warn(
        `Build directory not found at ${buildDir}. Trace conversion may fail. Please verify that the build output is present.`
      );
    }

    const zephyrElfExists = checkIfFileExists(zephyrElfPath);
    if (!zephyrElfExists) {
      this.warn(
        `Zephyr ELF file not found at ${zephyrElfPath}. Trace conversion may fail. Please verify that the ELF file is present.`
      );
    }

    const buildDirArg = buildDirExists
      ? ` --build-dir "${buildDir}"`
      : '';
    const zephyrElfArg = zephyrElfExists
      ? ` --zephyr-elf-path "${zephyrElfPath}"`
      : '';

    const westArgs = `west zpl-prepare-trace "${ctfFile}" -o "${zephyrTraceFile}"${buildDirArg}${zephyrElfArg}`;
    const command =
      process.platform === 'win32'
        ? `call "${zephyrEnvPath}" && ${westArgs}`
        : `source "${zephyrEnvPath}" && ${westArgs}`;

    const cppFiltPath = taskEnv.ZEPHYR_SDK_INSTALL_DIR
      ? path.join(
          taskEnv.ZEPHYR_SDK_INSTALL_DIR,
          'arm-zephyr-eabi',
          'bin',
          process.platform === 'win32'
            ? 'arm-zephyr-eabi-c++filt.exe'
            : 'arm-zephyr-eabi-c++filt'
        )
      : undefined;

    const spawnEnv = {...process.env, ...taskEnv};
    if (checkIfFileExists(cppFiltPath)) {
      spawnEnv.ZPL_DEMANGLE_CMD = cppFiltPath;
    }

    await new Promise<void>((resolve, reject) => {
      let stderrOutput = '';

      this.log(
        `Performing post-processing of the .ctf file. This may take a few moments...`
      );

      const child = spawn(shell, [...shellArgs, command], {
        cwd,
        env: spawnEnv,
        stdio: verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
        windowsVerbatimArguments:
          process.platform === 'win32' &&
          path.basename(shell).toLowerCase() === 'cmd.exe'
      });

      if (!verbose) {
        child.stdout?.on('data', () => {
          // Drain stdout without printing in non-verbose mode.
        });
      }

      child.stderr?.on('data', (chunk) => {
        stderrOutput += chunk.toString();
      });

      child.on('error', (err) => {
        reject(
          new Error(
            `Failed to spawn post-processing process: ${err.message}`
          )
        );
      });

      child.on('close', (code: null | number) => {
        if (code === 0) {
          this.log(
            `Zephyr output post-processing completed successfully and stored in ${zephyrTraceFile}.`
          );
          resolve();
        } else {
          if (!verbose && stderrOutput.trim()) {
            this.log('Post-processing error output:');
            this.log(stderrOutput.trim());
          }

          reject(
            new Error(
              `Post-processing failed with exit code ${code ?? 1}`
            )
          );
        }
      });
    });
  }

  /**
   * Resolve platform-specific overrides based on current OS.
   * @param task - Task definition with potential platform overrides.
   * @returns Resolved command and options.
   */
  private resolvePlatformOverrides(task: Task.Definition): {
    command: string;
    options?: Task.Definition['options'];
  } {
    const platformKey =
      process.platform === 'win32'
        ? 'windows'
        : process.platform === 'darwin'
          ? 'osx'
          : 'linux';

    const platformOverride = task[platformKey];

    const command = platformOverride?.command ?? task.command;
    const options = {
      ...task.options,
      ...platformOverride?.options
    };

    if (!command) {
      this.error(`Task "${task.label}" has no command defined.`);
    }

    return {command, options};
  }

  /**
   * Resolve the task execution cwd based on workspace/project context.
   * @param workspacePath - Resolved workspace path from command flags.
   * @param discoveryPath - Path used for task discovery.
   * @param task - Task currently being executed.
   * @returns Directory to use as execution context for this task.
   */
  private resolveTaskWorkspacePathForExecution(
    workspacePath: string,
    discoveryPath: string,
    task: Task.Definition
  ): string {
    // If discovery is already scoped to a specific project path,
    // execute from that same location.
    if (discoveryPath !== workspacePath) {
      return discoveryPath;
    }

    // If running from a workspace root and task has project context,
    // execute from the matching project directory.
    if (
      checkIfFileExists(path.join(workspacePath, '.cfs')) &&
      typeof task.projectId === 'string'
    ) {
      return path.join(workspacePath, task.projectId);
    }

    // Fallback to the discovery path (workspace/project cwd).
    return discoveryPath;
  }

  /**
   * Spawn the task process and wait for completion.
   * @param params - Task execution parameters.
   * @param params.label - Task label for logging.
   * @param params.command - Resolved command to execute.
   * @param params.workspacePath - Workspace folder path.
   * @param params.options - Task execution options.
   * @param params.taskEnv - Environment variables for task.
   * @param params.capture - Whether to capture serial port output.
   * @param params.port - Optional serial port name.
   * @param params.zephyrTraceFile - Optional file path for Zephyr-specific stdout output.
   * @returns Promise that resolves when process exits.
   */
  private async spawnTask(params: {
    label: string;
    command: string;
    workspacePath: string;
    options: Task.Definition['options'];
    taskEnv: Record<string, string>;
    verbose: boolean;
    capture: boolean;
    port?: string;
    project?: string;
    zephyrTraceFile: string;
  }): Promise<void> {
    const {
      label,
      command,
      workspacePath,
      options,
      taskEnv,
      verbose,
      capture,
      port,
      project,
      zephyrTraceFile
    } = params;

    this.log(`Running task: ${label}`);

    const shell =
      options?.shell?.executable ??
      (process.platform === 'win32' ? 'cmd.exe' : '/bin/bash');
    const shellArgs =
      options?.shell?.args ??
      (process.platform === 'win32' ? ['/d', '/c'] : ['-c']);
    const cwd = options?.cwd ?? workspacePath;

    const zephyrTraceFileBase = zephyrTraceFile.endsWith('.tef')
      ? zephyrTraceFile.slice(0, -4)
      : zephyrTraceFile;
    const ctfFile = `${zephyrTraceFileBase}.ctf`;

    // Open the serial port before spawning the task so that no trace data
    // emitted during device boot is missed while the port is still closed.
    let captureHandle: {stop: () => Promise<void>} | undefined;

    if (capture && port && project) {
      captureHandle = await this.startSerialCapture({
        port,
        project,
        workspacePath,
        ctfFile
      });
    }

    let stderrOutput = '';

    const child = spawn(shell, [...shellArgs, command], {
      cwd,
      env: {...process.env, ...taskEnv},
      stdio: verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      windowsVerbatimArguments:
        process.platform === 'win32' &&
        path.basename(shell).toLowerCase() === 'cmd.exe'
    });

    if (!verbose) {
      child.stdout?.on('data', () => {
        // Drain stdout without printing in non-verbose mode.
      });
    }

    child.stderr?.on('data', (chunk) => {
      stderrOutput += chunk.toString();
    });

    child.on('error', async (err) => {
      if (captureHandle) {
        try {
          await captureHandle.stop();
        } catch {
          /* ignore */
        }

        this.flushBuffer();
      }

      this.error(`Failed to spawn task process: ${err.message}`, {
        exit: 1
      });
    });

    const ac = new AbortController();

    const cleanup = async () => {
      if (captureHandle) {
        this.log('\nClosing serial port...');
        await captureHandle.stop();
        this.flushBuffer();
      }

      ac.abort();
      child.kill();
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    const exitCode = await new Promise<number>((resolve) => {
      child.on('close', (code: null | number) => resolve(code ?? 1));
      ac.signal.addEventListener('abort', () => resolve(-1));
    });

    process.removeListener('SIGINT', cleanup);
    process.removeListener('SIGTERM', cleanup);

    // Interrupted by signal — cleanup already ran
    if (exitCode === -1) {
      return;
    }

    if (exitCode !== 0) {
      await this.handleTaskFailure({
        label,
        exitCode,
        captureHandle,
        verbose,
        stderrOutput
      });
    }

    this.log(`Task "${label}" completed successfully.`);

    // Although the task has finished, we're still capturing output from the board.
    // Wait for CTRL-C then post-process any Zephyr trace file.
    if (captureHandle) {
      await this.waitForCaptureStop(captureHandle, {
        options,
        taskEnv,
        verbose,
        workspacePath,
        ctfFile,
        zephyrTraceFile
      });
    }
  }

  /**
   * Open the serial port and begin capturing output.
   * Resets Zephyr capture state before starting.
   * @param params - Serial capture parameters.
   * @param params.port - Serial port name (e.g., COM3, /dev/ttyUSB0).
   * @param params.project - Project folder name, used by the capture utility.
   * @param params.workspacePath - Absolute path to the workspace root.
   * @param params.ctfFile - File path for Zephyr CTF binary output.
   * @returns Handle with a stop() method to close the port.
   */
  private async startSerialCapture(params: {
    port: string;
    project: string;
    workspacePath: string;
    ctfFile: string;
  }): Promise<{stop: () => Promise<void>}> {
    const {port, project, workspacePath, ctfFile} = params;

    this.log(`Starting serial capture on ${port}.`);

    // Reset capture state for this run
    this.zephyrData = false;
    this.zephyrMessagePrinted = false;
    this.buffer = Buffer.alloc(0);
    this.ctfWriteStream = undefined;

    try {
      return await captureSerialOutput({
        portName: port,
        onData: (line: Buffer) => {
          this.handleData(line, ctfFile);
        },
        onError: (error: Error) => {
          this.error(`Serial port error: ${error.message}`);
        },
        workspacePath,
        project,
        userConfig: undefined
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.error(`Failed to start serial capture\n${errorMessage}`);
    }
  }

  /**
   * Wait for the user to press Ctrl+C after the task completes, stop the
   * serial capture, flush buffered output, and post-process any Zephyr trace.
   * @param captureHandle - The active capture handle to stop on signal.
   * @param zephyrParams - Parameters for optional Zephyr post-processing.
   * @param zephyrParams.options - Task options (used for shell/cwd resolution).
   * @param zephyrParams.taskEnv - Resolved task environment variables.
   * @param zephyrParams.verbose - Whether verbose output is enabled.
   * @param zephyrParams.workspacePath - Absolute path to the workspace root.
   * @param zephyrParams.ctfFile - Path to the captured CTF binary file.
   * @param zephyrParams.zephyrTraceFile - Output path for the generated TEF file.
   * @returns Promise that resolves when capture has stopped and post-processing is complete.
   */
  private async waitForCaptureStop(
    captureHandle: {stop: () => Promise<void>},
    zephyrParams: {
      options: Task.Definition['options'];
      taskEnv: Record<string, string>;
      verbose: boolean;
      workspacePath: string;
      ctfFile: string;
      zephyrTraceFile: string;
    }
  ): Promise<void> {
    this.log('Press Ctrl+C to stop capture.');

    await new Promise<void>((resolve) => {
      const stopCapture = async () => {
        process.removeListener('SIGINT', stopCapture);
        process.removeListener('SIGTERM', stopCapture);
        this.log('\nClosing serial port...');
        try {
          await captureHandle.stop();
        } finally {
          this.flushBuffer();
          resolve();
        }
      };

      process.on('SIGINT', stopCapture);
      process.on('SIGTERM', stopCapture);
    });

    if (this.zephyrData && checkIfFileExists(zephyrParams.ctfFile)) {
      await this.processZephyrFile(zephyrParams);
    }
  }
}
