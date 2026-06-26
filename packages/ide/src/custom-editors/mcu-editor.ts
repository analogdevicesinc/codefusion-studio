/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import * as path from "path";
import { ViewProviderPanel } from "../view-provider/view-provider-panel";
import debounce from "lodash.debounce";
import { CONFIG_FILE_EXTENSION, MCU_EDITOR_ID } from "../constants";
import {
  CfsPluginManager,
  CfsToolManager,
  MissingDependencyError,
} from "cfs-lib";
import type {
  CfsPackageManagerProvider,
  CfsPackageReference,
} from "cfs-package-manager";
import type {
  CfsConfig,
  CfsFeatureScope,
  CfsSettings,
  ConfiguredClockNode,
  ConfiguredProject,
  ConfiguredPin,
  ConfiguredApplicationPackage,
  CfsSocDataModel,
  DFGStream,
  GasketConfig,
  AIModel,
  Profiling,
} from "cfs-types";
import { resolveVariables } from "../utils/resolveVariables";
import { tmpdir } from "os";
import { type CfsDataModelManager } from "cfs-lib";
import Path from "node:path";
import {
  CodeGenerationFailure,
  CodeGenerationProject,
} from "cfs-lib/dist/types/code-generation";
import { getAiToolsPlugin } from "cfs-lib";
import { createPrivateKey } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { AIToolsService, getCfsaiPath } from "../services/ai-tools-service";
import { Utils } from "../utils/utils";
import { CfsMissingComponent } from "cfs-types";
import { getCatalogManager } from "../utils/catalog";

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
  getMemoryAccessOverrides: "get-memory-access-overrides",
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
  getApplicationPackagesBanner: "get-application-package-banner",
  updateApplicationPackagesBanner: "update-application-package-banner",
  getDeleteAppPackWarning: "get-delete-app-pack-warning",
  showDeleteAppPackWarning: "show-delete-app-pack-warning",
  readPemAlgorithm: "read-pem-algorithm",
  checkDirectoryExists: "check-directory-exists",
  generatePemKey: "generate-pem-key",
  showDeleteCustomTLVWarning: "show-delete-custom-tlv-warning",
  getDeleteCustomTLVWarning: "get-delete-custom-tlv-warning",
  getFileSize: "get-file-size",
  updateMcubootConfig: "update-mcuboot-config",
  packager_install: "packager--install",
  packager_search: "packager--search",
  packager_update_persisted_cfsconfig_dataModel_version:
    "packager--update--persisted--cfsconfig--data-model--version",
  packager_update_persisted_cfsconfig_plugin_version:
    "packager--update--persisted--cfsconfig--plugin--version",
  document_reload: "document--reload",
};

type ClockNodesPayload = Partial<{
  updatedClockNode: ConfiguredClockNode;
  initialControlValues: Record<string, string> | undefined;
  modifiedClockNodes: Array<{
    Name: string;
    EnabledControls: Record<string, boolean>;
  }>;
}>;

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
        const pluginsCustomSearchPaths = [...(pluginSearchDirs ?? [])];

        pluginManager = new CfsPluginManager(
          this.dataModelManager,
          this.pkgManager,
          {
            pluginsCustomSearchPaths,
          },
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Plugin Manager failed to initialize. All code generation features will not work as expected. Error: ${
            (error as Error).message
          }`,
        );
        throw new Error(
          `Plugin Manager failed to initialize. All code generation features will not work as expected. Error: ${
            (error as Error).message
          }`,
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

      const missingDependencyList: CfsMissingComponent[] = [];

      // Validate data model is available
      try {
        await this.dataModelManager.validateDataModel(
          socName,
          packageId,
          dmVersion,
        );
      } catch (error) {
        if (
          error instanceof MissingDependencyError &&
          error.dependencyType === "data-model"
        ) {
          missingDependencyList.push({
            id: (error.details.packageId as string) ?? packageId,
            soc: (error.details.socName as string) ?? socName,
            version: (error.details.requestedVersion as string) ?? dmVersion,
            availableVersions:
              (error.details.availableVersions as string[]) ?? undefined,
            type: "data-model",
          });
        } else {
          throw error;
        }
      }

      // Validate all project plugins are available
      try {
        await pluginManager.validateConfigPlugins(cfsconfig);
      } catch (error) {
        if (
          error instanceof MissingDependencyError &&
          error.dependencyType === "plugin"
        ) {
          const plugins =
            (error.details.plugins as Array<{
              id: string;
              version: string;
              availableVersions?: string[];
            }>) ?? [];

          for (const p of plugins) {
            missingDependencyList.push({
              id: p.id,
              version: p.version,
              availableVersions: p.availableVersions,
              type: "plugin",
            });
          }
        } else {
          throw error;
        }
      }

      // Initialize catalog manager to enrich data model with catalog metadata
      let catalogSupportsMCUboot: boolean | undefined;
      const catalogManager = await getCatalogManager();
      if (catalogManager) {
        try {
          await catalogManager.loadCatalog();
          const allSocs = await catalogManager.socCatalog.getAll();
          const catalogSoc = allSocs.find(
            (soc) => soc.name.toLowerCase() === socName.toLowerCase(),
          );
          catalogSupportsMCUboot = catalogSoc?.supportsMCUboot ?? false;
        } catch (error) {
          console.warn("Failed to load catalog data", error);
          void vscode.window.showWarningMessage("Failed to load catalog data.");
        } finally {
          void catalogManager.dispose();
        }
      }

      // Listen for messages from the webview
      webviewPanel.webview.onDidReceiveMessage(async (message) => {
        let request;

        if (message.type === messageTypes.getSocAndConfig) {
          const dm = await this.dataModelManager.getDataModel(
            socName,
            packageId,
            dmVersion,
          );

          const enrichedDm =
            catalogSupportsMCUboot !== undefined
              ? { ...dm, supportsMCUboot: catalogSupportsMCUboot }
              : dm;

          request = Promise.resolve({
            dataModel: enrichedDm,
            configOptions: cfsconfig,
          });
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
        } else if (message.type === messageTypes.updateMcubootConfig) {
          const { settings, applicationPackages } = message.body;

          await this.updateMcubootConfig(
            document,
            settings as CfsSettings,
            applicationPackages as ConfiguredApplicationPackage[],
          );
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
            const dm = await this.dataModelManager.getDataModel(
              socName,
              packageId,
              dmVersion,
            );

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
              const selectedProject = selectedProjects?.find(
                (p) => p.projectId === project.ProjectId,
              );

              const shouldSkipCodegen =
                project.ExternallyManaged || !selectedProject;

              return {
                ...project,
                ExternallyManaged: shouldSkipCodegen,
                // disable all models in the project so no code is generated for them,
                // but keep the model information to be used by plugins
                AIModels: project.AIModels?.map((model) => ({
                  ...model,
                  Enabled: model.Enabled && !!selectedProject?.includeAI,
                })),
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
                const aiToolsService = new AIToolsService(cfsaiPath);
                const aiFiles = await aiToolsService.generateAiModelCode(
                  cfsconfig,
                  dm,
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
                `Code generation completed successfully. ${generatedFilesPath.length} files created.`,
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
            const dm = await this.dataModelManager.getDataModel(
              socName,
              packageId,
              dmVersion,
            );
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
              `An error occurred while fetching plugin properties: ${
                (error as Error).message
              }`,
            );

            request = Promise.reject(error);
          }
        } else if (message.type === messageTypes.getMemoryAccessOverrides) {
          try {
            const dm = await this.dataModelManager.getDataModel(
              socName,
              packageId,
              dmVersion,
            );

            const overrides =
              (await pluginManager?.getMemoryAccessOverrides(
                dm.Name,
                message.body.coreId,
              )) ?? undefined;

            request = Promise.resolve(overrides);
          } catch (error) {
            vscode.window.showErrorMessage(
              `An error occurred while fetching plugin overrides: ${
                (error as Error).message
              }`,
            );

            request = Promise.reject(error);
          }
        } else if (message.type === messageTypes.document_reload) {
          try {
            const uri = document.uri;
            await vscode.commands.executeCommand(
              "workbench.action.closeActiveEditor",
            );
            await vscode.commands.executeCommand("vscode.open", uri);
            request = Promise.resolve();
          } catch (error) {
            request = Promise.reject(error);
          }
        } else if (message.type === messageTypes.packager_install) {
          const references = message.body
            .referencesToInstall as CfsPackageReference[];

          const installResults: PromiseSettledResult<any>[] = [];

          for (const reference of references) {
            try {
              const value = await this.pkgManager?.install(reference);
              installResults.push({ status: "fulfilled", value });
            } catch (reason) {
              installResults.push({ status: "rejected", reason });
            }
          }

          const mappedResults = installResults.map((installResult, index) => {
            const reference = references[index];

            if (installResult.status === "fulfilled") {
              return {
                reference,
                success: true,
                data: installResult?.value?.[0],
              };
            } else {
              return {
                reference,
                success: false,
                error: installResult?.reason,
              };
            }
          });

          if (mappedResults.findIndex((r) => r.success === false) > -1) {
            vscode.window.showErrorMessage(
              `An error occurred while installing packages.`,
            );
          }

          request = Promise.resolve(mappedResults);
        } else if (message.type === messageTypes.packager_search) {
          const components = message.body.components as CfsMissingComponent[];

          try {
            const results = await Promise.all(
              components.map(async (component) => {
                const filter = {
                  name:
                    component.type === "data-model"
                      ? `${component.soc}:${component.id}`.toLowerCase()
                      : component.id,
                  type: component.type,
                };

                const packages =
                  (await this.pkgManager?.searchInfo(`*`, {
                    component: filter,
                  })) ?? [];

                return {
                  id: component.id,
                  packages,
                };
              }),
            );

            request = Promise.resolve(results);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(
              `An error occurred while searching for packages: ${errorMessage}`,
            );
            request = Promise.reject(error);
          }
        } else if (
          message.type ===
          messageTypes.packager_update_persisted_cfsconfig_dataModel_version
        ) {
          const { componentId, version } = message.body;

          const fn = (cfsConfig: CfsConfig): CfsConfig => {
            cfsConfig.DataModelVersion = version;
            return cfsConfig;
          };

          try {
            await this.updatePersistedWithFn(document, fn);
            request = Promise.resolve({
              componentId,
              success: true,
            });
          } catch (error) {
            request = Promise.reject({
              componentId,
              success: false,
              error,
            });
          }
        } else if (
          message.type ===
          messageTypes.packager_update_persisted_cfsconfig_plugin_version
        ) {
          const { componentId, version } = message.body;

          const fn = (cfsConfig: CfsConfig): CfsConfig => {
            for (const project of cfsConfig.Projects) {
              if (project.PluginId === componentId) {
                project.PluginVersion = version;
              }
            }

            return cfsConfig;
          };

          try {
            await this.updatePersistedWithFn(document, fn);
            request = Promise.resolve({
              componentId,
              success: true,
            });
          } catch (error) {
            request = Promise.reject({
              componentId,
              success: false,
              error,
            });
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
        } else if (message.type === messageTypes.showDeleteAppPackWarning) {
          request = this.context.globalState
            .update("show-delete-app-pack-warning", message.body.flag)
            .then(() => Promise.resolve());
        } else if (message.type === messageTypes.getDeleteAppPackWarning) {
          try {
            const storedValue = this.context.globalState.get<boolean>(
              "show-delete-app-pack-warning",
            );

            request = Promise.resolve(storedValue ?? true);
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
          const { filePath, editor } = message.body;
          if (editor) {
            vscode.commands.executeCommand(
              "vscode.openWith",
              vscode.Uri.file(filePath),
              editor,
            );
          } else {
            vscode.commands.executeCommand(
              "vscode.open",
              vscode.Uri.file(filePath),
            );
          }
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

            request = getAiToolsPlugin(
              cfsaiPath,
              Utils.getExtensionVersion(),
            ).getSupportedBackends();
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

          request = getAiToolsPlugin(
            cfsaiPath,
            Utils.getExtensionVersion(),
          ).getProperties(scope);
        } else if (message.type === messageTypes.validateAIModel) {
          try {
            const dm = await this.dataModelManager.getDataModel(
              socName,
              packageId,
              dmVersion,
            );

            const aiToolsService = new AIToolsService(
              await getCfsaiPath(this.toolManager),
            );

            const valid = await aiToolsService.validateAiModel(
              message.body.aiModel as AIModel,
              dm,
              socName,
              packageId,
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
            const dm = await this.dataModelManager.getDataModel(
              socName,
              packageId,
              dmVersion,
            );

            const aiToolsService = new AIToolsService(
              await getCfsaiPath(this.toolManager),
            );

            const reportPath = await aiToolsService.profileAiModel(
              message.body.aiModel as AIModel,
              dm,
              socName,
              packageId,
            );

            vscode.commands.executeCommand(
              "vscode.openWith",
              vscode.Uri.file(reportPath),
              "cfs.reportViewer",
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `AI Model analysis failed: ${(error as Error).message}`,
            );
          } finally {
            request = Promise.resolve();
          }
        } else if (message.type === messageTypes.getApplicationPackagesBanner) {
          try {
            const storedValue = this.context.globalState.get<boolean>(
              "isApplicationPackagesBannerVisible",
            );

            request = Promise.resolve(storedValue ?? true);
          } catch (error) {
            request = Promise.reject(error);
          }
        } else if (
          message.type === messageTypes.updateApplicationPackagesBanner
        ) {
          request = this.context.globalState
            .update("isApplicationPackagesBannerVisible", message.body.flag)
            .then(() => Promise.resolve());
        } else if (message.type === messageTypes.readPemAlgorithm) {
          const { filePath } = message.body;
          try {
            const pemContent = await readFile(filePath, "utf-8");
            const key = createPrivateKey(pemContent);
            const { asymmetricKeyType } = key;
            const keyDetail = key.asymmetricKeyDetails;

            let algorithm = "";
            if (asymmetricKeyType === "rsa") {
              const modulusLength = keyDetail?.modulusLength ?? 0;
              algorithm = `rsa-${String(modulusLength)}`;
            } else if (asymmetricKeyType === "ec") {
              const curve = keyDetail?.namedCurve ?? "";
              if (curve === "prime256v1" || curve === "P-256") {
                algorithm = "ecdsa-p256";
              } else {
                algorithm = `ecdsa-${curve}`;
              }
            } else {
              algorithm = asymmetricKeyType ?? "unknown";
            }

            request = Promise.resolve(algorithm);
          } catch (error) {
            request = Promise.reject(
              new Error(
                `Failed to read key algorithm: ${(error as Error).message}`,
              ),
            );
          }
        } else if (message.type === messageTypes.checkDirectoryExists) {
          const { dirPath } = message.body as { dirPath: string };

          try {
            const dirStat = await stat(dirPath);
            request = Promise.resolve(dirStat.isDirectory());
          } catch {
            request = Promise.resolve(false);
          }
        } else if (message.type === messageTypes.showDeleteCustomTLVWarning) {
          request = this.context.globalState
            .update("show-delete-custom-tlv-warning", message.body.flag)
            .then(() => Promise.resolve());
        } else if (message.type === messageTypes.getDeleteCustomTLVWarning) {
          try {
            const storedValue = this.context.globalState.get<boolean>(
              "show-delete-custom-tlv-warning",
            );

            request = Promise.resolve(storedValue ?? true);
          } catch (error) {
            request = Promise.reject(error);
          }
        } else if (message.type === messageTypes.getFileSize) {
          const { filePath } = message.body;
          try {
            const fileStats = await stat(filePath);
            request = Promise.resolve(fileStats.size);
          } catch (error) {
            request = Promise.reject(
              new Error(`Failed to get file size: ${(error as Error).message}`),
            );
          }
        } else if (message.type === messageTypes.generatePemKey) {
          const { filePath, algorithm } = message.body as {
            filePath: string;
            algorithm: string;
          };
          // This Zephyr-specific logic should be reworked in the future to keep the MCU editor firmware-agnostic.
          const zephyrPath = await this.toolManager.getToolPath("zephyr");

          if (!zephyrPath) {
            request = Promise.reject(
              new Error(
                "Zephyr package path not found. Please ensure the Zephyr package is installed and configured correctly.",
              ),
            );
          } else {
            const imgtoolPath = path.join(
              zephyrPath,
              "bootloader",
              "mcuboot",
              "scripts",
              "imgtool.py",
            );
            try {
              await stat(imgtoolPath);
            } catch {
              request = Promise.reject(
                new Error(
                  `imgtool.py not found at ${imgtoolPath}. Please ensure the Zephyr package is installed correctly.`,
                ),
              );
            }
            const sdkPath = await Utils.getSdkPath();
            const pythonExe = sdkPath
              ? path.join(
                  sdkPath,
                  "Tools",
                  "python",
                  process.platform === "win32" ? "python.exe" : "bin/python3",
                )
              : process.platform === "win32"
                ? "python"
                : "python3";
            request = new Promise<void>((resolve, reject) => {
              execFile(
                pythonExe,
                [imgtoolPath, "keygen", "-k", filePath, "-t", algorithm],
                (error, _stdout, stderr) => {
                  if (error) {
                    const errorMessage = stderr?.trim() || error.message;
                    reject(
                      new Error(`Failed to generate PEM key: ${errorMessage}`),
                    );
                    return;
                  }
                  resolve();
                },
              );
            });
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

      if (missingDependencyList.length > 0) {
        throw new MissingDependencyError("missing-components", {
          components: missingDependencyList,
        });
      }

      await viewProviderPanel.resolveWebviewView(webviewPanel);
    } catch (error) {
      console.error("Error resolving custom text editor", error);

      await viewProviderPanel.resolveWebviewErrorView(webviewPanel, error);
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

  private async updatePersistedWithFn(
    document: vscode.TextDocument,
    fn: (document: CfsConfig) => CfsConfig,
  ) {
    const edit = new vscode.WorkspaceEdit();
    const parsedDoc = this.getDocumentAsJson(document)!;

    fn(parsedDoc);

    // Ensure updated timestamp reference
    parsedDoc.Timestamp = new Date().toISOString();

    edit.replace(
      document.uri,
      new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(document.lineCount, 0),
      ),
      JSON.stringify(parsedDoc, null, 2) + "\n",
    );

    const success = await vscode.workspace.applyEdit(edit);

    if (success) {
      await document.save();
    } else {
      throw new Error("Could not edit the document.");
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
      Port: "",
      RtosEventsEnabled: false,
      ProfilingMemoryUsageEnabled: false,
      ProfilingMemoryUsageInterval: 0,
      ProfilingCpuLoadEnabled: false,
      ProfilingCpuLoadInterval: 0,
      InstrumentationSubsystemEnabled: false,
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

  private async updateMcubootConfig(
    document: vscode.TextDocument,
    settings: CfsSettings,
    applicationPackages: ConfiguredApplicationPackage[],
  ) {
    const edit = new vscode.WorkspaceEdit();
    const parsedDoc = this.getDocumentAsJson(document)!;

    parsedDoc.Timestamp = new Date().toISOString();
    parsedDoc.Settings = settings;
    parsedDoc.ApplicationPackages = applicationPackages;

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
    const toolInstance = await toolManager.getInstalledToolById("cfsai.tool");

    if (!toolInstance) {
      throw new Error("Could not resolve path to cfsai the tool.");
    }

    const cfsaiPath = toolInstance.rootPath;

    return cfsaiPath;
  }
}
