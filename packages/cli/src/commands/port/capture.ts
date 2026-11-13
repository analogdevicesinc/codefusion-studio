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
import {Flags} from '@oclif/core';

import {BaseCommand} from '../../utils/base-command.js';
import {
  type RecordingFormat,
  type SerialSourceConfig,
  Recording
} from 'cfs-lib';
import path from 'node:path';

import type {CliConfig} from '../../types/cli-config.js';

import {CliTaskProvider} from '../../providers/cli-task-provider.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {resolveSerialSourceConfig} from '../../utils/serial-capture.js';
import {
  buildShellEnvironment,
  convertCtfToTef
} from '../../utils/trace-conversion.js';
import {readUserConfig} from '../../utils/utils.js';
import {isWorkspaceRoot} from '../../utils/workspace-utils.js';

/**
 * Build the shell environment needed to convert traces of a project.
 * @param projectPath - Absolute path of the project folder.
 * @param userConfig - Optional CLI user configuration.
 * @returns The resolved shell environment.
 */
async function getConversionEnvironment(
  projectPath: string,
  userConfig: CliConfig | undefined
): Promise<Record<string, string>> {
  const packageManager = await getPackageManager({
    acceptUndefined: true
  });
  const taskProvider = new CliTaskProvider(
    projectPath,
    packageManager,
    userConfig
  );
  taskProvider.setVariableResolverWorkspaceFolder(projectPath);
  taskProvider.getConfigResolver().addProjectSettings(projectPath);

  return buildShellEnvironment({taskProvider, userConfig});
}

export const portCaptureDeps: {
  resolveSerialSourceConfig: typeof resolveSerialSourceConfig;
  getConversionEnvironment: typeof getConversionEnvironment;
  convertCtfToTef: typeof convertCtfToTef;
} = {
  resolveSerialSourceConfig,
  getConversionEnvironment,
  convertCtfToTef
};

/**
 * Data returned by `port capture`, wrapped in the JSON response envelope.
 */
export interface PortCaptureResult {
  capturedFiles: string[];
  convertedFiles: {ctfFile: string; tefFile: string}[];
}

export default class Capture extends BaseCommand<typeof Capture> {
  static description =
    'Capture data from a connected board into trace files.';

  static override examples = [
    '<%= config.bin %> <%= command.id %> --port /dev/ttyUSB0',
    '<%= config.bin %> <%= command.id %> --port COM3 --capture-dir ./traces --capture-format txt --timeout 30',
    '<%= config.bin %> <%= command.id %> --port COM3 --workspace my-workspace --project m4 --convert'
  ];

  static flags = {
    port: Flags.string({
      char: 'p',
      summary: 'The serial port to capture from (e.g., COM3)',
      required: true
    }),
    'capture-dir': Flags.string({
      summary:
        'The folder to write trace files into. File names are generated automatically. Defaults to the current directory',
      required: false,
      default: process.cwd()
    }),
    'capture-format': Flags.string({
      summary:
        'The capture format. "ctf" waits for a Zephyr CTF start tag and starts a new file on every start tag (board reset); "txt" writes the raw output from the first byte',
      required: false,
      options: ['ctf', 'txt'],
      default: 'ctf'
    }),
    timeout: Flags.integer({
      summary:
        'Stop capturing after the given number of seconds. Use 0 to capture until the process is terminated',
      required: false,
      min: 0
    }),
    convert: Flags.boolean({
      summary:
        'Convert captured CTF traces to TEF after capturing. Requires --project and the Zephyr build output of the project. Only valid with --capture-format ctf',
      required: false,
      default: false
    }),
    workspace: Flags.string({
      char: 'w',
      summary:
        'The workspace path, used to read serial settings and to locate build output for --convert. Defaults to the current directory',
      required: false,
      default: process.cwd()
    }),
    project: Flags.string({
      summary:
        'The project id within the workspace, used to read serial settings and to locate build output for --convert',
      required: false
    })
  };

  static hidden = true; // Hide this command from the help output for now.

  static useResponseEnvelope = true;

  public async run(): Promise<PortCaptureResult> {
    const {flags} = this;
    const format = flags['capture-format'] as RecordingFormat;

    if (flags.convert && format !== 'ctf') {
      this.error(
        '--convert can only be used with --capture-format ctf.',
        {code: 'CONVERT_REQUIRES_CTF_FORMAT'}
      );
    }

    this.telemetryMetadata = {
      captureFormat: format,
      convert: flags.convert,
      hasTimeout: (flags.timeout ?? 0) > 0
    };

    const workspacePath = path.resolve(flags.workspace);
    const projectPath =
      flags.project && isWorkspaceRoot(workspacePath)
        ? path.join(workspacePath, flags.project)
        : undefined;

    if (flags.convert && !projectPath) {
      this.error(
        '--convert requires a project. Use --workspace and --project to select the project whose build output is used for the conversion.',
        {code: 'CONVERT_REQUIRES_PROJECT'}
      );
    }
    const outputFolder = path.resolve(flags['capture-dir']);

    const source = this.resolveSource(
      flags.port,
      workspacePath,
      flags.project
    );

    let recording: Recording;
    try {
      recording = await Recording.start({
        source,
        outputFolder,
        format
      });
    } catch (error) {
      this.error(
        `Failed to start capture on ${flags.port}: ${error instanceof Error ? error.message : String(error)}`,
        {code: 'CAPTURE_START_FAILED'}
      );
    }

    this.log(
      `Capturing ${format} data from ${flags.port} into ${outputFolder}.`
    );
    if (format === 'ctf') {
      this.log('Waiting for the CTF trace start tag...');
    }

    const recordingError = await this.waitForStop(
      recording,
      flags.timeout
    );

    this.log('\nClosing port...');
    await recording.dispose();

    this.reportCapturedFiles(recording, format);

    if (recordingError) {
      this.error(`Capture error: ${recordingError.message}`, {
        code: 'CAPTURE_FAILED'
      });
    }

    const convertedFiles =
      flags.convert && projectPath
        ? await this.convertCapturedFiles(
            recording.capturedFiles,
            projectPath,
            // Streamed conversion output would corrupt the JSON envelope.
            flags.verbose && !this.jsonEnabled()
          )
        : [];

    return {
      capturedFiles: recording.capturedFiles,
      convertedFiles
    };
  }

  /**
   * Convert all captured CTF files to TEF.
   * @param files - Captured trace files.
   * @param projectPath - Project folder containing the Zephyr build output.
   * @param verbose - Stream conversion output when `true`.
   * @returns The converted CTF files and their generated TEF files.
   */
  private async convertCapturedFiles(
    files: string[],
    projectPath: string,
    verbose: boolean
  ): Promise<PortCaptureResult['convertedFiles']> {
    const ctfFiles = files.filter((file) => file.endsWith('.ctf'));
    if (ctfFiles.length === 0) {
      return [];
    }

    const userConfig = readUserConfig(this.config) as
      | CliConfig
      | undefined;

    try {
      const env = await portCaptureDeps.getConversionEnvironment(
        projectPath,
        userConfig
      );

      const convertedFiles: PortCaptureResult['convertedFiles'] = [];
      for (const ctfFile of ctfFiles) {
        const tefFile = await portCaptureDeps.convertCtfToTef({
          ctfFile,
          env,
          projectPath,
          verbose,
          log: (message) => this.log(message),
          warn: (message) => this.warn(message)
        });
        this.log(`Converted ${ctfFile} to ${tefFile}.`);
        convertedFiles.push({ctfFile, tefFile});
      }

      return convertedFiles;
    } catch (error) {
      this.error(
        error instanceof Error ? error.message : String(error),
        {code: 'TRACE_CONVERSION_FAILED'}
      );
    }
  }

  /**
   * Log the files written by the recording.
   * @param recording - The stopped recording.
   * @param format - The capture format that was used.
   */
  private reportCapturedFiles(
    recording: Recording,
    format: RecordingFormat
  ): void {
    const files = recording.capturedFiles;

    if (files.length === 0) {
      this.warn(
        format === 'ctf'
          ? 'No CTF trace start tag was received, so no trace file was written. Use --capture-format txt to capture raw output.'
          : 'No trace file was written.'
      );
      return;
    }

    this.log(`Captured ${recording.bytesRecorded} bytes into:`);
    for (const file of files) {
      this.log(`  ${file}`);
    }
  }

  /**
   * Build the serial source config, using the project serial settings from
   * the workspace `.cfsconfig` when a project is given.
   * @param port - The serial port.
   * @param workspacePath - Absolute workspace path.
   * @param project - Optional project id.
   * @returns The serial source config.
   */
  private resolveSource(
    port: string,
    workspacePath: string,
    project: string | undefined
  ): SerialSourceConfig {
    try {
      return portCaptureDeps.resolveSerialSourceConfig(port, {
        workspacePath,
        project
      });
    } catch (error) {
      this.error(
        error instanceof Error ? error.message : String(error),
        {code: 'SERIAL_SETTINGS_INVALID'}
      );
    }
  }

  /**
   * Wait until the capture should stop: Ctrl+C / SIGTERM, the optional
   * timeout, or a recording error (e.g. device disconnect).
   * @param recording - The active recording.
   * @param timeout - Optional seconds after which capture stops. 0 or
   * undefined means capture until terminated.
   * @returns The recording error that ended the capture, if any.
   */
  private async waitForStop(
    recording: Recording,
    timeout: number | undefined
  ): Promise<Error | undefined> {
    const hasTimeout = timeout !== undefined && timeout > 0;

    if (hasTimeout) {
      this.log(
        `Capturing for ${timeout} ${timeout === 1 ? 'second' : 'seconds'}. Press Ctrl+C to stop early.`
      );
    } else {
      this.log('Press Ctrl+C to stop capture.');
    }

    return new Promise<Error | undefined>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;

      const finish = (error?: Error) => {
        process.removeListener('SIGINT', onSignal);
        process.removeListener('SIGTERM', onSignal);
        if (timer) {
          clearTimeout(timer);
        }

        resolve(error);
      };

      const onSignal = () => finish();

      process.on('SIGINT', onSignal);
      process.on('SIGTERM', onSignal);
      recording.onError((error) => finish(error));

      if (hasTimeout) {
        timer = setTimeout(() => {
          this.log(
            `\nCapture timeout of ${timeout} ${timeout === 1 ? 'second' : 'seconds'} reached.`
          );
          finish();
        }, timeout * 1000);
      }
    });
  }
}
