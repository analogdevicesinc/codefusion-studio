/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import CfsCustomEditor from "./cfs-custom-editor";
import {
  CfsFeatureScope,
  CfsPluginInfo,
  CfsPluginManager,
  CfsPluginProperty,
  getHostPlatform,
} from "cfs-lib";
import type { CfsPackageManagerProvider } from "cfs-package-manager";
import { CfsDataModelManager } from "cfs-lib";

import { WORKSPACE_CREATION_EDITOR_ID } from "../constants";
import { resolveVariables } from "../utils/resolveVariables";
import { Utils } from "../utils/utils";
import { CfsWorkspace } from "cfs-lib";
import path from "path";
import { VSCODE_OPEN_FOLDER_COMMAND_ID } from "../commands/constants";
import { SoC } from "cfs-ccm-lib";
import debounce from "lodash.debounce";
import * as fs from "node:fs";
import {
  getTelemetryManager,
  handleSensitiveTelemetryData,
} from "../telemetry/telemetry";
import { getCatalogManager } from "../utils/catalog";

const messageTypes = {
  getCatalog: "get-catalog",
  getWorkspaceConfig: "get-workspace-config",
  updatePersistedConfig: "update-persisted-config",
  openFileExplorer: "open-file-explorer",
  getDefaultPath: "get-default-path",
  getPlugins: "get-plugins",
  getPluginProperties: "get-plugin-properties",
  createWorkspace: "create-workspace",
  getMulticoreTemplates: "get-multicore-templates",
  getHostPlatform: "get-host-platform",
};

class WorkspaceCreationEditor extends CfsCustomEditor {
  static viewType = WORKSPACE_CREATION_EDITOR_ID;

  private pkgManager?: CfsPackageManagerProvider;

  constructor(
    private context: vscode.ExtensionContext,
    private dataModelManager: CfsDataModelManager,
    pkgManager?: CfsPackageManagerProvider,
  ) {
    super(context);
    this.pkgManager = pkgManager;
  }

  static register(
    context: vscode.ExtensionContext,
    dataModelManager: CfsDataModelManager,
    pkgManager?: CfsPackageManagerProvider,
  ): vscode.Disposable {
    const provider = new WorkspaceCreationEditor(
      context,
      dataModelManager,
      pkgManager,
    );

    const providerRegistration = vscode.window.registerCustomEditorProvider(
      this.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    );

    return providerRegistration;
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    const viewProviderPanel = new ViewProviderPanel(this.context, {
      distDir: "out/workspace-creation",
      indexPath: "out/workspace-creation/index.html",
    });

    const pluginSearchDirs = vscode.workspace
      .getConfiguration("cfs")
      .get<string[]>("plugins.searchDirectories")
      ?.map((dir) => resolveVariables(dir, true));

    const dataModelSearchDirs = vscode.workspace
      .getConfiguration("cfs")
      .get<string[]>("plugins.dataModelSearchDirectories")
      ?.map((dir) => resolveVariables(dir, true));

    let catalogData: SoC[] | undefined;
    let catalogManager = await getCatalogManager();

    if (catalogManager) {
      try {
        await catalogManager.loadCatalog();
      } catch (error) {
        console.error("Catalog could not be loaded.", error);
        void catalogManager!.dispose();
        catalogManager = undefined;
        void vscode.window.showErrorMessage(
          "Catalog Manager failed to load catalog. Catalog data unavailable.",
        );
      }
    }

    let pluginManager: CfsPluginManager | undefined;

    try {
      const searchPaths = [
        ...(pluginSearchDirs ?? []),
        ...(dataModelSearchDirs ?? []),
      ];
      pluginManager = new CfsPluginManager(
        searchPaths,
        this.pkgManager,
        this.dataModelManager,
      );
    } catch (error) {
      debounce(
        () =>
          vscode.window.showWarningMessage(
            `Plugin Manager failed to initialize with error ${(error as Error).message}. Some features may not work as expected.`,
          ),
        4000,
      );
    }

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      let request;

      switch (message.type) {
        case messageTypes.getCatalog:
          if (catalogManager) {
            try {
              // Fetch and cache catalog data on first request; subsequent requests use cached data.
              if (!catalogData) {
                catalogData = (await catalogManager.socCatalog.getAll()).sort(
                  (a: SoC, b: SoC) => {
                    return a.name.localeCompare(b.name);
                  },
                );
              }

              request = Promise.resolve(catalogData);
            } catch (error) {
              request = Promise.reject(error);
              await vscode.window.showErrorMessage(
                `Failed to get catalog. ${error}`,
              );
            }
          } else {
            request = Promise.reject(
              new Error("Catalog Manager is not initialized."),
            );
          }
          break;

        case messageTypes.getWorkspaceConfig:
          try {
            const workspaceConfig = this.getDocumentAsJson(document);

            request = Promise.resolve(workspaceConfig);
          } catch (error) {
            request = Promise.reject(error);

            await vscode.window.showErrorMessage(
              `Failed to get document as json: ${error}`,
            );
          } finally {
            break;
          }

        case messageTypes.updatePersistedConfig:
          try {
            await this.updateDocument(message.body, document);

            request = Promise.resolve();
          } catch (error) {
            request = Promise.reject(error);

            await vscode.window.showErrorMessage(
              `Failed to update document: ${error}`,
            );
          } finally {
            break;
          }

        case messageTypes.openFileExplorer:
          try {
            const isFile = message.body.mode === "file";

            const options: vscode.OpenDialogOptions = {
              canSelectFiles: isFile,
              canSelectFolders: !isFile,
              canSelectMany: false,
              title: "Select a build path",
            };

            const fileUri = await vscode.window.showOpenDialog(options);
            const path =
              fileUri && fileUri[0]?.fsPath ? fileUri[0]?.fsPath : "";

            request = Promise.resolve(path);
          } catch (error) {
            request = Promise.reject(error);

            await vscode.window.showErrorMessage(
              `Failed to open file explorer: ${error}`,
            );
          } finally {
            break;
          }

        case messageTypes.getDefaultPath:
          const userHome = resolveVariables("${userHome}");
          const version = this.getExtensionVersion();

          const defaultLocation = Utils.normalizePath(
            `${userHome}/cfs${version !== undefined ? `/${version}` : ""}`,
          );

          request = Promise.resolve(defaultLocation);
          break;

        case messageTypes.getPlugins:
          if (pluginManager) {
            try {
              const plugins = await pluginManager?.getPluginsInfoList();
              request = Promise.resolve(plugins ?? []);
            } catch (error) {
              request = Promise.reject(error);
              await vscode.window.showErrorMessage(
                `Failed to get plugins: ${error}`,
              );
            }
          } else {
            request = Promise.reject(
              new Error("Plugin Manager is not initialized."),
            );
          }
          break;

        case messageTypes.getPluginProperties:
          if (pluginManager) {
            try {
              const { pluginInfo, scope, context } = message.body;
              const properties = await pluginManager?.getProperties(
                pluginInfo.pluginId,
                pluginInfo.pluginVersion,
                scope,
                context,
              );
              request = Promise.resolve(properties ?? []);
            } catch (error) {
              request = Promise.reject(error);
              await vscode.window.showErrorMessage(
                `Failed to get plugin properties: ${error}`,
              );
            }
          } else {
            request = Promise.reject(
              new Error("Plugin Manager is not initialized."),
            );
          }
          break;

        case messageTypes.createWorkspace:
          const workspaceConfig = message.body satisfies CfsWorkspace;
          const workspacePath = vscode.Uri.file(
            path.join(workspaceConfig.location, workspaceConfig.workspaceName),
          );
          if (fs.existsSync(workspacePath.fsPath)) {
            await vscode.window.showErrorMessage(
              `Workspace path already exists: ${workspacePath.fsPath}`,
            );
          } else {
            try {
              await vscode.workspace.save(Utils.getTempCfsWorkspacePath());
              const soc = catalogData?.find(
                (soc) => soc.name === workspaceConfig.soc,
              );

              if (soc) {
                await logWorkspaceCreationTelemetry(workspaceConfig, soc);
              }
              await pluginManager
                ?.generateWorkspace(workspaceConfig)
                .then(async () => {
                  const codeWorkspace = vscode.Uri.file(
                    path.join(
                      workspaceConfig.location,
                      workspaceConfig.workspaceName,
                      `${workspaceConfig.workspaceName}.code-workspace`,
                    ),
                  );
                  if (!process.env.SKIP_OPEN_WORKSPACE) {
                    vscode.commands.executeCommand(
                      VSCODE_OPEN_FOLDER_COMMAND_ID,
                      codeWorkspace,
                    );
                  }

                  catalogManager?.dispose();
                  request = Promise.resolve("success");
                });
            } catch (error) {
              if (fs.existsSync(workspacePath.fsPath)) {
                await fs.promises.rm(workspacePath.fsPath, {
                  recursive: true,
                  force: true,
                });
              }
              request = Promise.reject(error);
              await vscode.window.showErrorMessage(
                `Failed to create workspace: ${error}`,
              );
            }
          }
          break;

        case messageTypes.getMulticoreTemplates:
          if (pluginManager) {
            try {
              const { socId, packageId, boardId = "" } = message.body;

              const filter = (plugin: CfsPluginInfo) => {
                const normalizedPackageId = packageId.replace(/[\s-]+/g, "");
                return (
                  Boolean(plugin.features.workspace) &&
                  (plugin.supportedSocs?.some(
                    (soc) =>
                      soc.name?.toLowerCase() === socId.toLowerCase() &&
                      soc.package?.toLowerCase() ===
                        normalizedPackageId.toLowerCase() &&
                      (soc.board?.toLowerCase() ?? "") ===
                        boardId.toLowerCase(),
                  ) ??
                    false)
                );
              };

              const plugins = await pluginManager?.getPluginsInfoList(filter);

              request = Promise.resolve(plugins ?? []);
            } catch (error) {
              request = Promise.reject(error);
              await vscode.window.showErrorMessage(
                `Failed to get multicore templates: ${error}`,
              );
            }
          } else {
            request = Promise.reject(
              new Error("Plugin Manager is not initialized."),
            );
          }
          break;

        case messageTypes.getHostPlatform:
          request = Promise.resolve(getHostPlatform());
          break;

        default:
          return;
      }

      if (request) {
        const { body, error } = await request.then(
          (body) => ({ body, error: undefined }),
          (error) => ({ body: undefined, error: error?.message ?? "error" }),
        );

        // Send result to the webview
        await webviewPanel.webview.postMessage({
          type: "api-response",
          id: message.id,
          body,
          error,
        });
      }
    });

    webviewPanel.onDidDispose(() => {
      catalogManager?.dispose();
    });

    await viewProviderPanel.resolveWebviewView(webviewPanel);
  }
}

const logWorkspaceCreationTelemetry = async (
  workspaceConfig: CfsWorkspace,
  soc: SoC,
) => {
  const workspaceData: Partial<CfsWorkspace> = {
    soc: workspaceConfig.soc,
    package: workspaceConfig.package,
    board: handleSensitiveTelemetryData(
      workspaceConfig.board,
      Utils.isAdiBoard(workspaceConfig.board, soc),
    ),
    pluginId: handleSensitiveTelemetryData(
      workspaceConfig.workspacePluginId ?? "",
      Utils.isAdiDevelopedPlugin(workspaceConfig.workspacePluginId ?? ""),
    ),
    projects: workspaceConfig.projects?.map((project) => ({
      coreId: project.coreId,
      pluginId: handleSensitiveTelemetryData(
        project.pluginId ?? "",
        Utils.isAdiDevelopedPlugin(project.pluginId ?? ""),
      ),
      pluginVersion: project.pluginVersion,
      firmwarePlatform: project.firmwarePlatform,
    })),
    hostOS: require("os").platform(),
  };

  const telemetryManager = await getTelemetryManager();
  await telemetryManager.logAction("Workspace created", workspaceData);
};

export default WorkspaceCreationEditor;
