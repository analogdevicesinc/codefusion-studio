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
  CfsDataModelManager,
  CfsToolManager,
  MAX_MODEL_NAME_LENGTH,
  generateAIArtifacts,
  getAiToolsPlugin,
  type AuthConfig,
} from "cfs-lib";
import { tmpdir } from "os";
import path from "path";
import {
  AIModel,
  CfsConfig,
  CfsSocDataModel,
  CfsWorkspace,
  ConfiguredProject,
} from "cfs-types";
import { AIToolsPlugin } from "cfs-lib";
import { Utils, getWorkspaceRoot, getProjectFolderPath } from "../utils/utils";
import { CfsPackageManagerProvider } from "cfs-package-manager";
import type { AuthService } from "./auth-service";
import { getTelemetryManager } from "../telemetry/telemetry";
import { TELEMETRY_ACTIONS } from "../telemetry/action-names";

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

  constructor(
    private cfsaiPath: string,
    pkgManager?: CfsPackageManagerProvider,
  ) {
    this.aiToolsPlugin = getAiToolsPlugin(
      cfsaiPath,
      Utils.getExtensionVersion(),
      pkgManager,
    );
  }

  async profileAiModel(
    aiModel: AIModel,
    dm: CfsSocDataModel,
    socName: string,
    packageId: string,
    project: ConfiguredProject | undefined,
  ): Promise<string> {
    const aiSocData = this.aiToolsPlugin.getAIDataFromSOCModel(
      dm,
      socName,
      packageId,
      aiModel.Target.Core,
      aiModel.Target.Accelerator ?? "",
    );

    const reportPath = this.getReportPath(aiModel, "profiling", project);

    const workspaceRoot = getWorkspaceRoot();

    await this.aiToolsPlugin.runProfile(
      aiSocData,
      aiModel.Files.Model,
      {
        reportFileFormat: "json",
        reportFilePath: reportPath,
      },
      workspaceRoot,
    );

    return reportPath;
  }

  async validateAiModel(
    aiModel: AIModel,
    dm: CfsSocDataModel,
    socName: string,
    packageId: string,
    project: ConfiguredProject | undefined,
  ): Promise<ModelValidationResult> {
    const aiSocData = this.aiToolsPlugin.getAIDataFromSOCModel(
      dm,
      socName,
      packageId,
      aiModel.Target.Core,
      aiModel.Target.Accelerator ?? "",
    );

    const reportPath = this.getReportPath(aiModel, "compatibility", project);

    const workspaceRoot = getWorkspaceRoot();

    const result = await this.aiToolsPlugin.runCompat(
      aiSocData,
      aiModel.Files.Model,
      {
        reportFile: reportPath,
        dataset: aiModel.Files.Dataset,
      },
      workspaceRoot,
    );

    return {
      isValid: result.code === 0,
      reportPath: result.code === 10 ? reportPath : undefined,
    };
  }

  async generateAiModelCode(
    cfsconfig: CfsConfig,
    dataModel: CfsSocDataModel,
    workspacePath: string,
    authConfig: AuthConfig,
    token?: vscode.CancellationToken,
  ): Promise<string[]> {
    const result = await this.aiToolsPlugin.generateFromConfig(
      cfsconfig,
      dataModel,
      workspacePath,
      authConfig,
      undefined,
      undefined,
      token,
    );

    return result.artifacts?.files ?? [];
  }

  /**
   * Resolves the report path inside the workspace project's `reports`
   * folder, falling back to a temp directory if there is no project for
   * the core or the workspace root cannot be determined.
   */
  private getReportPath(
    model: AIModel,
    type: "profiling" | "compatibility",
    project: ConfiguredProject | undefined,
  ): string {
    const workspaceRoot = getWorkspaceRoot();

    const reportsDir =
      project && workspaceRoot
        ? path.join(getProjectFolderPath(workspaceRoot, project), "reports")
        : DEFAULT_REPORT_TMP_DIR;

    return path.join(
      reportsDir,
      `${model.Name.replace(/[\s\\/<>:"|?*]+/g, "_").substring(
        0,
        MAX_MODEL_NAME_LENGTH,
      )}_${type}_report.cfsreport`,
    );
  }
}

/**
 * Generates the AI model code for a freshly generated workspace, if its
 * `.cfsconfig` contains at least one enabled AI model. Intended to run after
 * the workspace files have been generated and before the workspace is opened.
 * @param workspaceConfig - the configuration the workspace was generated from
 * @param services - the services needed to resolve the data model and cfsai
 * @param progress - optional progress reporter to show the generation step
 * @param token - optional token to cancel the code generation
 */
export async function generateAiCodeForWorkspace(
  workspaceConfig: CfsWorkspace,
  services: {
    dataModelManager: CfsDataModelManager;
    toolManager: CfsToolManager;
    authService: AuthService;
    pkgManager?: CfsPackageManagerProvider;
  },
  progress?: vscode.Progress<{ message?: string }>,
  token?: vscode.CancellationToken,
): Promise<void> {
  await generateAIArtifacts(
    workspaceConfig,
    async (config, _configPath, workspacePath) => {
      progress?.report({
        message: "Generating AI model code. This may take several minutes...",
      });

      const dataModel = await services.dataModelManager.getDataModel(
        config.Soc,
        config.Package,
        config.DataModelVersion,
      );

      if (!dataModel) {
        throw new Error(
          `Data model not found for SoC ${config.Soc}, Package ${config.Package}, Version ${config.DataModelVersion}`,
        );
      }

      const codeGenStart = Date.now();
      const telemetryManager = await getTelemetryManager();

      try {
        const aiToolsService = new AIToolsService(
          await getCfsaiPath(services.toolManager),
          services.pkgManager,
        );
        const generatedFiles = await aiToolsService.generateAiModelCode(
          config,
          dataModel,
          workspacePath,
          services.authService.requireConfig(),
          token,
        );

        telemetryManager.logAction(TELEMETRY_ACTIONS.AI_CODE_GENERATED, {
          generatedFileCount: generatedFiles.length,
          durationMs: Date.now() - codeGenStart,
        });
      } catch (error) {
        telemetryManager.logAction(
          TELEMETRY_ACTIONS.AI_CODE_GENERATION_FAILED,
          {
            errorType: "CodeGenerationFailure",
            failureCount: 1,
            durationMs: Date.now() - codeGenStart,
          },
        );

        throw error;
      }
    },
  );
}
