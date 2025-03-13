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

import {
  Disposable,
  Uri,
  ViewColumn,
  Webview,
  WebviewPanel,
  window,
} from "vscode";
import * as vscode from "vscode";
import {
  BROWSE_FOLDERS,
  BROWSE_FOR_BOARDS,
  CHECK_CUSTOM_BOARD,
  CHECK_FILE_EXISTS,
  CLOSE_NEW_PROJECT_WIZARD_TAB,
  GET_DEFAULT_LOCATION,
  GET_SOC_DATA,
  SUBMIT_NEW_PROJECT_FORM,
} from "../constants";
import {
  ProjectGenerator,
  ProjectGeneratorTypes,
  ProjectGeneratorFactory,
  Soc,
} from "cfs-lib";
import { getNonce } from "../utils/getNonce";
import { getUri } from "../utils/getUri";
import { resolveVariables } from "../utils/resolveVariables";
import { Utils } from "../utils/utils";
import path from "path";
import fs from "fs";
import { Message } from "./homepage";
import {
  NEW_PROJECT_COMMAND_ID,
  VSCODE_OPEN_FOLDER_COMMAND_ID,
} from "../commands/constants";
import { generateCode, GeneratedCode, getSoc, getSocs } from "../cli";
import { SocDataType } from "../webview/common/types/soc-data";
import { SocDataObj } from "./data/soc-data-obj";

/**
 * This class manages the state and behavior of the CFS New Project Wizard webview tab.
 */

export class NewProjectPanel {
  public static currentPanel: NewProjectPanel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];
  public readonly webview: vscode.Webview;

  /**
   * The NewProjectPanel class private constructor.
   * @param panel - A reference to the webview panel
   * @param extensionUri - The URI of the directory containing the extension
   */

  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;

    this.webview = panel.webview;

    // Sets an event listener to listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Sets the HTML content for the webview panel
    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      extensionUri,
    );

    // Sets an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this._panel.webview);
  }

  /**
   * Renders the current new project wizard webview tab if it exists otherwise a new webview panel will be created and displayed.
   * @param extensionUri - The URI of the directory containing the extension.
   */

  public static render(extensionUri: Uri) {
    if (NewProjectPanel.currentPanel) {
      // If the webview panel already exists reveal it
      NewProjectPanel.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      // If a webview panel does not already exist create and show a new one
      const panel = window.createWebviewPanel(
        // Tab view type
        "NewProjectPanel",
        // Tab title
        "New Project Wizard",
        // The editor column the panel should be displayed in
        ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [Uri.joinPath(extensionUri, "out")],
        },
      );

      const NewProjectWizardTabIcon = vscode.Uri.file(
        path.join(
          extensionUri.fsPath,
          "src/panels/icons/new-project-wizard-icon.svg",
        ),
      );

      panel.iconPath = NewProjectWizardTabIcon;
      NewProjectPanel.currentPanel = new NewProjectPanel(panel, extensionUri);
    }
  }

  /**
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */

  public dispose() {
    NewProjectPanel.currentPanel = undefined;

    // Dispose of the current webview panel
    this._panel.dispose();

    // Dispose of all disposables (i.e. commands) associated with the current webview panel
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Defines and returns the HTML that should be rendered within the webview panel.
   * @remarks This is also the place where references to CSS and JavaScript files are created and inserted into the webview HTML.
   * @param webview - A reference to the extension webview
   * @param extensionUri - The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be rendered within the webview panel
   */

  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    const scriptUri = getUri(webview, extensionUri, [
      "out",
      "new-project-wizard",
      "index.js",
    ]);

    const stylesUri = getUri(webview, extensionUri, [
      "out",
      "new-project-wizard",
      "style.css",
    ]);
    const nonce = getNonce();

    const htmlContent = /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
        </head>
        <body>
					<div id="root"></div>
          <div id="modal-root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
    return htmlContent;
  }

  /**
   * Sets up an event listener to listen for messages passed from the webview context and executes code based on the message that is received.
   * @param webview - A reference to the extension webview
   */

  private _setWebviewMessageListener(webview: Webview) {
    webview.onDidReceiveMessage(async (message: Message) => {
      const command = message.command;
      switch (command) {
        case GET_DEFAULT_LOCATION:
          const userHome = resolveVariables("${userHome}");
          const version = this._getVersion();

          const defaultLocation = Utils.normalizePath(
            `${userHome}/cfs/${version}`,
          );

          if (!fs.existsSync(defaultLocation)) {
            fs.mkdirSync(defaultLocation, { recursive: true });
          }

          webview.postMessage({
            command: GET_DEFAULT_LOCATION,
            defaultLocation: defaultLocation,
          });
          break;
        case SUBMIT_NEW_PROJECT_FORM:
          const projectContext = message.data as {
            projectName: string;
            projectLocation: string;
            template: SocDataType.Template;
            firmwarePlatform: string;
            socPackage: SocDataType.Package;
            firmwarePlatformObj: SocDataType.FirmwarePlatform;
            board: string;
            boardType: string;
            boardFileLocation: string;
            boardObj: SocDataType.Board;
            soc: SocDataType.SoC;
          };

          vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: "CFS Project Creation",
              cancellable: false,
            },
            async (progress) => {
              vscode.window.setStatusBarMessage(
                "Creating CFS project...",
                4000,
              );
              progress.report({
                message: `Creating ${projectContext.firmwarePlatform} project...`,
              });
              try {
                for (const templateFolder of projectContext.template.folders) {
                  if (
                    templateFolder.location.isRelative &&
                    templateFolder.location.type === "localFolder"
                  ) {
                    const temp = path.join(
                      projectContext.firmwarePlatformObj?.location
                        .path as string,
                      templateFolder.location.path,
                    );
                    templateFolder.location.path = resolveVariables(temp, true);
                  }
                }
                // Setting identifier based on the firmware platform and type of board(standard or custom)
                let identifier: string;
                if (projectContext.firmwarePlatformObj.name === "msdk") {
                  identifier =
                    projectContext.boardType === "custom"
                      ? projectContext.board
                      : (projectContext.boardObj.msdkIdentifier as string);
                }
                if (projectContext.firmwarePlatformObj.name === "zephyr-3.7") {
                  identifier =
                    projectContext.boardType === "custom"
                      ? projectContext.board
                      : (projectContext.boardObj.zephyrIdentifier as string);
                }

                const projectGenerator: ProjectGenerator =
                  ProjectGeneratorFactory.getProjectGenerator(
                    projectContext.firmwarePlatform as ProjectGeneratorTypes.FirmwarePlatform,
                  );

                this._panel.dispose();
                let socData: Soc | undefined = undefined;

                const projectPath = path.join(
                  projectContext.projectLocation,
                  projectContext.projectName,
                  projectContext.template.folders[0].name,
                );

                let engine = projectContext.firmwarePlatform;
                if (engine.includes("zephyr")) {
                  engine = "zephyr";
                }

                const otherProjects = projectContext.template.folders.filter(
                  (_folder, index) => {
                    return index > 0;
                  },
                );

                //Querying the list of Socs supported
                getSocs()
                  .then((supportedSocs) => {
                    //Checking if the Soc-package has a config file
                    //resolving the return to SocData if Soc-package is supported
                    //else resolving the return to undefined
                    const socToSearch = `${projectContext.soc.name}-${projectContext.socPackage.name}`;
                    if (supportedSocs.includes(socToSearch)) {
                      return getSoc(`${socToSearch}`);
                    } else {
                      return undefined;
                    }
                  })
                  .then((tempSocData) => {
                    //Creating a new project based on selection
                    socData = tempSocData ? (tempSocData as Soc) : undefined;
                    return projectGenerator.createProject(
                      projectContext.template as ProjectGeneratorTypes.Template,
                      projectContext.projectLocation,
                      projectContext.projectName,
                      projectContext.soc.displayName,
                      projectContext.board,
                      projectContext.socPackage.name,
                      identifier,
                      socData,
                      projectContext.boardFileLocation,
                    );
                  })
                  .then((isProjectCreated) => {
                    if (!isProjectCreated) {
                      throw new Error(`Error in project creation.`);
                    }

                    const cfsconfigPath = path.join(
                      projectPath,
                      `${projectContext.soc.name}-${projectContext.socPackage.name}.cfsconfig`,
                    );
                    if (fs.existsSync(cfsconfigPath)) {
                      // Copy the cfsconfig file into the other projects to keep them in sync
                      for (const projectFolder of otherProjects) {
                        const destPath = path.join(
                          projectPath,
                          "../",
                          projectFolder.name,
                          path.basename(cfsconfigPath),
                        );
                        fs.copyFileSync(cfsconfigPath, destPath);
                      }
                      // Generate source code using the cfsconfig file
                      return generateCode(engine, cfsconfigPath);
                    }
                  })
                  .then((output: GeneratedCode | undefined) => {
                    if (!output) {
                      return;
                    }

                    for (const file in output.files) {
                      const data = output.files[file].join("\n").concat("\n");
                      const fileName =
                        engine === "zephyr" ? `boards/${file}` : file;
                      const filePath = path.join(projectPath, fileName);
                      const fileFolder = path.dirname(filePath);
                      if (!fs.existsSync(fileFolder)) {
                        fs.mkdirSync(fileFolder, { recursive: true });
                      }
                      fs.writeFileSync(filePath, data, {
                        encoding: "utf-8",
                      });
                      // Copy the generated files into the other project directories
                      for (const projectFolder of otherProjects) {
                        const destPath = path.join(
                          projectPath,
                          "../",
                          projectFolder.name,
                          fileName,
                        );
                        fs.copyFileSync(filePath, destPath);
                      }
                    }
                  })
                  .then(() => {
                    // Providing notification to open newly created project
                    const workspaceFilePath = path.join(
                      projectContext.projectLocation,
                      projectContext.projectName,
                      `${projectContext.projectName}.code-workspace`,
                    );

                    vscode.window
                      .showInformationMessage(
                        `Project ${projectContext.projectName} created successfully!`,
                        "Open project",
                      )
                      .then((selection) => {
                        if (selection === "Open project") {
                          vscode.commands.executeCommand(
                            VSCODE_OPEN_FOLDER_COMMAND_ID,
                            vscode.Uri.file(workspaceFilePath),
                          );
                        }
                      });
                  })
                  .catch((err) => {
                    const errorMsg = `Failed to create project: ${projectContext.projectName}. ${(err as Error).message}.`;
                    console.error(err);
                    vscode.window
                      .showErrorMessage(errorMsg, "Try again")
                      .then((selection) => {
                        if (selection === "Try again") {
                          vscode.commands.executeCommand(
                            NEW_PROJECT_COMMAND_ID,
                          );
                        }
                      });
                  });
              } catch (error) {
                vscode.window.showErrorMessage(
                  `An error occurred while creating the project: ${error}`,
                );
              }
            },
          );
          break;
        case BROWSE_FOLDERS:
          const uris = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
          });

          if (uris && uris.length > 0) {
            this._panel.webview.postMessage({
              command: "selectedFolder",
              path: Utils.normalizePath(uris[0].fsPath),
            });
          }
          break;
        case BROWSE_FOR_BOARDS:
          const boardUris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
              "Board Files": ["yaml", "mk"],
            },
          });

          if (boardUris && boardUris.length === 1) {
            this._panel.webview.postMessage({
              command: "selectedBoardFile",
              path: Utils.normalizePath(boardUris[0].fsPath),
            });
          }
          break;
        case CLOSE_NEW_PROJECT_WIZARD_TAB:
          this._panel.dispose();
          break;
        case CHECK_FILE_EXISTS:
          const webviewData = message.data as {
            location: string;
            name: string;
          };
          const locationHasSpaces = webviewData.location.includes(" ");
          const locationValid = fs.existsSync(webviewData.location);
          let nameValid = fs.existsSync(
            path.join(webviewData.location, webviewData.name),
          );
          if (webviewData.name.trim() === "") {
            nameValid = false;
          }
          this._panel.webview.postMessage({
            command: "checkFileExistsResponse",
            data: { locationValid, nameValid, locationHasSpaces },
          });
          break;
        case CHECK_CUSTOM_BOARD:
          const boardData = message.data as {
            location: string;
            socName: string;
          };
          const boardLocationValid = fs.existsSync(boardData.location);
          let targetValid = true;
          let inferredBoardName = await this.getInferredMsdkBoard(
            boardData.location,
          );
          if (!boardData.location.endsWith(".mk")) {
            targetValid = await this.verifyZephyrTarget(
              boardData.location,
              boardData.socName.toLowerCase(),
            );
            if (targetValid) {
              inferredBoardName = await this.getZephyrIdentifier(
                boardData.location,
              );
            }
          }
          this._panel.webview.postMessage({
            command: "checkBoardFileExistsResponse",
            data: { boardLocationValid, targetValid, inferredBoardName },
          });
          break;
        case GET_SOC_DATA:
          const socDataObj = SocDataObj.getInstance();
          const socData = socDataObj.getSocData();

          this._panel.webview.postMessage({
            command: "socData",
            data: socData,
          });
      }
    }, undefined);
  }

  public async verifyZephyrTarget(location: string, target: string) {
    try {
      const newLocation = location.replace(/[^/]*\.yaml$/, "board.yml");
      const fileContent = fs.readFileSync(newLocation, "utf8");
      const regex = /board:\s*\n\s*name:\s*(max32690)/;
      const match = fileContent.match(regex);
      if (match && match[1].trim() === target) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error reading file:", error);
      return false;
    }
  }

  public async getInferredMsdkBoard(location: string) {
    const parentDir = path.dirname(location);
    const parentFolder = path.basename(parentDir);
    return parentFolder;
  }

  public async getZephyrIdentifier(location: string) {
    const fileContent = fs.readFileSync(location, "utf8");
    const regex = /identifier\s*:\s*(.*)/;
    const match = fileContent.match(regex);
    if (match) {
      return match[1].trim();
    } else {
      return "";
    }
  }

  public async launchNewProjectWizard() {
    this.webview.postMessage({
      command: "newProject",
      launch: true,
    });
  }

  private _getVersion() {
    const extension = vscode.extensions.getExtension("analogdevices.cfs-ide");

    if (!extension) {
      return null; // should never happen
    }

    const version = extension.packageJSON.version.split("-")[0];
    if (version === "1.0.2") {
      // 1.0.2 was a patch release for 1.0.0 and doesn't require a new project location.
      return "1.0.0";
    }

    return version;
  }
}
