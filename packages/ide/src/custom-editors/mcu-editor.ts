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

/* eslint-disable complexity */
import * as vscode from "vscode";
import * as path from "path";
import { ViewProviderPanel } from "../view-provider/view-provider-panel";
import debounce from "lodash.debounce";
import { CONFIG_FILE_EXTENSION, MCU_EDITOR_ID } from "../constants";
import { CfsPluginManager, CfsToolManager } from "cfs-lib";
import type { CfsPackageManagerProvider } from "cfs-package-manager";
import {
  CfsConfig,
  CfsFeatureScope,
  ConfiguredClockNode,
  ConfiguredProject,
  ConfiguredPin,
  CfsSocDataModel,
  DFG,
  DFGStream,
  GasketConfig,
  AIModel,
  CfsProject,
} from "cfs-plugins-api";
import { resolveVariables } from "../utils/resolveVariables";
import { tmpdir } from "os";
import { type CfsDataModelManager } from "cfs-lib";
import { compareVersions } from "cfs-lib/src/utils/semantic-versioning";
import Path from "node:path";
import {
  CodeGenerationFailure,
  CodeGenerationProject,
} from "cfs-lib/dist/types/code-generation";
import { getAiToolsPlugin } from "cfs-lib";
import { toWebviewErrorPayload, WebviewError } from "../utils/webview-error";
import { getMissingProjectPlugins } from "../utils/plugins";
import { Profiling } from "cfs-plugins-api";

const messageTypes = {
  getSocAndConfig: "get-soc-and-config",
  getIsDocumentUnsaved: "get-is-document-unsaved",
  updatePersistedConfig: "update-persisted-config",
  updatePersistedDfgConfig: "update-persisted-dfg-config",
  updateProfilingConfig: "update-profiling-config",
  showSaveDialog: "show-save-dialog",
  generateCode: "generate-code",
  showInformationMessage: "show-information-message",
  getIsPeripheralBanner: "get-is-peripheral-banner",
  updateIsPeripheralBanner: "update-is-peripheral-banner",
  getProperties: "get-properties",
  showGenerateCodeWarning: "show-generate-code-warning",
  getGenerateCodeWarning: "get-generate-code-warning",
  getGaskets: "get-gaskets",
  exportCSV: "export-csv",
  openFile: "open-file",
  selectFile: "select-file",
  getPreference: "get-preference",
  setPreference: "set-preference",
  getSupportedAiBackends: "get-ai-backends",
  getAIBackendProperties: "get-ai-backend-properties",
  validateAIModel: "validate-ai-model",
  analyzeAIModel: "analyze-ai-model",
};

type ClockNodesPayload = Partial<{
  updatedClockNode: ConfiguredClockNode;
  initialControlValues: Record<string, string> | undefined;
  modifiedClockNodes: Array<{
    Name: string;
    EnabledControls: Record<string, boolean>;
  }>;
}>;

type Document = {
  Copyright: string;
  DataModelSchemaVersion: string;
  DataModelVersion: string;
  Package: string;
  Soc: string;
  Timestamp: string;
  Projects: ConfiguredProject[];
  Pins: ConfiguredPin[];
  ClockNodes: ConfiguredClockNode[];
  ClockFrequencies?: Record<string, string | number>;
  DFG?: DFG;
};

export class McuEditor implements vscode.CustomTextEditorProvider {
  public static register(
    context: vscode.ExtensionContext,
    dataModelManager: CfsDataModelManager,
    toolManager: CfsToolManager,
    pkgManager?: CfsPackageManagerProvider,
  ): vscode.Disposable {
    const provider = new McuEditor(
      context,
      dataModelManager,
      toolManager,
      pkgManager,
    );

    const providerRegistration = vscode.window.registerCustomEditorProvider(
      McuEditor.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    );

    return providerRegistration;
  }

  private static get viewType() {
    return MCU_EDITOR_ID;
  }

  constructor(
    private readonly context: vscode.ExtensionContext,
    private dataModelManager: CfsDataModelManager,
    private toolManager: CfsToolManager,
    private pkgManager?: CfsPackageManagerProvider,
  ) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ) {
    const viewProviderPanel = new ViewProviderPanel(this.context, {
      distDir: "out/config-tools",
      indexPath: "out/config-tools/index.html",
    });

    try {
      const cfsconfig = this.getDocumentAsJson(document);
      const socName = cfsconfig.Soc ?? "";
      const packageId = cfsconfig.Package ?? "";
      const dmVersion = cfsconfig.DataModelVersion ?? "";

      webviewPanel.webview.options = {
        enableScripts: true,
      };

      const showWarningMessageDebounced = debounce(
        (message: string) => vscode.window.showWarningMessage(message),
        2000,
      );

      const pluginSearchDirs = vscode.workspace
        .getConfiguration("cfs")
        .get<string[]>("plugins.searchDirectories")
        ?.map((dir) => resolveVariables(dir, true));

      let pluginManager: CfsPluginManager | undefined;

      try {
        const pluginCustomSearchPaths = [...(pluginSearchDirs ?? [])];

        pluginManager = new CfsPluginManager(
          pluginCustomSearchPaths,
          this.pkgManager,
          this.dataModelManager,
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Plugin Manager failed to initialize. All code generation features will not work as expected. Error: ${(error as Error).message}`,
        );
        throw new Error(
          `Plugin Manager failed to initialize. All code generation features will not work as expected. Error: ${(error as Error).message}`,
        );
      }

      const changeDocumentSubscription =
        vscode.workspace.onDidChangeTextDocument((e) => {
          const { document: modifiedDoc } = e;

          if (modifiedDoc.uri.path.endsWith(CONFIG_FILE_EXTENSION)) {
            const text = modifiedDoc.getText();
            let parsedDoc;

            try {
              parsedDoc = JSON.parse(text);
            } catch {
              void showWarningMessageDebounced(
                "The updates to the document are not valid JSON",
              );

              return;
            }

            const timeDiff = Math.abs(
              new Date(parsedDoc?.Timestamp as string).getTime() -
                new Date().getTime(),
            );

            // Low time difference between updates mean the update was generated through the ui
            // and we should ignore it
            if (timeDiff < 100) return;

            if (e.document.uri.toString() === document.uri.toString()) {
              void webviewPanel.webview.postMessage({
                type: "document-changed",
                reason: e.reason,
                pins: parsedDoc?.Pins,
                clockNodes: parsedDoc?.ClockNodes,
              });
            }
          }
        });

      // Fetch data model
      const dataModel = await this.dataModelManager.getDataModel(
        socName,
        packageId,
      );
      if (!dataModel) {
        throw WebviewError.dataModelError({
          soc: socName,
          pkg: packageId,
          version: dmVersion,
        });
      }

      // Check for missing project plugins
      const missingPlugins = await getMissingProjectPlugins(
        cfsconfig.Projects,
        pluginManager,
      );
      if (missingPlugins.length) {
        throw WebviewError.missingPluginsError(
          missingPlugins.map((p) => ({
            id: p.PluginId,
            version: p.PluginVersion,
          })),
        );
      }

      // Listen for messages from the webview
      webviewPanel.webview.onDidReceiveMessage(async (message) => {
        let request;

        if (message.type === messageTypes.getSocAndConfig) {
          try {
            const dm = await this.assertDataModel(socName, packageId);

            // If data model version has diverged from the persisted config version, inform the user.
            if (
              cfsconfig.DataModelVersion !== dm.Version &&
              compareVersions(dm.Version, cfsconfig.DataModelVersion) > 0
            ) {
              console.warn(
                // @TODO: define the final action/message that will trigger if the installed data model version
                // has diverged from the persisted version.
                `The data model version of the current document (${cfsconfig.DataModelVersion}) is older than the installed version (${dm.Version}).
              Consider installing the correct data model version, or updating manually the version used in the cfsconfig file.`,
              );
            }
            request = Promise.resolve({
              dataModel: dm,
              configOptions: cfsconfig,
            });
          } catch (error) {
            const errorMessage = `Error reading required configuration data: ${
              (error as Error).message
            }`;

            vscode.window.showErrorMessage(errorMessage);

            request = Promise.reject(error);
          }
        } else if (message.type === messageTypes.updatePersistedConfig) {
          const {
            updatedPins,
            updatedClockNode,
            initialControlValues,
            modifiedClockNodes,
            updatedProjects,
            clockFrequencies,
            aiModels,
          } = message.body.updatedConfig;

          const clockNodesPayload: ClockNodesPayload = {
            updatedClockNode,
            initialControlValues: initialControlValues as
              | Record<string, string>
              | undefined,
            modifiedClockNodes: modifiedClockNodes as Array<{
              Name: string;
              EnabledControls: Record<string, boolean>;
            }>,
          };

          await this.updatePersistedConfig(
            document,
            updatedPins as ConfiguredPin[],
            clockNodesPayload,
            updatedProjects as ConfiguredProject[],
            clockFrequencies as Record<string, string | number>,
            aiModels as AIModel[],
          );
        } else if (message.type === messageTypes.updatePersistedDfgConfig) {
          this.updateDFGConfig(document, message.body);
        } else if (message.type === messageTypes.updateProfilingConfig) {
          const { type, config, projectId } = message.body;

          this.updateProfilingConfig(document, config, type, projectId);
        } else if (message.type === messageTypes.getIsDocumentUnsaved) {
          request = Promise.resolve(document.isDirty);
        } else if (message.type === messageTypes.showSaveDialog) {
          const res = await vscode.window.showInformationMessage(
            "Save Config File?",
            {
              modal: true,
              detail: "To generate code you must first save your config file",
            },
            "Save",
          );

          if (res === "Save") {
            try {
              await document.save();

              request = Promise.resolve(document.uri.fsPath);
            } catch (error) {
              request = Promise.reject(error);
            }
          } else {
            request = Promise.resolve(null);
          }
        } else if (message.type === messageTypes.generateCode) {
          try {
            const dm = await this.assertDataModel(socName, packageId);

            if (document.isDirty) {
              const res = await vscode.window.showInformationMessage(
                "Save Config File?",
                {
                  modal: true,
                  detail:
                    "To generate code you must first save your config file",
                },
                "Save",
              );

              if (!res) {
                return; // User closed dialog
              }

              if (res === "Save") {
                await document.save();
              }
            }

            const selectedProjects = message.body?.selectedProjects as
              | CodeGenerationProject[]
              | undefined;

            if (!(selectedProjects ?? []).length) {
              vscode.window.showErrorMessage(
                "No valid projects were selected for code generation. Resolve any errors present and select at least one project.",
              );

              return;
            }

            const cfsconfig = this.getDocumentAsJson(document);

            // Patching disabled project as externally managed so that code generation for a given project is skipped,
            // but project information is preserved in the object provided to the code generator templates.
            // Also patches projects so that AI model code is only generated for selected projects
            cfsconfig.Projects = cfsconfig.Projects.map((project) => {
              const shouldSkipCodegen =
                project.ExternallyManaged ||
                !selectedProjects?.some(
                  (p) => p.projectId === project.ProjectId,
                );

              return {
                ...project,
                ExternallyManaged: shouldSkipCodegen,
                AIModels: selectedProjects?.some(
                  (p) => p.projectId === project.ProjectId && p.includeAI,
                )
                  ? project.AIModels
                  : undefined,
              };
            });

            const workspaceFile = vscode.workspace.workspaceFile;

            const workspacePath = workspaceFile
              ? path.dirname(workspaceFile.fsPath)
              : path.join(tmpdir(), "cfs").replace(/\\/g, "/");

            const generatedFilesPath: (string | CodeGenerationFailure)[] =
              (await pluginManager?.generateConfigCode(
                {
                  cfsconfig,
                  datamodel: dm,
                },
                workspacePath,
              )) ?? [];

            if (
              cfsconfig.Projects.some(
                (p) => p.AIModels && p.AIModels.length > 0,
              )
            ) {
              let cfsaiPath;
              try {
                cfsaiPath = await this.getCfsaiPath(this.toolManager);
              } catch (error) {
                vscode.window.showWarningMessage(
                  "Error resolving the path to the CodeFusion Studio AI tool. Skipping AI code generation",
                );
              }

              if (cfsaiPath) {
                // @TODO load plugin through the plugin manager rather than instantiating directly
                const aiPlugin = await getAiToolsPlugin(cfsaiPath);

                const aiFiles = await aiPlugin.generateCode(
                  {
                    cfsconfig,
                    datamodel: dm,
                  },
                  workspacePath,
                );
                generatedFilesPath.push(...aiFiles);
              } else {
                vscode.window.showWarningMessage(
                  "CodeFusion Studio AI package not found. Skipping AI code generation",
                );
              }
            }

            if (!generatedFilesPath.length) {
              throw new Error(
                "No files returned by the code generation plugin. This may be an issue with the plugin itself.",
              );
            }

            request = Promise.resolve(generatedFilesPath);

            const failures = generatedFilesPath.filter(
              (file) => typeof file !== "string",
            );
            if (failures.length) {
              vscode.window.showErrorMessage(
                `Code generation completed with errors. ${
                  generatedFilesPath.length - failures.length
                } files created.`,
              );
            } else {
              vscode.window.showInformationMessage(
                `Code generation completed successfully. ${
                  generatedFilesPath.length
                } files created.`,
              );
            }
          } catch (e) {
            console.error("Code generation error", e);
            vscode.window.showErrorMessage(
              `Code generation failed with error: ${(e as Error).message}`,
            );

            request = Promise.reject(e);
          }
        } else if (message.type === messageTypes.showInformationMessage) {
          const { message: text } = message.body;

          void vscode.window.showInformationMessage(text as string);

          request = Promise.resolve();
        } else if (message.type === messageTypes.getIsPeripheralBanner) {
          try {
            const isBanner =
              this.context.globalState.get("isPeripheralBanner") === undefined
                ? true
                : false;

            request = Promise.resolve(isBanner);
          } catch (error) {
            request = Promise.reject(error);
          }
        } else if (message.type === messageTypes.updateIsPeripheralBanner) {
          this.context.globalState.update(
            "isPeripheralBanner",
            message.body.flag,
          );
        } else if (message.type === messageTypes.getProperties) {
          try {
            const dm = await this.assertDataModel(socName, packageId);
            const { pluginId, pluginVersion, scope } = message.body;

            const socData = JSON.parse(JSON.stringify(dm)) as CfsSocDataModel;

            const controls = await pluginManager?.overrideSocControls(
              pluginId,
              pluginVersion,
              scope as CfsFeatureScope,
              socData,
            );

            request = Promise.resolve(controls);
          } catch (error) {
            vscode.window.showErrorMessage(
              `An error ocurred while fetching plugin properties: ${(error as Error).message}`,
            );

            request = Promise.reject(error);
          }
        } else if (message.type === messageTypes.showGenerateCodeWarning) {
          this.context.globalState.update(
            "show-generate-code-warning",
            message.body.flag,
          );
        } else if (message.type === messageTypes.getGenerateCodeWarning) {
          try {
            const showWarning =
              this.context.globalState.get("show-generate-code-warning") ===
              undefined
                ? true
                : false;

            request = Promise.resolve(showWarning);
          } catch (error) {
            request = Promise.reject(error);
          }
        } else if (message.type === messageTypes.exportCSV) {
          try {
            const { csvContent, defaultFileName } = message.body;

            const options: vscode.SaveDialogOptions = {
              defaultUri: vscode.Uri.file(`${defaultFileName ?? "export"}.csv`),
              filters: {
                "CSV Files": ["csv"],
              },
              saveLabel: "Export CSV",
            };

            const fileUri = await vscode.window.showSaveDialog(options);

            if (fileUri) {
              await vscode.workspace.fs.writeFile(
                fileUri,
                new TextEncoder().encode(csvContent),
              );

              vscode.window.showInformationMessage(
                `Stream table exported successfully to ${fileUri.fsPath}`,
              );

              request = Promise.resolve(fileUri.fsPath);
            } else {
              request = Promise.resolve(undefined);
            }
          } catch (error) {
            request = Promise.reject(error);
            vscode.window.showErrorMessage(
              `Failed to export CSV: ${(error as Error).message}`,
            );
          }
        } else if (message.type === messageTypes.openFile) {
          const { filePath } = message.body;
          vscode.commands.executeCommand(
            "vscode.open",
            vscode.Uri.file(filePath),
          );
        } else if (message.type === messageTypes.selectFile) {
          const { title, filters, canSelectFolders } = message.body;

          const workspaceRoot = vscode.workspace.workspaceFile
            ? Path.dirname(vscode.workspace.workspaceFile?.fsPath)
            : vscode.workspace.workspaceFolders?.[0].uri.fsPath;

          const options: vscode.OpenDialogOptions = {
            defaultUri: workspaceRoot
              ? vscode.Uri.file(workspaceRoot)
              : undefined,
            canSelectMany: false,
            openLabel: "Select",
            filters: filters,
            title: title ?? "Select a file",
            canSelectFolders: Boolean(canSelectFolders),
            canSelectFiles: !canSelectFolders,
          };

          try {
            const selectedFiles = await vscode.window.showOpenDialog(options);
            if (selectedFiles && selectedFiles.length > 0) {
              let path = selectedFiles[0].fsPath;
              if (
                message.body.relativeToWorkspaceRoot &&
                workspaceRoot &&
                path.startsWith(workspaceRoot)
              ) {
                path = Path.relative(workspaceRoot, path);
              }
              request = Promise.resolve(path);
            } else {
              request = Promise.resolve(null);
            }
          } catch (error) {
            request = Promise.reject(error);
          }
        } else if (message.type === messageTypes.getPreference) {
          const { id } = message.body;

          try {
            const value = await vscode.workspace
              .getConfiguration("cfs")
              .get(id);

            request = Promise.resolve(value);
          } catch (error) {
            request = Promise.reject(error);
          }
        } else if (message.type === messageTypes.setPreference) {
          const { id, value, scope } = message.body;

          try {
            await vscode.workspace
              .getConfiguration("cfs")
              .update(id, value, scope ?? vscode.ConfigurationTarget.Workspace);

            request = Promise.resolve();
          } catch (error) {
            request = Promise.reject(error);
          }
        } else if (message.type === messageTypes.getSupportedAiBackends) {
          try {
            const cfsaiPath = await this.getCfsaiPath(this.toolManager);

            request = getAiToolsPlugin(cfsaiPath).getSupportedBackends();
          } catch (error) {
            vscode.window.showErrorMessage(
              `An error ocurred while fetching the supported AI backends: ${
                (error as Error).message
              }`,
            );

            request = Promise.reject(error);
          }
        } else if (message.type === messageTypes.getAIBackendProperties) {
          const { scope } = message.body;

          const cfsaiPath = await this.getCfsaiPath(this.toolManager);

          request = getAiToolsPlugin(cfsaiPath).getProperties(scope);
        } else if (message.type === messageTypes.validateAIModel) {
          try {
            const dm = await this.assertDataModel(socName, packageId);
            const cfsaiPath = await this.getCfsaiPath(this.toolManager);

            const workspaceRoot = vscode.workspace.workspaceFile
              ? Path.dirname(vscode.workspace.workspaceFile?.fsPath)
              : vscode.workspace.workspaceFolders?.[0].uri.fsPath;

            const valid = await getAiToolsPlugin(cfsaiPath).runModelValidation(
              message.body.aiModel as AIModel,
              dm.Name,
              workspaceRoot,
            );
            request = Promise.resolve(valid);
          } catch (error) {
            vscode.window.showErrorMessage(
              `AI Model analysis failed: ${(error as Error).message}`,
            );
            request = Promise.reject(error);
          }
        } else if (message.type === messageTypes.analyzeAIModel) {
          try {
            const dm = await this.assertDataModel(socName, packageId);
            const cfsaiPath = await this.getCfsaiPath(this.toolManager);

            const workspaceRoot = vscode.workspace.workspaceFile
              ? Path.dirname(vscode.workspace.workspaceFile?.fsPath)
              : vscode.workspace.workspaceFolders?.[0].uri.fsPath;

            const reportPath = await getAiToolsPlugin(
              cfsaiPath,
            ).runModelAnalysis(
              message.body.aiModel as AIModel,
              dm.Name,
              workspaceRoot,
            );

            vscode.commands.executeCommand(
              "vscode.open",
              vscode.Uri.file(reportPath),
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `AI Model analysis failed: ${(error as Error).message}`,
            );
          } finally {
            request = Promise.resolve();
          }
        }

        if (request) {
          const { body, error } = await request.then(
            (body) => ({ body, error: undefined }),
            (error) => ({ body: undefined, error: error?.message }),
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
        changeDocumentSubscription.dispose();
      });

      await viewProviderPanel.resolveWebviewView(webviewPanel);
    } catch (error) {
      console.error("Error resolving custom text editor", error);

      const payload = toWebviewErrorPayload(error);
      await viewProviderPanel.resolveWebviewErrorView(webviewPanel, payload);
    }
  }

  /**
   * Get the current document as json
   */
  private getDocumentAsJson(document: vscode.TextDocument): CfsConfig {
    const text = document.getText();

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        "Could not get document as json. Content is not valid json",
      );
    }
  }

  private async updatePersistedConfig(
    document: vscode.TextDocument,
    updatedPins: ConfiguredPin[],
    clockNodesPayload: ClockNodesPayload,
    updatedProjects?: ConfiguredProject[],
    clockFrequencies?: Record<string, string | number>,
    aiModels?: AIModel[],
  ) {
    const edit = new vscode.WorkspaceEdit();
    const parsedDoc = this.getDocumentAsJson(document)!;
    const { ClockNodes } = parsedDoc;
    const { updatedClockNode, initialControlValues, modifiedClockNodes } =
      clockNodesPayload;
    parsedDoc.Timestamp = new Date().toISOString();

    if (updatedPins && modifiedClockNodes) {
      parsedDoc.Pins = updatedPins;
      parsedDoc.ClockNodes = this.updateClockNodes(
        ClockNodes,
        modifiedClockNodes,
      );
    }

    if (updatedClockNode && initialControlValues && modifiedClockNodes) {
      parsedDoc.ClockNodes = this.updateClockNodeAssignments(
        ClockNodes,
        updatedClockNode,
        initialControlValues,
      );
      parsedDoc.ClockNodes = this.updateClockNodes(
        parsedDoc.ClockNodes,
        modifiedClockNodes,
      );
    }

    if (updatedProjects) {
      parsedDoc.Projects = updatedProjects;
    }

    if (clockFrequencies) {
      parsedDoc.ClockFrequencies = clockFrequencies;
    }

    if (aiModels) {
      parsedDoc.Projects.forEach((project) => {
        project.AIModels = aiModels.filter(
          (model) =>
            model.Target.Core.toUpperCase() === project.CoreId.toUpperCase(),
        );
      });
    }

    edit.replace(
      document.uri,
      new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(document.lineCount, 0),
      ),
      JSON.stringify(parsedDoc, null, 2) + "\n",
    );

    await vscode.workspace.applyEdit(edit);
  }

  private updateClockNodes(
    clockNodes: ConfiguredClockNode[],
    modifiedClockNodes: Array<{
      Name: string;
      EnabledControls: Record<string, boolean>;
    }>,
  ) {
    return clockNodes.map((clockNode) => {
      const match = modifiedClockNodes.find(
        (modifiedClockNode) => modifiedClockNode.Name === clockNode.Name,
      );

      return match
        ? {
            ...clockNode,
            Enabled: Boolean(match?.EnabledControls[clockNode.Control]),
          }
        : clockNode;
    });
  }

  private updateClockNodeAssignments(
    clockNodes: ConfiguredClockNode[],
    updatedClockNode: ConfiguredClockNode,
    initialControlValues: Record<string, string> | undefined,
  ) {
    // If new value is the same as the initial default, remove from parsedDoc
    if (
      initialControlValues &&
      initialControlValues[updatedClockNode.Control] === updatedClockNode.Value
    ) {
      clockNodes = clockNodes.filter(
        (clockNode) =>
          !(
            clockNode.Name === updatedClockNode.Name &&
            clockNode.Control === updatedClockNode.Control
          ),
      );
    } else {
      const nodeToChange = clockNodes.find(
        (clockNode) =>
          clockNode.Control === updatedClockNode.Control &&
          clockNode.Name === updatedClockNode.Name,
      );

      // If there's an old entry, remove it before populating with the new one
      if (nodeToChange) {
        clockNodes = clockNodes.filter(
          (clockNode) =>
            !(
              clockNode.Name === nodeToChange.Name &&
              clockNode.Control === updatedClockNode.Control
            ),
        );
      }

      clockNodes = [...clockNodes, updatedClockNode];
    }

    return clockNodes;
  }

  private defaultProfilingData: Record<
    keyof Profiling,
    Profiling[keyof Profiling]
  > = {
    Zephelin: {
      Enabled: false,
      Format: "Text",
      Interface: "UART",
      AIEnabled: false,
      Port: 0,
    },
  };

  private async updateProfilingConfig(
    document: vscode.TextDocument,
    config: Partial<Profiling[keyof Profiling]>,
    type: keyof Profiling,
    projectId: string,
  ) {
    const edit = new vscode.WorkspaceEdit();
    const parsedDoc = this.getDocumentAsJson(document)!;

    const project = parsedDoc.Projects.find((p) => p.ProjectId === projectId);

    if (!project) {
      console.error(`Could not find project with id ${projectId}`);
      return;
    }

    if (!project.Profiling) {
      project.Profiling = {};
    }

    project.Profiling[type] = {
      ...this.defaultProfilingData[type],
      ...project.Profiling[type],
      ...config,
    } as Profiling[keyof Profiling];

    edit.replace(
      document.uri,
      new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(document.lineCount, 0),
      ),
      JSON.stringify(parsedDoc, null, 2) + "\n",
    );

    await vscode.workspace.applyEdit(edit);
  }

  private async updateDFGConfig(
    document: vscode.TextDocument,
    data: { streams: DFGStream[]; gaskets: GasketConfig[] },
  ) {
    const edit = new vscode.WorkspaceEdit();
    const parsedDoc = this.getDocumentAsJson(document)!;

    if (!parsedDoc.DFG) {
      parsedDoc.DFG = {
        Streams: [],
        Gaskets: [],
      };
    }

    parsedDoc.DFG.Streams = data.streams;
    parsedDoc.DFG.Gaskets = data.gaskets;

    edit.replace(
      document.uri,
      new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(document.lineCount, 0),
      ),
      JSON.stringify(parsedDoc, null, 2) + "\n",
    );

    await vscode.workspace.applyEdit(edit);
  }

  private async getCfsaiPath(toolManager: CfsToolManager): Promise<string> {
    const [toolInstance] =
      await toolManager.getInstalledToolsForId("cfsai.tool");

    if (!toolInstance) {
      throw new Error("Could not resolve path to cfsai the tool.");
    }

    const cfsaiPath = toolInstance.getPath();

    return cfsaiPath;
  }

  private async assertDataModel(socName: string, packageId: string) {
    const dm = await this.dataModelManager.getDataModel(socName, packageId);
    if (dm === undefined) {
      vscode.window.showErrorMessage(
        `No data model found for SoC "${socName}" with package "${packageId}". Please ensure the data model is installed.`,
      );

      // close the current editor
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor",
      );

      throw new Error("No data model found.");
    }
    return dm;
  }
}
