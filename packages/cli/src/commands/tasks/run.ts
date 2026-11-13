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

import type {PackageDependencyVerification} from '../../utils/package-dependency-verification.js';
import type {Task} from 'cfs-types';

import {Args, Flags} from '@oclif/core';

import {BaseCommand} from '../../utils/base-command.js';
import {
  CfsShellEnvProvider,
  checkIfFileExists,
  convertTrace
} from 'cfs-lib';
import {getSkippedPackageReasonMessage} from 'cfs-package-manager';
import {spawn, type StdioOptions} from 'node:child_process';
import {
  type WriteStream,
  createWriteStream,
  existsSync
} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import type {CliConfig} from '../../types/cli-config.js';

import {CliTaskProvider} from '../../providers/cli-task-provider.js';
import {verifyPackageDependenciesLocally} from '../../utils/package-dependency-verification.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {captureSerialOutput} from '../../utils/serial-capture.js';
import {readUserConfig} from '../../utils/utils.js';
import {
  getDependencyManifestCandidates,
  isWorkspaceRoot
} from '../../utils/workspace-utils.js';

const CTF_TRACE_START_TAG = Buffer.from('_zpl_ctf_start__');

export const tasksRunDeps: {
  getPackageManager: typeof getPackageManager;
  verifyPackageDependenciesLocally: typeof verifyPackageDependenciesLocally;
  getDependencyManifestCandidates: typeof getDependencyManifestCandidates;
} = {
  getPackageManager,
  verifyPackageDependenciesLocally,
  getDependencyManifestCandidates
};

// Generate a timestamp string for uniquely naming Zephyr output files
function timeStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}-${d.getHours()}${d.getMinutes()}${d.getSeconds()}`;
}

type ExecutedTask = {label: string; workspacePath: string};

export default class Run extends BaseCommand<typeof Run> {
  static aliases = ['task:run', 'tasks:run'];

  static args = {
    task: Args.string({
      description: 'The task to run.',
      required: true
    })
  };

  static description =
    'Run a task by label from a workspace/project context. By default, uses the current directory.';

  static useResponseEnvelope = true;

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
      default: process.cwd(),
      defaultHelp: async () => '.'
    }),
    project: Flags.string({
      char: 'p',
      summary:
        'The project id to run the task from (resolved relative to the workspace path)',
      required: false
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
      default: `zephyr_trace-${timeStamp()}.tef`,
      defaultHelp: async () => 'zephyr_trace-<timestamp>.tef'
    }),
    timeout: Flags.integer({
      summary:
        'Terminate serial capture after the given number of seconds. Requires --capture. Use 0 to capture indefinitely.',
      required: false,
      min: 0,
      dependsOn: ['capture']
    })
  };

  private buffer = Buffer.alloc(0);
  private ctfWriteStream: WriteStream | undefined;
  private executedTasks: ExecutedTask[] = [];
  private zephyrData = false;
  private zephyrMessagePrinted = false;

  async run(): Promise<{
    executed: ExecutedTask[];
  }> {
    const {args, flags} = this;

    if (flags.capture) {
      this.warn(
        `The --capture flag is deprecated and will be removed in a future release. Use "${this.config.bin} port capture" instead.`
      );
    }

    const workspacePath = path.resolve(
      flags.workspace ?? process.cwd()
    );

    // Convert the trace file path to an absolute path
    flags.zephyrTraceFile = path.resolve(flags.zephyrTraceFile);

    const discoveryPath =
      isWorkspaceRoot(workspacePath) && flags.project
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

    this.telemetryMetadata = {
      taskType: /build/i.test(args.task)
        ? 'build'
        : /flash/i.test(args.task)
          ? 'flash'
          : 'other',
      hasCapture: flags.capture ?? false,
      taskCount: matchingTasks.length
    };

    for (const task of matchingTasks) {
      const taskWorkspacePath =
        this.resolveTaskWorkspacePathForExecution(
          workspacePath,
          discoveryPath,
          task
        );

      await this.executeDependencies({
        task,
        tasks,
        workspacePath,
        discoveryPath,
        taskWorkspacePath,
        taskProvider,
        userConfig,
        verbose: flags.verbose,
        port: flags.port,
        project: flags.project,
        zephyrTraceFile: flags.zephyrTraceFile,
        chain: new Set([task.label])
      });

      await this.executeTask({
        task,
        workspacePath: taskWorkspacePath,
        taskProvider,
        userConfig,
        verbose: flags.verbose,
        capture: flags.capture ?? false,
        port: flags.port,
        project: flags.project,
        zephyrTraceFile: flags.zephyrTraceFile,
        timeout: flags.timeout
      });
    }

    return {executed: this.executedTasks};
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
    timeout?: number;
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
      zephyrTraceFile,
      timeout
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

    // The cfspkg git remote helper ships next to this command's bundle in
    // dist/git-remote; its directory is prepended to PATH so git/west spawned
    // by the task can resolve cfspkg:// URLs.
    const gitRemoteHelperDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'git-remote'
    );

    const taskEnv = shellEnvProvider.getBaseShellEnvironment(
      installedTools,
      {
        ...shellEnvOptions,
        gitRemoteHelperDir,
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
      zephyrTraceFile,
      timeout
    });
  }

  /**
   * Recursively execute a task's `dependsOn` chain depth-first, so that
   * dependencies of dependencies run before the task that requires them.
   * @param params - Dependency execution parameters.
   * @param params.task - Task whose dependencies should be executed.
   * @param params.tasks - All discovered tasks to resolve labels against.
   * @param params.workspacePath - Resolved workspace path from command flags.
   * @param params.discoveryPath - Path used for task discovery.
   * @param params.taskWorkspacePath - Execution folder of the dependent task.
   * @param params.taskProvider - Task provider with infrastructure components.
   * @param params.userConfig - Optional CLI user configuration.
   * @param params.chain - Labels already being resolved, used to detect cycles.
   * @returns Promise that resolves once all transitive dependencies have run.
   */
  private async executeDependencies(params: {
    task: Task.Definition;
    tasks: Task.Definition[];
    workspacePath: string;
    discoveryPath: string;
    taskWorkspacePath: string;
    taskProvider: CliTaskProvider;
    userConfig: CliConfig | undefined;
    verbose: boolean;
    port?: string;
    project?: string;
    zephyrTraceFile: string;
    chain: Set<string>;
  }): Promise<void> {
    const {task, tasks, workspacePath, discoveryPath, chain} = params;

    for (const depLabel of [task.dependsOn ?? []].flat()) {
      if (chain.has(depLabel)) {
        this.error(
          `Circular dependsOn detected for task "${task.label}".`,
          {code: 'TASK_CIRCULAR_DEPENDENCY'}
        );
      }

      const dep = this.resolveDependency({
        depLabel,
        task,
        tasks,
        workspacePath,
        discoveryPath,
        taskWorkspacePath: params.taskWorkspacePath
      });

      await this.executeDependencies({
        ...params,
        task: dep,
        chain: new Set(chain).add(depLabel)
      });

      await this.executeTask({
        task: dep,
        workspacePath: params.taskWorkspacePath,
        taskProvider: params.taskProvider,
        userConfig: params.userConfig,
        verbose: params.verbose,
        capture: false,
        port: params.port,
        project: params.project,
        zephyrTraceFile: params.zephyrTraceFile
      });
    }
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
        `Task "${label}" not found. Available tasks: ${available || 'none'}`,
        {code: 'TASK_NOT_FOUND'}
      );
    }

    return matchingTasks;
  }

  /**
   * Print captured subprocess error output under a label. In JSON mode it
   * goes to stderr so stdout carries only the final JSON document.
   * @param label - Heading shown before the output.
   * @param text - The error output to print.
   * @returns void
   */
  private writeErrorOutput(label: string, text: string): void {
    if (this.jsonEnabled()) {
      this.writeToStderr(`${label}\n${text}\n`);
    } else {
      this.log(label);
      this.log(text);
    }
  }

  /**
   * Write captured serial output. In JSON mode it goes to stderr so stdout
   * carries only the final JSON document.
   * @param data - Captured bytes to write.
   * @returns void
   */
  private writeCapturedOutput(data: Buffer): void {
    if (this.jsonEnabled()) {
      this.writeToStderr(data);
    } else {
      this.writeToStdout(data);
    }
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
      this.writeCapturedOutput(this.buffer);
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
            this.writeCapturedOutput(safe);
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
            `Unable to create ${zephyrTraceFile}: ${err.message}`,
            {code: 'TASK_TRACE_FILE_CREATE_FAILED'}
          );
        });

        this.log(
          'Zephyr board reset detected — discarding previous trace data.'
        );
      } else {
        // First occurrence — flush any pre-CTF bytes to stdout, then switch
        // to file mode.
        if (before.length > 0) {
          this.writeCapturedOutput(before);
        }

        this.zephyrData = true;
        this.ctfWriteStream = createWriteStream(zephyrTraceFile);
        this.ctfWriteStream.on('error', (err: Error) => {
          this.error(
            `Unable to create ${zephyrTraceFile}: ${err.message}`,
            {code: 'TASK_TRACE_FILE_CREATE_FAILED'}
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
   * Formats unmet packages from a dependency verification result into a
   * supplementary note appended to a task failure message.
   * @param result - The dependency verification result to summarize.
   * @returns The formatted annotation text.
   */
  private formatDependencyAnnotation(
    result: PackageDependencyVerification
  ): string {
    const lines = result.packages
      .filter((pkg) => pkg.status !== 'installed')
      .map((pkg) => {
        const constraint = `${pkg.name}/${pkg.requiredVersion}`;

        if (pkg.status === 'missing') {
          return `- ${constraint}: missing`;
        }

        if (pkg.status === 'version-mismatch') {
          return `- ${constraint}: installed version '${pkg.installedVersion}' does not satisfy the requirement`;
        }

        const reason = pkg.reasonCode
          ? ` (${getSkippedPackageReasonMessage(pkg.reasonCode)})`
          : '';
        return `- ${constraint}: unsupported on this platform${reason}`;
      });

    return [
      `This workspace has unmet package dependencies in '${result.manifestPath}':`,
      ...lines,
      `Run cfsutil validate dependencies '${result.manifestPath}' for complete details.`
    ].join('\n');
  }

  /**
   * Best-effort check for unmet workspace dependencies, used to annotate a
   * task failure. Never throws and never blocks task execution; any
   * manifest, package-manager, or verification failure is swallowed so it
   * cannot mask the original task error. Uses
   * {@link verifyPackageDependenciesLocally}, which only reads the local
   * package cache (`checkManifest()`/`list()`), never `getInstallPlan()` -
   * this guarantees no remote-registry round trip regardless of which
   * remotes are already configured locally, unlike `useRemotes: false` on
   * its own, which only skips remote *provider registration* and does not
   * stop `getInstallPlan()` from consulting already-configured remotes.
   * @param workspacePath - Path to search for workspace dependency
   * manifests. Only the workspace root manifest and the manifest of the
   * project containing this path are checked.
   * @returns A supplementary annotation, or `undefined` when there is
   * nothing to add.
   */
  private async getDependencyAnnotation(
    workspacePath: string
  ): Promise<string | undefined> {
    try {
      const manifestPaths = tasksRunDeps
        .getDependencyManifestCandidates(workspacePath)
        .filter((manifestPath) => existsSync(manifestPath));
      if (manifestPaths.length === 0) {
        return undefined;
      }

      const packageManager = await tasksRunDeps.getPackageManager({
        acceptUndefined: true
      });
      if (!packageManager) {
        return undefined;
      }

      const annotations: string[] = [];
      for (const manifestPath of manifestPaths) {
        try {
          const result =
            await tasksRunDeps.verifyPackageDependenciesLocally(
              manifestPath,
              packageManager
            );
          if (!result.valid) {
            annotations.push(this.formatDependencyAnnotation(result));
          }
        } catch {
          // Skip an unreadable manifest so other annotations survive.
        }
      }

      return annotations.length > 0
        ? annotations.join('\n\n')
        : undefined;
    } catch {
      return undefined;
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
   * @param params.workspacePath - Workspace path used to look up unmet
   * dependencies for the failure annotation.
   * @returns Never returns; always throws.
   */
  private async handleTaskFailure(params: {
    label: string;
    exitCode: number;
    captureHandle: {stop: () => Promise<void>} | undefined;
    verbose: boolean;
    stderrOutput: string;
    workspacePath: string;
  }): Promise<never> {
    const {
      label,
      exitCode,
      captureHandle,
      verbose,
      stderrOutput,
      workspacePath
    } = params;

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
      this.writeErrorOutput(
        'Task error output:',
        stderrOutput.trim()
      );
    }

    const annotation =
      await this.getDependencyAnnotation(workspacePath);

    this.error(
      `Task "${label}" failed with exit code ${exitCode}${annotation ? `\n\n${annotation}` : ''}`,
      {
        code: 'TASK_FAILED',
        exit: exitCode
      }
    );
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

    // ZEPHYR_BASE needs to be set for the conversion to resolve the Zephyr tooling.
    if (!taskEnv.ZEPHYR_BASE) {
      this.error(
        'Zephyr base directory is not set. Please set the ZEPHYR_BASE environment variable.'
      );
    }

    const cwd = options?.cwd ?? workspacePath;

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

    this.log(
      `Performing post-processing of the .ctf file. This may take a few moments...`
    );

    try {
      await convertTrace(ctfFile, taskEnv, {
        cwd,
        outputPath: zephyrTraceFile,
        ...(buildDirExists && {buildDir}),
        ...(zephyrElfExists && {zephyrElfPath}),
        ...(verbose && {
          onStdout: (chunk: string) =>
            (this.jsonEnabled()
              ? process.stderr
              : process.stdout
            ).write(chunk),
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
        this.writeErrorOutput(
          'Post-processing error output:',
          stderrOutput.trim()
        );
      }

      this.error(
        `Post-processing failed: ${error instanceof Error ? error.message : String(error)}`,
        {code: 'TASK_POST_PROCESSING_FAILED', exit: 1}
      );
    }

    this.log(
      `Zephyr output post-processing completed successfully and stored in ${zephyrTraceFile}.`
    );
  }

  /**
   * Resolve a `dependsOn` label to a concrete task, preferring one in the same
   * execution folder and falling back to the first match. Errors if none found.
   * @param params - Dependency resolution parameters.
   * @param params.depLabel - The dependency label declared in `dependsOn`.
   * @param params.task - The task that declared the dependency.
   * @param params.tasks - All discovered tasks to resolve the label against.
   * @param params.workspacePath - Resolved workspace path from command flags.
   * @param params.discoveryPath - Path used for task discovery.
   * @param params.taskWorkspacePath - Execution folder of the dependent task.
   * @returns The resolved dependency task.
   */
  private resolveDependency(params: {
    depLabel: string;
    task: Task.Definition;
    tasks: Task.Definition[];
    workspacePath: string;
    discoveryPath: string;
    taskWorkspacePath: string;
  }): Task.Definition {
    const {
      depLabel,
      task,
      tasks,
      workspacePath,
      discoveryPath,
      taskWorkspacePath
    } = params;

    const matchingDeps = tasks.filter((t) => t.label === depLabel);

    const dep =
      matchingDeps.find(
        (t) =>
          this.resolveTaskWorkspacePathForExecution(
            workspacePath,
            discoveryPath,
            t
          ) === taskWorkspacePath
      ) ?? matchingDeps[0];

    if (!dep) {
      this.error(
        `Dependency "${depLabel}" not found for task "${task.label}".`,
        {code: 'TASK_DEPENDENCY_NOT_FOUND'}
      );
    }

    return dep;
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
      this.error(`Task "${task.label}" has no command defined.`, {
        code: 'TASK_COMMAND_MISSING'
      });
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
      isWorkspaceRoot(workspacePath) &&
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
    timeout?: number;
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
      zephyrTraceFile,
      timeout
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

    let stdio: StdioOptions = ['ignore', 'pipe', 'pipe'];
    if (verbose) {
      // stdout joins stderr in JSON mode so it cannot corrupt the JSON document.
      stdio = this.jsonEnabled() ? ['inherit', 2, 2] : 'inherit';
    }

    const child = spawn(shell, [...shellArgs, command], {
      cwd,
      env: {...process.env, ...taskEnv},
      stdio,
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

    // Recorded rather than acted on immediately: 'close' fires after
    // 'error' for a failed spawn, so the exit-code wait below is the single
    // place that decides which failure message to report.
    let spawnError: Error | undefined;
    child.on('error', (err) => {
      spawnError = err;
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
      // Text mode keeps its historical silent return; JSON must not report success.
      if (this.jsonEnabled()) {
        this.error(`Task "${label}" was interrupted`, {
          code: 'TASK_INTERRUPTED',
          exit: 1
        });
      }

      return;
    }

    if (spawnError) {
      if (captureHandle) {
        try {
          await captureHandle.stop();
        } catch {
          /* ignore */
        }

        this.flushBuffer();
      }

      const annotation =
        await this.getDependencyAnnotation(workspacePath);

      this.error(
        `Failed to spawn task process: ${spawnError.message}${annotation ? `\n\n${annotation}` : ''}`,
        {
          code: 'TASK_SPAWN_FAILED',
          exit: 1
        }
      );
    }

    if (exitCode !== 0) {
      await this.handleTaskFailure({
        label,
        exitCode,
        captureHandle,
        verbose,
        stderrOutput,
        workspacePath
      });
    }

    this.log(`Task "${label}" completed successfully.`);
    this.executedTasks.push({label, workspacePath});

    // Although the task has finished, we're still capturing output from the board.
    // Wait for CTRL-C then post-process any Zephyr trace file.
    if (captureHandle) {
      await this.waitForCaptureStop(
        captureHandle,
        {
          options,
          taskEnv,
          verbose,
          workspacePath,
          ctfFile,
          zephyrTraceFile
        },
        timeout
      );
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
          this.error(`Serial port error: ${error.message}`, {
            code: 'TASK_SERIAL_PORT_ERROR'
          });
        },
        workspacePath,
        project,
        userConfig: undefined
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.error(`Failed to start serial capture\n${errorMessage}`, {
        code: 'TASK_SERIAL_CAPTURE_FAILED'
      });
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
   * @param timeout - Optional seconds after which capture stops automatically. 0 or undefined means we capture indefinitely.
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
    },
    timeout?: number
  ): Promise<void> {
    // A timeout of 0 (or undefined) means capture indefinitely until Ctrl+C.
    const hasTimeout = timeout !== undefined && timeout > 0;

    if (hasTimeout) {
      this.log(
        `Capturing for ${timeout} ${timeout === 1 ? 'second' : 'seconds'}. Press Ctrl+C to stop early.`
      );
    } else {
      this.log('Press Ctrl+C to stop capture.');
    }

    await new Promise<void>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;

      const stopCapture = async () => {
        process.removeListener('SIGINT', stopCapture);
        process.removeListener('SIGTERM', stopCapture);
        if (timer) {
          clearTimeout(timer);
        }

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

      if (hasTimeout) {
        timer = setTimeout(() => {
          this.log(
            `\nCapture timeout of ${timeout} ${timeout === 1 ? 'second' : 'seconds'} reached.`
          );
          void stopCapture();
        }, timeout * 1000);
      }
    });

    if (this.zephyrData && checkIfFileExists(zephyrParams.ctfFile)) {
      await this.processZephyrFile(zephyrParams);
    }
  }
}
