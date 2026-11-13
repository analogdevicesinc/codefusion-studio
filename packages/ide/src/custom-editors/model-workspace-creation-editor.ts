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
import { ViewProviderPanel } from "../view-provider/view-provider-panel";
import {
  MODEL_WORKSPACE_CREATION_EDITOR_ID,
  OPEN_AIPROFILING_EXTENSION_STATE,
} from "../constants";
import { Messenger } from "vscode-messenger";
import { type MessageParticipant } from "vscode-messenger-common";
import {
  getWorkspaceConfig,
  updateWorkspaceConfig,
  generateWorkspace,
  getCatalog,
  runCompatibilityCheck,
} from "../constants/messages/model-to-workspace";
import { CfsPackageManagerProvider } from "cfs-package-manager/dist/api/api";
import { CfsDataModelManager } from "cfs-lib";
import { createPluginManager } from "../utils/plugin-manager";
import { resolveZephyrBase } from "../utils/zephyr-base";
import type { AIModelCfsWorkspace, CfsPluginInfo } from "cfs-types";
import { Utils } from "../utils/utils";
import path from "path";
import * as fs from "node:fs";
import { VSCODE_OPEN_FOLDER_COMMAND_ID } from "../commands/constants";
import { getCatalogManager } from "../utils/catalog";
import type { AuthService } from "../services/auth-service";
import {
  CfsPluginManager,
  CfsToolManager,
  generateAIWorkspace,
  getAiToolsPlugin,
} from "cfs-lib";
import type { SoC } from "cfs-ccm-lib";
import * as semver from "semver";
import { getTelemetryManager } from "../telemetry/telemetry";
import { TELEMETRY_ACTIONS } from "../telemetry/action-names";
import { generateAiCodeForWorkspace } from "../services/ai-tools-service";
import { logger } from "../utils/logger";

export class ModelWorkspaceCreationEditor
  implements vscode.CustomTextEditorProvider
{
  static readonly viewType = MODEL_WORKSPACE_CREATION_EDITOR_ID;

  private pluginManager: CfsPluginManager | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private messenger: Messenger,
    private dataModelManager: CfsDataModelManager,
    private toolManager: CfsToolManager,
    private readonly authService: AuthService,
    private pkgManager?: CfsPackageManagerProvider,
  ) {
    this.pluginManager = createPluginManager(
      this.pkgManager,
      this.dataModelManager,
    );
  }

  static register(
    context: vscode.ExtensionContext,
    messenger: Messenger,
    dataModelManager: CfsDataModelManager,
    toolManager: CfsToolManager,
    authService: AuthService,
    pkgManager?: CfsPackageManagerProvider,
  ): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      ModelWorkspaceCreationEditor.viewType,
      new ModelWorkspaceCreationEditor(
        context,
        messenger,
        dataModelManager,
        toolManager,
        authService,
        pkgManager,
      ),
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    );
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    void getTelemetryManager().then((telemetryManager) => {
      telemetryManager.logAction(TELEMETRY_ACTIONS.FEATURE_ACCESSED, {
        feature: "model_workspace_creation",
      });
    });

    const participant = this.messenger.registerWebviewPanel(webviewPanel);
    this.registerMessageHandlers(participant, document);

    webviewPanel.webview.options = {
      enableScripts: true,
    };

    const viewProviderPanel = new ViewProviderPanel(this.context, {
      distDir: "out/model-workspace-creation",
      indexPath: "out/model-workspace-creation/index.html",
    });

    await viewProviderPanel.resolveWebviewView(webviewPanel);
  }

  private registerMessageHandlers(
    participant: MessageParticipant,
    document: vscode.TextDocument,
  ) {
    this.messenger.onRequest(
      getWorkspaceConfig,
      async () => {
        const workspaceConfig = this.getWorkspaceConfigFromDocument(document);
        return workspaceConfig;
      },
      { sender: participant },
    );

    this.messenger.onNotification(
      updateWorkspaceConfig,
      async (data) => {
        await this.updateWorkspaceConfigDocument(document, data);
      },
      { sender: participant },
    );

    // TODO should be merged with the same hanlder in workspace creation
    this.messenger.onRequest(getCatalog, async () => this.getSocCatalog(), {
      sender: participant,
    });

    this.messenger.onRequest(
      runCompatibilityCheck,
      async ({ soc, board, modelFile, sampleData }) =>
        this.runCompatibilityCheck(soc, board, modelFile, sampleData),
      { sender: participant },
    );

    this.messenger.onRequest(
      generateWorkspace,
      async (update) => {
        if (update) {
          await this.updateWorkspaceConfigDocument(document, update);
        }
        await this.generateWorkspace(document);
      },
      {
        sender: participant,
      },
    );
  }

  private getWorkspaceConfigFromDocument(
    document: vscode.TextDocument,
  ): Partial<AIModelCfsWorkspace> {
    return JSON.parse(document.getText() || "{}");
  }

  private async updateWorkspaceConfigDocument(
    document: vscode.TextDocument,
    data: Partial<AIModelCfsWorkspace>,
  ) {
    const workspaceConfig = this.getWorkspaceConfigFromDocument(document);
    const updatedConfig = {
      ...workspaceConfig,
      ...data,
    };

    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length),
    );

    edit.replace(
      document.uri,
      fullRange,
      JSON.stringify(updatedConfig, null, 2),
    );

    await vscode.workspace.applyEdit(edit);
  }

  private async generateWorkspace(document: vscode.TextDocument) {
    try {
      const workspaceConfig: AIModelCfsWorkspace =
        this.getWorkspaceConfigFromDocument(document) as AIModelCfsWorkspace;

      // select the plugin and package based on the soc, board and core
      const { plugin: pluginToUse, package: socPackage } =
        await this.getAiPluginForTarget(
          workspaceConfig.soc,
          workspaceConfig.board,
          workspaceConfig.coreId,
        );

      workspaceConfig.package = socPackage;
      workspaceConfig.workspacePluginId = pluginToUse.pluginId;
      workspaceConfig.workspacePluginVersion = pluginToUse.pluginVersion;

      workspaceConfig.location =
        workspaceConfig.location || Utils.getDefaultWorkspacepath();

      workspaceConfig.workspaceName =
        workspaceConfig.workspaceName ||
        `${
          workspaceConfig.soc
        }-${workspaceConfig.package.toUpperCase()}_ai_prof_${Date.now()}`;

      const workspacePath = path.join(
        workspaceConfig.location,
        workspaceConfig.workspaceName,
      );
      const codeWorkspace = vscode.Uri.file(
        path.join(
          workspacePath,
          `${workspaceConfig.workspaceName}.code-workspace`,
        ),
      );

      if (fs.existsSync(workspacePath)) {
        throw new Error(`Workspace path already exists: ${workspacePath}`);
      }

      const pluginManager = this.pluginManager;
      if (!pluginManager) {
        throw new Error("Plugin Manager not initialized");
      }

      // Resolve Zephyr base for board DTS detection, scoped to the target SoC.
      const zephyrBase = await resolveZephyrBase(
        workspaceConfig.soc,
        this.pkgManager,
      );

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Creating workspace "${workspaceConfig.workspaceName}"`,
          cancellable: true,
        },
        async (progress, token) => {
          progress.report({ message: "Generating workspace files..." });
          await generateAIWorkspace(
            pluginManager,
            workspaceConfig,
            workspacePath,
            { zephyrBase },
          );

          if (token.isCancellationRequested) {
            throw new Error("Workspace creation cancelled.");
          }

          await generateAiCodeForWorkspace(
            workspaceConfig,
            {
              dataModelManager: this.dataModelManager,
              toolManager: this.toolManager,
              authService: this.authService,
              pkgManager: this.pkgManager,
            },
            progress,
            token,
          );

          if (token.isCancellationRequested) {
            throw new Error("Workspace creation cancelled.");
          }
        },
      );

      const telemetryManager = await getTelemetryManager();
      await telemetryManager.logAction(
        TELEMETRY_ACTIONS.WORKSPACE_CREATED_FROM_MODEL,
        {},
      );

      if (!process.env.SKIP_OPEN_WORKSPACE) {
        await this.context.globalState.update(
          `${OPEN_AIPROFILING_EXTENSION_STATE}:${codeWorkspace}`,
          true,
        );
        vscode.commands.executeCommand(
          VSCODE_OPEN_FOLDER_COMMAND_ID,
          codeWorkspace,
        );
      }
    } catch (error) {
      console.error("Error generating workspace:", error);
      vscode.window.showErrorMessage(
        `An error occurred while generating the workspace: ${error}`,
      );
      // Rethrow so the webview can leave its busy state.
      throw error;
    }
  }

  private async getSocCatalog(): Promise<SoC[]> {
    const catalogManager = await getCatalogManager(this.authService);

    if (!catalogManager) {
      throw new Error("Error creating Catalog Manager");
    }

    await catalogManager?.loadCatalog();
    const allSocs = (await catalogManager.socCatalog.getAll()).sort((a, b) => {
      return a.name.localeCompare(b.name);
    });

    const aiPlugins = await this.getAiSupportingPlugins();

    // filter socs based on the available supporting plugins
    const aiSupportingSocs = allSocs.filter((soc) =>
      aiPlugins.some((plugin) =>
        plugin.supportedSocs.some((s) => s.name === soc.name),
      ),
    );

    // for each soc, find if any of its cores are supported by the available plugins
    return aiSupportingSocs.map((soc: Omit<SoC, "accessTag">) => {
      const supportedCoreNames = new Set<string>(
        aiPlugins.flatMap((plugin) =>
          plugin.supportedSocs
            .filter((s) => s.name === soc.name)
            .flatMap((s) => s.cores ?? []),
        ),
      );

      const supportedBoards = aiPlugins.flatMap((plugin) =>
        plugin.supportedSocs
          .filter((s) => s.name === soc.name)
          .map((s) => s.board),
      );

      return {
        ...soc,
        boards: soc.boards.filter((board) =>
          supportedBoards.includes(board.name),
        ),
        cores: soc.cores.map((core) => ({
          ...core,
          aiSupported: supportedCoreNames.has(core.dataModelCoreID),
        })),
      };
    });
  }

  /**
   * Runs the compatibility check for all AI-supported cores of the given SoC.
   * Failures are logged to the CodeFusion Studio output channel, which is
   * revealed so the user can see why the check failed.
   */
  private async runCompatibilityCheck(
    soc: string,
    board: string,
    modelFile: string,
    sampleData?: string,
  ): Promise<Record<string, boolean | "error">> {
    try {
      return await this.runCompatibilityCheckForCores(
        soc,
        board,
        modelFile,
        sampleData,
      );
    } catch (error) {
      logger.error(
        `Compatibility check for model "${modelFile}" on ${soc} (${board}) failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      logger.show(true);
      throw error;
    }
  }

  private async runCompatibilityCheckForCores(
    soc: string,
    board: string,
    modelFile: string,
    sampleData?: string,
  ): Promise<Record<string, boolean | "error">> {
    const aiToolsPath = (
      await this.toolManager.getInstalledToolById("cfsai.tool")
    )?.rootPath;

    if (!aiToolsPath) {
      throw new Error(
        "CFS AI Tools not found. Please ensure it is installed and try again.",
      );
    }

    // get cores for the selected soc that are supported by AI tools plugins
    const aiPlugins = await this.getAiSupportingPlugins();
    const cores = aiPlugins
      .flatMap((plugin) => plugin.supportedSocs)
      .filter((s) => s.name === soc)
      .flatMap((s) => s.cores ?? []);

    const aiToolsPlugin = getAiToolsPlugin(
      aiToolsPath,
      Utils.getExtensionVersion(),
    );

    const packageId = await this.getPackageForSoc(soc, board);

    const dataModel = await this.dataModelManager.getDataModel(soc, packageId);

    // Settle each core independently so a failure on one core doesn't hide
    // the results of the others.
    const compatResults = await Promise.allSettled(
      cores.map(async (core) =>
        aiToolsPlugin.runCompat(
          aiToolsPlugin.getAIDataFromSOCModel(dataModel, soc, packageId, core),
          modelFile,
          { dataset: sampleData },
        ),
      ),
    );

    let hasErrors = false;

    const result = cores.reduce(
      (acc, core, index) => {
        const compatResult = compatResults[index];

        if (compatResult.status === "rejected") {
          hasErrors = true;
          logger.error(
            `Compatibility check for model "${modelFile}" on ${soc} (${board}), core ${core} failed: ${compatResult.reason instanceof Error ? compatResult.reason.message : String(compatResult.reason)}`,
          );
          acc[core] = "error";
        } else {
          acc[core] =
            compatResult.value.code === 0
              ? true
              : compatResult.value.code === 10
                ? false
                : "error";
        }

        return acc;
      },
      {} as Record<string, boolean | "error">,
    );

    if (hasErrors) {
      logger.show(true);
    }
    void getTelemetryManager().then((telemetryManager) => {
      const action = Object.values(result).some((value) => value === true)
        ? TELEMETRY_ACTIONS.AI_MODEL_CHECK_SUCCESS
        : TELEMETRY_ACTIONS.AI_MODEL_CHECK_FAILURE;
      telemetryManager.logAction(action, {
        soc: soc,
        packageId,
        dataModelVersion: dataModel.Version,
        model_format: path.extname(modelFile).replace(".", ""),
      });
    });
    return result;
  }

  private async getAiSupportingPlugins() {
    const plugins = await this.pluginManager?.getPluginsInfoList();
    const aiPlugins = plugins?.filter((plugin) => plugin.features.aiprof) ?? [];
    return aiPlugins;
  }

  private async getPackageForSoc(
    socName: string,
    boardName: string,
  ): Promise<string> {
    return (await this.getAiPluginForTarget(socName, boardName)).package;
  }

  /**
   * Selects the AI plugin supporting the given SoC, board and (optionally) core.
   * If multiple versions of a plugin match, the latest version is used.
   * @param socName - The SoC name
   * @param boardName - The board name
   * @param coreId - The data model ID of the core the model runs on
   * @returns The selected plugin and the SoC package it declares
   */
  private async getAiPluginForTarget(
    socName: string,
    boardName: string,
    coreId?: string,
  ): Promise<{ plugin: CfsPluginInfo; package: string }> {
    const aiPlugins = await this.getAiSupportingPlugins();

    const candidates = aiPlugins.flatMap((plugin) => {
      const supportedSoc = plugin.supportedSocs.find(
        (soc) =>
          soc.name === socName &&
          soc.board === boardName &&
          (!coreId || !soc.cores || soc.cores.includes(coreId)),
      );

      return supportedSoc ? [{ plugin, package: supportedSoc.package }] : [];
    });

    const selected = candidates.find(({ plugin }) =>
      candidates.every(
        ({ plugin: other }) =>
          other.pluginId !== plugin.pluginId ||
          !semver.lt(plugin.pluginVersion, other.pluginVersion),
      ),
    );

    if (!selected) {
      throw new Error(
        `No AI plugin found for SoC ${socName}, board ${boardName}${coreId ? ` and core ${coreId}` : ""}`,
      );
    }

    return selected;
  }
}
