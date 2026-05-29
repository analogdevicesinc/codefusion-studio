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
import { CfsDataModelManager } from "cfs-lib/dist/managers/cfs-data-model-manager";
import { createPluginManager } from "../utils/plugin-manager";
import { AIModelCfsWorkspace } from "cfs-types";
import { Utils } from "../utils/utils";
import path from "path";
import { VSCODE_OPEN_FOLDER_COMMAND_ID } from "../commands/constants";
import { getCatalogManager } from "../utils/catalog";
import { CfsPluginManager, CfsToolManager, getAiToolsPlugin } from "cfs-lib";
import { SoC } from "cfs-ccm-api/dist/rest-types";


export class ModelWorkspaceCreationEditor implements vscode.CustomTextEditorProvider {
  static readonly viewType = MODEL_WORKSPACE_CREATION_EDITOR_ID;

  private pluginManager: CfsPluginManager | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private messenger: Messenger,
    private dataModelManager: CfsDataModelManager,
    private toolManager: CfsToolManager,
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
    pkgManager?: CfsPackageManagerProvider,
  ): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      ModelWorkspaceCreationEditor.viewType,
      new ModelWorkspaceCreationEditor(
        context,
        messenger,
        dataModelManager,
        toolManager,
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
        const workspaceConfig = JSON.parse(document.getText() || "{}");
        return workspaceConfig;
      },
      { sender: participant },
    );

    this.messenger.onNotification(
      updateWorkspaceConfig,
      async (data) => {
        const workspaceConfig = JSON.parse(document.getText() || "{}");
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

    this.messenger.onNotification(
      generateWorkspace,
      async () => {
        this.generateWorkspace(document);
      },
      {
        sender: participant,
      },
    );
  }

  private async generateWorkspace(document: vscode.TextDocument) {
    try {
      const workspaceConfig: AIModelCfsWorkspace = JSON.parse(
        document.getText() || "{}",
      );

      // set the package based on the soc and board
      workspaceConfig.package = await this.getPackageForSoc(
        workspaceConfig.soc,
        workspaceConfig.board,
      );

      workspaceConfig.location =
        workspaceConfig.location || Utils.getDefaultWorkspacepath();

      workspaceConfig.workspaceName =
        workspaceConfig.workspaceName ||
        `${workspaceConfig.soc}-${workspaceConfig.package.toUpperCase()}_ai_prof_${Date.now()}`;

      const plugins = await this.pluginManager?.getPluginsInfoList();
      const pluginToUse = plugins?.find(
        (plugin) =>
          plugin.features.aiprof &&
          plugin.supportedSocs.find((soc) => soc.name === workspaceConfig.soc),
      );

      workspaceConfig.workspacePluginId = pluginToUse?.pluginId;

      await this.pluginManager?.generateWorkspace(workspaceConfig);
      const codeWorkspace = vscode.Uri.file(
        path.join(
          workspaceConfig.location,
          workspaceConfig.workspaceName,
          `${workspaceConfig.workspaceName}.code-workspace`,
        ),
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
    }
  }

  private async getSocCatalog(): Promise<SoC[]> {
    const catalogManager = await getCatalogManager();

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

  private async runCompatibilityCheck(
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

    const compatResults = await Promise.all(
      cores.map((core) =>
        aiToolsPlugin.runCompat(
          aiToolsPlugin.getAIDataFromSOCModel(dataModel, soc, packageId, core),
          modelFile,
          { dataset: sampleData },
        ),
      ),
    );

    return cores.reduce(
      (acc, core, index) => {
        acc[core] =
          compatResults[index].code === 0
            ? true
            : compatResults[index].code === 10
              ? false
              : "error";
        return acc;
      },
      {} as Record<string, boolean | "error">,
    );
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
    const aiPlugins = await this.getAiSupportingPlugins();
    const supportedSocs = aiPlugins.flatMap((plugin) => plugin.supportedSocs);

    const socPackage = supportedSocs.find(
      (soc) => soc.name === socName && soc.board === boardName,
    )?.package;

    if (!socPackage) {
      throw new Error(
        `No supported package found for SoC ${socName} and board ${boardName}`,
      );
    }

    return socPackage;
  }
}
