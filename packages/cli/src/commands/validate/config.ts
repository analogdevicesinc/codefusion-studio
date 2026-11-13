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
import {
  CfsConfigError,
  type CheckDiagnostic,
  isErrorSeverity
} from 'cfs-lib';
import {existsSync, readdirSync} from 'node:fs';
import path from 'node:path';

import {BaseCommand} from '../../utils/base-command.js';
import {validateCfsConfigFile} from '../../utils/config-validation.js';
import {RecoverableError} from '../../utils/recoverable-error.js';
import {checkErrors} from '../../utils/workspace-utils.js';

/**
 * The kinds of configuration document the command can discover. Only
 * `.cfsconfig` files are checked against a schema (via {@link CfsConfigValidator});
 * `.cfsworkspace` support is reported as not yet implemented.
 */
type ConfigKind = 'cfsconfig' | 'cfsworkspace';

/** A single document to check, paired with its kind. */
interface CheckTarget {
  kind: ConfigKind;
  path: string;
}

/** The outcome of checking one target. */
interface CheckOutcome {
  diagnostics: CheckDiagnostic[];
  kind: ConfigKind;
  path: string;
  valid: boolean;
}

/**
 * Determine the document kind from a file's extension.
 * @param file - The file path or name.
 * @returns The matching {@link ConfigKind}.
 * @throws A RecoverableError when the extension is not recognised.
 */
function kindFromExtension(file: string): ConfigKind {
  if (file.endsWith('.cfsconfig')) {
    return 'cfsconfig';
  }

  if (file.endsWith('.cfsworkspace')) {
    return 'cfsworkspace';
  }

  throw new RecoverableError(`Unsupported file type: '${file}'.`, {
    suggestion: 'Provide a .cfsconfig file.'
  });
}

export default class ValidateConfig extends BaseCommand<
  typeof ValidateConfig
> {
  static description =
    'Validate a CFS workspace or a standalone .cfsconfig file against the schema.';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --workspace ./my-workspace',
    '<%= config.bin %> <%= command.id %> --input ./my.cfsconfig',
    '<%= config.bin %> <%= command.id %> -w ./my-workspace -v'
  ];

  static flags = {
    workspace: Flags.directory({
      char: 'w',
      required: false,
      exclusive: ['input'],
      summary:
        'Path to the CFS workspace. Defaults to the current directory.'
    }),
    input: Flags.file({
      char: 'i',
      required: false,
      exists: true,
      exclusive: ['workspace'],
      summary: 'Path to a standalone .cfsconfig file.'
    }),
    'search-path': Flags.string({
      char: 's',
      summary:
        'Specify additional search path. Can be used multiple times.',
      multiple: true // Allows multiple values
    })
  };

  async run(): Promise<{
    results: CheckOutcome[];
    valid: boolean;
  }> {
    const {flags} = this;

    const targets = flags.input
      ? [this.targetFromInput(flags.input)]
      : this.targetsFromWorkspace(
          path.resolve(flags.workspace ?? process.cwd()),
          flags.verbose
        );

    const results = await Promise.all(
      targets.map((target) => this.checkTarget(target, flags.verbose))
    );

    const valid = results.every((result) => result.valid);

    this.telemetryMetadata = {
      isValid: valid,
      targetCount: results.length,
      diagnosticCount: results.reduce(
        (n, r) => n + r.diagnostics.length,
        0
      )
    };

    if (!valid) {
      process.exitCode = 1;
    }

    // Route validation errors through oclif's error handling so the output
    // matches other commands (for example `workspace configure`). Skipped in
    // JSON mode so the structured result is returned to callers instead.
    if (!this.jsonEnabled()) {
      checkErrors(
        this.collectErrorMessages(results, flags.verbose),
        this
      );
    }

    return {valid, results};
  }

  /**
   * Load and validate a `.cfsconfig` file through the shared
   * {@link validateCfsConfigFile} helper (which loads the data model and
   * runs the `CfsConfigValidator` checks). Failures that make the file unusable (a
   * missing file or invalid JSON) are reported as fatal CLI errors. Schema
   * violations are reported as per-property diagnostics so the source of every
   * problem is clear.
   * @param filePath - The `.cfsconfig` file to check.
   * @returns The diagnostics for the file.
   */
  private async checkCfsConfig(
    filePath: string
  ): Promise<CheckDiagnostic[]> {
    try {
      const {diagnostics} = await validateCfsConfigFile(
        filePath,
        this.config,
        this.flags['search-path']
      );
      return diagnostics;
    } catch (error) {
      if (error instanceof CfsConfigError) {
        // Schema violations carry per-property diagnostics. Report them like
        // any other finding so the detailed, per-file output is preserved.
        if (error.code === 'SCHEMA_INVALID') {
          return error.diagnostics;
        }

        // A file that cannot be read or parsed cannot be checked at all.
        // Report the shared message through oclif so the output matches
        // other commands.
        return this.error(error.message);
      }

      throw error;
    }
  }

  /**
   * Produce the advisory reported for a `.cfsworkspace` file. No
   * `.cfsworkspace` schema or checkers exist yet, so an `info` diagnostic is
   * returned rather than failing.
   * @returns A single advisory diagnostic.
   */
  private checkCfsWorkspace(): CheckDiagnostic[] {
    return [
      {
        severity: 'info',
        ruleId: 'workspace',
        message:
          'Skipped. .cfsworkspace checking is not yet implemented.'
      }
    ];
  }

  /**
   * Read, check and (unless JSON output is enabled) print the result for a
   * single target. `.cfsconfig` files are loaded and validated through the
   * shared {@link validateCfsConfigFile} helper which allows multiple
   * commands to use the same mechanism. `.cfsworkspace` files are reported
   * as not yet implemented.
   * @param target - The file and kind to check.
   * @param verbose - Whether to print extra detail.
   * @returns The outcome for this target.
   */
  private async checkTarget(
    target: CheckTarget,
    verbose: boolean
  ): Promise<CheckOutcome> {
    if (verbose && !this.jsonEnabled()) {
      this.log(`Found configuration file '${target.path}'.`);
    }

    const diagnostics =
      target.kind === 'cfsconfig'
        ? await this.checkCfsConfig(target.path)
        : this.checkCfsWorkspace();

    const valid = !diagnostics.some((diagnostic) =>
      isErrorSeverity(diagnostic.severity)
    );

    if (!this.jsonEnabled()) {
      this.printResult(target.path, valid, diagnostics, verbose);
    }

    return {
      path: target.path,
      kind: target.kind,
      valid,
      diagnostics
    };
  }

  /**
   * Collect the error-severity diagnostics from every outcome as a flat list
   * of formatted messages suitable for {@link checkErrors}. Each message is
   * prefixed with its file path so the source of every error is always clear.
   * @param results - The outcomes for all checked targets.
   * @param verbose - Whether to fold offending and allowed values into each
   * message.
   * @returns The formatted error messages, or an empty array when none apply.
   */
  private collectErrorMessages(
    results: CheckOutcome[],
    verbose: boolean
  ): string[] {
    const messages: string[] = [];

    for (const result of results) {
      for (const diagnostic of result.diagnostics) {
        if (!isErrorSeverity(diagnostic.severity)) {
          continue;
        }

        const detail = this.formatDiagnostic(diagnostic, verbose);
        messages.push(`${result.path}: ${detail}`);
      }
    }

    return messages;
  }

  /**
   * Render a single diagnostic as one line, optionally folding the offending
   * and allowed values into the message when verbose output is requested.
   * @param diagnostic - The diagnostic to format.
   * @param verbose - Whether to include the offending and allowed values.
   * @returns The formatted single-line message.
   */
  private formatDiagnostic(
    diagnostic: CheckDiagnostic,
    verbose: boolean
  ): string {
    if (!verbose) {
      return diagnostic.message;
    }

    const parts: string[] = [];

    if ('value' in diagnostic) {
      parts.push(`found: ${JSON.stringify(diagnostic.value)}`);
    }

    if (diagnostic.allowedValues) {
      parts.push(
        `allowed values: ${diagnostic.allowedValues
          .map((value) => JSON.stringify(value))
          .join(', ')}`
      );
    }

    return parts.length > 0
      ? `${diagnostic.message} (${parts.join('; ')})`
      : diagnostic.message;
  }

  /**
   * Print a labelled group of diagnostics, skipping the group entirely
   * when it is empty.
   * @param label - The section heading (for example `Errors`).
   * @param diagnostics - The diagnostics belonging to this group.
   * @param verbose - Whether to also print the offending and allowed
   * values for each diagnostic.
   * @returns Nothing.
   */
  private printDiagnostics(
    label: string,
    diagnostics: CheckDiagnostic[],
    verbose: boolean
  ): void {
    if (diagnostics.length === 0) {
      return;
    }

    this.log(`${label}:`);

    for (const diagnostic of diagnostics) {
      this.log(`  - ${diagnostic.message}`);

      if (verbose) {
        if ('value' in diagnostic) {
          this.log(
            `      Found: ${JSON.stringify(diagnostic.value)}`
          );
        }

        if (diagnostic.allowedValues) {
          this.log(
            `      Allowed values: ${diagnostic.allowedValues
              .map((value) => JSON.stringify(value))
              .join(', ')}`
          );
        }
      }
    }
  }

  /**
   * Print the success line and the non-fatal (warning and info) diagnostic
   * groups for one file. Error-severity diagnostics are reported separately
   * via {@link checkErrors} once every target has been checked.
   * @param filePath - The file that was checked.
   * @param valid - Whether the file passed (no error-severity diagnostics).
   * @param diagnostics - The diagnostics to report.
   * @param verbose - Whether to also print offending and allowed values.
   * @returns Nothing.
   */
  private printResult(
    filePath: string,
    valid: boolean,
    diagnostics: CheckDiagnostic[],
    verbose: boolean
  ): void {
    if (valid) {
      this.log(`'${filePath}' is valid.`);
    }

    // Errors are reported together via `this.error` after every target has
    // been checked, so only the non-fatal groups are printed here.
    const warnings = diagnostics.filter(
      (diagnostic) => diagnostic.severity === 'warning'
    );
    const info = diagnostics.filter(
      (diagnostic) => diagnostic.severity === 'info'
    );

    this.printDiagnostics('Warnings', warnings, verbose);
    this.printDiagnostics('Info', info, verbose);
  }

  /**
   * Build a check target from a standalone file, inferring its kind from
   * the file extension.
   * @param input - The file path supplied via `--input`.
   * @returns The resolved check target.
   */
  private targetFromInput(input: string): CheckTarget {
    const resolved = path.resolve(input);

    return {path: resolved, kind: kindFromExtension(resolved)};
  }

  /**
   * Discover the checkable files in a workspace: the `.cfsconfig` file and,
   * at a later time, the `.cfsworkspace` file, both under the `.cfs` folder.
   * The code to deal with the `.cfsworkspace` file is currently commented out.
   * @param workspacePath - The resolved workspace directory.
   * @param verbose - Whether to log discovery progress.
   * @returns The targets found in the workspace.
   * @throws A RecoverableError when the `.cfs` folder or files are missing.
   */
  private targetsFromWorkspace(
    workspacePath: string,
    verbose: boolean
  ): CheckTarget[] {
    if (verbose && !this.jsonEnabled()) {
      this.log(`Checking workspace at '${workspacePath}'.`);
    }

    const cfsDir = path.join(workspacePath, '.cfs');
    if (!existsSync(cfsDir)) {
      throw new RecoverableError(
        `No '.cfs' directory found in workspace '${workspacePath}'.`,
        {
          suggestion:
            'Ensure the path points to a valid CFS workspace.',
          run: `${this.config.bin} validate config --workspace <path>`
        }
      );
    }

    const targets: CheckTarget[] = [];

    const cfsconfigFile = readdirSync(cfsDir).find((file) =>
      file.endsWith('.cfsconfig')
    );
    if (cfsconfigFile) {
      targets.push({
        path: path.join(cfsDir, cfsconfigFile),
        kind: 'cfsconfig'
      });
    }

    // Skip the .cfsworkspace file for now.
    /*
    const workspaceFile = path.join(cfsDir, '.cfsworkspace');
    if (existsSync(workspaceFile)) {
      targets.push({path: workspaceFile, kind: 'cfsworkspace'});
    }
		*/

    if (targets.length === 0) {
      throw new RecoverableError(
        `No '.cfsconfig' file found in '${cfsDir}'.`,
        {
          suggestion:
            'Ensure the workspace contains a .cfsconfig file in its .cfs directory.'
        }
      );
    }

    return targets;
  }
}
