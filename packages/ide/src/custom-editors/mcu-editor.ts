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
import { MCU_EDITOR_ID } from "../constants";
import {
  CfsPluginManager,
  CfsToolManager,
  CURRENT_SCHEMA_VERSION,
  MissingDependencyError,
} from "cfs-lib";
import type { CfsPackageManagerProvider } from "cfs-package-manager";
import type {
  CfsConfig,
  CfsSocDataModel,
  ConfiguredClockNode,
  ConfiguredProject,
  ConfiguredPin,
  AIModel,
  Profiling,
  CfsSettings,
  ConfiguredApplicationPackage,
  DFGStream,
  FirewallConfig,
  GasketConfig,
  Zephelin,
} from "cfs-types";
import { resolveVariables } from "../utils/resolveVariables";
import { resolveZephyrBase } from "../utils/zephyr-base";
import { type CfsDataModelManager } from "cfs-lib";
import { getAiToolsPlugin } from "cfs-lib";
import { createPrivateKey } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { AIToolsService } from "../services/ai-tools-service";
import { Utils } from "../utils/utils";
import { CfsMissingComponent } from "cfs-types";
import { getCatalogManager } from "../utils/catalog";
import type { AuthService } from "../services/auth-service";
import { Messenger } from "vscode-messenger";
import { getTelemetryManager } from "../telemetry/telemetry";
import { TELEMETRY_ACTIONS } from "../telemetry/action-names";
import {
  findProjectByCoreId,
  mergePeripheralProjectUpdates,
} from "../utils/project-persistence";
import { applyResolvedVersionRequirements } from "../utils/resolved-version-requirements";
import {
  cancelGenerateCodeRequest,
  exportCsvRequest,
  generateCodeRequest,
  generatePemKeyRequest,
  getApplicationPackagesBannerRequest,
  getDeleteAppPackWarningRequest,
  getDeleteCustomTLVWarningRequest,
  getDeleteFirewallZoneWarningRequest,
  getDeleteInitiatorResponderWarningRequest,
  getGenerateCodeWarningRequest,
  getIsPeripheralBannerRequest,
  getMemoryAccessOverridesRequest,
  getPluginPropertiesRequest,
  getSocAndConfigRequest,
  packagerInstallRequest,
  packagerSearchRequest,
  packagerUpdatePersistedDataModelVersionRequest,
  packagerUpdatePersistedPluginVersionRequest,
  readPemAlgorithmRequest,
  setApplicationPackagesBannerRequest,
  setDeleteAppPackWarningRequest,
  setDeleteCustomTLVWarningRequest,
  setDeleteFirewallZoneWarningRequest,
  setDeleteInitiatorResponderWarningRequest,
  setGenerateCodeWarningNotification,
  showSRUResetUndoNotificationRequest,
  updateFirewallConfigNotification,
  updateIsPeripheralBannerNotification,
  updateMcubootConfigNotification,
  updatePersistedConfigNotification,
  updatePersistedDfgConfigNotification,
  updateProfilingConfigNotification,
  updateSRUConfigNotification,
} from "../constants/messages/cfgtools-messages";
import {
  analyzeAIModelRequest,
  getAIBackendPropertiesRequest,
  getSupportedAiBackendsRequest,
  validateAIModelRequest,
} from "../constants/messages/ai-tools-messages";

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
    messenger: Messenger,
    dataModelManager: CfsDataModelManager,
    toolManager: CfsToolManager,
    authService: AuthService,
    pkgManager?: CfsPackageManagerProvider,
  ): vscode.Disposable {
    const provider = new McuEditor(
      context,
      messenger,
      dataModelManager,
      toolManager,
      authService,
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

  /**
   * Tracks the in-flight code generation for each open webview panel, so that
   * only one generation can run per document and a panel can cancel its own
   * generation on request or on dispose.
   */
  private readonly activeCodeGenerations = new Map<
    vscode.WebviewPanel,
    {
      documentUri: string;
      cts: vscode.CancellationTokenSource;
      promise: Promise<string[] | undefined>;
    }
  >();

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly messenger: Messenger,
    private dataModelManager: CfsDataModelManager,
    private toolManager: CfsToolManager,
    private readonly authService: AuthService,
    private pkgManager?: CfsPackageManagerProvider,
  ) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ) {
    const participant = this.messenger.registerWebviewPanel(webviewPanel);

    const viewProviderPanel = new ViewProviderPanel(this.context, {
      distDir: "out/config-tools",
      indexPath: "out/config-tools/index.html",
    });

    try {
      const cfsconfig = this.getDocumentAsJson(document);
      const socName = cfsconfig.Soc ?? "";
      const packageId = cfsconfig.Package ?? "";
      const dmVersion = cfsconfig.DataModelVersion ?? "";

      // Report that the config tools editor was opened for this SoC.
      void getTelemetryManager().then((telemetryManager) => {
        telemetryManager.logAction(TELEMETRY_ACTIONS.CONFIG_TOOLS_OPENED, {
          socName,
          package: packageId,
          coreConfiguration: (cfsconfig.Projects ?? [])
            .map((project) => project.CoreId)
            .join(","),
        });
      });

      webviewPanel.webview.options = {
        enableScripts: true,
      };

      webviewPanel.onDidDispose(async () => {
        await this.cancelActiveGeneration(webviewPanel);
      });

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
        await pluginManager.validateConfigPlugins(
          cfsconfig,
          // We don't pass board in here, because that is irrelevant for project plugins.
          CfsPluginManager.buildSocContext(socName, packageId, undefined),
        );
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
      const catalogManager = await getCatalogManager(this.authService);
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

      // Register messenger handlers for messages from the webview
      const senderFilter = { sender: participant };

      this.messenger.onRequest(
        getSocAndConfigRequest,
        async () => {
          const dm = await this.dataModelManager.getDataModel(
            socName,
            packageId,
            dmVersion,
          );

          // We don't pass board in here, because that is irrelevant for project plugins.
          const socContext = CfsPluginManager.buildSocContext(
            socName,
            packageId,
            undefined,
          );
          const resolvedPluginVersionEntries = await Promise.all(
            cfsconfig.Projects.map(async (project) => {
              if (!project.PluginId || project.ExternallyManaged) {
                return undefined;
              }

              const plugin = await pluginManager.resolvePlugin(
                project.PluginId,
                project.PluginVersion,
                socContext,
              );

              return plugin
                ? ([project.ProjectId, plugin.pluginVersion] as const)
                : undefined;
            }),
          );
          const resolvedPluginVersions = Object.fromEntries(
            resolvedPluginVersionEntries.filter(
              (entry): entry is readonly [string, string] =>
                entry !== undefined,
            ),
          );

          let configOptions = cfsconfig;
          if (
            applyResolvedVersionRequirements(
              cfsconfig,
              dm.Version,
              resolvedPluginVersions,
            )
          ) {
            configOptions = await this.updatePersistedWithFn(
              document,
              (currentConfig) => {
                applyResolvedVersionRequirements(
                  currentConfig,
                  dm.Version,
                  resolvedPluginVersions,
                );

                return currentConfig;
              },
            );
          }

          const enrichedDm =
            catalogSupportsMCUboot !== undefined
              ? { ...dm, supportsMCUboot: catalogSupportsMCUboot }
              : dm;

          return {
            dataModel: enrichedDm,
            configOptions,
            resolvedPluginVersions,
          };
        },
        senderFilter,
      );

      this.messenger.onNotification(
        updatePersistedConfigNotification,
        async (updatedConfig) => {
          const {
            updatedPins,
            updatedClockNode,
            initialControlValues,
            modifiedClockNodes,
            updatedProjects,
            clockFrequencies,
            aiModels,
          } = updatedConfig;

          const clockNodesPayload: ClockNodesPayload = {
            updatedClockNode,
            initialControlValues,
            modifiedClockNodes,
          };

          await this.updatePersistedConfig(
            document,
            updatedPins as ConfiguredPin[],
            clockNodesPayload,
            updatedProjects,
            clockFrequencies,
            aiModels,
          );
        },
        senderFilter,
      );

      this.messenger.onNotification(
        updatePersistedDfgConfigNotification,
        (body) => {
          this.updateDFGConfig(document, body);
        },
        senderFilter,
      );

      this.messenger.onNotification(
        updateProfilingConfigNotification,
        ({ type, config, projectId }) => {
          this.updateProfilingConfig(document, config, type, projectId);
        },
        senderFilter,
      );

      this.messenger.onNotification(
        updateMcubootConfigNotification,
        async ({ settings, applicationPackages }) => {
          await this.updateMcubootConfig(
            document,
            settings,
            applicationPackages,
          );
        },
        senderFilter,
      );

      this.messenger.onNotification(
        updateSRUConfigNotification,
        async ({
          connections,
          descriptions,
          signalAliases,
          signalInversions,
        }) => {
          await this.updateSruConfig(
            document,
            connections,
            descriptions,
            signalAliases,
            signalInversions,
          );
        },
        senderFilter,
      );

      this.messenger.onRequest(
        showSRUResetUndoNotificationRequest,
        async ({ message, undoButtonLabel }) => {
          return new Promise<{ undo: boolean }>((resolve) => {
            let settled = false;
            const disposeListener = webviewPanel.onDidDispose(() => {
              if (!settled) {
                settled = true;
                disposeListener.dispose();
                resolve({ undo: false });
              }
            });

            void vscode.window
              .showInformationMessage(message, undoButtonLabel)
              .then((selection) => {
                if (!settled) {
                  settled = true;
                  disposeListener.dispose();
                  resolve({ undo: selection === undoButtonLabel });
                }
              });
          });
        },
        senderFilter,
      );

      this.messenger.onNotification(
        updateFirewallConfigNotification,
        async ({ firewall }) => {
          await this.updateFirewallConfig(document, firewall);
        },
        senderFilter,
      );

      this.messenger.onRequest(
        generateCodeRequest,
        async ({ selectedProjects }) => {
          const existingGeneration = [
            ...this.activeCodeGenerations.values(),
          ].find(
            (generation) => generation.documentUri === document.uri.toString(),
          );

          if (existingGeneration) {
            vscode.window.showErrorMessage(
              "Code generation is already running for this file.",
            );
            throw new Error(
              "Code generation is already running for this file.",
            );
          }

          const cts = new vscode.CancellationTokenSource();
          const codeGenStart = Date.now();

          const generation = (async (): Promise<string[] | undefined> => {
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

              let workspacePath: string;
              if (workspaceFile) {
                workspacePath = path.dirname(workspaceFile.fsPath);
              } else {
                const configDir = path.dirname(document.uri.fsPath);
                workspacePath =
                  path.basename(configDir) === ".cfs"
                    ? path.dirname(configDir)
                    : configDir;

                const l10n = (vscode.l10n.bundle as Record<string, any>)
                  ?.cfgtools?.generateCode?.directoryModal;

                const res = await vscode.window.showInformationMessage(
                  l10n?.title ?? "Code Generation Directory",
                  {
                    modal: true,
                    detail: (
                      l10n?.detail ??
                      "Code will be generated in the {workspacePath} directory."
                    ).replace("{workspacePath}", workspacePath),
                  },
                  l10n?.confirm ?? "OK",
                );

                if (!res) {
                  return; // User closed dialog
                }
              }

              // Resolve Zephyr base for board DTS detection, scoped to this
              // config's SoC rather than the extension's startup-time target.
              const zephyrBase = await resolveZephyrBase(
                socName,
                this.pkgManager,
              );

              const generatedFilesPath: string[] =
                (await pluginManager?.generateConfigCode(
                  {
                    cfsconfig,
                    datamodel: dm,
                  },
                  workspacePath,
                  { zephyrBase },
                )) ?? [];

              if (
                cfsconfig.Projects.some(
                  (p) => p.AIModels && p.AIModels.length > 0,
                )
              ) {
                let cfsaiPath;
                try {
                  cfsaiPath = await this.getCfsaiPath(this.toolManager);
                } catch {
                  vscode.window.showWarningMessage(
                    "Error resolving the path to the CodeFusion Studio AI tool. Skipping AI code generation",
                  );
                }

                if (cfsaiPath) {
                  const aiToolsService = new AIToolsService(
                    cfsaiPath,
                    this.pkgManager,
                  );
                  const aiFiles = await aiToolsService.generateAiModelCode(
                    cfsconfig,
                    dm,
                    workspacePath,
                    this.authService.requireConfig(),
                    cts.token,
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

              const telemetryManager = await getTelemetryManager();
              telemetryManager.logAction(TELEMETRY_ACTIONS.CODE_GENERATED, {
                selectedProjectCount: (selectedProjects ?? []).length,
                includesAiModel: (selectedProjects ?? []).some(
                  (project) => project.includeAI,
                ),
                generatedFileCount: generatedFilesPath.length,
                durationMs: Date.now() - codeGenStart,
              });
              vscode.window.showInformationMessage(
                `Code generation completed successfully. ${generatedFilesPath.length} files created.`,
              );

              return generatedFilesPath;
            } catch (e) {
              console.error("Code generation error", e);

              if (!cts.token.isCancellationRequested) {
                const telemetryManager = await getTelemetryManager();
                telemetryManager.logAction(
                  TELEMETRY_ACTIONS.CODE_GENERATION_FAILED,
                  {
                    errorType: "CodeGenerationFailure",
                    failureCount: 1,
                    durationMs: Date.now() - codeGenStart,
                  },
                );

                vscode.window.showErrorMessage(
                  `Code generation failed with error: ${(e as Error).message}`,
                );
              }

              throw e;
            }
          })();

          this.activeCodeGenerations.set(webviewPanel, {
            documentUri: document.uri.toString(),
            cts,
            promise: generation,
          });

          try {
            return await generation;
          } finally {
            this.activeCodeGenerations.delete(webviewPanel);
            cts.dispose();
          }
        },
        senderFilter,
      );

      this.messenger.onRequest(
        cancelGenerateCodeRequest,
        async () => {
          await this.cancelActiveGeneration(webviewPanel);
        },
        senderFilter,
      );

      this.messenger.onRequest(
        getIsPeripheralBannerRequest,
        () => this.context.globalState.get("isPeripheralBanner") === undefined,
        senderFilter,
      );

      this.messenger.onNotification(
        updateIsPeripheralBannerNotification,
        ({ flag }) => {
          this.context.globalState.update("isPeripheralBanner", flag);
        },
        senderFilter,
      );

      this.messenger.onRequest(
        getPluginPropertiesRequest,
        async ({ pluginId, pluginVersion, scope }) => {
          try {
            const dm = await this.dataModelManager.getDataModel(
              socName,
              packageId,
              dmVersion,
            );

            const socData = JSON.parse(JSON.stringify(dm)) as CfsSocDataModel;

            return (
              (await pluginManager?.overrideSocControls(
                pluginId,
                pluginVersion,
                scope,
                socData,
                packageId,
              )) ?? {}
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `An error occurred while fetching plugin properties: ${
                (error as Error).message
              }`,
            );

            throw error;
          }
        },
        senderFilter,
      );

      this.messenger.onRequest(
        getMemoryAccessOverridesRequest,
        async ({ coreId }) => {
          try {
            const dm = await this.dataModelManager.getDataModel(
              socName,
              packageId,
              dmVersion,
            );

            return (
              (await pluginManager?.getMemoryAccessOverrides(
                dm.Name,
                coreId,
              )) ?? undefined
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `An error occurred while fetching plugin overrides: ${
                (error as Error).message
              }`,
            );

            throw error;
          }
        },
        senderFilter,
      );

      this.messenger.onRequest(
        packagerInstallRequest,
        async ({ referencesToInstall }) => {
          const installResults: PromiseSettledResult<any>[] = [];

          for (const reference of referencesToInstall) {
            try {
              const value = await this.pkgManager?.install(reference);
              installResults.push({ status: "fulfilled", value });
            } catch (reason) {
              installResults.push({ status: "rejected", reason });
            }
          }

          const mappedResults = installResults.map((installResult, index) => {
            const reference = referencesToInstall[index];

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

          return mappedResults;
        },
        senderFilter,
      );

      this.messenger.onRequest(
        packagerSearchRequest,
        async ({ components }) => {
          try {
            return await Promise.all(
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
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(
              `An error occurred while searching for packages: ${errorMessage}`,
            );

            throw error;
          }
        },
        senderFilter,
      );

      this.messenger.onRequest(
        packagerUpdatePersistedDataModelVersionRequest,
        async ({ componentId, version }) => {
          const fn = (cfsConfig: CfsConfig): CfsConfig => {
            cfsConfig.DataModelVersion = version;
            return cfsConfig;
          };

          try {
            await this.updatePersistedWithFn(document, fn);
            return { componentId, success: true };
          } catch (error) {
            return {
              componentId,
              success: false,
              error: (error as Error).message,
            };
          }
        },
        senderFilter,
      );

      this.messenger.onRequest(
        packagerUpdatePersistedPluginVersionRequest,
        async ({ componentId, version }) => {
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
            return { componentId, success: true };
          } catch (error) {
            return {
              componentId,
              success: false,
              error: (error as Error).message,
            };
          }
        },
        senderFilter,
      );

      this.messenger.onNotification(
        setGenerateCodeWarningNotification,
        ({ flag }) => {
          this.context.globalState.update("show-generate-code-warning", flag);
        },
        senderFilter,
      );

      this.messenger.onRequest(
        getGenerateCodeWarningRequest,
        () =>
          this.context.globalState.get("show-generate-code-warning") ===
          undefined,
        senderFilter,
      );

      this.messenger.onRequest(
        setDeleteAppPackWarningRequest,
        async ({ flag }) => {
          await this.context.globalState.update(
            "show-delete-app-pack-warning",
            flag,
          );
        },
        senderFilter,
      );

      this.messenger.onRequest(
        getDeleteAppPackWarningRequest,
        () =>
          this.context.globalState.get<boolean>(
            "show-delete-app-pack-warning",
          ) ?? true,
        senderFilter,
      );

      this.messenger.onRequest(
        setDeleteFirewallZoneWarningRequest,
        async ({ flag }) => {
          await this.context.globalState.update(
            "show-delete-firewall-zone-warning",
            flag,
          );
        },
        senderFilter,
      );

      this.messenger.onRequest(
        getDeleteFirewallZoneWarningRequest,
        () =>
          this.context.globalState.get<boolean>(
            "show-delete-firewall-zone-warning",
          ) ?? true,
        senderFilter,
      );

      this.messenger.onRequest(
        setDeleteInitiatorResponderWarningRequest,
        async ({ flag }) => {
          await this.context.globalState.update(
            "show-delete-initiator-responder-warning",
            flag,
          );
        },
        senderFilter,
      );

      this.messenger.onRequest(
        getDeleteInitiatorResponderWarningRequest,
        () =>
          this.context.globalState.get<boolean>(
            "show-delete-initiator-responder-warning",
          ) ?? true,
        senderFilter,
      );

      this.messenger.onRequest(
        exportCsvRequest,
        async ({ csvContent, defaultFileName }) => {
          try {
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

              return fileUri.fsPath;
            }

            return undefined;
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to export CSV: ${(error as Error).message}`,
            );
            throw error;
          }
        },
        senderFilter,
      );

      this.messenger.onRequest(
        getSupportedAiBackendsRequest,
        async () => {
          try {
            const cfsaiPath = await this.getCfsaiPath(this.toolManager);

            return await getAiToolsPlugin(
              cfsaiPath,
              Utils.getExtensionVersion(),
              this.pkgManager,
            ).getSupportedBackends();
          } catch (error) {
            vscode.window.showErrorMessage(
              `An error ocurred while fetching the supported AI backends: ${
                (error as Error).message
              }`,
            );

            throw error;
          }
        },
        senderFilter,
      );

      this.messenger.onRequest(
        getAIBackendPropertiesRequest,
        async ({ scope }) => {
          const cfsaiPath = await this.getCfsaiPath(this.toolManager);

          return getAiToolsPlugin(
            cfsaiPath,
            Utils.getExtensionVersion(),
            this.pkgManager,
          ).getProperties(scope);
        },
        senderFilter,
      );

      this.messenger.onRequest(
        validateAIModelRequest,
        async ({ aiModel }) => {
          try {
            const telemetryManager = await getTelemetryManager();
            telemetryManager.logAction(
              TELEMETRY_ACTIONS.AI_COMPAT_CHECK_STARTED,
              {
                targetCore: aiModel.Target.Core,
                targetAccelerator: aiModel.Target.Accelerator,
              },
            );

            const currentConfig = this.getDocumentAsJson(document);
            const project = findProjectByCoreId(
              currentConfig.Projects ?? [],
              aiModel.Target.Core,
            );

            const dm = await this.dataModelManager.getDataModel(
              socName,
              packageId,
              dmVersion,
            );

            const aiToolsService = new AIToolsService(
              await this.getCfsaiPath(this.toolManager),
              this.pkgManager,
            );
            const valid = await aiToolsService.validateAiModel(
              aiModel,
              dm,
              socName,
              packageId,
              project,
            );
            telemetryManager.logAction(
              valid.isValid
                ? TELEMETRY_ACTIONS.AI_MODEL_CHECK_SUCCESS
                : TELEMETRY_ACTIONS.AI_MODEL_CHECK_FAILURE,
              {
                soc: socName,
                packageId,
                dataModelVersion: dmVersion,
                model_format: path
                  .extname(aiModel?.Files?.Model ?? "")
                  .replace(".", ""),
              },
            );

            if (!valid.isValid) {
              telemetryManager.logAction(
                TELEMETRY_ACTIONS.AI_COMPAT_REPORT_OPEN,
                {},
              );
            }

            return valid;
          } catch (error) {
            vscode.window.showErrorMessage(
              `AI Model compatibility failed: ${(error as Error).message}`,
            );
            throw error;
          }
        },
        senderFilter,
      );

      this.messenger.onRequest(
        analyzeAIModelRequest,
        async ({ aiModel }) => {
          let telemetryManager:
            | Awaited<ReturnType<typeof getTelemetryManager>>
            | undefined;
          try {
            telemetryManager = await getTelemetryManager();

            const currentConfig = this.getDocumentAsJson(document);
            const project = findProjectByCoreId(
              currentConfig.Projects ?? [],
              aiModel.Target.Core,
            );

            const dm = await this.dataModelManager.getDataModel(
              socName,
              packageId,
              dmVersion,
            );

            const aiToolsService = new AIToolsService(
              await this.getCfsaiPath(this.toolManager),
              this.pkgManager,
            );

            const reportPath = await aiToolsService.profileAiModel(
              aiModel,
              dm,
              socName,
              packageId,
              project,
            );

            await vscode.commands.executeCommand(
              "vscode.openWith",
              vscode.Uri.file(reportPath),
              "cfs.reportViewer",
            );

            telemetryManager.logAction(
              TELEMETRY_ACTIONS.AI_PROFILING_REPORT_OPEN,
              {},
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `AI Model profiling failed: ${(error as Error).message}`,
            );
          }
        },
        senderFilter,
      );

      this.messenger.onRequest(
        getApplicationPackagesBannerRequest,
        () =>
          this.context.globalState.get<boolean>(
            "isApplicationPackagesBannerVisible",
          ) ?? true,
        senderFilter,
      );

      this.messenger.onRequest(
        setApplicationPackagesBannerRequest,
        async ({ flag }) => {
          await this.context.globalState.update(
            "isApplicationPackagesBannerVisible",
            flag,
          );
        },
        senderFilter,
      );

      this.messenger.onRequest(
        readPemAlgorithmRequest,
        async ({ filePath }) => {
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

            return algorithm;
          } catch (error) {
            throw new Error(
              `Failed to read key algorithm: ${(error as Error).message}`,
            );
          }
        },
        senderFilter,
      );

      this.messenger.onRequest(
        setDeleteCustomTLVWarningRequest,
        async ({ flag }) => {
          await this.context.globalState.update(
            "show-delete-custom-tlv-warning",
            flag,
          );
        },
        senderFilter,
      );

      this.messenger.onRequest(
        getDeleteCustomTLVWarningRequest,
        () =>
          this.context.globalState.get<boolean>(
            "show-delete-custom-tlv-warning",
          ) ?? true,
        senderFilter,
      );

      this.messenger.onRequest(
        generatePemKeyRequest,
        async ({ filePath, algorithm }) => {
          // This Zephyr-specific logic should be reworked in the future to keep the MCU editor firmware-agnostic.
          const zephyrPath = await this.toolManager.getToolPath("zephyr");

          if (!zephyrPath) {
            throw new Error(
              "Zephyr package path not found. Please ensure the Zephyr package is installed and configured correctly.",
            );
          }

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
            throw new Error(
              `imgtool.py not found at ${imgtoolPath}. Please ensure the Zephyr package is installed correctly.`,
            );
          }
          const sdkPath = Utils.getSdkPath();
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

          await new Promise<void>((resolve, reject) => {
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
        },
        senderFilter,
      );

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
  ): Promise<CfsConfig> {
    const edit = new vscode.WorkspaceEdit();
    const parsedDoc = this.getDocumentAsJson(document)!;
    const updatedDoc = fn(parsedDoc);

    // Ensure updated timestamp reference
    updatedDoc.Timestamp = new Date().toISOString();

    edit.replace(
      document.uri,
      new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(document.lineCount, 0),
      ),
      JSON.stringify(updatedDoc, null, 2) + "\n",
    );

    const success = await vscode.workspace.applyEdit(edit);

    if (success) {
      await document.save();
    } else {
      throw new Error("Could not edit the document.");
    }

    return updatedDoc;
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
      parsedDoc.Projects = mergePeripheralProjectUpdates(
        parsedDoc.Projects ?? [],
        updatedProjects,
      );
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
        project.AIModels.forEach((model) => {
          const extensions = model.Backend?.Extensions;
          // trim all string values in the extensions and files objects
          // to avoid issues with leading/trailing whitespace or only whitespace values
          if (extensions) {
            Object.keys(extensions).forEach((key) => {
              const value = extensions[key];
              if (typeof value === "string") {
                extensions[key] = value.trim();
              }
            });
          }
          const files = model.Files;
          if (files) {
            Object.keys(files).forEach((key) => {
              const value = files[key];
              files[key] = value?.trim();
              if (files[key] === "") {
                delete files[key];
              }
            });
          }
        });
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
      Format: "TEXT",
      Interface: { Type: "UART", Port: "" },
      AIEnabled: false,
      RtosEventsEnabled: false,
      ProfilingMemoryUsageEnabled: false,
      ProfilingMemoryUsageInterval: 0,
      ProfilingCpuLoadEnabled: false,
      ProfilingCpuLoadInterval: 0,
      InstrumentationSubsystemEnabled: false,
      InstrumentationTriggerFunction: "",
      InstrumentationStopperFunction: "",
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

    if (type === "Zephelin") {
      const zephelin = project.Profiling[type] as Zephelin;

      // The legacy top-level Port is superseded by Interface.Port once the
      // interface has been normalized to the object form; a plain merge
      // can't express removing it, so it must be dropped explicitly here.
      if (typeof zephelin.Interface === "object") {
        delete zephelin.Port;
      }
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

  private async updateFirewallConfig(
    document: vscode.TextDocument,
    firewall: FirewallConfig,
  ) {
    const edit = new vscode.WorkspaceEdit();
    const parsedDoc = this.getDocumentAsJson(document)!;

    parsedDoc.Timestamp = new Date().toISOString();

    parsedDoc.SchemaVersion = CURRENT_SCHEMA_VERSION;
    parsedDoc.FirewallConfig = firewall;

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

  private async updateSruConfig(
    document: vscode.TextDocument,
    connections: Record<string, string>,
    descriptions: Record<string, string>,
    signalAliases: Record<string, string>,
    signalInversions: Record<string, boolean>,
  ) {
    const edit = new vscode.WorkspaceEdit();
    const parsedDoc = this.getDocumentAsJson(document)!;

    parsedDoc.Timestamp = new Date().toISOString();
    parsedDoc.Sru = {
      Connections: connections,
      UserDescriptions: descriptions,
      SignalAliases: signalAliases,
      SignalInversions: signalInversions,
    };

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

  /**
   * Cancels the in-flight code generation owned by the given panel, if any.
   * Shows progress while waiting for the generation to actually unwind, and
   * a confirmation once it has stopped.
   */
  private async cancelActiveGeneration(
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    const generation = this.activeCodeGenerations.get(panel);

    if (!generation) {
      return;
    }

    generation.cts.cancel();

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Cancelling code generation...",
      },
      async () => {
        // The generation promise is expected to reject once cancelled;
        // that failure is already handled by the generation's own catch
        // block, so it is safe to ignore here.
        await generation.promise.catch(() => undefined);
      },
    );

    vscode.window.showInformationMessage("Code generation cancelled.");
  }
}
