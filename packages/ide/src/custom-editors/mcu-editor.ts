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
import { createUnsavedFile } from "../utils/document";
import debounce from "lodash.debounce";
import { CONFIG_FILE_EXTENSION, MCU_EDITOR_ID } from "../constants";
import { getExportEngines, getSoc, getSocs } from "../cli";
import * as fs from "fs";
import { CfsPluginManager } from "cfs-lib";
import {
  CfsConfig,
  CfsFeatureScope,
  ConfiguredClockNode,
  ConfiguredProject,
  ConfiguredPin,
} from "cfs-plugins-api";
import { resolveVariables } from "../utils/resolveVariables";
import { tmpdir } from "os";

const messageTypes = {
  getSocAndConfig: "get-soc-and-config",
  getSocs: "get-socs",
  getSoc: "get-soc",
  getExportEngines: "get-export-engines",
  getIsDocumentUnsaved: "get-is-document-unsaved",
  updatePersistedConfig: "update-persisted-config",
  showSaveDialog: "show-save-dialog",
  generateCode: "generate-code",
  showInformationMessage: "show-information-message",
  getCores: "get-cores",
  getSocControls: "get-soc-controls",
  getClockCanvas: "get-clock-canvas",
  getClockNodes: "get-clock-nodes",
  getRegisters: "get-registers",
  getSocPackage: "get-soc-package",
  getPinCanvas: "get-pin-canvas",
  getSocPeripherals: "get-soc-peripherals",
  getMemoryTypes: "get-memory-types",
  getIsPeripheralBanner: "get-is-peripheral-banner",
  updateIsPeripheralBanner: "update-is-peripheral-banner",
  getProperties: "get-properties",
  showGenerateCodeWarning: "show-generate-code-warning",
  getGenerateCodeWarning: "get-generate-code-warning",
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
};

// To do: would be nice to import some of the above types instead of duplicating.. But due to current tsconfig structure is not possible

export class McuEditor implements vscode.CustomTextEditorProvider {
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new McuEditor(context);

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

  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ) {
    try {
      webviewPanel.webview.options = {
        enableScripts: true,
      };

      const showWarningMessageDebounced = debounce(
        (message: string) => vscode.window.showWarningMessage(message),
        2000,
      );

      const viewProviderPanel = new ViewProviderPanel(this.context, {
        distDir: "out/config-tools",
        indexPath: "out/config-tools/index.html",
      });

      const parsedDoc = this.getDocumentAsJson(document);
      if (!parsedDoc) {
        const error = new Error("Invalid JSON document.");
        await vscode.window.showErrorMessage(error.message);
        throw error;
      }

      const pluginSearchDirs = vscode.workspace
        .getConfiguration("cfs")
        .get<string[]>("plugins.searchDirectories")
        ?.map((dir) => resolveVariables(dir, true));

      const dataModelSearchDirs = vscode.workspace
        .getConfiguration("cfs")
        .get<string[]>("plugins.dataModelSearchDirectories")
        ?.map((dir) => resolveVariables(dir, true));

      let pluginManager: CfsPluginManager | undefined;

      try {
        const searchPaths = [
          ...(pluginSearchDirs ?? []),
          ...(dataModelSearchDirs ?? []),
        ];
        pluginManager = new CfsPluginManager(searchPaths);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Plugin Manager failed to initialize. All code generation features will not work as expected. Error: ${(error as Error).message}`,
        );
      }

      if ("Timestamp" in parsedDoc) {
        const mcuId = parsedDoc.Soc ?? "";
        const packageId = parsedDoc.Package ?? "";

        const socId =
          `${mcuId}${packageId ? `-${packageId}` : ""}`.toLowerCase();

        const dataModel = await getSoc(socId);

        Object.freeze(dataModel);

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

              // Low time difference between updates mean the update was generated thru the ui
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

        // Listen for messages from the webview
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
          let request;

          if (message.type === messageTypes.getSocs) {
            request = getSocs();
          } else if (message.type === messageTypes.getSoc) {
            request = Promise.resolve(dataModel);
          } else if (message.type === messageTypes.getSocAndConfig) {
            request = Promise.resolve({
              dataModel,
              configOptions: parsedDoc,
            });
          } else if (message.type === messageTypes.updatePersistedConfig) {
            const {
              updatedPins,
              updatedClockNode,
              initialControlValues,
              modifiedClockNodes,
              updatedProjects,
              clockFrequencies,
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
              parsedDoc,
              updatedPins as ConfiguredPin[],
              clockNodesPayload,
              updatedProjects as ConfiguredProject[],
              clockFrequencies as Record<string, string | number>,
            );
          } else if (message.type === messageTypes.getExportEngines) {
            request = getExportEngines();
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

              const cfsconfig = this.getDocumentAsJson(
                document,
              )! as unknown as CfsConfig;

              const selectedProjectIds = message.body?.selectedProjectIds as
                | string[]
                | undefined;

              if (!(selectedProjectIds ?? []).length) {
                vscode.window.showErrorMessage(
                  "No valid projects were selected for code generation. Resolve any errors present and select at least one project.",
                );

                return;
              }

              // Patching disabled project as externally managed so that code generation for a given project is skipped,
              // but project information is preserved in the object provided to the code generator templates.
              cfsconfig.Projects = cfsconfig.Projects.map((project) => {
                const shouldSkipCodegen =
                  project.ExternallyManaged ||
                  !selectedProjectIds?.includes(project.ProjectId);

                return {
                  ...project,
                  ExternallyManaged: shouldSkipCodegen,
                };
              });

              const workspaceFile = vscode.workspace.workspaceFile;

              const workspacePath = workspaceFile
                ? path.dirname(workspaceFile.fsPath)
                : path.join(tmpdir(), "cfs").replace(/\\/g, "/");

              const generatedFilesPath =
                (await pluginManager?.generateConfigCode(
                  {
                    cfsconfig,
                    datamodel: dataModel,
                  },
                  workspacePath,
                )) ?? [];

              if (!generatedFilesPath.length) {
                throw new Error(
                  "No files returned by the code generation plugin. This may be an issue with the plugin itself.",
                );
              }

              request = Promise.resolve(generatedFilesPath);

              vscode.window.showInformationMessage(
                `Code generation completed successfully. ${
                  generatedFilesPath.length
                } files created.`,
              );
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
          } else if (message.type === messageTypes.getCores) {
            request = Promise.resolve(dataModel.Cores);
          } else if (message.type === messageTypes.getMemoryTypes) {
            request = Promise.resolve(dataModel.MemoryTypes);
          } else if (message.type === messageTypes.getSocControls) {
            request = Promise.resolve(dataModel.Controls);
          } else if (message.type === messageTypes.getClockCanvas) {
            const canvas = dataModel.Packages[0].ClockCanvas;

            request = Promise.resolve(canvas);
          } else if (message.type === messageTypes.getClockNodes) {
            request = Promise.resolve(dataModel.ClockNodes);
          } else if (message.type === messageTypes.getRegisters) {
            request = Promise.resolve(dataModel.Registers);
          } else if (message.type === messageTypes.getSocPackage) {
            request = Promise.resolve(dataModel.Packages[0]);
          } else if (message.type === messageTypes.getPinCanvas) {
            request = Promise.resolve(dataModel.Packages[0]?.PinCanvas);
          } else if (message.type === messageTypes.getSocPeripherals) {
            request = Promise.resolve(dataModel.Peripherals);
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
              const { pluginId, pluginVersion, scope } = message.body;

              const controls = await pluginManager?.getProperties(
                pluginId,
                pluginVersion,
                scope as CfsFeatureScope,
                JSON.parse(JSON.stringify(dataModel)),
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
      }
    } catch (error) {
      console.error("Error resolving custom text editor", error);
    }
  }

  /**
   * Parse the file contents, looking for project dependencies that need to be added
   * to project.mk, such as USB and bluetooth.
   * @param fileContents - the file contents to parse
   */
  private parseProjectDependencies(fileContents: string[]): Set<string> {
    const dependencies: Set<string> = new Set<string>();

    fileContents.forEach((line) => {
      if (line.match(/.*MXC_SYS_ClockEnable\(MXC_SYS_PERIPH_CLOCK_USB\).*/)) {
        dependencies.add("LIB_MAXUSB=1");
      }
      if (line.match(/.*MXC_SYS_ClockEnable\(MXC_SYS_PERIPH_CLOCK_BTLE\).*/)) {
        dependencies.add("LIB_CORDIO=1");
      }
    });

    return dependencies;
  }

  /**
   * Add dependencies to the end of the project.mk file.
   * @param projectMk - path to the project.mk file to update
   * @param projectDeps - dependencies to add, if not already present
   * @returns the modified project.mk file as a document or null if no changes were made
   */
  private async updateProjectMk(
    projectMk: string,
    projectDeps: Set<string>,
  ): Promise<vscode.TextDocument | null> {
    if (fs.existsSync(projectMk)) {
      let projectMkContents = fs.readFileSync(projectMk, "utf-8");

      let depsToAdd = false;
      for (const dep of projectDeps) {
        // skip dependencies that are already in the file
        if (projectMkContents.match(new RegExp(`.*${dep}.*`))) {
          continue;
        }

        projectMkContents = projectMkContents.concat(`\n${dep}`);
        depsToAdd = true;
      }

      // don't modify the project.mk file unless there are changes to add
      if (depsToAdd) {
        return createUnsavedFile(projectMk, projectMkContents.split("\n"));
      }
    }
    return null;
  }

  /**
   * Get the current document as json
   */
  private getDocumentAsJson(document: vscode.TextDocument): Document | null {
    const text = document.getText();

    if (text.trim().length === 0) {
      return null;
    }

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
    parsedDoc: Document,
    updatedPins: ConfiguredPin[],
    clockNodesPayload: ClockNodesPayload,
    updatedProjects?: ConfiguredProject[],
    clockFrequencies?: Record<string, string | number>,
  ) {
    const edit = new vscode.WorkspaceEdit();
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
    return clockNodes.map((clockNode) => ({
      ...clockNode,
      Enabled: Boolean(
        modifiedClockNodes.find(
          (modifiedClockNode) => modifiedClockNode.Name === clockNode.Name,
        )?.EnabledControls[clockNode.Control],
      ),
    }));
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
}
