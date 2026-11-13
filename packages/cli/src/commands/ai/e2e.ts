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

import type {CfsAiProfilingData} from 'cfs-types';

import {Flags} from '@oclif/core';
import {readFileSync} from 'node:fs';
import path from 'node:path';

import {
  ensureOrTryInferCoreFlags,
  getAndEnsureDataModel
} from '../../utils/ai-command-utils.js';
import {BaseCommand} from '../../utils/base-command.js';
import {getSocCatalog} from '../../utils/catalog-manager.js';
import {getDataModelManager} from '../../utils/data-model-manager.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {RecoverableError} from '../../utils/recoverable-error.js';
import {preserveTelemetrySession} from '../../utils/telemetry-session.js';
import {
  findSocByName,
  getCfsConfig,
  getPackageName
} from '../../utils/utils.js';
import {sanitizeTaskLabel} from '../../utils/workspace-utils.js';
import type {PortCaptureResult} from '../port/capture.js';
import {portListDeps} from '../port/list.js';

export default class E2E extends BaseCommand<typeof E2E> {
  static description =
    'Full end-to-end workflow for ai model inference';

  static examples: string[] = [
    '<%= config.bin %> <%= command.id %> --soc MAX32690 --board EvKit_V1 --model model.tflite --debugger JLink --port /dev/ttyUSB0'
  ];

  static flags = {
    soc: Flags.string({
      char: 's',
      summary: 'Target SoC',
      required: true
    }),
    core: Flags.string({
      char: 'c',
      summary: 'Target core',
      required: false
    }),
    board: Flags.string({
      required: true,
      summary: 'Board name'
    }),
    model: Flags.string({
      char: 'm',
      summary: 'Path or URL to a model file',
      required: true
    }),
    dataset: Flags.string({
      required: false,
      summary: 'Path or URL to the sample dataset for the model'
    }),
    output: Flags.string({
      char: 'o',
      required: false,
      summary:
        'Output path for new workspace (excluding workspace name)',
      default: '.'
    }),
    name: Flags.string({
      required: false,
      summary:
        'Name for new workspace, defaults to: ws.soc.core.timestamp'
    }),
    'skip-compat': Flags.boolean({
      required: false,
      default: false,
      summary: 'Skip the model compatibility check'
    }),
    'run-profiler': Flags.boolean({
      required: false,
      default: false,
      summary: 'Run static profiling analysis'
    }),
    debugger: Flags.string({
      char: 'd',
      summary:
        'Debugger to use for flash & run after build e.g. JLink, CMSIS-DAP',
      required: true,
      options: ['JLink', 'CMSIS-DAP']
    }),
    'search-path': Flags.string({
      char: 'x',
      summary:
        'Additional search path for templates and data models. Can be used multiple times',
      multiple: true
    }),
    port: Flags.string({
      summary:
        'Specify the serial port name (e.g., COM3, /dev/ttyUSB0)',
      required: true
    }),
    timeout: Flags.integer({
      summary:
        'Terminate serial capture after the given number of seconds. Use 0 to capture indefinitely.',
      min: 0,
      default: 20
    }),
    'create-reports': Flags.boolean({
      required: false,
      default: true,
      allowNo: true,
      summary:
        'Convert the captured TEF traces into CodeFusion Studio reports. Enabled by default; use --no-create-reports to skip. Only supported by workspaces that output CTF traces'
    })
  };

  async run() {
    const {flags, config} = this;

    if (this.jsonEnabled()) {
      throw new RecoverableError(
        `JSON output is not currently supported.`,
        {
          suggestion: 'Run without --format JSON'
        }
      );
    }

    const catalog = await getSocCatalog(config, false);
    const socs = await catalog.getAll();
    const soc = findSocByName(socs, flags.soc);

    if (!soc) {
      throw new RecoverableError(
        `SoC '${flags.soc}' not found in catalog`,
        {
          suggestion: 'Verify the SoC name is correct',
          run: 'cfsutil socs list'
        }
      );
    }

    const ports = await portListDeps.listPorts();

    if (ports.length === 0) {
      throw new RecoverableError('No serial ports found', {
        suggestion: 'Ensure a device is connected via USB'
      });
    }

    const availablePorts = ports.map((port) => port.path);

    if (!availablePorts.includes(flags.port)) {
      throw new RecoverableError(
        'Invalid port supplied, use one of the below or ensure your device is connected',
        {
          suggestion: availablePorts.join(', ')
        }
      );
    }

    const errors: string[] = [];
    const packageName = await getPackageName(
      this.config,
      flags.board,
      flags.soc,
      errors
    );

    if (!packageName && errors.length > 0) {
      this.error(errors[0]);
    }

    const packageManager = await getPackageManager({
      acceptUndefined: true
    });

    const dmManager = await getDataModelManager(
      config,
      packageManager,
      flags['search-path']
    );

    const dataModel = await getAndEnsureDataModel(
      flags.soc,
      packageName as string,
      dmManager
    );

    ensureOrTryInferCoreFlags(flags, dataModel, []);

    const coreFlags: string[] = [
      '--soc',
      flags.soc,
      '--core',
      flags.core,
      '--model',
      flags.model,
      ...(flags['search-path']?.flatMap((v) => [
        '--search-path',
        v
      ]) ?? []),
      ...(flags.verbose && !this.jsonEnabled() ? ['--verbose'] : []),
      ...(flags.quiet || this.jsonEnabled() ? ['--quiet'] : [])
    ];

    if (!flags['skip-compat']) {
      this.log('Running model compatibility checks...');
      await preserveTelemetrySession(() =>
        this.config.runCommand('ai:compat', [
          '--package',
          packageName as string,
          ...coreFlags,
          ...(flags.dataset ? ['--dataset', flags.dataset] : [])
        ])
      );

      if (process.exitCode !== 0) {
        this.warn('add --skip-compat to ignore compatibility check.');
        this.exit(1);
      }
    }

    flags.name =
      flags.name ??
      `ws.${flags.soc}.${flags.core}.${Math.floor(Date.now() / 1000)}`.toLowerCase();

    if (flags['run-profiler']) {
      this.log('Running model profiling checks...');
      const reportFile = path.join(
        flags.output,
        `${flags.name}.cfsreport`
      );
      await preserveTelemetrySession(() =>
        this.config.runCommand('ai:profile', [
          '--package',
          packageName as string,
          ...coreFlags,
          `--report-file`,
          reportFile
        ])
      );
      this.log('Profiling report generated at: ', reportFile);
    }

    await preserveTelemetrySession(() =>
      this.config.runCommand('ai:workspace:create', [
        ...coreFlags,
        '--name',
        flags.name as string,
        '--output',
        flags.output,
        '--board',
        flags.board,
        ...(flags.dataset ? ['--dataset', flags.dataset] : []),
        '--skip-compat'
      ])
    );

    const workspacePath = path.join(flags.output, flags.name);
    const aiprofPath = path.join(
      workspacePath,
      '.cfs',
      'ai.cfsaiprof'
    );

    let aiprof: CfsAiProfilingData;

    try {
      aiprof = JSON.parse(readFileSync(aiprofPath, 'utf8'));
    } catch {
      this.error(
        `Could not read Hardware Profiling info at ${aiprofPath}.`
      );
    }

    const core = aiprof.Cores?.[0] ?? flags.core;
    const {config: cfsConfig} = getCfsConfig(workspacePath);
    const coreProject = cfsConfig.Projects.find(
      (p) => p.CoreId.toLowerCase() === core.toLowerCase()
    );
    if (!coreProject) {
      this.error(`No project found for core '${core}'.`);
    }
    const project = String(
      coreProject.PlatformConfig?.ProjectName || coreProject.ProjectId
    );
    this.log(`Found project: ${project}`);

    const flashRunTaskName = aiprof.Debuggers[flags.debugger];

    if (!flashRunTaskName) {
      throw new RecoverableError(
        `Debugger '${flags.debugger}' not found`,
        {
          suggestion: `Available debuggers: ${Object.keys(aiprof.Debuggers).join(', ')}`
        }
      );
    }

    const captureFormat =
      aiprof.Output.Format === 'TEXT' ? 'txt' : 'ctf';

    // Reports are created from TEF files, which are only produced by
    // converting captured CTF traces, so they are skipped for text traces.
    const createReports =
      flags['create-reports'] && captureFormat === 'ctf';

    // port:capture and tasks:run run in parallel, so a single wrapper
    // restores the session once both have finished.
    const captureResult = await preserveTelemetrySession(() =>
      this.flashAndCapture({
        workspacePath,
        project,
        captureFormat,
        flashRunTaskName
      })
    );

    if (createReports) {
      await this.createReports(captureResult);
    }
  }

  /**
   * Flash and run the project while capturing its serial output.
   * @param params - Capture and flash settings.
   * @param params.workspacePath - Path of the generated workspace.
   * @param params.project - Project id within the workspace.
   * @param params.captureFormat - Format to capture the output in.
   * @param params.flashRunTaskName - Task that flashes and runs the project.
   * @returns The result of the `port capture` command.
   */
  private async flashAndCapture(params: {
    workspacePath: string;
    project: string;
    captureFormat: 'ctf' | 'txt';
    flashRunTaskName: string;
  }): Promise<PortCaptureResult> {
    const {flags} = this;
    const {workspacePath, project, captureFormat, flashRunTaskName} =
      params;

    // Start capturing before flashing so that no output emitted during
    // device boot is missed. The capture runs without its own timeout and
    // is stopped through SIGINT, which it listens for, so the timeout
    // can start once flashing has finished.
    const capture = this.config.runCommand('port:capture', [
      '--port',
      flags.port,
      '-w',
      workspacePath,
      '--project',
      project,
      '--capture-format',
      captureFormat,
      ...(captureFormat === 'ctf' ? ['--convert'] : []),
      ...(flags.quiet || this.jsonEnabled() ? ['--quiet'] : [])
    ]);
    // Mark a rejection as handled while flashing is in progress, so an
    // early capture failure (e.g. busy port) does not crash the CLI as an
    // unhandled rejection. The error still propagates via `await capture`.
    capture.catch(() => {});
    const stopCapture = () => process.emit('SIGINT');

    this.log(`Flashing & running with ${flags.debugger}...`);
    try {
      await this.config.runCommand('tasks:run', [
        sanitizeTaskLabel(flashRunTaskName),
        '-w',
        workspacePath,
        '--project',
        project,
        ...(flags.quiet || this.jsonEnabled() ? ['--quiet'] : [])
      ]);
    } catch (error) {
      stopCapture();
      await capture.catch(() => {});
      throw error;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (flags.timeout > 0) {
      this.log(
        `Capturing for ${flags.timeout} ${flags.timeout === 1 ? 'second' : 'seconds'}.`
      );
      timer = setTimeout(() => {
        this.log(
          `\nCapture timeout of ${flags.timeout} ${flags.timeout === 1 ? 'second' : 'seconds'} reached.`
        );
        stopCapture();
      }, flags.timeout * 1000);
    }

    try {
      return (await capture) as PortCaptureResult;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Convert the TEF files produced by the capture into reports.
   * @param captureResult - The result of the `port capture` command.
   */
  private async createReports(
    captureResult: PortCaptureResult
  ): Promise<void> {
    const {flags} = this;
    const tefFiles = captureResult.convertedFiles.map(
      ({tefFile}) => tefFile
    );
    if (tefFiles.length === 0) {
      this.warn(
        'No TEF traces were captured, so no reports were created.'
      );
      return;
    }

    this.log('Creating reports...');
    for (const tefFile of tefFiles) {
      await preserveTelemetrySession(() =>
        this.config.runCommand('convert', [
          '--input',
          tefFile,
          ...(flags.quiet || this.jsonEnabled() ? ['--quiet'] : [])
        ])
      );
    }
  }
}
