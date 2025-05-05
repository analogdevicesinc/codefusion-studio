/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
/**
 * Module for executing the cli from the vscode extension
 */

import * as vscode from "vscode";
import { spawn } from "node:child_process";
import { CLI_ID } from "./constants";

// Gets cli path from vscode config (and asks user to set it if unset)
async function getCliPath(): Promise<string> {
  const cliPath = vscode.workspace
    .getConfiguration("cfgtools")
    .get(`${CLI_ID}.path`);

  if (!cliPath) {
    const selection = await vscode.window.showErrorMessage(
      `You need to set the path to the "${CLI_ID}" CLI command to use this extension.`,
      "Set path now",
      "Abort",
    );

    if (selection === "Set path now") {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        `cfgtools.${CLI_ID}.path`,
      );
    }

    throw new Error(`cfgtools.${CLI_ID}.path not set`);
  }

  return String(cliPath);
}

// Executes cli in a shell
async function runCli(
  ...args: string[]
): Promise<{ code: number; stdout: string; stderr: string }> {
  const cliPath = await getCliPath();

  return new Promise((resolve, reject) => {
    const cli = spawn(cliPath, args, { shell: true });
    const stdout: string[] = [];
    const stderr: string[] = [];

    cli.stdout.on("data", (data: string) => stdout.push(data));
    cli.stderr.on("data", (data: string) => stderr.push(data));
    cli.on("close", (code: number) => {
      resolve({
        code,
        stdout: stdout.join(""),
        stderr: stderr.join(""),
      });
    });
    cli.on("error", (err: Error) => {
      reject(err);
    });
  });
}

// Returns a list of soc names
export async function getSocs() {
  const { stdout } = await runCli("socs", "list");

  return stdout.trim().split("\n");
}

// Returns details about a particular soc
export async function getSoc(name: string) {
  const { stdout } = await runCli("socs", "export", "--name", name, "--minify");

  const trimmedStdout: string = stdout.trim();

  return JSON.parse(trimmedStdout);
}

export async function getExportEngines() {
  const { stdout } = await runCli(
    "engines",
    "list",
    "--format",
    "json",
    "--verbose",
  );

  return JSON.parse(stdout);
}

export async function getWorkspaceRoot() {
  const { workspaceFolders } = vscode.workspace;

  if (workspaceFolders) {
    return workspaceFolders[0].uri.fsPath;
  }

  return "";
}

export async function getUserHomeDirectory() {
  return process.env.HOME ?? "";
}

export type GeneratedCode = {
  files: Record<string, string[]>;
  status: "success" | "error";
};
