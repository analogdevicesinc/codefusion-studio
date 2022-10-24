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

/* eslint-disable complexity */
import * as vscode from "vscode";
import * as path from "path";
import { ViewProviderPanel } from "../view-provider/view-provider-panel";
import { createUnsavedFile } from "../utils/document";
import debounce from "lodash.debounce";
import { CONFIG_FILE_EXTENSION } from "../constants";
import { generateCode, getExportEngines, getSoc, getSocs } from "../cli";
import * as fs from "fs";

const messageTypes = {
  getSocConfig: "get-soc-config",
  getSocs: "get-socs",
  getSoc: "get-soc",
  getExportEngines: "get-export-engines",
  getIsDocumentUnsaved: "get-is-document-unsaved",
  updatePersistedPinAssignments: "update-pin-assignments",
  updatePersistedClockNodeAssignments: "update-clock-node-assignments",
  showSaveDialog: "show-save-dialog",
  generateCode: "generate-code",
  showInformationMessage: "show-information-message",
  getSocControls: "get-soc-controls",
  getClockCanvas: "get-clock-canvas",
  getClockNodes: "get-clock-nodes",
};

type Pin = {
  Pin: string;
  Peripheral: string;
  Signal: string;
  Config: Record<string, string>;
  ControlResetValues: Record<string, string>;
};

type ClockNode = {
  Type: string;
  Name: string;
  Control: string;
  Value: string;
  Enabled?: boolean;
};

type Document = {
  Copyright: string;
  DataModelSchemaVersion: string;
  DataModelVersion: string;
  Package: string;
  Soc: string;
  Timestamp: string;
  Pins: Pin[];
  ClockNodes: ClockNode[];
};

// To do: would be nice to import some of the above types instead of duplicating.. But due to current tsconfig structure is not possible

export const MCU_EDITOR_ID = "cfgtools.editor";

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

      if ("Timestamp" in parsedDoc) {
        const mcuId = parsedDoc.Soc ?? "";
        const packageId = parsedDoc.Package ?? "";

        const socId =
          `${mcuId}${packageId ? `-${packageId}` : ""}`.toLowerCase();

        const dataModel = await getSoc(socId);

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
          // To do: would be nice to have types on this message for better safety and support - but that would require changes in tsconfig structure
          let request;

          if (message.type === messageTypes.getSocs) {
            request = getSocs();
          } else if (message.type === messageTypes.getSoc) {
            request = Promise.resolve(dataModel);
          } else if (message.type === messageTypes.getSocConfig) {
            request = Promise.resolve({
              dataModel,
              configOptions: this.getDocumentAsJson(document),
            });
          } else if (
            message.type === messageTypes.updatePersistedPinAssignments
          ) {
            await this.updatePinAssignments(
              document,
              message.body.updatedPins as Pin[],
              message.body.modifiedClockNodes as Array<{
                Name: string;
                EnabledControls: Record<string, boolean>;
              }>,
            );
          } else if (
            message.type === messageTypes.updatePersistedClockNodeAssignments
          ) {
            await this.updateClockNodeAssignments(
              document,
              message.body.updatedClockNode as ClockNode,
              message.body.initialControlValues as
                | Record<string, string>
                | undefined,
              message.body.modifiedClockNodes as Array<{
                Name: string;
                EnabledControls: Record<string, boolean>;
              }>,
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
            const { engine } = message.body;

            try {
              const { files } = await generateCode(
                engine as string,
                document.uri.fsPath,
              );

              if (!files) {
                throw new Error(
                  "No files generated during code generation process.",
                );
              }

              const generatedDocs: vscode.TextDocument[] = [];
              const projectDeps: Set<string> = new Set<string>();

              // Using Promise.all results in concurrency issues with the vscode api
              for (const [file, fileContent] of Object.entries(files)) {
                generatedDocs.push(
                  // eslint-disable-next-line no-await-in-loop
                  await createUnsavedFile(
                    path.join(
                      path.dirname(document.uri.fsPath),
                      engine === "zephyr" ? `boards/${file}` : file,
                    ),
                    fileContent,
                  ).catch((e) => {
                    throw new Error(`Error creating file: ${e}`);
                  }),
                );

                for (const dep of this.parseProjectDependencies(fileContent)) {
                  projectDeps.add(dep);
                }
              }

              // add project dependencies to project.mk
              const projectMk = path.join(
                path.dirname(document.uri.fsPath),
                "project.mk",
              );
              await this.updateProjectMk(projectMk, projectDeps).catch((e) => {
                throw new Error(`Error updating project.mk: ${e}`);
              });

              if (generatedDocs.length) {
                // Display the first generated file
                await vscode.window.showTextDocument(generatedDocs[0]);
              }

              await vscode.window.showInformationMessage(
                `${generatedDocs.length} code files have been generated.`,
              );

              request = Promise.resolve("success");
            } catch (e) {
              console.log("e", e);
              await vscode.window.showErrorMessage(
                "Unable to generate files, please try again later.",
              );

              request = Promise.reject(e);
            }
          } else if (message.type === messageTypes.showInformationMessage) {
            const { message: text } = message.body;

            void vscode.window.showInformationMessage(text as string);

            request = Promise.resolve();
          } else if (message.type === messageTypes.getSocControls) {
            request = Promise.resolve(dataModel.Controls);
          } else if (message.type === messageTypes.getClockCanvas) {
            const canvas = dataModel.Packages[0].ClockCanvas;

            request = Promise.resolve(canvas);
          } else if (message.type === messageTypes.getClockNodes) {
            request = Promise.resolve(dataModel.ClockNodes);
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
  private getDocumentAsJson(
    document: vscode.TextDocument,
  ): Document | Record<never, never> {
    const text = document.getText();

    if (text.trim().length === 0) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        "Could not get document as json. Content is not valid json",
      );
    }
  }

  private async updatePinAssignments(
    document: vscode.TextDocument,
    updatedPins: Pin[],
    modifiedClockNodes: Array<{
      Name: string;
      EnabledControls: Record<string, boolean>;
    }>,
  ) {
    const edit = new vscode.WorkspaceEdit();
    const timestamp = new Date().toISOString();
    const parsedDoc = this.getDocumentAsJson(document);

    if ("Timestamp" in parsedDoc) {
      parsedDoc.Timestamp = timestamp;

      parsedDoc.Pins = updatedPins;

      parsedDoc.ClockNodes = parsedDoc.ClockNodes.map((clockNode) => ({
        ...clockNode,
        Enabled: modifiedClockNodes.find(
          (modifiedClockNode) => modifiedClockNode.Name === clockNode.Name,
        )?.EnabledControls[clockNode.Control],
      }));
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

  private async updateClockNodeAssignments(
    document: vscode.TextDocument,
    updatedClockNode: ClockNode,
    initialControlValues: Record<string, string> | undefined,
    modifiedClockNodes: Array<{
      Name: string;
      EnabledControls: Record<string, boolean>;
    }>,
  ) {
    const edit = new vscode.WorkspaceEdit();
    const timestamp = new Date().toISOString();
    const parsedDoc = this.getDocumentAsJson(document);

    if ("Timestamp" in parsedDoc) {
      parsedDoc.Timestamp = timestamp;

      // If new value is the same as the initial default, remove from parsedDoc
      if (
        initialControlValues &&
        initialControlValues[updatedClockNode.Control] ===
          updatedClockNode.Value
      ) {
        parsedDoc.ClockNodes = parsedDoc.ClockNodes.filter(
          (clockNode) =>
            !(
              clockNode.Name === updatedClockNode.Name &&
              clockNode.Control === updatedClockNode.Control
            ),
        );
      } else {
        const nodeToChange = parsedDoc.ClockNodes.find(
          (clockNode) =>
            clockNode.Control === updatedClockNode.Control &&
            clockNode.Name === updatedClockNode.Name,
        );

        // If there's an old entry, remove it before populating with the new one
        if (nodeToChange) {
          parsedDoc.ClockNodes = parsedDoc.ClockNodes.filter(
            (clockNode) =>
              !(
                clockNode.Name === nodeToChange.Name &&
                clockNode.Control === updatedClockNode.Control
              ),
          );
        }

        parsedDoc.ClockNodes = [...parsedDoc.ClockNodes, updatedClockNode];
      }

      parsedDoc.ClockNodes = parsedDoc.ClockNodes.map((clockNode) => ({
        ...clockNode,
        Enabled: modifiedClockNodes.find(
          (modifiedClockNode) => modifiedClockNode.Name === clockNode.Name,
        )?.EnabledControls[clockNode.Control],
      }));
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
}
