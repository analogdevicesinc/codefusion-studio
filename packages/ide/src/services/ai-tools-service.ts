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

import * as vscode from "vscode";
import {
  CfsToolManager,
  getAiToolsPlugin,
  parseAICodegenEvents,
} from "cfs-lib";
import { tmpdir } from "os";
import path from "path";
import { AIModel, CfsConfig, CfsSocDataModel } from "cfs-types";
import AIToolsPlugin from "cfs-lib/dist/ai-tools";
import { CodeGenerationFailure } from "cfs-lib/dist/types/code-generation";
import { Utils } from "../utils/utils";
import { AuthConfigParser } from "../utils/auth-config";

export async function getCfsaiPath(
  toolManager: CfsToolManager,
): Promise<string> {
  const toolInstance = await toolManager.getInstalledToolById("cfsai.tool");

  if (!toolInstance) {
    throw new Error("Could not resolve path to cfsai the tool.");
  }

  const cfsaiPath = toolInstance.rootPath;

  return cfsaiPath;
}

const DEFAULT_REPORT_TMP_DIR = path.join(
  tmpdir(),
  ".cfs_model_validation_reports",
);

export type ModelValidationResult = {
  isValid: boolean;
  reportPath?: string;
};

export class AIToolsService {
  private aiToolsPlugin: AIToolsPlugin;

  constructor(private cfsaiPath: string) {
    this.aiToolsPlugin = getAiToolsPlugin(
      cfsaiPath,
      Utils.getExtensionVersion(),
    );
  }

  async profileAiModel(
    aiModel: AIModel,
    dm: CfsSocDataModel,
    socName: string,
    packageId: string,
  ) {
    const aiSocData = this.aiToolsPlugin.getAIDataFromSOCModel(
      dm,
      socName,
      packageId,
      aiModel.Target.Core,
      aiModel.Target.Accelerator ?? "",
    );

    const reportPath = this.getReportPath(aiModel, "profiling");

    const workspaceRoot = vscode.workspace.workspaceFile
      ? path.dirname(vscode.workspace.workspaceFile?.fsPath)
      : vscode.workspace.workspaceFolders?.[0].uri.fsPath;

    const result = await this.aiToolsPlugin.runProfile(
      aiSocData,
      aiModel.Files.Model,
      {
        reportFileFormat: "json",
        reportFilePath: reportPath,
      },
      workspaceRoot,
    );

    if (result.code !== 0) {
      throw new Error(
        `AI Model profiling failed with exit code ${result.code?.toString() ?? "unknown"}.`,
      );
    }

    return reportPath;
  }

  async validateAiModel(
    aiModel: AIModel,
    dm: CfsSocDataModel,
    socName: string,
    packageId: string,
  ): Promise<ModelValidationResult> {
    const aiSocData = this.aiToolsPlugin.getAIDataFromSOCModel(
      dm,
      socName,
      packageId,
      aiModel.Target.Core,
      aiModel.Target.Accelerator ?? "",
    );

    const reportPath = this.getReportPath(aiModel, "compatibility");

    const workspaceRoot = vscode.workspace.workspaceFile
      ? path.dirname(vscode.workspace.workspaceFile?.fsPath)
      : vscode.workspace.workspaceFolders?.[0].uri.fsPath;

    const result = await this.aiToolsPlugin.runCompat(
      aiSocData,
      aiModel.Files.Model,
      {
        reportFile: reportPath,
        dataset: aiModel.Files.Dataset,
      },
      workspaceRoot,
    );

    if (result.code !== 0 && result.code !== 10) {
      throw new Error(
        `AI Model analysis failed with exit code ${result.code?.toString() ?? "unknown"}.`,
      );
    }

    return {
      isValid: result.code === 0,
      reportPath: result.code === 10 ? reportPath : undefined,
    };
  }

  async generateAiModelCode(
    cfsconfig: CfsConfig,
    dataModel: CfsSocDataModel,
    workspacePath: string,
  ): Promise<(string | CodeGenerationFailure)[]> {
    const authConfig = new AuthConfigParser().getConfig();
    const aiOutput = await this.aiToolsPlugin.generateFromConfig(
      cfsconfig,
      dataModel,
      workspacePath,
      authConfig,
    );

    if (
      aiOutput.code !== null &&
      !aiOutput.validCodes.includes(aiOutput.code)
    ) {
      throw new Error(
        aiOutput.stderr.join("\n") ||
          `AI code generation failed with exit code ${aiOutput.code.toString()}`,
      );
    }

    const combined = [...aiOutput.stdout, ...aiOutput.stderr];

    const aiEvents = parseAICodegenEvents(combined.join(""));

    const aiGeneratedFiles = aiEvents
      .filter((evt) => evt.event?.status === "OK" && evt.event.type === "FILE")
      .map((evt) => evt.event?.value)
      .filter((value) => value !== undefined);

    const aiFailures: CodeGenerationFailure[] = aiEvents
      .filter((evt) => evt.event && evt.event.status !== "OK")
      .map((evt) => ({
        name: evt.event?.value ?? "",
        error: `Failed to create file: ${evt.event?.value}`,
      }));

    return [...aiGeneratedFiles, ...aiFailures];
  }

  private getReportPath(
    model: AIModel,
    type: "profiling" | "compatibility",
  ): string {
    return path.join(
      DEFAULT_REPORT_TMP_DIR,
      `${model.Name.replace(/\s+/g, "_")}_${type}_report.cfsreport`,
    );
  }
}
